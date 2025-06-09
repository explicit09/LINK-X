#!/usr/bin/env python3
"""
Test script to manually trigger file processing
"""
import sys
import os

# Add the docker-image/src directory to Python path
sys.path.insert(0, os.path.join(os.path.dirname(__file__), 'docker-image', 'src'))

def test_file_processing():
    """Test file processing directly"""
    try:
        # Import the processing function
        from tasks.enhanced_file_processing import process_file_with_semantic_chunking
        
        # Test file ID from our database
        file_id = "fc3ecd8e-07ca-4a69-85c4-02734270c07c"
        
        print(f"🔄 Testing file processing for file: {file_id}")
        
        # Create a mock task instance
        class MockTask:
            def __init__(self):
                self.request = type('obj', (object,), {'retries': 0})()
            
            def retry(self, exc=None, countdown=60):
                print(f"❌ Task would retry: {exc}")
                raise exc
        
        # Run the task function directly
        mock_task = MockTask()
        result = process_file_with_semantic_chunking.run(file_id, force=True)
        
        print(f"✅ Processing result: {result}")
        return result
        
    except Exception as e:
        print(f"❌ Error during processing: {e}")
        import traceback
        traceback.print_exc()
        return None

if __name__ == "__main__":
    test_file_processing() 