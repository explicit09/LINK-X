#!/bin/bash

# LEARN-X Vercel Deployment Script
# This script helps prepare and deploy the frontend to Vercel

echo "🚀 LEARN-X Vercel Deployment Script"
echo "=================================="

# Check if we're in the right directory
if [ ! -f "frontend/package.json" ]; then
    echo "❌ Error: Must run from project root directory"
    exit 1
fi

# Check if Vercel CLI is installed
if ! command -v vercel &> /dev/null; then
    echo "❌ Vercel CLI not found. Install with: npm i -g vercel"
    exit 1
fi

# Function to check environment variables
check_env_vars() {
    echo "📋 Checking environment variables..."
    
    required_vars=(
        "NEXT_PUBLIC_API_URL"
        "NEXT_PUBLIC_FIREBASE_API_KEY"
        "NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN"
        "NEXT_PUBLIC_FIREBASE_PROJECT_ID"
    )
    
    missing_vars=()
    
    for var in "${required_vars[@]}"; do
        if [ -z "${!var}" ]; then
            missing_vars+=($var)
        fi
    done
    
    if [ ${#missing_vars[@]} -ne 0 ]; then
        echo "⚠️  Warning: Missing environment variables:"
        printf '%s\n' "${missing_vars[@]}"
        echo ""
        echo "Make sure to set these in Vercel Dashboard!"
    else
        echo "✅ All required environment variables are set"
    fi
}

# Build frontend locally to check for errors
echo "🔨 Building frontend locally..."
cd frontend

# Clean previous builds
echo "🧹 Cleaning previous builds..."
rm -rf .next
rm -rf node_modules/.cache

# Install dependencies
echo "📦 Installing dependencies..."
npm install

# Run type checking
echo "🔍 Running type check..."
npm run type-check
if [ $? -ne 0 ]; then
    echo "❌ Type checking failed. Fix errors before deploying."
    exit 1
fi

# Run linting
echo "🔍 Running linter..."
npm run lint
if [ $? -ne 0 ]; then
    echo "❌ Linting failed. Run 'npm run lint:fix' to auto-fix."
    exit 1
fi

# Build the project
echo "🏗️  Building project..."
npm run build
if [ $? -ne 0 ]; then
    echo "❌ Build failed. Check error messages above."
    exit 1
fi

echo "✅ Local build successful!"
echo ""

# Deploy to Vercel
echo "🚀 Deploying to Vercel..."
echo "Choose deployment type:"
echo "1) Production deployment"
echo "2) Preview deployment"
echo "3) Skip deployment (just build locally)"

read -p "Enter choice (1-3): " choice

case $choice in
    1)
        echo "🌟 Deploying to production..."
        vercel --prod
        ;;
    2)
        echo "👁️  Creating preview deployment..."
        vercel
        ;;
    3)
        echo "✅ Build complete. Skipping deployment."
        ;;
    *)
        echo "❌ Invalid choice"
        exit 1
        ;;
esac

echo ""
echo "🎉 Deployment process complete!"
echo ""
echo "📝 Post-deployment checklist:"
echo "  [ ] Test authentication flow"
echo "  [ ] Verify API connections"
echo "  [ ] Check file uploads work"
echo "  [ ] Test gamification features"
echo "  [ ] Verify responsive design"
echo "  [ ] Monitor error logs"

cd ..