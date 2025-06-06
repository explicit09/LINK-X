"""
Simplified File Processing
Handles text extraction and chunking only - embeddings are generated automatically by Supabase
"""
import logging
from typing import Optional, List
import PyPDF2
import io

from core.database_supabase import db
from db.schema import File, FileChunk
from services.file_service_supabase import SupabaseFileService
from utils.semantic_chunker import SemanticChunker
from utils.textUtils import clean_text
from utils.transcriber import AudioTranscriber

logger = logging.getLogger(__name__)


def process_file_content(file_id: str) -> bool:
    """
    Process uploaded file content - extract text and create chunks
    Embeddings will be generated automatically via Supabase triggers
    
    Simplified from 300+ lines to ~100 lines
    """
    try:
        # Get file record
        file_record = db.session.query(File).filter_by(id=file_id).first()
        if not file_record:
            logger.error(f"File not found: {file_id}")
            return False
        
        logger.info(f"Processing file: {file_record.filename}")
        
        # Download file content from Supabase Storage
        file_service = SupabaseFileService()
        file_data, _, _ = file_service.download_file(file_id)
        
        # Extract text based on file type
        extracted_text = None
        
        if file_record.file_type == 'pdf':
            extracted_text = extract_pdf_text(file_data)
        elif file_record.file_type in ['txt', 'md']:
            extracted_text = file_data.decode('utf-8', errors='ignore')
        elif file_record.file_type in ['mp3', 'wav', 'm4a']:
            # Transcribe audio
            transcriber = AudioTranscriber()
            extracted_text = transcriber.transcribe_audio(io.BytesIO(file_data))
        elif file_record.file_type in ['doc', 'docx']:
            # For now, skip complex document processing
            logger.warning(f"Document processing not implemented for {file_record.file_type}")
            extracted_text = None
        
        if not extracted_text:
            logger.warning(f"No text extracted from file {file_id}")
            # Update file status
            file_record.processing_status = 'no_content'
            db.session.commit()
            return True
        
        # Clean the extracted text
        cleaned_text = clean_text(extracted_text)
        
        # Update file with extracted text
        file_record.extracted_text = cleaned_text[:5000]  # Store first 5000 chars for preview
        file_record.processing_status = 'processing'
        db.session.commit()
        
        # Create semantic chunks
        chunker = SemanticChunker(
            max_chunk_size=1000,
            min_chunk_size=200,
            overlap=50
        )
        
        chunks = chunker.chunk_content(cleaned_text)
        logger.info(f"Created {len(chunks)} chunks for file {file_id}")
        
        # Store chunks in database
        # The database trigger will automatically queue embedding generation
        for idx, chunk_text in enumerate(chunks):
            chunk = FileChunk(
                file_id=file_id,
                chunk_index=idx,
                content=chunk_text,  # This will trigger automatic embedding!
                chunk_metadata={
                    'file_type': file_record.file_type,
                    'chunk_number': idx + 1,
                    'total_chunks': len(chunks)
                }
            )
            db.session.add(chunk)
        
        # Update file status
        file_record.processing_status = 'completed'
        file_record.chunk_count = len(chunks)
        db.session.commit()
        
        logger.info(f"Successfully processed file {file_id} with {len(chunks)} chunks")
        return True
        
    except Exception as e:
        logger.error(f"Error processing file {file_id}: {str(e)}", exc_info=True)
        
        # Update file status
        try:
            file_record = db.session.query(File).filter_by(id=file_id).first()
            if file_record:
                file_record.processing_status = 'failed'
                file_record.processing_error = str(e)
                db.session.commit()
        except:
            pass
        
        return False


def extract_pdf_text(pdf_data: bytes) -> str:
    """Extract text from PDF data"""
    try:
        pdf_reader = PyPDF2.PdfReader(io.BytesIO(pdf_data))
        text_content = []
        
        for page_num in range(len(pdf_reader.pages)):
            page = pdf_reader.pages[page_num]
            text = page.extract_text()
            if text:
                text_content.append(text)
        
        return '\n'.join(text_content)
        
    except Exception as e:
        logger.error(f"Error extracting PDF text: {str(e)}")
        raise


def reprocess_file(file_id: str) -> bool:
    """Reprocess a file (useful for fixing failed processing)"""
    try:
        # Delete existing chunks
        db.session.query(FileChunk).filter_by(file_id=file_id).delete()
        db.session.commit()
        
        # Reprocess the file
        return process_file_content(file_id)
        
    except Exception as e:
        logger.error(f"Error reprocessing file {file_id}: {str(e)}")
        return False