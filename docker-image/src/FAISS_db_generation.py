import os, sys
import pandas as pd
import openai
import glob
from dotenv import load_dotenv, find_dotenv
from langchain_community.vectorstores import FAISS
from langchain_openai import OpenAIEmbeddings
from langchain.text_splitter import RecursiveCharacterTextSplitter
from langchain_community.document_loaders import (
    PyPDFLoader,
    TextLoader,
    UnstructuredWordDocumentLoader,
    UnstructuredPowerPointLoader
)

# Load environment variables from .env file
load_dotenv(find_dotenv())
# item_01
def create_database(course_dir):
    # Validate existence of Course directory
    if not os.path.isdir(course_dir):
        print(f"The provided path is not a valid directory: {course_dir}")
        sys.exit(1)


    loader_mapping = {
        ".pdf": PyPDFLoader,
        ".txt": TextLoader,
        ".docx": UnstructuredWordDocumentLoader,
        ".pptx": UnstructuredPowerPointLoader
    }

    all_documents = []
    for ext, loader_cls in loader_mapping.items():
        pattern = os.path.join(course_dir, f"**/*{ext}")
        for file_path in glob.glob(pattern, recursive=True):
            try:
                loader = loader_cls(file_path)
                docs = loader.load()
                all_documents.extend(docs)
            except Exception as e:
                print(f"Failed to load {file_path}: {e}")
        
        if not all_documents:
            print("No supported documents found.")
            return

    # Splitting the text into chunks
    text_splitter = RecursiveCharacterTextSplitter(chunk_size=1000, chunk_overlap=200) # Divide into 1000 char chunks w/ 200 char overlap to retain context across chunks
    texts = text_splitter.split_documents(all_documents) # contains the document chunks
    print(f"Number of text chunks: {len(texts)}")

    # FAISS Vector Store Creation
    embedding = OpenAIEmbeddings(api_key=os.getenv("OPENAI_API_KEY")) # convert text into OpenAI vector embeddings
    vectordb = FAISS.from_documents(documents=texts, embedding=embedding)

    # vectordb.save_local(output_dir)
    vectordb.save_local(course_dir)
# item_02
def generate_citations(course_dir):
    # Validate existence of Course directory
    if not os.path.isdir(course_dir):
        print(f"The provided path is not a valid directory: {course_dir}")
        sys.exit(1)

    # Initialize OpenAI embeddings
    embedding = OpenAIEmbeddings(api_key=os.getenv("OPENAI_API_KEY"))
    # Load the FAISS index
    vectordb = FAISS.load_local(course_dir, embedding, allow_dangerous_deserialization=True)

    # Get the document store data
    docstore_data = vectordb.docstore.__dict__['_dict']
    values_list = list(docstore_data.values())
    all_keys = list(docstore_data.keys())

    # Create initial DataFrame
    df = pd.DataFrame({"Keys": all_keys, "Values": values_list})

    # Extract source from metadata
    df["Source"] = df["Values"].apply(lambda x: x.metadata.get("source", "unknown"))

    # Get unique sources
    unique_sources = df['Source'].unique()

    def obtain_reference_using_gpt(text_for_obtaining_reference):
        completion = openai.chat.completions.create(
            model="gpt-4o-mini",
            messages=[
                {
                    "role": "system",
                    "content": (
                        "You are a straightforward assistant who provides quick, direct APA 7th-style citations. "
                        "Use only the provided text chunk. If you cannot generate a citation, respond with 'I do not know'."
                    ),
                },
                {
                    "role": "user",
                    "content": f"Text chunk: {text_for_obtaining_reference}",
                }
            ],
        )
        return completion.choices[0].message.content.strip()

    # Generate citations
    reference_dict = {}
    for source in unique_sources:
        df_for_each = df[df["Source"] == source].iloc[:3]
        combined_text = " ".join(df_for_each["Values"].apply(lambda x: x.page_content))
        reference = obtain_reference_using_gpt(combined_text)
        reference_dict[source] = reference

    # Add citation to each chunk’s metadata
    for key, doc in docstore_data.items():
        original_source = doc.metadata.get("source", "unknown")
        if original_source in reference_dict:
            doc.metadata["citation"] = reference_dict[original_source]

    # Save updated FAISS index
    vectordb.save_local(course_dir)
    print(f"Saved updated FAISS index with citation metadata to: {course_dir}")

    # Optionally write CSV too
    citation_records = [{"Source": k, "Reference": v} for k, v in reference_dict.items()]
    pd.DataFrame(citation_records).to_csv(
        os.path.join(course_dir, "citations.csv"), index=False, encoding='utf-8'
    )
    print(f"Saved citation lookup table to citations.csv.")

# item_03
def replace_sources(course_dir):
    # Validate existence of Course directory
    if not os.path.isdir(course_dir):
        print(f"The provided path is not a valid directory: {course_dir}")
        sys.exit(1)

    # Initialize OpenAI embeddings
    embedding = OpenAIEmbeddings(api_key=os.getenv("OPENAI_API_KEY"))

    # Load the FAISS index
    vectordb = FAISS.load_local(course_dir, embedding, allow_dangerous_deserialization=True)

    # Load the CSV file with sources and references
    csv_filename = os.path.join(course_dir, "citations.csv")
    if not os.path.isfile(csv_filename):
        print(f"Error: Citations CSV file not found at: {csv_filename}")
        sys.exit(1)
    citations_df = pd.read_csv(csv_filename)

    # Create a dictionary for quick lookup
    source_to_reference = dict(zip(citations_df['Source'], citations_df['Reference']))

    # Get all keys from the vector database
    all_keys = list(vectordb.docstore.__dict__['_dict'].keys())

    # Function to replace source with reference
    def replace_source_with_reference(doc):
        original_source = doc.metadata["source"]
        if original_source in source_to_reference:
            doc.metadata["source"] = source_to_reference[original_source]
        return doc

    # Iterate through all documents and replace the source with the reference
    for key in all_keys:
        vectordb.docstore.__dict__['_dict'][key] = replace_source_with_reference(
            vectordb.docstore.__dict__['_dict'][key]
        )

    # Save the modified vectordb to local
    vectordb.save_local(course_dir)

    print(f"Sources in the FAISS database have been replaced with their corresponding references.")

    # Optionally, verify a few entries
    # This should show chunks with the same citation when using a single PDF
    # print("\nVerifying a few entries:")
    # for i in range(min(5, len(all_keys))):
    #   print(f"Document {i + 1} source:", vectordb.docstore.__dict__['_dict'][all_keys[i]].metadata["source"])

# item_03.5    
# Remove all files except for index.faiss and index.pkl from the folder
def file_cleanup(course_dir):
    # Validate existence of Course directory
    if not os.path.isdir(course_dir):
        print(f"The provided path is not a valid directory: {course_dir}")
        sys.exit(1)

    files_to_keep = {'index.faiss', 'index.pkl'}

    for file in os.listdir(course_dir):
        file_path = os.path.join(course_dir, file)
        if os.path.isfile(file_path) and file not in files_to_keep:
            os.remove(file_path)
            # print(f"Deleted: {file_path}")