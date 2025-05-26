#!/usr/bin/env python3
import boto3
import os
from dotenv import load_dotenv

load_dotenv()

# Initialize S3 client
s3_client = boto3.client(
    's3',
    aws_access_key_id=os.getenv('AWS_ACCESS_KEY_ID'),
    aws_secret_access_key=os.getenv('AWS_SECRET_ACCESS_KEY'),
    region_name=os.getenv('AWS_REGION', 'us-east-1')
)

bucket_name = os.getenv('S3_BUCKET_NAME', 'learn-x')

# Update CORS configuration
cors_config = {
    'CORSRules': [
        {
            'AllowedHeaders': ['*'],
            'AllowedMethods': ['GET', 'HEAD', 'PUT', 'POST', 'DELETE'],
            'AllowedOrigins': [
                'http://localhost:3000',
                'http://localhost:3001',
                'http://localhost:3002',
                'http://localhost:3003',
                'http://127.0.0.1:3000',
                'http://127.0.0.1:3001',
                'http://127.0.0.1:3002',
                'http://127.0.0.1:3003',
                'http://localhost:49713'
            ],
            'ExposeHeaders': [
                'ETag',
                'Content-Length',
                'Content-Type',
                'x-amz-server-side-encryption',
                'x-amz-request-id',
                'x-amz-id-2',
                'x-amz-expiration',
                'x-amz-request-charged'
            ],
            'MaxAgeSeconds': 3000
        }
    ]
}

try:
    s3_client.put_bucket_cors(
        Bucket=bucket_name,
        CORSConfiguration=cors_config
    )
    print(f"✅ Successfully updated CORS configuration for bucket: {bucket_name}")
    
    # Verify the configuration
    response = s3_client.get_bucket_cors(Bucket=bucket_name)
    print("\nCurrent CORS configuration:")
    for rule in response['CORSRules']:
        print(f"  Allowed Origins: {rule.get('AllowedOrigins', [])}")
        print(f"  Allowed Methods: {rule.get('AllowedMethods', [])}")
        
except Exception as e:
    print(f"❌ Error updating CORS: {str(e)}")