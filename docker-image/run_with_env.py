#!/usr/bin/env python3
import os
import sys
import subprocess
from dotenv import load_dotenv

def main():
    # Get the project root directory
    project_root = os.path.dirname(os.path.abspath(__file__))
    src_dir = os.path.join(project_root, 'src')
    
    # Add src directory to Python path
    if src_dir not in sys.path:
        sys.path.insert(0, src_dir)
    
    # Load environment variables from .env file
    load_dotenv(os.path.join(src_dir, '.env'))
    
    # Run the reprocessing script
    cmd = [sys.executable, os.path.join(src_dir, 'reprocess_all_files_s3.py')]
    subprocess.run(cmd, check=True, cwd=src_dir)

if __name__ == "__main__":
    main()
