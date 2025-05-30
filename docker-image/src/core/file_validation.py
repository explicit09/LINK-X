"""File Upload Validation and Security"""
import os
import magic
import hashlib
from pathlib import Path
from typing import List, Tuple, Optional
from werkzeug.datastructures import FileStorage
from werkzeug.utils import secure_filename
import logging

logger = logging.getLogger(__name__)


class FileValidator:
    """Secure file upload validation"""
    
    # Safe file extensions and their MIME types
    ALLOWED_EXTENSIONS = {
        # Documents
        'pdf': ['application/pdf'],
        'doc': ['application/msword'],
        'docx': ['application/vnd.openxmlformats-officedocument.wordprocessingml.document'],
        'txt': ['text/plain'],
        'rtf': ['application/rtf', 'text/rtf'],
        
        # Spreadsheets
        'xls': ['application/vnd.ms-excel'],
        'xlsx': ['application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'],
        'csv': ['text/csv', 'application/csv'],
        
        # Presentations
        'ppt': ['application/vnd.ms-powerpoint'],
        'pptx': ['application/vnd.openxmlformats-officedocument.presentationml.presentation'],
        
        # Images (limited for safety)
        'jpg': ['image/jpeg'],
        'jpeg': ['image/jpeg'],
        'png': ['image/png'],
        'gif': ['image/gif'],
        'webp': ['image/webp'],
        
        # Data formats
        'json': ['application/json'],
        'xml': ['application/xml', 'text/xml'],
        
        # Audio formats
        'mp3': ['audio/mpeg', 'audio/mp3'],
        'wav': ['audio/wav', 'audio/x-wav', 'audio/wave'],
        'm4a': ['audio/mp4', 'audio/x-m4a'],
        'ogg': ['audio/ogg'],
        'flac': ['audio/flac'],
    }
    
    # Maximum file sizes by extension (in bytes)
    MAX_FILE_SIZES = {
        'default': 10 * 1024 * 1024,      # 10MB default
        'pdf': 50 * 1024 * 1024,          # 50MB for PDFs
        'doc': 20 * 1024 * 1024,          # 20MB for Word docs
        'docx': 20 * 1024 * 1024,
        'ppt': 100 * 1024 * 1024,         # 100MB for presentations
        'pptx': 100 * 1024 * 1024,
        'jpg': 5 * 1024 * 1024,           # 5MB for images
        'jpeg': 5 * 1024 * 1024,
        'png': 5 * 1024 * 1024,
        'gif': 2 * 1024 * 1024,           # 2MB for GIFs
        'csv': 50 * 1024 * 1024,          # 50MB for CSVs
        'xlsx': 20 * 1024 * 1024,         # 20MB for Excel
        'mp3': 50 * 1024 * 1024,          # 50MB for MP3
        'wav': 100 * 1024 * 1024,         # 100MB for WAV
        'm4a': 50 * 1024 * 1024,          # 50MB for M4A
        'ogg': 50 * 1024 * 1024,          # 50MB for OGG
        'flac': 100 * 1024 * 1024,        # 100MB for FLAC
    }
    
    # Dangerous content patterns
    DANGEROUS_PATTERNS = [
        b'<script',  # JavaScript
        b'javascript:',  # JavaScript protocol
        b'eval(',  # Eval function
        b'exec(',  # Exec function
        b'__import__',  # Python import
        b'subprocess',  # System calls
        b'os.system',  # System calls
        b'<?php',  # PHP code
        b'<%',  # ASP code
    ]
    
    def __init__(self, upload_folder: str = '/tmp/uploads'):
        self.upload_folder = Path(upload_folder)
        self.upload_folder.mkdir(parents=True, exist_ok=True)
        
        # Initialize magic for MIME type detection
        self.mime_detector = magic.Magic(mime=True)
    
    def validate_file(self, file: FileStorage) -> Tuple[bool, Optional[str], Optional[dict]]:
        """
        Validate uploaded file for security
        
        Returns:
            Tuple of (is_valid, error_message, file_info)
        """
        if not file or not file.filename:
            return False, "No file provided", None
        
        # Secure the filename
        filename = secure_filename(file.filename)
        if not filename:
            return False, "Invalid filename", None
        
        # Check extension
        ext = self._get_extension(filename)
        if not ext or ext not in self.ALLOWED_EXTENSIONS:
            return False, f"File type '.{ext}' not allowed", None
        
        # Check file size
        file.seek(0, os.SEEK_END)
        file_size = file.tell()
        file.seek(0)  # Reset to beginning
        
        max_size = self.MAX_FILE_SIZES.get(ext, self.MAX_FILE_SIZES['default'])
        if file_size > max_size:
            return False, f"File too large. Maximum size: {max_size // (1024*1024)}MB", None
        
        if file_size == 0:
            return False, "Empty file not allowed", None
        
        # Read file content for validation
        content = file.read(8192)  # Read first 8KB
        file.seek(0)  # Reset again
        
        # Check MIME type
        mime_type = self.mime_detector.from_buffer(content)
        allowed_mimes = self.ALLOWED_EXTENSIONS.get(ext, [])
        if mime_type not in allowed_mimes:
            return False, f"File content doesn't match extension. Expected {ext}, got {mime_type}", None
        
        # Check for dangerous patterns
        for pattern in self.DANGEROUS_PATTERNS:
            if pattern in content.lower():
                return False, "File contains potentially malicious content", None
        
        # Calculate file hash
        file_hash = self._calculate_hash(file)
        file.seek(0)
        
        # Prepare file info
        file_info = {
            'filename': filename,
            'original_filename': file.filename,
            'extension': ext,
            'mime_type': mime_type,
            'size': file_size,
            'hash': file_hash,
            'secure_filename': filename
        }
        
        return True, None, file_info
    
    def save_file(self, file: FileStorage, subfolder: Optional[str] = None) -> Tuple[bool, Optional[str], Optional[Path]]:
        """
        Validate and save file securely
        
        Returns:
            Tuple of (success, error_message, file_path)
        """
        # Validate first
        is_valid, error, file_info = self.validate_file(file)
        if not is_valid:
            return False, error, None
        
        # Create subfolder if specified
        save_dir = self.upload_folder
        if subfolder:
            save_dir = save_dir / secure_filename(subfolder)
            save_dir.mkdir(parents=True, exist_ok=True)
        
        # Generate unique filename using hash
        timestamp = hashlib.md5(str(os.time.time_ns()).encode()).hexdigest()[:8]
        filename = f"{timestamp}_{file_info['secure_filename']}"
        file_path = save_dir / filename
        
        try:
            # Save file
            file.save(str(file_path))
            
            # Set restrictive permissions
            os.chmod(file_path, 0o644)
            
            logger.info(f"File saved: {file_path} (size: {file_info['size']}, hash: {file_info['hash']})")
            return True, None, file_path
            
        except Exception as e:
            logger.error(f"Failed to save file: {e}")
            if file_path.exists():
                file_path.unlink()  # Clean up
            return False, f"Failed to save file: {str(e)}", None
    
    def _get_extension(self, filename: str) -> Optional[str]:
        """Get file extension safely"""
        if '.' not in filename:
            return None
        return filename.rsplit('.', 1)[1].lower()
    
    def _calculate_hash(self, file: FileStorage) -> str:
        """Calculate SHA-256 hash of file"""
        sha256_hash = hashlib.sha256()
        for chunk in iter(lambda: file.read(4096), b""):
            sha256_hash.update(chunk)
        return sha256_hash.hexdigest()
    
    def scan_for_viruses(self, file_path: Path) -> Tuple[bool, Optional[str]]:
        """
        Scan file for viruses (placeholder for ClamAV integration)
        
        Returns:
            Tuple of (is_clean, virus_name)
        """
        # TODO: Integrate with ClamAV or other antivirus
        # For now, just do basic checks
        try:
            with open(file_path, 'rb') as f:
                content = f.read(1024)  # Read first 1KB
                
                # Check for EICAR test virus signature
                if b'X5O!P%@AP[4\\PZX54(P^)7CC)7}$EICAR-STANDARD-ANTIVIRUS-TEST-FILE!$H+H*' in content:
                    return False, "EICAR-Test-Virus"
                    
            return True, None
            
        except Exception as e:
            logger.error(f"Error scanning file: {e}")
            return False, "scan-error"
    
    def cleanup_old_files(self, max_age_hours: int = 24):
        """Remove temporary files older than specified hours"""
        import time
        current_time = time.time()
        
        for file_path in self.upload_folder.rglob('*'):
            if file_path.is_file():
                file_age = current_time - file_path.stat().st_mtime
                if file_age > (max_age_hours * 3600):
                    try:
                        file_path.unlink()
                        logger.info(f"Cleaned up old file: {file_path}")
                    except Exception as e:
                        logger.error(f"Failed to delete old file {file_path}: {e}")


# Global validator instance
file_validator = FileValidator()