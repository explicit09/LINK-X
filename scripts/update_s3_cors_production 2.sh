#!/bin/bash

# Script to update S3 CORS configuration for production
# Usage: ./update_s3_cors_production.sh

set -e

# Colors for output
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo -e "${YELLOW}Updating S3 CORS Configuration for Production${NC}"
echo "================================================"

# Check if AWS CLI is installed
if ! command -v aws &> /dev/null; then
    echo -e "${RED}Error: AWS CLI is not installed${NC}"
    echo "Please install AWS CLI: https://aws.amazon.com/cli/"
    exit 1
fi

# Check if required environment variables are set
if [ -z "$S3_BUCKET_NAME" ]; then
    echo -e "${RED}Error: S3_BUCKET_NAME environment variable is not set${NC}"
    exit 1
fi

# Determine which CORS config to use based on environment
if [ "$FLASK_ENV" == "production" ] || [ "$NODE_ENV" == "production" ]; then
    CORS_CONFIG_FILE="docker-image/config/s3_cors_config_production.json"
    echo -e "${GREEN}Using production CORS configuration${NC}"
else
    CORS_CONFIG_FILE="docker-image/config/s3_cors_config.json"
    echo -e "${YELLOW}Using development CORS configuration${NC}"
fi

# Check if CORS config file exists
if [ ! -f "$CORS_CONFIG_FILE" ]; then
    echo -e "${RED}Error: CORS configuration file not found: $CORS_CONFIG_FILE${NC}"
    exit 1
fi

echo -e "\nCORS Configuration to apply:"
cat "$CORS_CONFIG_FILE" | jq '.'

# Confirm before applying
echo -e "\n${YELLOW}This will update CORS for bucket: $S3_BUCKET_NAME${NC}"
read -p "Are you sure you want to continue? (y/n) " -n 1 -r
echo
if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    echo -e "${RED}Aborted${NC}"
    exit 1
fi

# Apply CORS configuration
echo -e "\n${GREEN}Applying CORS configuration...${NC}"
aws s3api put-bucket-cors \
    --bucket "$S3_BUCKET_NAME" \
    --cors-configuration "file://$CORS_CONFIG_FILE"

if [ $? -eq 0 ]; then
    echo -e "${GREEN}✅ CORS configuration updated successfully!${NC}"
    
    # Verify the configuration
    echo -e "\n${YELLOW}Verifying CORS configuration...${NC}"
    aws s3api get-bucket-cors --bucket "$S3_BUCKET_NAME" | jq '.'
    
    echo -e "\n${GREEN}✅ CORS configuration verified!${NC}"
else
    echo -e "${RED}❌ Failed to update CORS configuration${NC}"
    exit 1
fi

echo -e "\n${YELLOW}Important Notes:${NC}"
echo "1. CORS changes may take a few minutes to propagate"
echo "2. Clear browser cache if you experience CORS issues"
echo "3. Test file uploads from your production domain"
echo "4. Monitor browser console for any CORS errors"

# Additional security recommendations
echo -e "\n${YELLOW}Security Recommendations:${NC}"
echo "1. Review and restrict AllowedOrigins to only necessary domains"
echo "2. Limit AllowedHeaders to required headers only"
echo "3. Consider using CloudFront for additional security"
echo "4. Enable S3 bucket logging for security monitoring"