#!/bin/bash

# Test file processing directly

echo "🔍 Testing file processing..."

# First, get the most recent file ID from Supabase
# You'll need to replace FILE_ID with an actual file ID from your database
FILE_ID="YOUR_FILE_ID_HERE"

# Get auth token (you may need to login first)
AUTH_TOKEN="YOUR_AUTH_TOKEN_HERE"

# Test the /process endpoint
echo "📤 Sending process request..."
curl -X POST "http://localhost:8000/api/v2/files/${FILE_ID}/process" \
  -H "Authorization: Bearer ${AUTH_TOKEN}" \
  -H "Content-Type: application/json" \
  -d '{"priority": "high", "processing_type": "full"}' \
  -v

echo -e "\n\n✅ Request sent. Check:"
echo "1. Backend logs for processing activity"
echo "2. processing_queue table for new entry"
echo "3. file_chunks table for created chunks"
echo "4. files table for updated processed status"