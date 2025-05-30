"""S3 Signed URL Service for Secure File Access"""
import boto3
from botocore.exceptions import ClientError
from datetime import datetime, timedelta
from typing import Optional, Dict, Any, List
from urllib.parse import urlparse, quote
import hashlib
import logging
import os

from core.config import settings
from core.cache import cache

logger = logging.getLogger(__name__)


class S3SignedURLService:
    """Service for generating and managing S3 signed URLs"""
    
    def __init__(self):
        self.s3_client = boto3.client(
            's3',
            aws_access_key_id=settings.AWS_ACCESS_KEY_ID,
            aws_secret_access_key=settings.AWS_SECRET_ACCESS_KEY,
            region_name=settings.AWS_S3_REGION
        )
        self.bucket_name = settings.AWS_S3_BUCKET_NAME
        self.cloudfront_domain = os.getenv('CLOUDFRONT_DOMAIN')
        self.cloudfront_key_pair_id = os.getenv('CLOUDFRONT_KEY_PAIR_ID')
        self.cloudfront_private_key = os.getenv('CLOUDFRONT_PRIVATE_KEY')
        
    def generate_download_url(
        self,
        s3_key: str,
        filename: Optional[str] = None,
        expires_in: int = 3600,
        user_id: Optional[str] = None
    ) -> str:
        """
        Generate a signed URL for downloading a file
        
        Args:
            s3_key: S3 object key
            filename: Optional filename for Content-Disposition
            expires_in: URL expiration time in seconds (default 1 hour)
            user_id: Optional user ID for access logging
            
        Returns:
            Signed URL string
        """
        # Check cache first
        cache_key = f"s3_url:{s3_key}:{user_id}:{expires_in}"
        cached_url = cache.get(cache_key)
        if cached_url:
            return cached_url
        
        try:
            # Generate response headers
            response_params = {}
            if filename:
                # Properly encode filename for Content-Disposition
                safe_filename = quote(filename.encode('utf-8'))
                response_params['ResponseContentDisposition'] = f'attachment; filename="{safe_filename}"'
            
            # Add security headers
            response_params['ResponseCacheControl'] = 'private, no-cache'
            
            # Generate signed URL
            if self.cloudfront_domain:
                # Use CloudFront for better performance
                url = self._generate_cloudfront_signed_url(
                    s3_key, expires_in, response_params
                )
            else:
                # Direct S3 signed URL
                url = self.s3_client.generate_presigned_url(
                    'get_object',
                    Params={
                        'Bucket': self.bucket_name,
                        'Key': s3_key,
                        **response_params
                    },
                    ExpiresIn=expires_in
                )
            
            # Cache the URL (with shorter TTL than expiration)
            cache_ttl = min(expires_in - 60, 3600)  # 1 hour max cache
            if cache_ttl > 0:
                cache.set(cache_key, url, cache_ttl)
            
            # Log access
            if user_id:
                self._log_access(user_id, s3_key, 'download')
            
            return url
            
        except ClientError as e:
            logger.error(f"Failed to generate download URL for {s3_key}: {e}")
            raise
    
    def generate_upload_url(
        self,
        s3_key: str,
        content_type: str,
        content_length_range: Optional[List[int]] = None,
        expires_in: int = 300,
        user_id: Optional[str] = None
    ) -> Dict[str, Any]:
        """
        Generate a signed URL for uploading a file
        
        Args:
            s3_key: S3 object key
            content_type: MIME type of the file
            content_length_range: [min, max] file size in bytes
            expires_in: URL expiration time in seconds (default 5 minutes)
            user_id: Optional user ID for access logging
            
        Returns:
            Dict with URL and required headers
        """
        try:
            # Build conditions for the policy
            conditions = [
                {'bucket': self.bucket_name},
                {'key': s3_key},
                {'Content-Type': content_type},
                ['starts-with', '$x-amz-meta-', ''],  # Allow metadata
            ]
            
            # Add content length restriction
            if content_length_range:
                conditions.append(
                    ['content-length-range', content_length_range[0], content_length_range[1]]
                )
            
            # Generate presigned POST
            response = self.s3_client.generate_presigned_post(
                Bucket=self.bucket_name,
                Key=s3_key,
                Fields={
                    'Content-Type': content_type,
                    'x-amz-meta-uploaded-by': user_id or 'anonymous'
                },
                Conditions=conditions,
                ExpiresIn=expires_in
            )
            
            # Log access
            if user_id:
                self._log_access(user_id, s3_key, 'upload')
            
            return {
                'url': response['url'],
                'fields': response['fields'],
                'expires_at': datetime.utcnow() + timedelta(seconds=expires_in)
            }
            
        except ClientError as e:
            logger.error(f"Failed to generate upload URL for {s3_key}: {e}")
            raise
    
    def generate_streaming_url(
        self,
        s3_key: str,
        expires_in: int = 7200,
        user_id: Optional[str] = None
    ) -> str:
        """
        Generate a signed URL optimized for streaming (video/audio)
        
        Args:
            s3_key: S3 object key
            expires_in: URL expiration time in seconds (default 2 hours)
            user_id: Optional user ID for access logging
            
        Returns:
            Signed URL string
        """
        try:
            # Use longer expiration for streaming
            url = self.s3_client.generate_presigned_url(
                'get_object',
                Params={
                    'Bucket': self.bucket_name,
                    'Key': s3_key,
                    'ResponseCacheControl': 'public, max-age=3600',
                    'ResponseContentType': 'video/mp4'  # Adjust based on actual type
                },
                ExpiresIn=expires_in
            )
            
            # Log access
            if user_id:
                self._log_access(user_id, s3_key, 'stream')
            
            return url
            
        except ClientError as e:
            logger.error(f"Failed to generate streaming URL for {s3_key}: {e}")
            raise
    
    def batch_generate_urls(
        self,
        s3_keys: List[str],
        expires_in: int = 3600,
        user_id: Optional[str] = None
    ) -> Dict[str, str]:
        """
        Generate signed URLs for multiple files at once
        
        Args:
            s3_keys: List of S3 object keys
            expires_in: URL expiration time in seconds
            user_id: Optional user ID for access logging
            
        Returns:
            Dict mapping s3_key to signed URL
        """
        urls = {}
        
        for s3_key in s3_keys:
            try:
                urls[s3_key] = self.generate_download_url(
                    s3_key, expires_in=expires_in, user_id=user_id
                )
            except Exception as e:
                logger.error(f"Failed to generate URL for {s3_key}: {e}")
                urls[s3_key] = None
        
        return urls
    
    def revoke_url(self, s3_key: str, user_id: Optional[str] = None):
        """
        Revoke access to a signed URL by removing from cache
        
        Args:
            s3_key: S3 object key
            user_id: Optional user ID to revoke for specific user
        """
        # Remove from cache
        if user_id:
            cache_key = f"s3_url:{s3_key}:{user_id}:*"
        else:
            cache_key = f"s3_url:{s3_key}:*"
        
        # Note: This requires cache backend that supports pattern deletion
        cache.delete_pattern(cache_key)
        
        logger.info(f"Revoked URL access for {s3_key}")
    
    def _generate_cloudfront_signed_url(
        self,
        s3_key: str,
        expires_in: int,
        response_params: Dict
    ) -> str:
        """Generate CloudFront signed URL for better performance"""
        if not all([self.cloudfront_domain, self.cloudfront_key_pair_id, self.cloudfront_private_key]):
            # Fall back to S3 signed URL
            return self.s3_client.generate_presigned_url(
                'get_object',
                Params={
                    'Bucket': self.bucket_name,
                    'Key': s3_key,
                    **response_params
                },
                ExpiresIn=expires_in
            )
        
        # CloudFront URL construction
        base_url = f"https://{self.cloudfront_domain}/{s3_key}"
        expires = int((datetime.utcnow() + timedelta(seconds=expires_in)).timestamp())
        
        # Create CloudFront signed URL policy
        policy = {
            "Statement": [{
                "Resource": base_url,
                "Condition": {
                    "DateLessThan": {"AWS:EpochTime": expires}
                }
            }]
        }
        
        # Sign the policy
        from cryptography.hazmat.primitives import hashes, serialization
        from cryptography.hazmat.primitives.asymmetric import padding
        import base64
        import json
        
        policy_json = json.dumps(policy, separators=(',', ':'))
        policy_b64 = base64.b64encode(policy_json.encode()).decode()
        
        # Load private key and sign
        private_key = serialization.load_pem_private_key(
            self.cloudfront_private_key.encode(),
            password=None
        )
        
        signature = private_key.sign(
            policy_json.encode(),
            padding.PKCS1v15(),
            hashes.SHA1()
        )
        
        signature_b64 = base64.b64encode(signature).decode()
        
        # URL-safe encoding
        policy_b64 = policy_b64.replace('+', '-').replace('=', '_').replace('/', '~')
        signature_b64 = signature_b64.replace('+', '-').replace('=', '_').replace('/', '~')
        
        # Construct final URL
        signed_url = f"{base_url}?Policy={policy_b64}&Signature={signature_b64}&Key-Pair-Id={self.cloudfront_key_pair_id}"
        
        return signed_url
    
    def _log_access(self, user_id: str, s3_key: str, access_type: str):
        """Log file access for auditing"""
        # This could write to a database, CloudWatch, etc.
        logger.info(f"S3 access: user={user_id}, key={s3_key}, type={access_type}")
        
        # Optional: Store in database for analytics
        # from db.schema import FileAccessLog
        # log = FileAccessLog(
        #     user_id=user_id,
        #     s3_key=s3_key,
        #     access_type=access_type,
        #     accessed_at=datetime.utcnow()
        # )
        # db.session.add(log)
        # db.session.commit()


# Singleton instance
s3_signed_urls = S3SignedURLService()