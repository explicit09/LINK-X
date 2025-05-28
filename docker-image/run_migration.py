#!/usr/bin/env python3
import os
import subprocess
from dotenv import load_dotenv

def main():
    # Load environment variables from .env file
    load_dotenv('src/.env')
    
    # Run the migration script in dry-run mode by default
    cmd = ['python3', 'src/migrate_files_to_s3.py']
    subprocess.run(cmd, check=True)

if __name__ == "__main__":
    main()
