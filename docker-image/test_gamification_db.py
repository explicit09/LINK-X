#!/usr/bin/env python3
"""
Test gamification database tables and functionality
"""
import sys
import os
sys.path.append('src')

from core.database_supabase import db_manager
from db.schema import UserStats, UserActivity, UserAchievement
from sqlalchemy import text

def test_gamification_tables():
    """Test if gamification tables exist and are accessible"""
    print("Testing Gamification Database Setup")
    print("=" * 50)
    
    try:
        with db_manager.session_factory() as session:
            # Test user_stats table
            print("1. Testing user_stats table...")
            try:
                # Try to query the table structure
                result = session.execute(text("SELECT column_name, data_type FROM information_schema.columns WHERE table_name = 'user_stats' ORDER BY ordinal_position"))
                columns = list(result)
                if columns:
                    print(f"   ✅ user_stats table found with {len(columns)} columns:")
                    for col_name, col_type in columns:
                        print(f"      - {col_name}: {col_type}")
                    
                    # Test if we can create a record using SQLAlchemy
                    test_user_id = '123e4567-e89b-12d3-a456-426614174000'  # Example UUID
                    
                    # Check if test record exists
                    existing = session.query(UserStats).filter(UserStats.user_id == test_user_id).first()
                    if existing:
                        print(f"   ✅ Test user stats found: Level {existing.current_level}, XP {existing.total_xp}")
                    else:
                        print("   ➡️  No test user stats found (this is normal)")
                else:
                    print("   ❌ user_stats table not found")
            except Exception as e:
                print(f"   ❌ Error accessing user_stats: {e}")
            
            # Test user_activities table
            print("\n2. Testing user_activities table...")
            try:
                result = session.execute(text("SELECT column_name, data_type FROM information_schema.columns WHERE table_name = 'user_activities' ORDER BY ordinal_position"))
                columns = list(result)
                if columns:
                    print(f"   ✅ user_activities table found with {len(columns)} columns:")
                    for col_name, col_type in columns:
                        print(f"      - {col_name}: {col_type}")
                    
                    # Count activities
                    count = session.query(UserActivity).count()
                    print(f"   ✅ Current activity count: {count}")
                else:
                    print("   ❌ user_activities table not found")
            except Exception as e:
                print(f"   ❌ Error accessing user_activities: {e}")
            
            # Test user_achievements table
            print("\n3. Testing user_achievements table...")
            try:
                result = session.execute(text("SELECT column_name, data_type FROM information_schema.columns WHERE table_name = 'user_achievements' ORDER BY ordinal_position"))
                columns = list(result)
                if columns:
                    print(f"   ✅ user_achievements table found with {len(columns)} columns:")
                    for col_name, col_type in columns:
                        print(f"      - {col_name}: {col_type}")
                    
                    # Count achievements
                    count = session.query(UserAchievement).count()
                    print(f"   ✅ Current achievement count: {count}")
                else:
                    print("   ❌ user_achievements table not found")
            except Exception as e:
                print(f"   ❌ Error accessing user_achievements: {e}")
            
            # Test functions and views
            print("\n4. Testing gamification functions...")
            try:
                # Check if award_xp function exists
                result = session.execute(text("SELECT EXISTS(SELECT 1 FROM pg_proc WHERE proname = 'award_xp')"))
                has_award_xp = result.scalar()
                if has_award_xp:
                    print("   ✅ award_xp function found")
                else:
                    print("   ❌ award_xp function not found")
                
                # Check if user_leaderboard view exists
                result = session.execute(text("SELECT EXISTS(SELECT 1 FROM pg_views WHERE viewname = 'user_leaderboard')"))
                has_leaderboard = result.scalar()
                if has_leaderboard:
                    print("   ✅ user_leaderboard view found")
                else:
                    print("   ❌ user_leaderboard view not found")
                    
            except Exception as e:
                print(f"   ❌ Error checking functions: {e}")
            
            print(f"\n✅ Database test completed successfully!")
            
    except Exception as e:
        print(f"❌ Database connection failed: {e}")
        import traceback
        traceback.print_exc()

if __name__ == '__main__':
    test_gamification_tables()