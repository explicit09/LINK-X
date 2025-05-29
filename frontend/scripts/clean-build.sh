#!/bin/bash

# Clean Next.js build script for performance optimization
echo "🧹 Cleaning Next.js build artifacts..."

# Stop any running Next.js processes
echo "Stopping Next.js processes..."
pkill -f "next" 2>/dev/null || true

# Wait a moment for processes to stop
sleep 2

# Remove build artifacts
echo "Removing build directories..."
rm -rf .next
rm -rf out
rm -rf build
rm -rf .turbo

# Clear npm/yarn cache if needed
echo "Clearing package manager cache..."
if command -v pnpm &> /dev/null; then
    pnpm store prune
elif command -v yarn &> /dev/null; then
    yarn cache clean
else
    npm cache clean --force
fi

# Clear TypeScript build info
rm -f tsconfig.tsbuildinfo

echo "✅ Build cleanup complete!"
echo "💡 You can now run 'npm run dev' or 'pnpm dev' for optimized development" 