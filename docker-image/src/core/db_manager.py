#!/usr/bin/env python3
"""Unified database management script."""

import sys
import argparse
from typing import Optional
from .db.connection import db_manager
from .run_migrations import run_migrations
from .migrate_to_pgvector import migrate_to_pgvector
from .migrate_files_to_s3 import migrate_files_to_s3


class DatabaseManager:
    """Centralized database management utilities."""
    
    @staticmethod
    def reset_content(force: bool = False) -> None:
        """Reset database content."""
        from .reset_db_content import reset_all_content
        from .reset_db_content_force import reset_all_content as force_reset
        
        if force:
            print("Force resetting database content...")
            force_reset()
        else:
            print("Resetting database content (interactive)...")
            reset_all_content()
    
    @staticmethod
    def run_migrations() -> None:
        """Run database migrations."""
        print("Running database migrations...")
        run_migrations()
    
    @staticmethod
    def migrate_to_pgvector() -> None:
        """Migrate to pgvector."""
        print("Migrating to pgvector...")
        migrate_to_pgvector()
    
    @staticmethod
    def migrate_to_s3() -> None:
        """Migrate files to S3."""
        print("Migrating files to S3...")
        migrate_files_to_s3()
    
    @staticmethod
    def backup(output_path: Optional[str] = None) -> None:
        """Backup database."""
        import subprocess
        import os
        from datetime import datetime
        
        if not output_path:
            timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
            output_path = f"backup_linkx_{timestamp}.sql"
        
        db_url = os.environ.get('DATABASE_URL')
        if not db_url:
            print("ERROR: DATABASE_URL not set")
            sys.exit(1)
        
        print(f"Backing up database to {output_path}...")
        cmd = f"pg_dump {db_url} > {output_path}"
        subprocess.run(cmd, shell=True, check=True)
        print(f"Backup completed: {output_path}")


def main():
    """Main entry point."""
    parser = argparse.ArgumentParser(description='Database management utility')
    parser.add_argument('command', choices=[
        'reset', 'reset-force', 'migrate', 'migrate-pgvector', 
        'migrate-s3', 'backup'
    ], help='Command to execute')
    parser.add_argument('--output', help='Output path for backup')
    
    args = parser.parse_args()
    
    manager = DatabaseManager()
    
    if args.command == 'reset':
        manager.reset_content(force=False)
    elif args.command == 'reset-force':
        manager.reset_content(force=True)
    elif args.command == 'migrate':
        manager.run_migrations()
    elif args.command == 'migrate-pgvector':
        manager.migrate_to_pgvector()
    elif args.command == 'migrate-s3':
        manager.migrate_to_s3()
    elif args.command == 'backup':
        manager.backup(args.output)


if __name__ == '__main__':
    main()