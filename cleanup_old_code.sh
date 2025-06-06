#!/bin/bash

# Cleanup script for removing S3 and manual embedding code
# Run this AFTER testing that Supabase Storage and automatic embeddings work

echo "🧹 Starting cleanup of old S3 and embedding code..."
echo "⚠️  This will delete ~2,000 lines of code across 10+ files"
echo ""
read -p "Have you tested that Supabase Storage uploads work? (y/n): " -n 1 -r
echo ""

if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    echo "❌ Cleanup cancelled. Test first with:"
    echo "   export USE_SUPABASE_STORAGE=true"
    echo "   ./test_supabase_upload.sh"
    exit 1
fi

echo ""
echo "📁 Creating backup directory..."
mkdir -p old_code_backup/$(date +%Y%m%d_%H%M%S)
BACKUP_DIR="old_code_backup/$(date +%Y%m%d_%H%M%S)"

# Function to safely delete files
safe_delete() {
    local file=$1
    if [ -f "$file" ]; then
        echo "  ↳ Backing up and removing: $file"
        cp "$file" "$BACKUP_DIR/" 2>/dev/null
        rm "$file"
    else
        echo "  ↳ Already removed: $file"
    fi
}

echo ""
echo "🤖 Step 1: Removing Embedding System Files (540+ lines)"
echo "========================================="

cd docker-image/src

# Primary embedding files
safe_delete "tasks/embedding.py"
safe_delete "services/ai/utils/embeddings.py"

echo ""
echo "📦 Step 2: Removing S3 Storage Files (1,450+ lines)"
echo "========================================="

# S3 service files
safe_delete "services/s3_storage.py"
safe_delete "services/s3_storage_resilient.py"
safe_delete "services/s3_signed_urls.py"

# AWS scripts
echo "  ↳ Removing AWS scripts directory..."
rm -rf scripts/aws/
cd ../..  # Back to LINK-X root

# Configuration files
safe_delete "docker-image/config/s3_cors_config.json"
safe_delete "docker-image/config/s3_cors_config_production.json"
safe_delete "scripts/update_s3_cors_production.sh"

echo ""
echo "📝 Step 3: Cleaning up imports and references"
echo "========================================="

cd docker-image/src

# Remove embedding imports from __init__.py files
if [ -f "tasks/__init__.py" ]; then
    echo "  ↳ Cleaning tasks/__init__.py"
    sed -i.bak '/from.*embedding.*import/d' tasks/__init__.py
    rm tasks/__init__.py.bak 2>/dev/null
fi

# Clean up celery_app.py
if [ -f "celery_app.py" ]; then
    echo "  ↳ Cleaning celery_app.py"
    # Remove embedding queue references
    sed -i.bak '/embeddings.*Queue/d' celery_app.py
    sed -i.bak '/embedding.*route/d' celery_app.py
    rm celery_app.py.bak 2>/dev/null
fi

# Clean up monitoring metrics
if [ -f "core/monitoring/metrics_definitions.py" ]; then
    echo "  ↳ Cleaning metrics definitions"
    sed -i.bak '/embedding_generation_duration/,+4d' core/monitoring/metrics_definitions.py
    rm core/monitoring/metrics_definitions.py.bak 2>/dev/null
fi

echo ""
echo "📋 Step 4: Update requirements.txt"
echo "========================================="

cd ../config

# Comment out dependencies that might only be used for S3/embeddings
echo "  ↳ Updating base.txt"
cp base.txt base.txt.backup

# Create new requirements without S3 dependencies
grep -v "boto3\|botocore" base.txt > base.txt.new

# Only remove Celery if you're sure it's not used elsewhere
read -p "Remove Celery dependencies? (only if not used elsewhere) (y/n): " -n 1 -r
echo ""
if [[ $REPLY =~ ^[Yy]$ ]]; then
    grep -v "celery\|flower\|redis\|hiredis" base.txt.new > base.txt.new2
    mv base.txt.new2 base.txt.new
fi

mv base.txt.new base.txt

echo ""
echo "🔍 Step 5: Verification"
echo "========================================="

# Check for remaining S3 imports
echo "Checking for remaining S3 imports..."
cd ../../
if grep -r "import boto3\|from boto3\|s3_storage\|s3_client" docker-image/src --include="*.py" | grep -v ".backup"; then
    echo "⚠️  Warning: Found remaining S3 imports that need manual cleanup"
else
    echo "✅ No S3 imports found"
fi

# Check for remaining embedding task imports
echo ""
echo "Checking for remaining embedding imports..."
if grep -r "from tasks.embedding\|import embedding\|generate_embeddings" docker-image/src --include="*.py" | grep -v ".backup"; then
    echo "⚠️  Warning: Found remaining embedding imports that need manual cleanup"
else
    echo "✅ No embedding imports found"
fi

echo ""
echo "📊 Summary"
echo "========================================="
echo "✅ Deleted embedding system files (2 files, ~300 lines)"
echo "✅ Deleted S3 storage files (8 files, ~1,450 lines)"
echo "✅ Cleaned up imports and references"
echo "✅ Updated requirements.txt"
echo "✅ Created backup in: $BACKUP_DIR"
echo ""
echo "🎉 Total code removed: ~2,000 lines!"
echo ""
echo "⚠️  Next steps:"
echo "1. Remove these environment variables from .env:"
echo "   - AWS_ACCESS_KEY_ID"
echo "   - AWS_SECRET_ACCESS_KEY"
echo "   - AWS_REGION"
echo "   - S3_BUCKET_NAME"
echo "   - S3_ENDPOINT_URL"
echo "   - CELERY_BROKER_URL (if not used elsewhere)"
echo "   - CELERY_RESULT_BACKEND (if not used elsewhere)"
echo ""
echo "2. Restart your backend to ensure everything still works"
echo "3. Run your test suite"
echo ""
echo "🔄 To restore if needed: cp -r $BACKUP_DIR/* ."