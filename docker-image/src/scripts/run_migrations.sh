#!/bin/bash
# Production migration runner with safety checks

set -e

echo "🚀 LEARN-X Database Migration Runner"
echo "===================================="

# Colors
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m'

# Check if we're in production
if [ "$FLASK_ENV" = "production" ]; then
    echo -e "${YELLOW}⚠️  PRODUCTION ENVIRONMENT DETECTED${NC}"
    echo "Are you sure you want to run migrations on production? (yes/no)"
    read -r confirmation
    if [ "$confirmation" != "yes" ]; then
        echo "Migration cancelled."
        exit 0
    fi
fi

# Load environment variables
if [ -f .env ]; then
    export $(cat .env | grep -v '^#' | xargs)
fi

# Check database connection
echo -e "\n${YELLOW}Checking database connection...${NC}"
python3 -c "
from sqlalchemy import create_engine
import os
engine = create_engine(os.getenv('DATABASE_URL'))
conn = engine.connect()
conn.close()
print('✅ Database connection successful')
"

# Backup database (production only)
if [ "$FLASK_ENV" = "production" ]; then
    echo -e "\n${YELLOW}Creating database backup...${NC}"
    BACKUP_FILE="backup_$(date +%Y%m%d_%H%M%S).sql"
    pg_dump $DATABASE_URL > $BACKUP_FILE
    echo -e "${GREEN}✅ Backup created: $BACKUP_FILE${NC}"
fi

# Run Alembic migrations
echo -e "\n${YELLOW}Running Alembic migrations...${NC}"
cd docker-image/src
alembic upgrade head

# Run SQL migrations
echo -e "\n${YELLOW}Running SQL migrations...${NC}"
for migration in db/migrations/*.sql; do
    if [ -f "$migration" ]; then
        echo "Running: $migration"
        psql $DATABASE_URL -f $migration
    fi
done

# Run performance indexes
echo -e "\n${YELLOW}Creating performance indexes...${NC}"
if [ -f "db/migrations/0010_add_performance_indexes.sql" ]; then
    psql $DATABASE_URL -f db/migrations/0010_add_performance_indexes.sql
    echo -e "${GREEN}✅ Performance indexes created${NC}"
fi

# Verify migrations
echo -e "\n${YELLOW}Verifying migrations...${NC}"
python3 -c "
from db.schema import *
from sqlalchemy import create_engine, inspect
import os

engine = create_engine(os.getenv('DATABASE_URL'))
inspector = inspect(engine)

# Check tables exist
required_tables = ['users', 'roles', 'courses', 'modules', 'files', 'enrollments', 'todos']
existing_tables = inspector.get_table_names()

missing = set(required_tables) - set(existing_tables)
if missing:
    print(f'❌ Missing tables: {missing}')
    exit(1)
else:
    print('✅ All required tables exist')

# Check indexes
for table in required_tables:
    indexes = inspector.get_indexes(table)
    if indexes:
        print(f'✅ {table}: {len(indexes)} indexes')
"

echo -e "\n${GREEN}✅ All migrations completed successfully!${NC}"

# Restart services
if [ "$FLASK_ENV" = "production" ]; then
    echo -e "\n${YELLOW}Restarting services...${NC}"
    docker-compose -f docker-compose.production.yml restart backend celery_worker
    echo -e "${GREEN}✅ Services restarted${NC}"
fi