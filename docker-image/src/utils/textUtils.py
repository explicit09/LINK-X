import io
from typing import Sequence, List

import tiktoken
from PyPDF2 import PdfReader
from unstructured.partition.auto import partition
from openai import OpenAI
import numpy as np
import os
import re

_embed_client = OpenAI(api_key=os.getenv("OPENAI_API_KEY"))

def extract_text(file_data: bytes, filename: str) -> str:
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
        # Use unstructured instead of textract
        elements = partition(file=io.BytesIO(file_data), metadata_filename=filename)
        return "\n".join([str(el) for el in elements])
    else:
        return file_data.decode('utf-8', errors='ignore')
    
def clean_extracted_text(text: str) -> str:
    # Remove NUL characters that cause PostgreSQL issues
    text = text.replace('\x00', '')
    
    # Remove other problematic control characters
    text = re.sub(r'[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]', '', text)
    
    # Normalize whitespace
    text = re.sub(r'\s+', ' ', text)
    text = re.sub(r'(?<=[a-z])(?=[A-Z])', ' ', text)
    text = re.sub(r'(?<=[a-zA-Z])(?=[0-9])', ' ', text)
    text = re.sub(r'(?<=[0-9])(?=[a-zA-Z])', ' ', text)

    return text.strip()

def split_text(text: str, max_tokens: int = 300, overlap: int = 50) -> List[str]:
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
    response = _embed_client.embeddings.create(
        model="text-embedding-3-small",
        input=text
    )
    return response.data[0].embedding

def openai_embed_text(texts: Sequence[str]) -> np.ndarray:
    if not texts:
        return np.empty((0, 1536), dtype=np.float32)
    CHUNK = 512
    out: List[np.ndarray] = []

    for i in range(0, len(texts), CHUNK):
        batch = texts[i : i + CHUNK]

        resp = _embed_client.embeddings.create(
            model="text-embedding-3-small",
            input=batch,
            encoding_format="float"
        )
        arr = np.asarray([d.embedding for d in resp.data], dtype=np.float32)
        out.append(arr)

    return np.vstack(out)
