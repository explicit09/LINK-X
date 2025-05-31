#!/bin/bash
# LEARN-X Automated Backup Script
# Supports both Neon and local PostgreSQL backups to S3

set -e

# Colors
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m'

echo -e "${YELLOW}🔒 LEARN-X Automated Backup System${NC}"
echo "===================================="

# Configuration
BACKUP_DIR="/tmp/learnx-backups"
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
S3_BUCKET=${BACKUP_S3_BUCKET:-"learnx-backups"}
RETENTION_DAYS=${BACKUP_RETENTION_DAYS:-30}

# Database configurations (using provided Neon URLs)
DEV_DATABASE_URL="postgresql://neondb_owner:npg_2ZO0npmbLIPU@ep-super-lab-a5pamjoe-pooler.us-east-2.aws.neon.tech/neondb?sslmode=require"
PROD_DATABASE_URL="postgresql://neondb_owner:npg_2ZO0npmbLIPU@ep-withered-hill-a5u0pgp4-pooler.us-east-2.aws.neon.tech/neondb?sslmode=require"

# Create backup directory
mkdir -p "$BACKUP_DIR"

# Function to perform backup
backup_database() {
    local env_name=$1
    local database_url=$2
    local backup_file="$BACKUP_DIR/learnx_${env_name}_${TIMESTAMP}.sql"
    
    echo -e "\n${YELLOW}Backing up $env_name database...${NC}"
    
    # Perform backup using pg_dump
    if pg_dump "$database_url" \
        --no-owner \
        --no-privileges \
        --clean \
        --if-exists \
        --verbose \
        -f "$backup_file" 2>&1 | tee "$BACKUP_DIR/backup_${env_name}_${TIMESTAMP}.log"; then
        
        echo -e "${GREEN}✅ Database backup completed: $backup_file${NC}"
        
        # Compress backup
        echo -e "${YELLOW}Compressing backup...${NC}"
        gzip "$backup_file"
        backup_file="${backup_file}.gz"
        
        # Calculate checksum
        checksum=$(sha256sum "$backup_file" | awk '{print $1}')
        echo "$checksum" > "${backup_file}.sha256"
        
        # Upload to S3
        if command -v aws &> /dev/null; then
            echo -e "${YELLOW}Uploading to S3...${NC}"
            
            # Upload backup file
            aws s3 cp "$backup_file" "s3://$S3_BUCKET/$env_name/$(basename "$backup_file")" \
                --storage-class STANDARD_IA
            
            # Upload checksum
            aws s3 cp "${backup_file}.sha256" "s3://$S3_BUCKET/$env_name/$(basename "${backup_file}.sha256")"
            
            # Upload log file
            aws s3 cp "$BACKUP_DIR/backup_${env_name}_${TIMESTAMP}.log" \
                "s3://$S3_BUCKET/$env_name/logs/backup_${env_name}_${TIMESTAMP}.log"
            
            echo -e "${GREEN}✅ Backup uploaded to S3${NC}"
            
            # Clean up old backups
            cleanup_old_backups "$env_name"
        else
            echo -e "${RED}❌ AWS CLI not installed. Keeping local backup only.${NC}"
        fi
        
        # Verify backup
        echo -e "${YELLOW}Verifying backup integrity...${NC}"
        if gunzip -t "$backup_file"; then
            echo -e "${GREEN}✅ Backup integrity verified${NC}"
        else
            echo -e "${RED}❌ Backup integrity check failed!${NC}"
            return 1
        fi
        
    else
        echo -e "${RED}❌ Database backup failed!${NC}"
        return 1
    fi
}

# Function to clean up old backups
cleanup_old_backups() {
    local env_name=$1
    
    echo -e "\n${YELLOW}Cleaning up old backups (older than $RETENTION_DAYS days)...${NC}"
    
    # List and delete old backups from S3
    aws s3 ls "s3://$S3_BUCKET/$env_name/" | while read -r line; do
        create_date=$(echo "$line" | awk '{print $1" "$2}')
        create_date_epoch=$(date -d "$create_date" +%s 2>/dev/null || date -j -f "%Y-%m-%d %H:%M:%S" "$create_date" +%s)
        current_epoch=$(date +%s)
        age_days=$(( (current_epoch - create_date_epoch) / 86400 ))
        
        if [ "$age_days" -gt "$RETENTION_DAYS" ]; then
            file_name=$(echo "$line" | awk '{print $4}')
            echo "Deleting old backup: $file_name (age: $age_days days)"
            aws s3 rm "s3://$S3_BUCKET/$env_name/$file_name"
        fi
    done
}

# Function to list backups
list_backups() {
    echo -e "\n${YELLOW}Available backups:${NC}"
    
    for env in dev prod; do
        echo -e "\n${GREEN}$env environment:${NC}"
        aws s3 ls "s3://$S3_BUCKET/$env/" --recursive | grep -E "\.sql\.gz$" | tail -10
    done
}

# Function to restore backup
restore_backup() {
    local env_name=$1
    local backup_date=$2
    local target_db=$3
    
    echo -e "\n${YELLOW}Restoring backup...${NC}"
    echo -e "${RED}⚠️  WARNING: This will overwrite the target database!${NC}"
    echo "Environment: $env_name"
    echo "Backup date: $backup_date"
    echo "Target database: $target_db"
    echo -e "\nAre you sure? (type 'yes' to continue): \c"
    read -r confirmation
    
    if [ "$confirmation" != "yes" ]; then
        echo "Restore cancelled."
        return 0
    fi
    
    # Download backup from S3
    local backup_file="learnx_${env_name}_${backup_date}.sql.gz"
    echo -e "${YELLOW}Downloading backup from S3...${NC}"
    aws s3 cp "s3://$S3_BUCKET/$env_name/$backup_file" "$BACKUP_DIR/$backup_file"
    
    # Verify checksum
    aws s3 cp "s3://$S3_BUCKET/$env_name/${backup_file}.sha256" "$BACKUP_DIR/${backup_file}.sha256"
    local expected_checksum=$(cat "$BACKUP_DIR/${backup_file}.sha256")
    local actual_checksum=$(sha256sum "$BACKUP_DIR/$backup_file" | awk '{print $1}')
    
    if [ "$expected_checksum" != "$actual_checksum" ]; then
        echo -e "${RED}❌ Checksum verification failed!${NC}"
        return 1
    fi
    
    # Decompress backup
    echo -e "${YELLOW}Decompressing backup...${NC}"
    gunzip "$BACKUP_DIR/$backup_file"
    
    # Restore database
    echo -e "${YELLOW}Restoring database...${NC}"
    psql "$target_db" < "$BACKUP_DIR/${backup_file%.gz}"
    
    echo -e "${GREEN}✅ Database restored successfully${NC}"
}

# Main menu
case "${1:-backup}" in
    backup)
        # Determine which environment to backup
        ENV_TO_BACKUP=${2:-"all"}
        
        case "$ENV_TO_BACKUP" in
            dev)
                backup_database "dev" "$DEV_DATABASE_URL"
                ;;
            prod)
                backup_database "prod" "$PROD_DATABASE_URL"
                ;;
            all)
                backup_database "dev" "$DEV_DATABASE_URL"
                backup_database "prod" "$PROD_DATABASE_URL"
                ;;
            *)
                echo -e "${RED}Invalid environment: $ENV_TO_BACKUP${NC}"
                echo "Usage: $0 backup [dev|prod|all]"
                exit 1
                ;;
        esac
        ;;
        
    list)
        list_backups
        ;;
        
    restore)
        if [ $# -lt 4 ]; then
            echo "Usage: $0 restore <env> <backup_date> <target_database_url>"
            echo "Example: $0 restore prod 20240101_120000 'postgresql://...'"
            exit 1
        fi
        restore_backup "$2" "$3" "$4"
        ;;
        
    cleanup)
        cleanup_old_backups "dev"
        cleanup_old_backups "prod"
        ;;
        
    *)
        echo "Usage: $0 {backup|list|restore|cleanup} [options]"
        echo ""
        echo "Commands:"
        echo "  backup [dev|prod|all]  - Create backup of specified environment(s)"
        echo "  list                   - List available backups"
        echo "  restore <env> <date> <db_url> - Restore a specific backup"
        echo "  cleanup                - Remove old backups"
        exit 1
        ;;
esac

# Clean up local files older than 7 days
echo -e "\n${YELLOW}Cleaning up local backup files...${NC}"
find "$BACKUP_DIR" -name "*.sql.gz" -mtime +7 -delete
find "$BACKUP_DIR" -name "*.log" -mtime +7 -delete
find "$BACKUP_DIR" -name "*.sha256" -mtime +7 -delete

echo -e "\n${GREEN}✅ Backup operations completed${NC}"

# Create cron job suggestion
if [ "${1:-backup}" == "backup" ]; then
    echo -e "\n${YELLOW}To automate backups, add this to your crontab:${NC}"
    echo "# Daily backups at 2 AM"
    echo "0 2 * * * $PWD/$0 backup all >> /var/log/learnx-backup.log 2>&1"
    echo ""
    echo "# Weekly cleanup on Sundays at 3 AM"
    echo "0 3 * * 0 $PWD/$0 cleanup >> /var/log/learnx-backup.log 2>&1"
fi