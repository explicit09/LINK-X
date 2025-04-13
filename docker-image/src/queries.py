import os
import sys
import json
from item_04_retriever_FAISS import answer_to_QA

def generate_course_outline_RAG(working_dir):
    query = ( 
    """
    You are an AI assistant with access to provided content on a subject. Your task is to summarize this content into exactly 10 chapters. For each chapter:

    1. Provide a concise title (3–7 words).
    2. Include an array of relevant metadata or key points. Each array should have 3–6 bullet items covering the main ideas, important highlights, and any important details from the content.

    Return the results as valid JSON, with the following structure:

    {
    "chapters": [
        {
        "chapterTitle": "string",
        "metadata": [
            "string",
            "string",
                ...
            ]
        },
        ...
    ]
    }
    """
    )

    response = answer_to_QA(query, working_dir)

    try:
        parsed_json = json.loads(response)
    except ValueError as e:
        print("Invalid JSON returned from AI response.")
        print("Error:", e)
        return None

    # return response
    return parsed_json

def generate_course_outline(user_query):
    # “I’m a sophomore in finance and I want to learn about investing”
    query = ( 
    f"""
    You are an AI assistant generating an educational course.  You have been provided with a user's learning goals: "{user_query}".  Your task is to retrieve all relevant content and summarize it into exactly 10 chapters. For each chapter:

    1. Provide a concise title (3–7 words).
    2. Include an array of relevant metadata or key points. Each array should have 3–6 bullet items covering the main ideas, important highlights, and any important details from the content.

    Return the results as valid JSON, with the following structure:

    {{
    "chapters": [
        {{
        "chapterTitle": "string",
        "metadata": [
            "string",
            "string",
                ...
            ]
        }},
        ...
    ]
    }}
    """
    )
        
    response = answer_to_QA(query, None)

    try:
        parsed_json = json.loads(response)
    except ValueError as e:
        print("Invalid JSON returned from AI response.")
        print("Error:", e)
        return None

    # return response
    return parsed_json

def generate_module_content():
    # TODO
    # Take faiss index, specific module json from outline (chapterTitle & metadata), persona
    # Generate the content for the specified module using data provided & broader internet
    # "Based on JSON, generate all relevant knowledge"
    return 0

def valid_query(user_query, working_dir):
    # TODO
    # Take a query given by a user and verify it is related to the course content
    query = (
    f"""
    You are an AI assistant with access to a knowledge base derived from provided content on a specific subject.  You have been provided the following query:

        "{user_query}"

    Your task is to:
    
    1. If the query is relevant to information within the knowledge base, respond with a consise answer.  

    2. If the query is not relevant to information within the knowledge base, reply with:

        "Query is not relevant to the Course. Please try again."

    Your output should only provide one of these two outcomes based on the relevance of the query to the course content.
    """
    )
    response = answer_to_QA(query, working_dir)
    # print(response)
    return response