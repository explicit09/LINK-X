#!/usr/bin/env python3
"""Unified file processing management."""

import argparse
from typing import Optional
from .reprocess_all_files_s3 import main as reprocess_s3
from .reprocess_all_files import main as reprocess_local


class FileProcessor:
    """Centralized file processing utilities."""
    
    @staticmethod
    def reprocess_all(use_s3: bool = True) -> None:
        """Reprocess all files."""
        if use_s3:
            print("Reprocessing all files from S3...")
            reprocess_s3()
        else:
            print("Reprocessing all local files...")
            reprocess_local()
    
    @staticmethod
    def cleanup_s3() -> None:
        """Clean up S3 test files."""
        from .cleanup_s3_test_files import cleanup_test_files
        print("Cleaning up S3 test files...")
        cleanup_test_files()
    
    @staticmethod
    def check_s3_access() -> None:
        """Check S3 access."""
        from .check_s3_access import main as check_access
        print("Checking S3 access...")
        check_access()


def main():
    """Main entry point."""
    parser = argparse.ArgumentParser(description='File processing utility')
    parser.add_argument('command', choices=[
        'reprocess', 'reprocess-local', 'cleanup-s3', 'check-s3'
    ], help='Command to execute')
    
    args = parser.parse_args()
    
    processor = FileProcessor()
    
    if args.command == 'reprocess':
        processor.reprocess_all(use_s3=True)
    elif args.command == 'reprocess-local':
        processor.reprocess_all(use_s3=False)
    elif args.command == 'cleanup-s3':
        processor.cleanup_s3()
    elif args.command == 'check-s3':
        processor.check_s3_access()


if __name__ == '__main__':
    main()