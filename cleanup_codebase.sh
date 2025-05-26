#!/bin/bash

# Cleanup script for LINK-X codebase
# Run with: ./cleanup_codebase.sh

echo "🧹 Starting LINK-X codebase cleanup..."

# Create archive directory for old docs
mkdir -p archived_docs
mkdir -p archived_docs/frontend_docs
mkdir -p archived_docs/implementation_docs

# Archive old documentation files
echo "📁 Archiving old documentation..."
mv -f ./coralx-frontend/FIXES_SUMMARY.md ./archived_docs/frontend_docs/ 2>/dev/null
mv -f ./coralx-frontend/OPTIMIZATION_SUMMARY.md ./archived_docs/frontend_docs/ 2>/dev/null
mv -f ./coralx-frontend/IMPLEMENTATION_SUMMARY.md ./archived_docs/frontend_docs/ 2>/dev/null
mv -f ./coralx-frontend/STATUS_UPDATE.md ./archived_docs/frontend_docs/ 2>/dev/null
mv -f ./coralx-frontend/REAL_DATA_IMPLEMENTATION.md ./archived_docs/frontend_docs/ 2>/dev/null
mv -f ./coralx-frontend/ASK_AI_WORKFLOW.md ./archived_docs/frontend_docs/ 2>/dev/null
mv -f ./coralx-frontend/TROUBLESHOOTING_ASK_AI.md ./archived_docs/frontend_docs/ 2>/dev/null
mv -f ./coralx-frontend/LEARN_PAGE_REDESIGN.md ./archived_docs/frontend_docs/ 2>/dev/null
mv -f ./coralx-frontend/UI_IMPROVEMENTS.md ./archived_docs/frontend_docs/ 2>/dev/null
mv -f ./coralx-frontend/ENHANCED_AI_FEATURES.md ./archived_docs/frontend_docs/ 2>/dev/null
mv -f ./coralx-frontend/test-onboarding-logic.md ./archived_docs/frontend_docs/ 2>/dev/null

mv -f ./FIXES_APPLIED.md ./archived_docs/implementation_docs/ 2>/dev/null
mv -f ./PERFORMANCE_FIX_SUMMARY.md ./archived_docs/implementation_docs/ 2>/dev/null
mv -f ./COURSE_STRUCTURE_FIX.md ./archived_docs/implementation_docs/ 2>/dev/null
mv -f ./FILE_UPLOAD_FIX.md ./archived_docs/implementation_docs/ 2>/dev/null
mv -f ./MODULE_FILE_FIXES.md ./archived_docs/implementation_docs/ 2>/dev/null
mv -f ./S3_MIGRATION_COMPLETE.md ./archived_docs/implementation_docs/ 2>/dev/null

# Remove test files from root
echo "🧪 Removing test files from root..."
rm -f ./test_file.txt
rm -f ./test_upload.txt
rm -f ./test_s3_setup.py
rm -f ./mock_backend.py

# Clean Python cache
echo "🐍 Cleaning Python cache..."
find . -type d -name "__pycache__" -exec rm -rf {} + 2>/dev/null
find . -type f -name "*.pyc" -delete
find . -type d -name ".pytest_cache" -exec rm -rf {} + 2>/dev/null
find . -type d -name "*.egg-info" -exec rm -rf {} + 2>/dev/null

# Clean up duplicate debug scripts
echo "🔧 Cleaning duplicate scripts..."
if [ -f "./docker-image/reset_db_content_force.py" ] && [ -f "./docker-image/reset_db_content.py" ]; then
    # Keep only the force version if both exist
    rm -f ./docker-image/reset_db_content.py
fi

# Create .gitignore entries if not present
echo "📝 Updating .gitignore..."
if ! grep -q "__pycache__" .gitignore 2>/dev/null; then
    echo -e "\n# Python cache\n__pycache__/\n*.pyc\n*.pyo\n*.pyd\n.pytest_cache/\n*.egg-info/" >> .gitignore
fi

if ! grep -q "archived_docs" .gitignore 2>/dev/null; then
    echo -e "\n# Archived documentation\narchived_docs/" >> .gitignore
fi

# Report on large files
echo -e "\n📊 Large files that could be moved to cloud storage:"
find ./documents -type f -size +1M -exec ls -lh {} \; | awk '{print $9, $5}'

# Summary
echo -e "\n✅ Cleanup complete!"
echo "📁 Old documentation archived to: ./archived_docs/"
echo "🗑️  Python cache files removed"
echo "🧪 Test files cleaned from root directory"

# Disk space saved estimation
if command -v du >/dev/null 2>&1; then
    echo -e "\n💾 Estimated space saved:"
    du -sh ./archived_docs/ 2>/dev/null || echo "Unable to calculate"
fi

echo -e "\n⚠️  Note: Large PDF files in ./documents/ can be moved to cloud storage to save more space"
echo "📦 Consider adding these to .gitignore after archiving"