#!/usr/bin/env python3
"""
Initialize LTI Database - BRUTAL EXECUTION
Deploy schema and register test platforms
"""

import os
import sys
import psycopg2
import json
from typing import Dict, Any

def create_database_if_not_exists(database_url: str, db_name: str):
    """Check database connection - Neon doesn't allow creating databases"""
    try:
        # For Neon, just verify connection to existing database
        conn = psycopg2.connect(database_url)
        
        with conn.cursor() as cursor:
            # Check if we can connect and query
            cursor.execute("SELECT current_database(), version()")
            result = cursor.fetchone()
            print(f"✅ Connected to database: {result[0]}")
            print(f"✅ PostgreSQL version: {result[1][:50]}...")
        
        conn.close()
        
    except Exception as e:
        print(f"❌ Database connection failed: {e}")
        raise

def execute_schema_file(database_url: str, schema_file: str):
    """Execute SQL schema file"""
    try:
        conn = psycopg2.connect(database_url)
        
        with open(schema_file, 'r') as f:
            schema_sql = f.read()
        
        with conn.cursor() as cursor:
            cursor.execute(schema_sql)
        
        conn.commit()
        conn.close()
        
        print(f"✅ Schema deployed: {schema_file}")
        
    except Exception as e:
        print(f"❌ Schema deployment failed: {e}")
        raise

def register_test_platforms(database_url: str):
    """Register test platforms for development"""
    
    test_platforms = [
        {
            'iss': 'https://canvas.instructure.com',
            'client_id': '10000000000001',
            'deployment_id': '1:dda2923e6e8b8f8c1932c5a8d7c1e1e1',
            'auth_login_url': 'https://canvas.instructure.com/api/lti/authorize_redirect',
            'auth_token_url': 'https://canvas.instructure.com/login/oauth2/token',
            'key_set_url': 'https://canvas.instructure.com/api/lti/security/jwks',
            'platform_config': {
                'name': 'Canvas Test Instance',
                'vendor': 'Instructure',
                'version': 'cloud'
            }
        },
        {
            'iss': 'https://blackboard.com',
            'client_id': 'bb-test-client-123',
            'deployment_id': 'bb-deployment-test',
            'auth_login_url': 'https://blackboard.com/auth/lti',
            'auth_token_url': 'https://blackboard.com/auth/token',
            'key_set_url': 'https://blackboard.com/auth/jwks',
            'platform_config': {
                'name': 'Blackboard Test Instance',
                'vendor': 'Blackboard',
                'version': 'ultra'
            }
        }
    ]
    
    try:
        conn = psycopg2.connect(database_url)
        
        for platform in test_platforms:
            with conn.cursor() as cursor:
                # Check if platform already exists
                cursor.execute(
                    """
                    SELECT id FROM lti_platforms 
                    WHERE iss = %s AND client_id = %s AND deployment_id = %s
                    """,
                    (platform['iss'], platform['client_id'], platform['deployment_id'])
                )
                
                if cursor.fetchone():
                    print(f"✅ Platform exists: {platform['iss']} - {platform['client_id']}")
                    continue
                
                # Insert new platform
                cursor.execute(
                    """
                    INSERT INTO lti_platforms (
                        iss, client_id, deployment_id, auth_login_url, 
                        auth_token_url, key_set_url, platform_config, active
                    ) VALUES (
                        %s, %s, %s, %s, %s, %s, %s, %s
                    )
                    """,
                    (
                        platform['iss'],
                        platform['client_id'],
                        platform['deployment_id'],
                        platform['auth_login_url'],
                        platform['auth_token_url'],
                        platform['key_set_url'],
                        json.dumps(platform['platform_config']),
                        True
                    )
                )
                
                print(f"✅ Registered platform: {platform['iss']} - {platform['client_id']}")
        
        conn.commit()
        conn.close()
        
    except Exception as e:
        print(f"❌ Platform registration failed: {e}")
        raise

def main():
    """Initialize LTI database"""
    print("🔄 INITIALIZING LTI DATABASE - BRUTAL EXECUTION")
    print("=" * 50)
    
    # Database configuration - Use Neon database
    database_url = os.environ.get(
        'LTI_DATABASE_URL',
        'postgresql://neondb_owner:npg_2ZO0npmbLIPU@ep-super-lab-a5pamjoe-pooler.us-east-2.aws.neon.tech/neondb?sslmode=require'
    )
    
    db_name = database_url.split('/')[-1].split('?')[0]  # Remove query params
    
    print(f"📋 Database URL: {database_url}")
    print(f"📋 Database name: {db_name}")
    
    try:
        # Step 1: Create database if needed
        print("\n🗄️  STEP 1: Database Creation")
        create_database_if_not_exists(database_url, db_name)
        
        # Step 2: Deploy schema
        print("\n🏗️  STEP 2: Schema Deployment")
        schema_file = os.path.join(os.path.dirname(__file__), 'schema.sql')
        
        if not os.path.exists(schema_file):
            print(f"❌ Schema file not found: {schema_file}")
            sys.exit(1)
        
        execute_schema_file(database_url, schema_file)
        
        # Step 3: Register test platforms
        print("\n🌐 STEP 3: Test Platform Registration")
        register_test_platforms(database_url)
        
        # Step 4: Validation
        print("\n✅ STEP 4: Validation")
        conn = psycopg2.connect(database_url)
        
        with conn.cursor() as cursor:
            # Check tables exist
            cursor.execute(
                """
                SELECT table_name FROM information_schema.tables 
                WHERE table_schema = 'public' AND table_name LIKE 'lti_%'
                ORDER BY table_name
                """
            )
            tables = [row[0] for row in cursor.fetchall()]
            
            print(f"✅ Tables created: {len(tables)}")
            for table in tables:
                print(f"   • {table}")
            
            # Check platforms registered
            cursor.execute("SELECT COUNT(*) FROM lti_platforms WHERE active = true")
            platform_count = cursor.fetchone()[0]
            
            print(f"✅ Active platforms: {platform_count}")
        
        conn.close()
        
        print("\n🚀 LTI DATABASE INITIALIZATION COMPLETE")
        print("=" * 50)
        print("✅ Schema deployed with multi-tenant security")
        print("✅ Test platforms registered")
        print("✅ Database ready for LTI Gateway")
        print("\n🎯 NEXT: Start LTI Gateway and test Canvas integration")
        
    except Exception as e:
        print(f"\n❌ INITIALIZATION FAILED: {e}")
        print("🔥 BRUTAL REALITY: Fix the error and try again")
        sys.exit(1)

if __name__ == '__main__':
    main()