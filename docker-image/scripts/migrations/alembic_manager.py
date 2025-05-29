#!/usr/bin/env python3
"""
Alembic migration management script
"""

import os
import sys
import argparse
import subprocess
from pathlib import Path

# Add src to path
src_path = Path(__file__).parent.parent.parent / 'src'
sys.path.insert(0, str(src_path))

from core.settings import get_settings


def run_command(cmd: list, cwd: str = None) -> int:
    """Run a command and return exit code"""
    print(f"Running: {' '.join(cmd)}")
    return subprocess.call(cmd, cwd=cwd)


def init_alembic():
    """Initialize Alembic (already done)"""
    print("Alembic is already initialized in src/db/alembic")
    return 0


def create_migration(message: str):
    """Create a new migration"""
    if not message:
        print("Error: Migration message is required")
        return 1
        
    db_path = src_path / 'db'
    cmd = ['alembic', '-c', 'alembic.ini', 'revision', '--autogenerate', '-m', message]
    return run_command(cmd, cwd=str(db_path))


def upgrade_database(revision: str = 'head'):
    """Upgrade database to a revision"""
    db_path = src_path / 'db'
    cmd = ['alembic', '-c', 'alembic.ini', 'upgrade', revision]
    return run_command(cmd, cwd=str(db_path))


def downgrade_database(revision: str = '-1'):
    """Downgrade database to a revision"""
    db_path = src_path / 'db'
    cmd = ['alembic', '-c', 'alembic.ini', 'downgrade', revision]
    return run_command(cmd, cwd=str(db_path))


def show_history():
    """Show migration history"""
    db_path = src_path / 'db'
    cmd = ['alembic', '-c', 'alembic.ini', 'history']
    return run_command(cmd, cwd=str(db_path))


def show_current():
    """Show current database revision"""
    db_path = src_path / 'db'
    cmd = ['alembic', '-c', 'alembic.ini', 'current']
    return run_command(cmd, cwd=str(db_path))


def stamp_database(revision: str):
    """Stamp database with a revision without running migrations"""
    db_path = src_path / 'db'
    cmd = ['alembic', '-c', 'alembic.ini', 'stamp', revision]
    return run_command(cmd, cwd=str(db_path))


def generate_sql(revision: str = 'head', output_file: str = None):
    """Generate SQL for migrations"""
    db_path = src_path / 'db'
    cmd = ['alembic', '-c', 'alembic.ini', 'upgrade', revision, '--sql']
    
    if output_file:
        cmd.extend(['>', output_file])
        print(f"Generating SQL to {output_file}...")
        return subprocess.call(' '.join(cmd), shell=True, cwd=str(db_path))
    else:
        return run_command(cmd, cwd=str(db_path))


def main():
    """Main entry point"""
    parser = argparse.ArgumentParser(description='Alembic migration management')
    subparsers = parser.add_subparsers(dest='command', help='Commands')
    
    # Init command
    subparsers.add_parser('init', help='Initialize Alembic')
    
    # Create migration
    create_parser = subparsers.add_parser('create', help='Create a new migration')
    create_parser.add_argument('message', help='Migration message')
    
    # Upgrade
    upgrade_parser = subparsers.add_parser('upgrade', help='Upgrade database')
    upgrade_parser.add_argument('revision', nargs='?', default='head', 
                                help='Target revision (default: head)')
    
    # Downgrade
    downgrade_parser = subparsers.add_parser('downgrade', help='Downgrade database')
    downgrade_parser.add_argument('revision', nargs='?', default='-1',
                                  help='Target revision (default: -1)')
    
    # History
    subparsers.add_parser('history', help='Show migration history')
    
    # Current
    subparsers.add_parser('current', help='Show current revision')
    
    # Stamp
    stamp_parser = subparsers.add_parser('stamp', help='Stamp database with revision')
    stamp_parser.add_argument('revision', help='Revision to stamp')
    
    # Generate SQL
    sql_parser = subparsers.add_parser('sql', help='Generate SQL for migrations')
    sql_parser.add_argument('--revision', default='head', help='Target revision')
    sql_parser.add_argument('--output', help='Output file for SQL')
    
    args = parser.parse_args()
    
    if not args.command:
        parser.print_help()
        return 1
    
    # Set environment
    settings = get_settings()
    print(f"Using database: {settings.database_url}")
    print(f"Environment: {settings.environment}")
    
    # Execute command
    if args.command == 'init':
        return init_alembic()
    elif args.command == 'create':
        return create_migration(args.message)
    elif args.command == 'upgrade':
        return upgrade_database(args.revision)
    elif args.command == 'downgrade':
        return downgrade_database(args.revision)
    elif args.command == 'history':
        return show_history()
    elif args.command == 'current':
        return show_current()
    elif args.command == 'stamp':
        return stamp_database(args.revision)
    elif args.command == 'sql':
        return generate_sql(args.revision, args.output)
    else:
        parser.print_help()
        return 1


if __name__ == '__main__':
    sys.exit(main())