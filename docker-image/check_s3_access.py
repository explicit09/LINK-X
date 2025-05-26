#!/usr/bin/env python3
import os
import boto3
from botocore.exceptions import ClientError
from dotenv import load_dotenv
from datetime import datetime

def check_s3_access():
    # Load environment variables
    load_dotenv('src/.env')
    
    # Get S3 configuration from environment
    aws_access_key_id = os.getenv('AWS_ACCESS_KEY_ID')
    aws_secret_access_key = os.getenv('AWS_SECRET_ACCESS_KEY')
    bucket_name = os.getenv('S3_BUCKET_NAME')
    region = os.getenv('AWS_REGION', 'us-east-1')
    
    if not all([aws_access_key_id, aws_secret_access_key, bucket_name]):
        print("❌ Error: Missing required S3 configuration in environment variables")
        return
    
    try:
        # Initialize S3 client
        s3 = boto3.client(
            's3',
            aws_access_key_id=aws_access_key_id,
            aws_secret_access_key=aws_secret_access_key,
            region_name=region
        )
        
        print(f"🔍 Checking access to S3 bucket: {bucket_name}")
        print("=" * 50)
        
        # List all objects in the bucket
        print("📂 Listing objects in the bucket...")
        objects = []
        paginator = s3.get_paginator('list_objects_v2')
        
        for page in paginator.paginate(Bucket=bucket_name):
            if 'Contents' in page:
                for obj in page['Contents']:
                    objects.append({
                        'Key': obj['Key'],
                        'Size': obj['Size'],
                        'LastModified': obj['LastModified']
                    })
        
        if not objects:
            print("ℹ️  No objects found in the bucket")
            return
        
        print(f"✅ Found {len(objects)} objects in the bucket")
        print("\n🔍 Verifying access to each file...")
        print("-" * 50)
        
        # Check access to each object
        accessible = 0
        for obj in objects:
            key = obj['Key']
            try:
                # Try to get the object's metadata
                s3.head_object(Bucket=bucket_name, Key=key)
                print(f"✅ Accessible: {key} (Size: {obj['Size']:,} bytes, Last Modified: {obj['LastModified']})")
                accessible += 1
            except ClientError as e:
                error_code = e.response.get('Error', {}).get('Code', 'Unknown')
                print(f"❌ Access denied: {key} - {error_code}")
        
        # Print summary
        print("\n" + "=" * 50)
        print(f"📊 Access Summary:")
        print(f"   Total objects: {len(objects)}")
        print(f"   Accessible: {accessible}")
        print(f"   Access denied: {len(objects) - accessible}")
        
    except ClientError as e:
        print(f"❌ Error accessing S3: {e}")
    except Exception as e:
        print(f"❌ Unexpected error: {e}")

if __name__ == "__main__":
    check_s3_access()
