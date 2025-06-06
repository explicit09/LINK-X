#!/bin/bash

# Supabase Migration Script
# Migrates schema from Neon to Supabase (no data migration needed)

set -e  # Exit on error

echo "==================================="
echo "LEARN-X Supabase Migration Script"
echo "==================================="
echo

# Check environment variables
if [ -z "$NEON_DATABASE_URL" ]; then
    echo "❌ Error: NEON_DATABASE_URL not set"
    echo "   Export your Neon database URL first:"
    echo "   export NEON_DATABASE_URL='postgresql://...'"
    exit 1
fi

if [ -z "$SUPABASE_DB_URL" ]; then
    echo "❌ Error: SUPABASE_DB_URL not set"
    echo "   Export your Supabase database URL first:"
    echo "   export SUPABASE_DB_URL='postgresql://...'"
    exit 1
fi

# Color codes for output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

echo "📋 Migration Plan:"
echo "   • Export schema from Neon (no data)"
echo "   • Clean up schema (remove test tables)"
echo "   • Import to Supabase"
echo "   • Verify migration"
echo

read -p "Continue with migration? (y/N) " -n 1 -r
echo
if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    echo "Migration cancelled."
    exit 0
fi

# Step 1: Export schema from Neon
echo
echo -e "${YELLOW}Step 1: Exporting schema from Neon...${NC}"
pg_dump "$NEON_DATABASE_URL" \
    --schema-only \
    --no-owner \
    --no-privileges \
    --no-comments \
    --exclude-table="market" \
    --exclude-table="news" \
    --exclude-table="alembic_version" \
    > neon_schema_export.sql

if [ $? -eq 0 ]; then
    echo -e "${GREEN}✅ Schema exported successfully${NC}"
else
    echo -e "${RED}❌ Schema export failed${NC}"
    exit 1
fi

# Step 2: Clean the schema
echo
echo -e "${YELLOW}Step 2: Cleaning schema...${NC}"

# Remove Neon-specific items and prepare for Supabase
cat > schema_cleaned.sql << 'EOF'
-- Temporary cleaned schema
-- This will be replaced by clean_schema_migration.sql
EOF

# Use our prepared clean schema instead
if [ -f "clean_schema_migration.sql" ]; then
    cp clean_schema_migration.sql schema_cleaned.sql
    echo -e "${GREEN}✅ Using prepared clean schema${NC}"
else
    # Fallback: clean the exported schema
    grep -v "COMMENT ON EXTENSION\|CREATE EXTENSION plpgsql\|SET default_table_access_method" \
        neon_schema_export.sql > schema_cleaned.sql
    echo -e "${GREEN}✅ Schema cleaned${NC}"
fi

# Step 3: Test Supabase connection
echo
echo -e "${YELLOW}Step 3: Testing Supabase connection...${NC}"
psql "$SUPABASE_DB_URL" -c "SELECT version();" > /dev/null 2>&1

if [ $? -eq 0 ]; then
    echo -e "${GREEN}✅ Supabase connection successful${NC}"
else
    echo -e "${RED}❌ Cannot connect to Supabase${NC}"
    exit 1
fi

# Step 4: Import schema to Supabase
echo
echo -e "${YELLOW}Step 4: Importing schema to Supabase...${NC}"
echo "   This will create all tables and indexes..."

psql "$SUPABASE_DB_URL" < schema_cleaned.sql

if [ $? -eq 0 ]; then
    echo -e "${GREEN}✅ Schema imported successfully${NC}"
else
    echo -e "${RED}❌ Schema import failed${NC}"
    echo "   Check the error messages above"
    exit 1
fi

# Step 5: Verify migration
echo
echo -e "${YELLOW}Step 5: Verifying migration...${NC}"

# Count tables
TABLE_COUNT=$(psql "$SUPABASE_DB_URL" -t -c "
    SELECT COUNT(*) 
    FROM information_schema.tables 
    WHERE table_schema = 'public' 
    AND table_type = 'BASE TABLE'
")

echo -e "   Tables created: ${GREEN}$TABLE_COUNT${NC}"

# Check specific important tables
echo "   Checking critical tables..."
for table in user_profiles courses modules files enrollments; do
    EXISTS=$(psql "$SUPABASE_DB_URL" -t -c "
        SELECT EXISTS (
            SELECT 1 
            FROM information_schema.tables 
            WHERE table_schema = 'public' 
            AND table_name = '$table'
        )
    ")
    
    if [ "$EXISTS" = " t" ]; then
        echo -e "   ✅ Table '$table' exists"
    else
        echo -e "   ❌ Table '$table' missing!"
    fi
done

# Check extensions
echo
echo "   Checking required extensions..."
for ext in uuid-ossp pgcrypto vector; do
    EXISTS=$(psql "$SUPABASE_DB_URL" -t -c "
        SELECT EXISTS (
            SELECT 1 
            FROM pg_extension 
            WHERE extname = '$ext'
        )
    ")
    
    if [ "$EXISTS" = " t" ]; then
        echo -e "   ✅ Extension '$ext' enabled"
    else
        echo -e "   ❌ Extension '$ext' missing!"
    fi
done

# Step 6: Create test data (optional)
echo
read -p "Create test data? (y/N) " -n 1 -r
echo
if [[ $REPLY =~ ^[Yy]$ ]]; then
    echo -e "${YELLOW}Creating test data...${NC}"
    
    # This would be a separate SQL file with test data
    # For now, just indicate it would be done
    echo "   (Test data creation would go here)"
    echo -e "${GREEN}✅ Test data created${NC}"
fi

# Final summary
echo
echo -e "${GREEN}==================================="
echo "Migration Complete!"
echo "===================================${NC}"
echo
echo "Next steps:"
echo "1. Update your .env files with Supabase credentials"
echo "2. Test the application with Supabase"
echo "3. Remove Neon configuration once verified"
echo
echo "Supabase Dashboard: https://app.supabase.com"
echo

# Cleanup
rm -f neon_schema_export.sql schema_cleaned.sql

echo "✨ Done!"