#!/usr/bin/env python3
"""
S3 Test Files Cleanup Script

This script identifies and removes test files from the S3 bucket.
It looks for common test file patterns and requires manual confirmation before deletion.
"""
import os
import boto3
from botocore.exceptions import ClientError
from dotenv import load_dotenv
from datetime import datetime, timedelta

def get_s3_client():
    """Initialize and return an S3 client with credentials from environment variables."""
    load_dotenv('src/.env')
    
    return boto3.client(
        's3',
        aws_access_key_id=os.getenv('AWS_ACCESS_KEY_ID'),
        aws_secret_access_key=os.getenv('AWS_SECRET_ACCESS_KEY'),
        region_name=os.getenv('AWS_REGION', 'us-east-1')
    )

def find_test_files(s3_client, bucket_name):
    """Find potential test files in the S3 bucket."""
    test_patterns = ['test-', 'test_', 'example', 'sample', 'temp_']
    test_files = []
    
    try:
        paginator = s3_client.get_paginator('list_objects_v2')
        for page in paginator.paginate(Bucket=bucket_name):
            if 'Contents' in page:
                for obj in page['Contents']:
                    key = obj['Key'].lower()
                    if any(pattern in key for pattern in test_patterns):
                        test_files.append({
                            'Key': obj['Key'],
                            'Size': obj['Size'],
                            'LastModified': obj['LastModified']
                        })
    except ClientError as e:
        print(f"❌ Error listing bucket contents: {e}")
        return []
    
    return test_files

def delete_files(s3_client, bucket_name, files, force=False):
    """Delete the specified files from the S3 bucket."""
    if not files:
        print("No files to delete.")
        return
        
    print("\nThe following files will be deleted:")
    for i, file in enumerate(files, 1):
        print(f"{i}. {file['Key']} (Size: {file['Size']:,} bytes, Last Modified: {file['LastModified']})")
    
    if not force:
        try:
            confirm = input("\nAre you sure you want to delete these files? (yes/no): ")
            if confirm.lower() != 'yes':
                print("Operation cancelled by user.")
                return
        except EOFError:
            print("\nRunning in non-interactive mode. Use --force to delete files without confirmation.")
            return
    
    deleted = 0
    for file in files:
        try:
            s3_client.delete_object(Bucket=bucket_name, Key=file['Key'])
            print(f"✅ Deleted: {file['Key']}")
            deleted += 1
        except ClientError as e:
            print(f"❌ Failed to delete {file['Key']}: {e}")
    
    print(f"\nDeleted {deleted} out of {len(files)} files.")

def parse_arguments():
    """Parse command line arguments."""
    import argparse
    parser = argparse.ArgumentParser(description='Clean up test files in S3 bucket')
    parser.add_argument('--force', action='store_true', help='Delete files without confirmation')
    return parser.parse_args()

def main():
    """Main function to execute the cleanup process."""
    try:
        args = parse_arguments()
        # Initialize S3 client
        s3 = get_s3_client()
        bucket_name = os.getenv('S3_BUCKET_NAME')
        
        if not bucket_name:
            print("❌ Error: S3_BUCKET_NAME not found in environment variables")
            return
        
        print(f"🔍 Searching for test files in bucket: {bucket_name}")
        
        # Find test files
        test_files = find_test_files(s3, bucket_name)
        
        if not test_files:
            print("✅ No test files found in the bucket.")
            return
        
        print(f"\nFound {len(test_files)} potential test files:")
        for i, file in enumerate(test_files, 1):
            print(f"{i}. {file['Key']} (Size: {file['Size']:,} bytes)")
        
        # Delete files after confirmation
        if args.force:
            print("\nRunning in non-interactive mode. The following files will be deleted:")
            for file in test_files:
                print(f"- {file['Key']} (Size: {file['Size']:,} bytes)")
        delete_files(s3, bucket_name, test_files, force=args.force)
        
    except Exception as e:
        print(f"❌ An error occurred: {e}")

if __name__ == "__main__":
    main()
