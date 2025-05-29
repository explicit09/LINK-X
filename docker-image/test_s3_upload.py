#!/usr/bin/env python3
"""
Test script to verify S3 storage is working correctly
"""
import sys
import os
sys.path.append('/app/src')

from io import BytesIO
from s3_storage import s3_storage

def test_s3_upload():
    """Test basic S3 upload functionality"""
    print("Testing S3 upload functionality...")
    
    # Create a test file
    test_content = b"This is a test file for S3 storage verification."
    test_file = BytesIO(test_content)
    
    try:
        # Test upload
        result = s3_storage.upload_file(
            file_obj=test_file,
            course_id="test-course-123",
            module_id="test-module-456", 
            file_id="test-file-789",
            filename="test-file.txt",
            content_type="text/plain"
        )
        
        print(f"✅ Upload successful!")
        print(f"   S3 Key: {result['s3_key']}")
        print(f"   S3 Bucket: {result['s3_bucket']}")
        print(f"   URL: {result['url']}")
        
        # Test download URL generation
        download_url = s3_storage.generate_presigned_url(
            s3_key=result['s3_key'],
            expiration=300
        )
        print(f"   Download URL: {download_url[:50]}...")
        
        # Clean up test file
        s3_storage.delete_file(result['s3_key'])
        print(f"✅ Test file cleaned up")
        
        return True
        
    except Exception as e:
        print(f"❌ S3 upload test failed: {str(e)}")
        return False

def check_environment():
    """Check S3 environment configuration"""
    print("Checking S3 environment configuration...")
    
    required_vars = {
        'USE_S3_STORAGE': os.getenv('USE_S3_STORAGE'),
        'AWS_ACCESS_KEY_ID': os.getenv('AWS_ACCESS_KEY_ID'),
        'AWS_SECRET_ACCESS_KEY': os.getenv('AWS_SECRET_ACCESS_KEY'),
        'S3_BUCKET_NAME': os.getenv('S3_BUCKET_NAME'),
        'AWS_REGION': os.getenv('AWS_REGION')
    }
    
    all_good = True
    for var, value in required_vars.items():
        if var == 'AWS_SECRET_ACCESS_KEY':
            # Don't print the secret, just check if it exists
            status = "✅ Set" if value else "❌ Missing"
            print(f"   {var}: {status}")
        else:
            status = "✅" if value else "❌"
            print(f"   {var}: {status} {value}")
        
        if not value:
            all_good = False
    
    return all_good

if __name__ == "__main__":
    print("🔍 S3 Storage Verification Test")
    print("=" * 40)
    
    # Check environment
    if not check_environment():
        print("\n❌ Environment configuration incomplete!")
        sys.exit(1)
    
    print("\n🧪 Running S3 upload test...")
    if test_s3_upload():
        print("\n✅ All tests passed! S3 storage is working correctly.")
        print("\n📋 Summary:")
        print("   • S3 storage is enabled")
        print("   • AWS credentials are configured")
        print("   • File uploads will go to S3")
        print("   • Database will only store metadata")
    else:
        print("\n❌ S3 tests failed!")
        sys.exit(1) 