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
    'CORSRules': [{
        'AllowedHeaders': ['*'],
        'AllowedMethods': ['GET', 'POST', 'PUT', 'DELETE', 'HEAD'],
        'AllowedOrigins': [
            'http://localhost:3000',
            'http://localhost:3001', 
            'http://localhost:3002',
            'https://localhost:3000',
            'https://localhost:3001',
            'https://localhost:3002',
            '*'  # For development - remove in production
        ],
        'ExposeHeaders': ['ETag', 'Content-Length', 'Content-Type'],
        'MaxAgeSeconds': 3000
    }]
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