#!/bin/bash

# Update Auth Dependencies Script
# This script updates the authentication system to use modern Supabase SSR

echo "🔄 Updating Supabase authentication dependencies..."

# Remove deprecated package
npm uninstall @supabase/auth-helpers-nextjs

# Install new SSR package
npm install @supabase/ssr@^0.5.2

echo "✅ Dependencies updated successfully!"

echo "🧹 Cleaning up old build files..."
rm -rf .next
rm -rf node_modules/.cache

echo "✅ Auth system update complete!"
echo ""
echo "📋 Next steps:"
echo "   1. Run 'npm run dev' to start the development server"
echo "   2. Test login/logout functionality"
echo "   3. Verify Google OAuth still works"
echo "   4. Remove deprecated auth files when ready:"
echo "      - frontend/contexts/SupabaseAuthContext.tsx"
echo "      - frontend/app/(auth)/AuthContext.tsx"
echo "      - frontend/components/auth/AuthInitializer.tsx" 