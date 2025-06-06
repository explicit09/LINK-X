"""
Create a test user in Supabase database
"""
import os
os.environ['DATABASE_URL'] = 'postgresql://postgres.torsffahnivnzcnjnxgc:DjGJCVNYksijOQuG@aws-0-us-east-2.pooler.supabase.com:6543/postgres'

import psycopg2
from psycopg2.extras import execute_values
import uuid

# Connect to database
conn = psycopg2.connect(os.environ['DATABASE_URL'])
cur = conn.cursor()

try:
    # Create test user with a specific UUID
    user_id = '0c8ca475-8d87-4510-866f-1fb7cf2d7c21'
    
    # Check if user exists
    cur.execute("SELECT id FROM users WHERE email = %s OR id = %s", ('test@example.com', user_id))
    existing = cur.fetchone()
    
    if existing:
        print(f"User already exists with ID: {existing[0]}")
        # Update firebase_uid to match our test ID
        cur.execute("UPDATE users SET firebase_uid = %s WHERE email = %s", (user_id, 'test@example.com'))
        conn.commit()
        print("Updated firebase_uid for test user")
    else:
        # Create user
        cur.execute("""
            INSERT INTO users (id, email, firebase_uid, created_at, last_login_at)
            VALUES (%s, %s, %s, NOW(), NOW())
        """, (user_id, 'test@example.com', user_id))
        
        # Create role
        cur.execute("""
            INSERT INTO roles (user_id, role_type)
            VALUES (%s, %s)
        """, (user_id, 'student'))
        
        # Create student profile
        cur.execute("""
            INSERT INTO student_profiles (user_id, name, onboard_answers, want_quizzes)
            VALUES (%s, %s, %s, %s)
        """, (user_id, 'Test User', '{}', False))
        
        conn.commit()
        print(f"Created test user with ID: {user_id}")
    
    # Verify user
    cur.execute("""
        SELECT u.id, u.email, u.firebase_uid, r.role_type
        FROM users u
        LEFT JOIN roles r ON u.id = r.user_id
        WHERE u.email = %s
    """, ('test@example.com',))
    
    user = cur.fetchone()
    if user:
        print(f"\nTest user verified:")
        print(f"  ID: {user[0]}")
        print(f"  Email: {user[1]}")
        print(f"  Firebase UID: {user[2]}")
        print(f"  Role: {user[3]}")
        
except Exception as e:
    print(f"Error: {e}")
    conn.rollback()
finally:
    cur.close()
    conn.close()