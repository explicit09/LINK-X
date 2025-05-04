import os
from openai import OpenAI
from dotenv import load_dotenv, find_dotenv
from FAISS_retriever import answer_to_QA

load_dotenv(find_dotenv())

client = OpenAI(api_key=os.getenv("OPENAI_API_KEY"))

def prompt1_create_course(user_query):
    system_query = (
    """
    You are an education assistant. Extract a topic and the user's level of expertise from the question.

    Give ONLY with the 'topic' and 'expertise' (one of: beginner, intermediate, advanced).

    Return ONLY the **raw valid JSON string** with the following structure:

    {
        "topic": "string",
        "expertise": "string"
    }
    
    Do NOT include any code-block markers (e.g., triple backticks, etc)
    """
    )

    response = client.chat.completions.create(
        model="gpt-4o",
        messages=[
            {"role": "system", "content": system_query},
            {"role": "user", "content": user_query}
        ],
        temperature=0
    )

    return response.choices[0].message.content.strip()

def prompt2_generate_course_outline_RAG(working_dir, expertise):
    query = ( 
    f"""
    You are an AI assistant with access to provided content on a subject. 
    
    The user has provided you with their experise on the subject: {expertise}

    Your task is to retrieve all content relevant to the topic based on their expertise and summarize it into exactly 10 chapters. For each chapter:

    1. Provide a concise title (3–7 words).
    2. Include an array of relevant metadata or key points. Each array should have 3–6 bullet items covering the main ideas, important highlights, and any important details from the content.

    Return ONLY the **raw valid JSON string** with the following structure:

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

    Do NOT include any code-block markers (like ``` or similar)
    """
    )

    response = answer_to_QA(query, working_dir)

    # .choices[0].message.content.strip() already done in FAISS_retriever
    return response

def prompt2_generate_course_outline(topic, expertise):
    # “I’m a sophomore in finance and I want to learn about investing”
    system_query = ( 
    """
    You are an AI assistant generating an educational course outline.
    
    The user will provide you with a topic and their level of experise on the subject.
    
    Your task is to generate exactly **10 Chapters** based on the topic and expertise level provided.
    
    For each chapter:
    1. Provide a **concise title** (3–7 words).
    2. Include an **array of 3-6 metadata points** (key points, main ideas, important highlights, or details relevant to the chapter).

    Return ONLY the **raw valid JSON string** with the following structure:

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
    
    Do NOT include any code-block markers (e.g., triple backticks, etc)
    """
    )

    user_query = f"The topic is: {topic}. My expertise level is: {expertise}"

    response = client.chat.completions.create(
        model="gpt-4o",
        messages=[
            {"role": "system", "content": system_query},
            {"role": "user", "content": user_query}
        ],
        temperature=0
    )
    
    return response.choices[0].message.content.strip()

def prompt3_generate_module_content_RAG(persona, expertise_summary, topic, working_dir):
    rag_query = (
    f"""
    You are an AI assistant retrieving raw knowledge to help generate an educational course module

    You have access to provided content. 

    The topic is: {topic}

    Your task is to retrieve all knowledge relevant to the module based on the provided topic and content.

    **Return ONLY** the raw knowledge.**  
    - No JSON
    - No code-block markers (like ``` or similar)
    """
    )

    rag_response = answer_to_QA(rag_query, working_dir)

    # After retrieval, personalize the content to the user.
    personalization_query = (
    f"""
    You are an AI assistant generating a personalized educational course module.

    You have been provided with retrieved knowledge: {rag_response}

    The user will provide you with their persona and their expertise level on the topic.

    Your tasks:
    1. You must use **ALL** of the retrieved knowledge provided
    2. Organize and explain the knowledge clearly, without omitting or skipping important parts.
    3. Personalize the explanation based on the user's persona and expertise level to adjust tone, depth, and style.
    4. Adapt examples to be more relevant to the user's persona without changing the underlying lesson or concept.
        - Do not change the core explanation or lesson being taught by the example.
        - Adjust only the context, terminology, or scenario so that the example feels more relatable and applicable to the user's background.

    **DO NOT** add any new information or content that wasn't in the retrieved knowledge.
    **DO NOT** leave out any part of the retrieved content unless explicitly redundant.

    **Return ONLY the raw explanatory text.**  
    - No JSON
    - No code-block markers (like ``` or similar)
    """
    )

    user_query = (
    f"""
    Persona: {persona}
    Expertise Level: {expertise_summary}
    """
    )

    response = client.chat.completions.create(
        model="gpt-4o",
        messages=[
            {"role": "system", "content": personalization_query},
            {"role": "user", "content": user_query}
        ],
        temperature=0
    )

    return response.choices[0].message.content.strip()

def prompt3_generate_module_content(persona, expertise_summary, topic):
    system_query = (
    f"""
    You are an AI assistant generating a personalized educational course module.

    The user will provide you with their persona, a module topic, and their expertise level on the topic.

    Your task is to generate a clear, instructional explanation of the topic, personalized to the user's persona and expertise.

    **Return ONLY the raw explanatory text.**  
    - No JSON
    - No code-block markers (like ``` or similar)
    """
    )

    user_query = (
    f"""
    Persona: {persona}
    Topic: {topic}
    Expertise Level: {expertise_summary}
    """
    )

    response = client.chat.completions.create(
        model="gpt-4o",
        messages=[
            {"role": "system", "content": system_query},
            {"role": "user", "content": user_query}
        ],
        temperature=0
    )

    return response.choices[0].message.content.strip()

def prompt4_valid_query(user_query, course_outline):
    # Take a query given by a user and verify it is related to the course content
    system_query = (
    f"""
    You are an AI determining the relevance of a user query.

    You have been provided with the JSON outline of an educational course: {course_outline}

    The user will provide you with a query about the course.

    Your task is to:
    
    1. If the query is relevant to the course based on the outline, respond with:

        "true"

    2. If the query is not relevant to the course based on the outline, reply with:

        "false"

    Your output should **only provide one of these two outcomes** based on the relevance of the query to the course content.
    """
    )

    response = client.chat.completions.create(
        model="gpt-4o",
        messages=[
            {"role": "system", "content": system_query},
            {"role": "user", "content": user_query}
        ],
        temperature=0
    )

    result = response.choices[0].message.content.strip().lower().split(".")[0]

    if result == "true":
        return True
    elif result == "false":
        return False
    else:
        print(f"Unexpected response: {result}")