#!/usr/bin/env python3
import os
import sys
import builtins
from dotenv import load_dotenv

# Add the src directory to the Python path
src_dir = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'src')
sys.path.insert(0, os.path.dirname(src_dir))  # Add the parent directory of src

# Load environment variables
load_dotenv(os.path.join(src_dir, '.env'))

# Mock input to automatically answer 'yes'
original_input = builtins.input
builtins.input = lambda _: 'yes'

try:
    # Import the reprocessing function
    from src.reprocess_all_files_s3 import main as reprocess_files

    if __name__ == "__main__":
        print("🚀 Starting file reprocessing...")
        reprocess_files()
        print("✅ Reprocessing completed!")
finally:
    # Restore original input function
    builtins.input = original_input
