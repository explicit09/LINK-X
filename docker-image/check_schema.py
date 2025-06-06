#!/usr/bin/env python3
"""Check the actual database schema"""
import os
from sqlalchemy import create_engine, text, inspect

DATABASE_URL = os.getenv('DATABASE_URL', 'postgresql://postgres.torsffahnivnzcnjnxgc:DjGJCVNYksijOQuG@aws-0-us-east-2.pooler.supabase.com:6543/postgres')

def check_schema():
    engine = create_engine(DATABASE_URL)
    inspector = inspect(engine)
    
    print("=== DATABASE SCHEMA ===\n")
    
    # Get all tables
    tables = inspector.get_table_names()
    print(f"Tables: {tables}\n")
    
    # Check each table's columns
    for table in ['users', 'user_profiles', 'roles']:
        if table in tables:
            print(f"\n{table.upper()} table columns:")
            columns = inspector.get_columns(table)
            for col in columns:
                nullable = "NULL" if col['nullable'] else "NOT NULL"
                print(f"  - {col['name']}: {col['type']} {nullable}")
            
            # Get primary keys
            pk = inspector.get_pk_constraint(table)
            if pk['constrained_columns']:
                print(f"  Primary Key: {pk['constrained_columns']}")
            
            # Get foreign keys
            fks = inspector.get_foreign_keys(table)
            if fks:
                print(f"  Foreign Keys:")
                for fk in fks:
                    print(f"    - {fk['constrained_columns']} -> {fk['referred_table']}.{fk['referred_columns']}")

if __name__ == "__main__":
    check_schema()