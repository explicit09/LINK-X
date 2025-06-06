#!/bin/bash

# Neon to Supabase Schema Export Script
# This script exports the schema from Neon PostgreSQL, excluding unused tables

echo "=== Neon to Supabase Schema Export ==="
echo

# Check if POSTGRES_URL is set
if [ -z "$POSTGRES_URL" ]; then
    echo "❌ Error: POSTGRES_URL environment variable is not set"
    echo "Please set it with your Neon database connection string"
    exit 1
fi

# Export schema only (no data)
echo "📤 Exporting schema from Neon database..."
echo "   Excluding tables: market, news"

pg_dump "$POSTGRES_URL" \
  --schema-only \
  --no-owner \
  --no-privileges \
  --no-comments \
  --exclude-table=market \
  --exclude-table=news \
  --exclude-table=alembic_version \
  --file=neon_schema_export.sql

if [ $? -eq 0 ]; then
    echo "✅ Schema exported successfully to neon_schema_export.sql"
    
    # Create a cleaned version for Supabase
    echo
    echo "🧹 Creating cleaned schema for Supabase..."
    
    # Remove Neon-specific configurations and add Supabase preparations
    cat > supabase_schema.sql << 'HEADER'
-- LEARN-X Database Schema for Supabase
-- Generated from Neon export, cleaned for Supabase

-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";
CREATE EXTENSION IF NOT EXISTS "vector";

-- Start of migrated schema
HEADER

    # Append the exported schema, removing any Neon-specific items
    cat neon_schema_export.sql | \
      grep -v "COMMENT ON EXTENSION" | \
      grep -v "CREATE EXTENSION plpgsql" | \
      grep -v "SET default_table_access_method" \
      >> supabase_schema.sql
    
    # Add Supabase-specific setup at the end
    cat >> supabase_schema.sql << 'FOOTER'

-- Supabase Auth Integration
-- This function syncs Supabase auth users with our User table
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
BEGIN
  -- Check if user already exists (in case of manual creation)
  IF NOT EXISTS (SELECT 1 FROM public."User" WHERE email = NEW.email) THEN
    INSERT INTO public."User" (
      id,
      email,
      firebase_uid,  -- We'll use this to store Supabase user ID
      created_at,
      updated_at
    ) VALUES (
      gen_random_uuid(),
      NEW.email,
      NEW.id::text,
      NOW(),
      NOW()
    );
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger for auth user creation
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Row Level Security (RLS) Policies
-- Enable RLS on tables that need it
ALTER TABLE "User" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Course" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "File" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Enrollment" ENABLE ROW LEVEL SECURITY;

-- Basic RLS policies (to be refined based on requirements)
CREATE POLICY "Users can view their own profile" ON "User"
  FOR SELECT USING (firebase_uid = auth.uid()::text);

CREATE POLICY "Users can update their own profile" ON "User"
  FOR UPDATE USING (firebase_uid = auth.uid()::text);

-- Add indexes for better performance
CREATE INDEX IF NOT EXISTS idx_user_firebase_uid ON "User"(firebase_uid);
CREATE INDEX IF NOT EXISTS idx_user_email ON "User"(email);
CREATE INDEX IF NOT EXISTS idx_file_chunk_file_id ON "FileChunk"(file_id);
CREATE INDEX IF NOT EXISTS idx_enrollment_user_course ON "Enrollment"(user_id, course_id);

-- Grant necessary permissions
GRANT USAGE ON SCHEMA public TO anon, authenticated;
GRANT ALL ON ALL TABLES IN SCHEMA public TO authenticated;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO authenticated;
FOOTER

    echo "✅ Cleaned schema created: supabase_schema.sql"
    
    # Show summary
    echo
    echo "📊 Schema Summary:"
    echo -n "   Total tables: "
    grep -c "CREATE TABLE" supabase_schema.sql
    echo -n "   Total indexes: "
    grep -c "CREATE.*INDEX" supabase_schema.sql
    echo -n "   Total functions: "
    grep -c "CREATE.*FUNCTION" supabase_schema.sql
    
    echo
    echo "📝 Next steps:"
    echo "1. Review supabase_schema.sql for any needed adjustments"
    echo "2. Create a Supabase project at https://supabase.com"
    echo "3. Run the schema in Supabase SQL Editor"
    echo "4. Update your environment variables"
    
else
    echo "❌ Error: Failed to export schema from Neon"
    exit 1
fi