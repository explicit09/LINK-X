import pickle
import faiss
import numpy as np
from sqlalchemy.orm import Session

from textUtils import extract_text, split_text, embed_text
from src.db.queries import get_modules_by_course, get_files_by_module

def rebuild_course_index(db: Session, course_id: str):
    """
    Rebuilds both the FAISS index and the metadata pickle for a course,
    based on all files in all modules of that course.
    Returns: (index_bytes, pkl_bytes)
    """
    texts = []
    metadata = {}

    # 1) Iterate modules → files → extract & chunk
    modules = get_modules_by_course(db, course_id)
    for mod in modules:
        files = get_files_by_module(db, mod.id)
        for f in files:
            raw = extract_text(f.file_data, f.filename)
            chunks = split_text(raw)
            for i, chunk in enumerate(chunks):
                idx = len(texts)
                texts.append(chunk)
                metadata[idx] = {
                    'file_id': str(f.id),
                    'chunk_index': i,
                    'filename': f.filename
                }

    if not texts:
        # no content: return empty index + metadata
        empty_index = faiss.IndexFlatL2(1)
        return faiss.serialize_index(empty_index), pickle.dumps(metadata)

    # 2) Embed all chunks
    embeddings = [embed_text(t) for t in texts]
    arr = np.vstack(embeddings).astype('float32')
    dim = arr.shape[1]

    # 3) Build FAISS index
    index = faiss.IndexFlatL2(dim)
    index.add(arr)
    index_bytes = faiss.serialize_index(index)

    # 4) Pickle metadata dict
    pkl_bytes = pickle.dumps(metadata)

    return index_bytes, pkl_bytes