"""
S3 Storage Service with Circuit Breaker Protection
Provides resilient S3 operations with fallback mechanisms
"""

import os
import boto3
from botocore.exceptions import ClientError
from typing import Optional, Dict, BinaryIO
import logging
from datetime import datetime
import mimetypes
from core.circuit_breaker import circuit_breaker, CircuitOpenError

logger = logging.getLogger(__name__)


class ResilientS3Storage:
    """S3 Storage with circuit breaker protection"""
    
    def __init__(self):
        # Configure the S3 client with explicit SigV4 authentication
        session = boto3.Session(
            aws_access_key_id=os.getenv('AWS_ACCESS_KEY_ID'),
            aws_secret_access_key=os.getenv('AWS_SECRET_ACCESS_KEY'),
            region_name=os.getenv('AWS_REGION', 'us-east-2')
        )
        self.s3_client = session.client(
            's3',
            config=boto3.session.Config(
                signature_version='s3v4',
                s3={'addressing_style': 'virtual'}
            )
        )
        self.bucket_name = os.getenv('S3_BUCKET_NAME', 'linkx-files')
        self.cloudfront_domain = os.getenv('CLOUDFRONT_DOMAIN')  # Optional CDN
        
    def _generate_s3_key(self, course_id: str, module_id: str, file_id: str, filename: str) -> str:
        """Generate a structured S3 key for file storage"""
        # Clean filename to be S3-safe
        safe_filename = filename.replace(' ', '_').replace('/', '-')
        return f"courses/{course_id}/modules/{module_id}/{file_id}/{safe_filename}"
    
    @circuit_breaker(
        name="s3_upload",
        failure_threshold=3,
        timeout=30,
        expected_exception=(ClientError, Exception)
    )
    def _s3_upload(self, file_obj: BinaryIO, s3_key: str, content_type: str, metadata: dict):
        """Internal S3 upload with circuit breaker"""
        self.s3_client.upload_fileobj(
            file_obj,
            self.bucket_name,
            s3_key,
            ExtraArgs={
                'ContentType': content_type,
                'Metadata': metadata
            }
        )
    
    def upload_file(self, file_obj: BinaryIO, course_id: str, module_id: str, 
                   file_id: str, filename: str, content_type: Optional[str] = None) -> Dict:
        """
        Upload a file to S3 with circuit breaker protection
        
        Returns:
            Dict with 's3_key', 's3_bucket', and 'url'
        """
        try:
            s3_key = self._generate_s3_key(course_id, module_id, file_id, filename)
            
            # Detect content type if not provided
            if not content_type:
                content_type, _ = mimetypes.guess_type(filename)
                if not content_type:
                    content_type = 'application/octet-stream'
            
            metadata = {
                'course_id': course_id,
                'module_id': module_id,
                'file_id': file_id,
                'uploaded_at': datetime.utcnow().isoformat()
            }
            
            # Upload with circuit breaker protection
            try:
                self._s3_upload(file_obj, s3_key, content_type, metadata)
                logger.info(f"Successfully uploaded file to S3: {s3_key}")
                
                return {
                    's3_key': s3_key,
                    's3_bucket': self.bucket_name,
                    'url': self._get_file_url(s3_key),
                    'fallback': False
                }
            except CircuitOpenError:
                logger.error(f"S3 circuit breaker open - upload failed for {filename}")
                # Return error response indicating temporary failure
                return {
                    'error': 'S3 service temporarily unavailable',
                    'retry_after': 30,
                    'fallback': True
                }
                
        except Exception as e:
            logger.error(f"Failed to upload file: {str(e)}")
            raise
    
    @circuit_breaker(
        name="s3_presigned_url",
        failure_threshold=5,
        timeout=60,
        expected_exception=(ClientError, Exception)
    )
    def _generate_presigned_url_internal(self, s3_key: str, expiration: int, 
                                       response_params: Optional[dict] = None) -> str:
        """Internal presigned URL generation with circuit breaker"""
        params = {
            'Bucket': self.bucket_name,
            'Key': s3_key
        }
        
        if response_params:
            params.update(response_params)
        
        return self.s3_client.generate_presigned_url(
            'get_object',
            Params=params,
            ExpiresIn=expiration
        )
    
    def generate_presigned_url(self, s3_key: str, expiration: int = 3600, 
                             download: bool = False) -> str:
        """
        Generate a presigned URL with circuit breaker protection
        
        Args:
            s3_key: The S3 key of the file
            expiration: URL expiration time in seconds (default 1 hour)
            download: If True, forces download instead of inline display
            
        Returns:
            Presigned URL string or CDN URL if circuit is open
        """
        try:
            response_params = {}
            if download:
                filename = os.path.basename(s3_key)
                response_params['ResponseContentDisposition'] = f'attachment; filename="{filename}"'
            
            # Try to generate presigned URL with circuit breaker
            try:
                return self._generate_presigned_url_internal(s3_key, expiration, response_params)
            except CircuitOpenError:
                # Fallback to CDN URL if available
                if self.cloudfront_domain and not download:
                    logger.warning(f"S3 circuit open, falling back to CDN for {s3_key}")
                    return f"https://{self.cloudfront_domain}/{s3_key}"
                raise
                
        except Exception as e:
            logger.error(f"Failed to generate presigned URL: {str(e)}")
            # Return public URL as last resort (if bucket allows)
            return f"https://{self.bucket_name}.s3.amazonaws.com/{s3_key}"
    
    @circuit_breaker(
        name="s3_download",
        failure_threshold=3,
        timeout=30,
        expected_exception=(ClientError, Exception)
    )
    def download_file(self, s3_key: str) -> bytes:
        """
        Download a file from S3 with circuit breaker protection
        
        Args:
            s3_key: The S3 key of the file to download
            
        Returns:
            File contents as bytes
        """
        response = self.s3_client.get_object(
            Bucket=self.bucket_name,
            Key=s3_key
        )
        return response['Body'].read()
    
    @circuit_breaker(
        name="s3_delete",
        failure_threshold=3,
        timeout=30,
        expected_exception=(ClientError, Exception)
    )
    def delete_file(self, s3_key: str) -> bool:
        """
        Delete a file from S3 with circuit breaker protection
        
        Args:
            s3_key: The S3 key of the file to delete
            
        Returns:
            True if successful
        """
        self.s3_client.delete_object(
            Bucket=self.bucket_name,
            Key=s3_key
        )
        logger.info(f"Deleted file from S3: {s3_key}")
        return True
    
    @circuit_breaker(
        name="s3_health_check",
        failure_threshold=2,
        timeout=120,
        expected_exception=(ClientError, Exception)
    )
    def health_check(self) -> bool:
        """Check S3 connectivity with circuit breaker"""
        # Try to list bucket (with max 1 key to minimize load)
        self.s3_client.list_objects_v2(
            Bucket=self.bucket_name,
            MaxKeys=1
        )
        return True
    
    def _get_file_url(self, s3_key: str) -> str:
        """Get the URL for accessing a file"""
        if self.cloudfront_domain:
            return f"https://{self.cloudfront_domain}/{s3_key}"
        return f"https://{self.bucket_name}.s3.amazonaws.com/{s3_key}"
    
    def get_circuit_breaker_stats(self) -> dict:
        """Get statistics for all S3 circuit breakers"""
        stats = {}
        for method_name in ['_s3_upload', '_generate_presigned_url_internal', 
                           'download_file', 'delete_file', 'health_check']:
            method = getattr(self, method_name, None)
            if method and hasattr(method, 'get_stats'):
                stats[method_name] = method.get_stats()
        return stats