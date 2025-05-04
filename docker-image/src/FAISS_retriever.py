# It contains all the functions: response with sources, response without sources, get similar chunks, raw LLM response, answer to QA

import os
import sys
from dotenv import load_dotenv, find_dotenv
from langchain_community.vectorstores import FAISS
from langchain_openai import OpenAIEmbeddings, ChatOpenAI
from langchain.chains import RetrievalQA
from langchain_core.globals import set_verbose, set_debug
from langchain.schema import BaseRetriever, Document
import warnings

# Load environment variables
load_dotenv(find_dotenv())

# Disable LangChain deprecation warnings
warnings.filterwarnings("ignore", message=".*LangChainDeprecationWarning.*")

# Disable verbose and debug logging
set_verbose(False)
set_debug(False)

# OpenAI-powered fallback retriever
class OpenAIRetriever(BaseRetriever):
    def __init__(self, llm):
        self.llm = llm

    def _get_relevant_documents(self, query):
        response = self.llm.invoke(query)
        doc = Document(page_content=response, metadata={"source" : "OpenAI"})
        return [doc]

def process_llm_response_with_sources(llm_response):
    result = llm_response['result'].strip().lower().split(".")[0]

    # Check if the response is a variation of "I don't know"
    if result in ["i don't know", "i do not know", "unknown", "i'm not sure", "i am not sure"]:
        return result.capitalize()
    
    return_txt = llm_response['result'] + '\nSources:'
    # Use a set to keep track of unique sources
    unique_sources = set()
    
    for source in llm_response["source_documents"]:
        citation = source.metadata['source']
        # Only add the citation if it's not already in the set
        if citation not in unique_sources:
            return_txt += f"\n \n{citation}"
            unique_sources.add(citation)
    
    return return_txt

def process_llm_response(llm_response):
    result = llm_response['result'].strip().lower().split(".")[0]

    # Check if the response is a variation of "I don't know"
    if result in ["i don't know", "i do not know", "unknown", "i'm not sure", "i am not sure"]:
        return result.capitalize()
    
    return_txt = llm_response['result']

    return return_txt

# def get_similar_chunks(raw_llm_response):

#     similar_chunks = []
#     for doc in raw_llm_response["source_documents"]:
#         similar_chunks.append(doc.page_content)
    
#     return similar_chunks

# Performs an LLM query using the top similar chunks and falls back to OpenAI knowledge if not enough
def cascading_LLM_response(query, faiss_index_path, threshold=2):
    embedding = OpenAIEmbeddings(api_key=os.getenv("OPENAI_API_KEY"))
    llm = ChatOpenAI(model="gpt-4o-mini", temperature=0)

    vectordb = FAISS.load_local(
        faiss_index_path, embedding, allow_dangerous_deserialization=True
    )
    faiss_retriever = vectordb.as_retriever(search_kwargs={"k" : 5})

    # Query FAISS first
    faiss_docs = faiss_retriever.invoke(query)

    # Check if we got enough good documents
    if len(faiss_docs) >= threshold:
        final_docs = faiss_docs
    else:
        print("FAISS retrieval weak - falling back to OpenAI knowledge.")
        openai_retriever = OpenAIRetriever(llm)
        openai_docs = openai_retriever._get_relevant_documents(query)
        final_docs = faiss_docs + openai_docs

    # Create a custom retriever that returns out final_docs
    class ListRetriever(BaseRetriever):
        def _get_relevant_documents(self, q):
            return final_docs
    
    combined_retriever = ListRetriever()

    # Run QA chain on combined docs
    qa_chain = RetrievalQA.from_chain_type(
        llm,
        chain_type="stuff",
        retriever=combined_retriever,
        return_source_documents=True
    )

    llm_response = qa_chain.invoke(query)

    return llm_response

# Perfoms LLM query using all of the provided chunks and does not fall back to OpenAI knowledge
def LLM_response_all_chunks(query, faiss_index_path):
    embedding = OpenAIEmbeddings(api_key=os.getenv("OPENAI_API_KEY"))
    llm = ChatOpenAI(model="gpt-4o-mini", temperature=0)

    vectordb = FAISS.load_local(
        faiss_index_path, embedding, allow_dangerous_deserialization=True
    )
    all_chunks = list(vectordb.docstore.__dict__["_dict"].values())

    class FullDumpRetriever(BaseRetriever):
        def _get_relevant_documents(self, q):
            return all_chunks

    retriever = FullDumpRetriever()

    qa_chain = RetrievalQA.from_chain_type(
        llm,
        chain_type="stuff",
        retriever=retriever,
        return_source_documents=False
    )

    llm_response = qa_chain.invoke(query)
    return llm_response

def answer_to_QA(query, faiss_index_path):
    llm_response = cascading_LLM_response(query, faiss_index_path)
    
    # Response without citations
    answer_txt = process_llm_response(llm_response)
    # Response with citations (could add a flag if there are cases where we want the sources listed
    # answer_txt = process_llm_response_with_sources(llm_response)

    return answer_txt

def answer_to_QA_all_chunks(query, faiss_index_path):
    llm_response = LLM_response_all_chunks(query, faiss_index_path)
    answer_txt = process_llm_response(llm_response)

    return answer_txt

if __name__ == "__main__":
    # query = "How parastites are damaging the corals?"
    query = "Split the given content up into 10 individual modules to make a full educational course"
    
    # llm_response = raw_LLM_response(query)

    # similar_chunk_list = get_similar_chunks(llm_response)
    
    # print(process_llm_response(llm_response))

    # print(similar_chunk_list)

    print(answer_to_QA(query, ""))