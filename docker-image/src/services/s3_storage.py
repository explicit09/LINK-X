import os
import boto3
from botocore.exceptions import ClientError
from typing import Optional, Dict, BinaryIO
import logging
from datetime import datetime
import mimetypes

logger = logging.getLogger(__name__)

class S3Storage:
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
    
    def upload_file(self, file_obj: BinaryIO, course_id: str, module_id: str, 
                   file_id: str, filename: str, content_type: Optional[str] = None) -> Dict:
        """
        Upload a file to S3 and return the S3 key and URL
        
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
            
            # Upload to S3 with metadata
            self.s3_client.upload_fileobj(
                file_obj,
                self.bucket_name,
                s3_key,
                ExtraArgs={
                    'ContentType': content_type,
                    'Metadata': {
                        'course_id': course_id,
                        'module_id': module_id,
                        'file_id': file_id,
                        'uploaded_at': datetime.utcnow().isoformat()
                    }
                }
            )
            
            logger.info(f"Successfully uploaded file to S3: {s3_key}")
            
            return {
                's3_key': s3_key,
                's3_bucket': self.bucket_name,
                'url': self._get_file_url(s3_key)
            }
            
        except ClientError as e:
            logger.error(f"Failed to upload file to S3: {str(e)}")
            raise Exception(f"S3 upload failed: {str(e)}")
    
    def generate_presigned_url(self, s3_key: str, expiration: int = 3600, 
                             download: bool = False) -> str:
        """
        Generate a presigned URL for secure file access
        
        Args:
            s3_key: The S3 key of the file
            expiration: URL expiration time in seconds (default 1 hour)
            download: If True, forces download instead of inline display
            
        Returns:
            Presigned URL string
        """
        try:
            # Create a new client with explicit region configuration
            session = boto3.Session(
                aws_access_key_id=os.getenv('AWS_ACCESS_KEY_ID'),
                aws_secret_access_key=os.getenv('AWS_SECRET_ACCESS_KEY'),
                region_name=os.getenv('AWS_REGION', 'us-east-2')
            )
            s3_client = session.client(
                's3',
                config=boto3.session.Config(
                    signature_version='s3v4',
                    s3={'addressing_style': 'virtual'}
                )
            )
            
            params = {
                'Bucket': self.bucket_name,
                'Key': s3_key
            }
            
            # Set content disposition for download if requested
            if download:
                filename = os.path.basename(s3_key)
                params['ResponseContentDisposition'] = f'attachment; filename="{filename}"'
            
            url = s3_client.generate_presigned_url(
                'get_object',
                Params=params,
                ExpiresIn=expiration
            )
            
            return url
            
        except ClientError as e:
            logger.error(f"Failed to generate presigned URL: {str(e)}")
            raise Exception(f"Presigned URL generation failed: {str(e)}")
    
    def generate_upload_url(self, course_id: str, module_id: str, file_id: str, 
                          filename: str, content_type: str, expiration: int = 3600) -> Dict:
        """
        Generate a presigned POST URL for direct browser uploads
        
        Returns:
            Dict with 'url' and 'fields' for form POST
        """
        try:
            s3_key = self._generate_s3_key(course_id, module_id, file_id, filename)
            
            # Generate presigned POST data
            response = self.s3_client.generate_presigned_post(
                Bucket=self.bucket_name,
                Key=s3_key,
                Fields={
                    'Content-Type': content_type,
                    'x-amz-meta-course_id': course_id,
                    'x-amz-meta-module_id': module_id,
                    'x-amz-meta-file_id': file_id
                },
                Conditions=[
                    {'Content-Type': content_type},
                    ['content-length-range', 0, 100 * 1024 * 1024]  # Max 100MB
                ],
                ExpiresIn=expiration
            )
            
            return {
                'upload_url': response['url'],
                'upload_fields': response['fields'],
                's3_key': s3_key
            }
            
        except ClientError as e:
            logger.error(f"Failed to generate upload URL: {str(e)}")
            raise Exception(f"Upload URL generation failed: {str(e)}")
    
    def delete_file(self, s3_key: str) -> bool:
        """Delete a file from S3"""
        try:
            self.s3_client.delete_object(
                Bucket=self.bucket_name,
                Key=s3_key
            )
            logger.info(f"Successfully deleted file from S3: {s3_key}")
            return True
            
        except ClientError as e:
            logger.error(f"Failed to delete file from S3: {str(e)}")
            return False
    
    def copy_file(self, source_key: str, dest_key: str) -> bool:
        """Copy a file within S3 (useful for backups or versions)"""
        try:
            copy_source = {'Bucket': self.bucket_name, 'Key': source_key}
            self.s3_client.copy_object(
                CopySource=copy_source,
                Bucket=self.bucket_name,
                Key=dest_key
            )
            return True
            
        except ClientError as e:
            logger.error(f"Failed to copy file in S3: {str(e)}")
            return False
    
    def get_file_metadata(self, s3_key: str) -> Optional[Dict]:
        """Get file metadata from S3"""
        try:
            response = self.s3_client.head_object(
                Bucket=self.bucket_name,
                Key=s3_key
            )
            
            return {
                'size': response['ContentLength'],
                'content_type': response['ContentType'],
                'last_modified': response['LastModified'],
                'metadata': response.get('Metadata', {})
            }
            
        except ClientError as e:
            logger.error(f"Failed to get file metadata: {str(e)}")
            return None
    
    def download_file(self, s3_key: str) -> Optional[bytes]:
        """Download file content from S3"""
        try:
            response = self.s3_client.get_object(
                Bucket=self.bucket_name,
                Key=s3_key
            )
            
            file_content = response['Body'].read()
            logger.info(f"Successfully downloaded file from S3: {s3_key}")
            return file_content
            
        except ClientError as e:
            logger.error(f"Failed to download file from S3: {str(e)}")
            return None
    
    def _get_file_url(self, s3_key: str) -> str:
        """
        Generate a pre-signed URL for secure file access
        
        Args:
            s3_key: The S3 key of the file
            
        Returns:
            Pre-signed URL string with 1-hour expiration
        """
        try:
            # Create a new client with explicit region configuration
            session = boto3.Session(
                aws_access_key_id=os.getenv('AWS_ACCESS_KEY_ID'),
                aws_secret_access_key=os.getenv('AWS_SECRET_ACCESS_KEY'),
                region_name=os.getenv('AWS_REGION', 'us-east-2')
            )
            s3_client = session.client(
                's3',
                config=boto3.session.Config(
                    signature_version='s3v4',
                    s3={'addressing_style': 'virtual'}
                )
            )
            
            # Generate a pre-signed URL for the S3 object
            url = s3_client.generate_presigned_url(
                'get_object',
                Params={
                    'Bucket': self.bucket_name,
                    'Key': s3_key,
                    'ResponseContentDisposition': 'inline',  # Display in browser
                    'ResponseContentType': 'application/pdf'  # Set appropriate content type
                },
                ExpiresIn=3600  # 1 hour expiration
            )
            
            # If using CloudFront, replace the domain
            if self.cloudfront_domain:
                from urllib.parse import urlparse, urlunparse
                parsed = urlparse(url)
                # Replace the netloc with CloudFront domain and reconstruct the URL
                cloudfront_url = urlunparse((
                    parsed.scheme,
                    self.cloudfront_domain,
                    parsed.path,
                    parsed.params,
                    parsed.query,
                    parsed.fragment
                ))
                return cloudfront_url
                
            return url
            
        except Exception as e:
            logger.error(f"Failed to generate pre-signed URL: {str(e)}")
            # Fallback to direct URL if pre-signed URL generation fails
            region = os.getenv('AWS_REGION', 'us-east-2')
            return f"https://{self.bucket_name}.s3.{region}.amazonaws.com/{s3_key}"
    
    def create_bucket_if_not_exists(self):
        """Create S3 bucket if it doesn't exist (for initial setup)"""
        try:
            self.s3_client.head_bucket(Bucket=self.bucket_name)
            logger.info(f"Bucket {self.bucket_name} already exists")
        except ClientError as e:
            if e.response['Error']['Code'] == '404':
                try:
                    if os.getenv('AWS_REGION', 'us-east-1') == 'us-east-1':
                        self.s3_client.create_bucket(Bucket=self.bucket_name)
                    else:
                        self.s3_client.create_bucket(
                            Bucket=self.bucket_name,
                            CreateBucketConfiguration={
                                'LocationConstraint': os.getenv('AWS_REGION')
                            }
                        )
                    logger.info(f"Created bucket {self.bucket_name}")
                    
                    # Set bucket CORS for browser uploads
                    self.s3_client.put_bucket_cors(
                        Bucket=self.bucket_name,
                        CORSConfiguration={
                            'CORSRules': [{
                                'AllowedHeaders': ['*'],
                                'AllowedMethods': ['GET', 'POST', 'PUT'],
                                'AllowedOrigins': ['*'],  # Configure this for production
                                'ExposeHeaders': ['ETag']
                            }]
                        }
                    )
                except ClientError as create_error:
                    logger.error(f"Failed to create bucket: {str(create_error)}")
                    raise

# Global instance
s3_storage = S3Storage()