#!/bin/bash
# Kill any existing Next.js processes
pkill -f "next dev" || true

# Clear Next.js cache
rm -rf .next

# Start dev server
npm run dev