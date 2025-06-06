#!/usr/bin/env node
/**
 * Authentication Fix Script
 * This script helps debug and fix authentication issues
 */

const path = require('path');
const fs = require('fs');

console.log('🔧 LEARN-X Authentication Fix Script\n');

// Check if we're in the right directory
const frontendPath = process.cwd().includes('frontend') ? '.' : './frontend';
const packageJsonPath = path.join(frontendPath, 'package.json');

if (!fs.existsSync(packageJsonPath)) {
  console.error('❌ Error: Could not find frontend directory.');
  console.error('   Please run this script from the project root or frontend directory.');
  process.exit(1);
}

console.log('✅ Found frontend directory');

// Check environment variables
const envPath = path.join(frontendPath, '.env.local');
if (!fs.existsSync(envPath)) {
  console.error('❌ Error: .env.local file not found');
  console.error('   Please ensure your environment variables are configured.');
  process.exit(1);
}

const envContent = fs.readFileSync(envPath, 'utf8');
const hasSupabaseUrl = envContent.includes('NEXT_PUBLIC_SUPABASE_URL');
const hasSupabaseKey = envContent.includes('NEXT_PUBLIC_SUPABASE_ANON_KEY');

if (!hasSupabaseUrl || !hasSupabaseKey) {
  console.error('❌ Error: Missing Supabase environment variables');
  console.error('   Please ensure NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY are set.');
  process.exit(1);
}

console.log('✅ Environment variables configured');

// Check key files exist
const keyFiles = [
  'supabaseconfig.ts',
  'app/auth/callback/page.tsx',
  'lib/auth/supabase-auth-service.ts',
  'lib/auth-service.ts'
];

let missingFiles = [];
for (const file of keyFiles) {
  const filePath = path.join(frontendPath, file);
  if (!fs.existsSync(filePath)) {
    missingFiles.push(file);
  }
}

if (missingFiles.length > 0) {
  console.error('❌ Error: Missing authentication files:');
  missingFiles.forEach(file => console.error(`   - ${file}`));
  process.exit(1);
}

console.log('✅ All authentication files present');

// Provide troubleshooting steps
console.log('\n🛠️  Troubleshooting Steps:\n');

console.log('1. Clear browser storage:');
console.log('   - Open browser DevTools (F12)');
console.log('   - Go to Application/Storage tab');
console.log('   - Clear Local Storage and Session Storage');
console.log('   - Refresh the page\n');

console.log('2. Test authentication:');
console.log('   - Navigate to: http://localhost:3001/test-auth-fix');
console.log('   - Try the "Clear Storage" button');
console.log('   - Try the "Test Google OAuth" button\n');

console.log('3. Check Supabase configuration:');
console.log('   - Go to: https://supabase.com/dashboard/project/torsffahnivnzcnjnxgc/auth/settings');
console.log('   - Verify these redirect URLs are configured:');
console.log('     - http://localhost:3001/auth/callback');
console.log('     - http://localhost:3000/auth/callback');
console.log('     - http://localhost:3001/test-auth-fix');
console.log('     - Your production domain/auth/callback\n');

console.log('4. OAuth Provider Settings:');
console.log('   - Ensure Google OAuth is enabled in Supabase');
console.log('   - Check that the OAuth redirect URIs match\n');

console.log('5. Check logs:');
console.log('   - Open browser console during login');
console.log('   - Look for error messages');
console.log('   - Check the Network tab for failed requests\n');

console.log('🎯 Quick Fixes Applied:');
console.log('✅ Updated OAuth flow from implicit to PKCE');
console.log('✅ Added session validation in callback');
console.log('✅ Added storage clearing functionality');
console.log('✅ Added better error handling');
console.log('✅ Increased timeout for OAuth callback');

console.log('\n🚀 Start the development server:');
console.log('   cd frontend && npm run dev');
console.log('\n📝 If issues persist, check the console logs and share them for further debugging.'); 