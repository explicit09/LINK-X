#%%
import os

# Get the current script's directory
# current_dir = os.path.dirname(os.path.abspath(__file__))

# Navigate two levels up
# working_dir = os.path.abspath(os.path.join(current_dir, '..', '..'))

#%%
from dotenv import load_dotenv, find_dotenv

load_dotenv(find_dotenv()) # search for .env file in directory, then load environment variables

#%%

from langchain_community.vectorstores import FAISS  # Import FAISS vectorstore
from langchain_openai import OpenAIEmbeddings
from langchain.text_splitter import RecursiveCharacterTextSplitter
from langchain_community.llms import OpenAI
from langchain.chains import RetrievalQA
from langchain_community.document_loaders import TextLoader, PyPDFLoader, DirectoryLoader

# pdf_folder = os.path.join(working_dir, "data", "nine_pdfs")
pdf_folder = "/app/data/learning_pdfs"  # based on mounting in docker container - may change later

loader = DirectoryLoader(pdf_folder, glob="**/*.pdf", loader_cls=PyPDFLoader)
documents = loader.load() # scan pdf_folder, recursively load all pdfs, extract text using PyPDFLoader

#%%

# Splitting the text into chunks
text_splitter = RecursiveCharacterTextSplitter(chunk_size=1000, chunk_overlap=200) # Divide into 1000 char chunks w/ 200 char overlap to retain context across chunks
texts = text_splitter.split_documents(documents) # contains the document chunks

len(texts)

#%%
# Create the DB using FAISS

# Use OpenAI embeddings
embedding = OpenAIEmbeddings(api_key=os.getenv("OPENAI_API_KEY")) # convert text into OpenAI vector embeddings

# Create FAISS vector store from documents
vectordb = FAISS.from_documents(documents=texts, embedding=embedding)

#%%

# Save the FAISS vectorstore to disk (optional, you can serialize it for later use)
# faiss_save_path = os.path.join(working_dir, "faiss_index")
faiss_save_path = "/app/faiss_index/" # based on mounting in docker container - may change later
vectordb.save_local(faiss_save_path)
