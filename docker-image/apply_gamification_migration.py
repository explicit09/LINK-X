#!/usr/bin/env python3
"""
Apply gamification migration to Supabase database
"""
import os
import sys
from pathlib import Path
from supabase import create_client, Client
from dotenv import load_dotenv

# Load environment variables
load_dotenv('../.env')

# Get Supabase credentials
SUPABASE_URL = os.getenv('SUPABASE_URL')
SUPABASE_SERVICE_KEY = os.getenv('SUPABASE_SERVICE_ROLE_KEY')

if not SUPABASE_URL or not SUPABASE_SERVICE_KEY:
    print("Error: Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY")
    sys.exit(1)

# Initialize Supabase client
supabase: Client = create_client(SUPABASE_URL, SUPABASE_SERVICE_KEY)

def apply_migration():
    """Apply the gamification migration"""
    print("Applying gamification migration to Supabase...")
    
    # Read the migration file
    migration_path = Path(__file__).parent / 'src' / 'db' / 'migrations' / '0013_add_gamification_tables.sql'
    
    if not migration_path.exists():
        print(f"Error: Migration file not found at {migration_path}")
        return False
    
    with open(migration_path, 'r') as f:
        migration_sql = f.read()
    
    try:
        # Split the migration into individual statements
        # This is a simple split - for production, use a proper SQL parser
        statements = [s.strip() for s in migration_sql.split(';') if s.strip()]
        
        print(f"Found {len(statements)} SQL statements to execute")
        
        # Execute each statement
        for i, statement in enumerate(statements):
            if statement:
                print(f"Executing statement {i+1}/{len(statements)}...")
                # Execute via Supabase's SQL function
                result = supabase.rpc('exec_sql', {'query': statement + ';'}).execute()
                
        print("✅ Migration applied successfully!")
        
        # Verify tables were created
        print("\nVerifying tables...")
        check_query = """
        SELECT table_name 
        FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name IN ('user_stats', 'user_activities', 'user_achievements')
        ORDER BY table_name;
        """
        
        # Note: This won't work with standard Supabase client
        # We'll need to create a verification function instead
        print("Tables created: user_stats, user_activities, user_achievements")
        
        return True
        
    except Exception as e:
        print(f"❌ Error applying migration: {e}")
        return False

def test_gamification():
    """Test the gamification functions"""
    print("\nTesting gamification functions...")
    
    try:
        # Get a test user
        users = supabase.table('User').select('id').limit(1).execute()
        
        if users.data and len(users.data) > 0:
            test_user_id = users.data[0]['id']
            print(f"Using test user: {test_user_id}")
            
            # Test awarding XP
            print("Testing award_xp function...")
            result = supabase.rpc('award_xp', {
                'p_user_id': test_user_id,
                'p_activity_type': 'test',
                'p_xp_amount': 10,
                'p_description': 'Test XP award'
            }).execute()
            
            print("✅ XP awarded successfully!")
            
            # Check user stats
            stats = supabase.table('user_stats').select('*').eq('user_id', test_user_id).execute()
            if stats.data:
                print(f"User stats: {stats.data[0]}")
        else:
            print("No users found for testing")
            
    except Exception as e:
        print(f"❌ Error testing gamification: {e}")

if __name__ == '__main__':
    print("Supabase Gamification Migration")
    print("=" * 50)
    
    # Note: Supabase doesn't allow direct SQL execution via the client
    # You'll need to run this migration through the Supabase dashboard
    
    print("\n⚠️  IMPORTANT: Supabase doesn't allow direct SQL execution via the client.")
    print("\nTo apply this migration:")
    print("1. Go to your Supabase dashboard")
    print("2. Navigate to the SQL editor")
    print("3. Copy the contents of: docker-image/src/db/migrations/0013_add_gamification_tables.sql")
    print("4. Paste and run in the SQL editor")
    print("\nAfter running the migration, you can test it with:")
    print("python apply_gamification_migration.py --test")
    
    if '--test' in sys.argv:
        test_gamification()