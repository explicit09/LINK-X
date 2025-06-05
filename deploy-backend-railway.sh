#!/bin/bash

# LEARN-X Backend Railway Deployment Script
# This script helps prepare and deploy the backend to Railway

echo "🚂 LEARN-X Backend Railway Deployment Script"
echo "==========================================="

# Check if we're in the right directory
if [ ! -f "docker-image/requirements.txt" ]; then
    echo "❌ Error: Must run from project root directory"
    exit 1
fi

# Check if Railway CLI is installed
if ! command -v railway &> /dev/null; then
    echo "⚠️  Railway CLI not found."
    echo "Install with: npm i -g @railway/cli"
    echo ""
    echo "Continuing with GitHub deployment method..."
fi

# Function to validate environment
validate_environment() {
    echo "🔍 Validating backend environment..."
    
    cd docker-image
    
    # Check Python syntax
    echo "Checking Python syntax..."
    find src -name "*.py" -exec python -m py_compile {} \; 2>&1 | grep -E "SyntaxError|Error" && {
        echo "❌ Python syntax errors found!"
        return 1
    }
    
    # Check for missing imports
    echo "Checking imports..."
    python -c "
import sys
sys.path.insert(0, 'src')
try:
    from app import app
    print('✅ Main app imports successfully')
except ImportError as e:
    print(f'❌ Import error: {e}')
    sys.exit(1)
"
    
    cd ..
    return 0
}

# Function to check required files
check_required_files() {
    echo "📋 Checking required files..."
    
    required_files=(
        "railway.json"
        "railway.toml"
        "docker-image/docker/Dockerfile.railway"
        "docker-image/requirements.txt"
        "docker-image/src/app.py"
    )
    
    missing_files=()
    
    for file in "${required_files[@]}"; do
        if [ ! -f "$file" ]; then
            missing_files+=($file)
        fi
    done
    
    if [ ${#missing_files[@]} -ne 0 ]; then
        echo "❌ Missing required files:"
        printf '%s\n' "${missing_files[@]}"
        return 1
    else
        echo "✅ All required files present"
        return 0
    fi
}

# Function to create .env template
create_env_template() {
    echo "📝 Creating environment variables template..."
    
    cat > railway-env-template.txt << 'EOF'
# Database
DATABASE_URL=postgresql://postgres:password@postgres.railway.internal:5432/railway
REDIS_URL=redis://default:password@redis.railway.internal:6379

# Flask Configuration
FLASK_ENV=production
SECRET_KEY=your-secret-key-here
JWT_SECRET_KEY=your-jwt-secret-key-here

# OpenAI Configuration
OPENAI_API_KEY=your-openai-api-key

# AWS S3 Configuration
AWS_ACCESS_KEY_ID=your-aws-access-key
AWS_SECRET_ACCESS_KEY=your-aws-secret-key
AWS_REGION=us-east-1
S3_BUCKET_NAME=your-s3-bucket-name
USE_S3_STORAGE=true

# Firebase Admin SDK (paste your service account JSON)
FIREBASE_ADMIN_CREDENTIALS={}

# CORS Configuration (add your Vercel URL)
CORS_ORIGINS=https://your-app.vercel.app

# Feature Flags
ENABLE_REDIS_CACHE=true
ENABLE_RATE_LIMITING=true

# Gunicorn Configuration
GUNICORN_WORKERS=4
GUNICORN_THREADS=2
GUNICORN_TIMEOUT=120
EOF
    
    echo "✅ Created railway-env-template.txt"
    echo "   Copy these to Railway dashboard!"
}

# Main deployment flow
echo ""
echo "🚀 Starting deployment preparation..."
echo ""

# Validate environment
if ! validate_environment; then
    echo "❌ Environment validation failed"
    exit 1
fi

# Check required files
if ! check_required_files; then
    echo "❌ Required files missing"
    exit 1
fi

# Create env template
create_env_template

echo ""
echo "✅ Backend is ready for Railway deployment!"
echo ""
echo "📋 Next Steps:"
echo ""
echo "1. Push to GitHub:"
echo "   git add ."
echo "   git commit -m 'feat: Add Railway backend configuration'"
echo "   git push origin main"
echo ""
echo "2. Create Railway Project:"
echo "   - Go to https://railway.app/new"
echo "   - Click 'Deploy from GitHub repo'"
echo "   - Select your repository"
echo "   - Choose 'docker-image' as root directory"
echo ""
echo "3. Add Services:"
echo "   - Click 'New' → 'Database' → 'PostgreSQL'"
echo "   - Click 'New' → 'Database' → 'Redis'"
echo ""
echo "4. Configure Environment Variables:"
echo "   - Copy from railway-env-template.txt"
echo "   - Update with your actual values"
echo "   - Add your Vercel frontend URL to CORS_ORIGINS"
echo ""
echo "5. Deploy:"
echo "   - Railway will auto-deploy on git push"
echo "   - Monitor logs in Railway dashboard"
echo ""

# If Railway CLI is available, offer to create project
if command -v railway &> /dev/null; then
    echo "🚂 Railway CLI detected!"
    echo ""
    read -p "Would you like to create a Railway project now? (y/n): " create_project
    
    if [ "$create_project" = "y" ]; then
        echo "Creating Railway project..."
        railway login
        railway init
        echo ""
        echo "✅ Railway project created!"
        echo "   Run 'railway up' to deploy"
    fi
fi

echo ""
echo "📚 Documentation:"
echo "   - Backend deployment guide: docs/deployment/RAILWAY_BACKEND_DEPLOYMENT.md"
echo "   - Frontend deployment guide: docs/deployment/VERCEL_DEPLOYMENT_GUIDE.md"
echo ""
echo "🎉 Good luck with your deployment!"