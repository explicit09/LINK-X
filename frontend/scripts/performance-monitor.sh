#!/bin/bash

# Performance monitoring script for Next.js
echo "📊 Next.js Performance Monitor"
echo "================================"

# Check if .next directory exists
if [ -d ".next" ]; then
    echo "📁 Build Directory Analysis:"
    echo "  Size: $(du -sh .next | cut -f1)"
    echo "  Files: $(find .next -type f | wc -l | tr -d ' ')"
    echo ""
    
    # Check cache size
    if [ -d ".next/cache" ]; then
        echo "💾 Cache Analysis:"
        echo "  Cache size: $(du -sh .next/cache | cut -f1)"
        echo "  Cache files: $(find .next/cache -type f | wc -l | tr -d ' ')"
        echo ""
    fi
    
    # Check static files
    if [ -d ".next/static" ]; then
        echo "📦 Static Assets:"
        echo "  Static size: $(du -sh .next/static | cut -f1)"
        echo ""
    fi
else
    echo "❌ No .next directory found. Run 'npm run build' first."
    echo ""
fi

# Check node_modules size
if [ -d "node_modules" ]; then
    echo "📚 Dependencies:"
    echo "  node_modules size: $(du -sh node_modules | cut -f1)"
    echo ""
fi

# Memory usage recommendations
echo "💡 Performance Tips:"
echo "  • Run 'npm run clean' to clear build cache"
echo "  • Use 'npm run dev:fast' for optimized development"
echo "  • Monitor .next directory size (keep under 100MB for best performance)"
echo "  • Consider using 'npm run build:analyze' to analyze bundle size"

# Check for performance issues
if [ -d ".next" ]; then
    SIZE_MB=$(du -sm .next | cut -f1)
    if [ "$SIZE_MB" -gt 200 ]; then
        echo ""
        echo "⚠️  WARNING: .next directory is large (${SIZE_MB}MB)"
        echo "   Consider running 'npm run clean' to improve performance"
    fi
fi 