import os
import sys
import json
from item_04_retriever_FAISS import answer_to_QA

def generate_course_outline(working_dir):
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

    # try:
    #     json.loads(response)
    # except ValueError as e:
        # do something if json is invalid
    print(response)
    return 0

def generate_module_content():
    # TODO
    # Take faiss index, specific module json from outline (chapterTitle & metadata), persona
    # Generate the content for the specified module using data provided & broader internet
    return 0

def valid_query(query):
    # TODO
    # Take a query given by a user and verify it is related to the course content
    return 0