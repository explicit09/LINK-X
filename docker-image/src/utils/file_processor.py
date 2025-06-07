#!/usr/bin/env python3
"""Unified file processing management."""

import argparse
from typing import Optional
from .reprocess_all_files import main as reprocess_local


class FileProcessor:
    """Centralized file processing utilities."""
    
    @staticmethod
    def reprocess_all() -> None:
        """Reprocess all files from Supabase storage."""
        print("Reprocessing all files...")
        reprocess_local()
    
    @staticmethod
    def check_storage_access() -> None:
        """Check Supabase storage access."""
        from core.supabase_config import get_supabase_client
        try:
            supabase = get_supabase_client()
            # Try to list files in the bucket
            supabase.storage.from_('course-files').list(limit=1)
            print("✓ Supabase storage is accessible")
        except Exception as e:
            print(f"✗ Supabase storage check failed: {e}")


def main():
    """Main entry point."""
    parser = argparse.ArgumentParser(description='File processing utility')
    parser.add_argument('command', choices=[
        'reprocess', 'check-storage'
    ], help='Command to execute')
    
    args = parser.parse_args()
    
    processor = FileProcessor()
    
    if args.command == 'reprocess':
        processor.reprocess_all()
    elif args.command == 'check-storage':
        processor.check_storage_access()


if __name__ == '__main__':
    main()