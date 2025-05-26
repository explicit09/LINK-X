#!/usr/bin/env python3
"""Test S3 configuration and file upload/download"""
import os
import sys
sys.path.insert(0, './docker-image')

# Test imports
try:
    from src.s3_storage import s3_storage
    print("✓ S3 storage module imported successfully")
except ImportError as e:
    print(f"✗ Failed to import S3 storage: {e}")
    sys.exit(1)

# Check environment variables
print("\nChecking environment variables:")
env_vars = {
    'USE_S3_STORAGE': os.getenv('USE_S3_STORAGE', 'false'),
    'AWS_ACCESS_KEY_ID': 'SET' if os.getenv('AWS_ACCESS_KEY_ID') else 'NOT SET',
    'AWS_SECRET_ACCESS_KEY': 'SET' if os.getenv('AWS_SECRET_ACCESS_KEY') else 'NOT SET',
    'S3_BUCKET_NAME': os.getenv('S3_BUCKET_NAME', 'Not set'),
    'AWS_REGION': os.getenv('AWS_REGION', 'us-east-1')
}

for key, value in env_vars.items():
    print(f"  {key}: {value}")

# Test S3 connection if enabled
if os.getenv('USE_S3_STORAGE', 'false').lower() == 'true':
    print("\nTesting S3 connection...")
    try:
        # This will create bucket if it doesn't exist
        s3_storage.create_bucket_if_not_exists()
        print("✓ S3 connection successful")
        
        # Test file upload
        from io import BytesIO
        test_content = b"Test file content"
        test_result = s3_storage.upload_file(
            file_obj=BytesIO(test_content),
            course_id="test-course",
            module_id="test-module", 
            file_id="test-file",
            filename="test.txt",
            content_type="text/plain"
        )
        print(f"✓ Test upload successful: {test_result['s3_key']}")
        
        # Test presigned URL generation
        url = s3_storage.generate_presigned_url(test_result['s3_key'])
        print(f"✓ Presigned URL generated: {url[:50]}...")
        
        # Cleanup
        s3_storage.delete_file(test_result['s3_key'])
        print("✓ Test file deleted")
        
    except Exception as e:
        print(f"✗ S3 test failed: {e}")
else:
    print("\nS3 storage is disabled (USE_S3_STORAGE != true)")
    print("Files will be stored in the database")

print("\nCurrent storage mode:", "S3" if os.getenv('USE_S3_STORAGE', 'false').lower() == 'true' else "Database")