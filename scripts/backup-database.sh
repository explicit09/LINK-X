#!/bin/bash
set -e

echo "💾 Starting database backup..."

# Load environment variables
if [ -f .env.production ]; then
    export $(cat .env.production | xargs)
fi

# Parse database URL
if [[ $DATABASE_URL =~ postgresql://([^:]+):([^@]+)@([^:/]+):([^/]+)/(.+) ]]; then
    DB_USER="${BASH_REMATCH[1]}"
    DB_PASS="${BASH_REMATCH[2]}"
    DB_HOST="${BASH_REMATCH[3]}"
    DB_PORT="${BASH_REMATCH[4]}"
    DB_NAME="${BASH_REMATCH[5]}"
else
    echo "❌ Error: Invalid DATABASE_URL format"
    exit 1
fi

# Create backup directory
BACKUP_DIR="./backups"
mkdir -p $BACKUP_DIR

# Generate backup filename with timestamp
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
BACKUP_FILE="$BACKUP_DIR/linkx_${DB_NAME}_${TIMESTAMP}.sql"

# Perform backup
echo "📦 Backing up database: $DB_NAME"
PGPASSWORD=$DB_PASS pg_dump \
    -h $DB_HOST \
    -p $DB_PORT \
    -U $DB_USER \
    -d $DB_NAME \
    -f $BACKUP_FILE \
    --verbose \
    --no-owner \
    --no-privileges

# Compress backup
echo "🗜️  Compressing backup..."
gzip $BACKUP_FILE

# Upload to S3 if configured
if [ ! -z "$BACKUP_S3_BUCKET" ]; then
    echo "☁️  Uploading to S3..."
    aws s3 cp "${BACKUP_FILE}.gz" "s3://$BACKUP_S3_BUCKET/database-backups/"
fi

# Cleanup old backups (keep last 7 days)
echo "🧹 Cleaning up old backups..."
find $BACKUP_DIR -name "*.sql.gz" -mtime +7 -delete

echo "✅ Database backup complete: ${BACKUP_FILE}.gz"