import os
import sys
from item_04_retriever_FAISS import answer_to_QA

def create_outline(working_dir):
    query = """You are an AI assistant with access to provided content on a subject. Your task is to summarize this content into exactly 10 chapters. For each chapter:

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
    }"""

    response = answer_to_QA(query, working_dir)