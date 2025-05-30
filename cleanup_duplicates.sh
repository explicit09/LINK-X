#!/bin/bash

# LINK-X Project Cleanup Script
# Removes duplicate files, backups, and unnecessary files

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}🧹 LINK-X Project Cleanup Script${NC}"
echo "This script will remove duplicate and unnecessary files."
echo ""

# Critical security warning
echo -e "${RED}🚨 CRITICAL SECURITY WARNING:${NC}"
echo -e "docker-image/.env contains exposed Firebase private key!"
echo -e "This file will be ${RED}DELETED${NC} and replaced with secure template."
echo ""

read -p "Continue with cleanup? (y/N): " -n 1 -r
echo
if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    echo "Cleanup cancelled."
    exit 1
fi

echo -e "\n${YELLOW}Starting cleanup...${NC}"

# 1. Remove duplicate Dockerfiles
echo -e "\n${BLUE}1. Removing duplicate Dockerfiles...${NC}"
files_to_remove=(
    "docker-image/Dockerfile.optimized"
    "docker-image/docker/Dockerfile.multistage"
)

for file in "${files_to_remove[@]}"; do
    if [ -f "$file" ]; then
        echo "  ❌ Removing: $file"
        rm "$file"
    else
        echo "  ⚠️  Not found: $file"
    fi
done

# 2. Remove legacy/backup files
echo -e "\n${BLUE}2. Removing legacy and backup files...${NC}"
legacy_files=(
    "docker-image/src/app_legacy_backup.py"
    "docker-image/src/api/legacy.py"
    "docker-image/src/utils/legacy_tasks.py"
    "docker-image/src/api/legacy_routes.py"
)

for file in "${legacy_files[@]}"; do
    if [ -f "$file" ]; then
        echo "  ❌ Removing: $file"
        rm "$file"
    else
        echo "  ⚠️  Not found: $file"
    fi
done

# 3. Remove duplicate documentation
echo -e "\n${BLUE}3. Removing duplicate documentation...${NC}"
doc_files=(
    "docs/docker/REFACTORING_COMPLETE 2.md"
    "docs/docker/DOCKER_REFACTORING_COMPLETE.md"
)

for file in "${doc_files[@]}"; do
    if [ -f "$file" ]; then
        echo "  ❌ Removing: $file"
        rm "$file"
    else
        echo "  ⚠️  Not found: $file"
    fi
done

# 4. Remove old deployment script
echo -e "\n${BLUE}4. Removing old deployment script...${NC}"
if [ -f "deploy_production.sh" ]; then
    echo "  ❌ Removing: deploy_production.sh (keeping deploy_production_v2.sh)"
    rm "deploy_production.sh"
else
    echo "  ⚠️  Not found: deploy_production.sh"
fi

# 5. CRITICAL: Handle exposed environment file
echo -e "\n${RED}5. Handling exposed environment file...${NC}"
if [ -f "docker-image/.env" ]; then
    echo "  🚨 CRITICAL: Removing exposed .env file with Firebase keys!"
    rm "docker-image/.env"
    
    # Create secure replacement
    if [ -f ".env.example.secure" ]; then
        echo "  ✅ Creating secure .env from template"
        cp ".env.example.secure" "docker-image/.env"
        echo "  ⚠️  Remember to add your actual credentials to docker-image/.env"
    else
        echo "  ⚠️  Warning: .env.example.secure not found - manually create docker-image/.env"
    fi
else
    echo "  ⚠️  docker-image/.env not found"
fi

# Summary
echo -e "\n${GREEN}✅ Cleanup completed!${NC}"
echo ""
echo -e "${YELLOW}Summary of actions:${NC}"
echo "  • Removed duplicate Dockerfiles"
echo "  • Removed legacy/backup code files"
echo "  • Removed duplicate documentation"
echo "  • Removed old deployment script"
echo "  • 🚨 SECURED exposed environment file"
echo ""
echo -e "${YELLOW}Next steps:${NC}"
echo "  1. Update docker-image/.env with your actual credentials"
echo "  2. Consider consolidating docker-compose files"
echo "  3. Merge similar test scripts"
echo "  4. Review remaining documentation for duplicates"
echo ""
echo -e "${GREEN}🎉 Project is now cleaner and more secure!${NC}" 