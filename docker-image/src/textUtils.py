import io
from typing import List

import tiktoken
from PyPDF2 import PdfReader
import textract
from openai import OpenAI
import os

_embed_client = OpenAI(api_key=os.getenv("OPENAI_API_KEY"))

def extract_text(file_data: bytes, filename: str) -> str:
    """
    Extracts text from PDF, Office docs, or plain-text files.
    """
    ext = filename.lower().rsplit('.', 1)[-1]
    if ext == 'pdf':
        reader = PdfReader(io.BytesIO(file_data))
        texts = []
        for page in reader.pages:
            txt = page.extract_text()
            if txt:
                texts.append(txt)
        return "\n".join(texts)
    elif ext in ('doc', 'docx', 'ppt', 'pptx'):
        return textract.process(io.BytesIO(file_data), extension=ext).decode('utf-8', errors='ignore')
    else:
        return file_data.decode('utf-8', errors='ignore')
def split_text(text: str, max_tokens: int = 500, overlap: int = 50) -> List[str]:
    """
    Splits text into chunks of up to max_tokens tokens, with overlap.
    """
    enc = tiktoken.get_encoding("cl100k_base")
    token_ids = enc.encode(text)
    chunks = []
    start = 0
    while start < len(token_ids):
        end = min(start + max_tokens, len(token_ids))
        chunk = enc.decode(token_ids[start:end])
        chunks.append(chunk)
        start += max_tokens - overlap
    return chunks
def embed_text(text: str) -> List[float]:
    """
    Returns an embedding vector for the given text.
    """
    response = _embed_client.embeddings.create(
        model="text-embedding-ada-002",
        input=text
    )
    return response.data[0].embedding
