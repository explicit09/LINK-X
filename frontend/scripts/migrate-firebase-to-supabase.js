#!/usr/bin/env node

/**
 * Firebase to Supabase Migration Script
 * Automatically updates imports and auth calls
 */

const fs = require('fs');
const path = require('path');
const glob = require('glob');

// Mapping of Firebase imports to Supabase
const IMPORT_MAPPINGS = {
  // Firebase imports to remove/replace
  'firebase/app': null,
  'firebase/auth': '@/lib/auth/supabase-auth-service',
  'firebase/analytics': null,
  '@/firebaseconfig': '@/supabaseconfig',
  '@/firebase-config': '@/supabaseconfig',
  './firebaseconfig': '@/supabaseconfig',
  '../firebaseconfig': '@/supabaseconfig',
  '../../firebaseconfig': '@/supabaseconfig',
  '@/lib/auth/firebase-manager': '@/lib/auth/supabase-auth-service',
};

// Function name mappings
const FUNCTION_MAPPINGS = {
  // Firebase auth functions to Supabase
  'signInWithEmailAndPassword': 'signInWithEmail',
  'createUserWithEmailAndPassword': 'signUpWithEmail',
  'signInWithPopup': 'signInWithGoogle',
  'sendPasswordResetEmail': 'sendPasswordResetEmail',
  'updateProfile': 'updateProfile',
  'signOut': 'signOut',
  'onAuthStateChanged': 'onAuthStateChange',
  'getIdToken': 'getAccessToken',
};

// Component/Hook mappings
const COMPONENT_MAPPINGS = {
  'useAuthUser': 'useSupabaseAuth',
  'FirebaseAuthProvider': 'SupabaseAuthProvider',
  'useFirebaseAuth': 'useSupabaseAuth',
  'AuthContext': 'SupabaseAuthContext',
};

function updateFile(filePath) {
  let content = fs.readFileSync(filePath, 'utf8');
  let hasChanges = false;

  // Update imports
  Object.entries(IMPORT_MAPPINGS).forEach(([oldImport, newImport]) => {
    const importRegex = new RegExp(`from ['"]${oldImport}['"]`, 'g');
    if (content.match(importRegex)) {
      if (newImport) {
        content = content.replace(importRegex, `from '${newImport}'`);
      } else {
        // Remove the entire import line
        content = content.replace(new RegExp(`.*from ['"]${oldImport}['"].*\n`, 'g'), '');
      }
      hasChanges = true;
    }
  });

  // Update Firebase specific imports
  const firebaseImportRegex = /import\s*{\s*([^}]+)\s*}\s*from\s*['"]firebase\/auth['"]/g;
  const matches = content.match(firebaseImportRegex);
  if (matches) {
    matches.forEach(match => {
      const imports = match.match(/{\s*([^}]+)\s*}/)[1];
      const importList = imports.split(',').map(i => i.trim());
      
      const newImports = importList.filter(imp => {
        const cleanImport = imp.split(' as ')[0].trim();
        return FUNCTION_MAPPINGS[cleanImport] || cleanImport === 'User';
      });

      if (newImports.length > 0) {
        const newImportStatement = `import { ${newImports.join(', ')} } from '@/lib/auth/supabase-auth-service'`;
        content = content.replace(match, newImportStatement);
      } else {
        content = content.replace(match + '\n', '');
      }
    });
    hasChanges = true;
  }

  // Update function calls
  Object.entries(FUNCTION_MAPPINGS).forEach(([oldFunc, newFunc]) => {
    const funcRegex = new RegExp(`\\b${oldFunc}\\b`, 'g');
    if (content.match(funcRegex)) {
      content = content.replace(funcRegex, newFunc);
      hasChanges = true;
    }
  });

  // Update component/hook names
  Object.entries(COMPONENT_MAPPINGS).forEach(([oldName, newName]) => {
    const nameRegex = new RegExp(`\\b${oldName}\\b`, 'g');
    if (content.match(nameRegex)) {
      content = content.replace(nameRegex, newName);
      hasChanges = true;
    }
  });

  // Update Firebase-specific patterns
  
  // auth.currentUser -> user (from useAuth hook)
  content = content.replace(/auth\.currentUser/g, 'user');
  
  // GoogleAuthProvider -> handled by signInWithGoogle
  content = content.replace(/new GoogleAuthProvider\(\)/g, '{}');
  
  // User type from Firebase
  content = content.replace(/User as FirebaseUser/g, 'AuthUser');
  content = content.replace(/import.*User.*from ['"]firebase\/auth['"]/g, "import { AuthUser } from '@/lib/auth/supabase-auth-service'");

  // getAuth() calls
  content = content.replace(/getAuth\(\)/g, 'authService');

  // initializeApp calls - remove them
  content = content.replace(/.*initializeApp\(.*\).*\n/g, '');

  // Analytics - remove for now
  content = content.replace(/.*getAnalytics\(.*\).*\n/g, '');
  content = content.replace(/.*logEvent\(.*\).*\n/g, '');

  if (hasChanges) {
    fs.writeFileSync(filePath, content);
    console.log(`✅ Updated: ${filePath}`);
    return true;
  }
  return false;
}

function migrateFiles() {
  console.log('🚀 Starting Firebase to Supabase migration...\n');

  // Find all TypeScript/JavaScript files
  const files = glob.sync('**/*.{ts,tsx,js,jsx}', {
    ignore: ['node_modules/**', '.next/**', 'scripts/**', 'coverage/**'],
    cwd: path.join(__dirname, '..'),
    absolute: true,
  });

  let updatedCount = 0;
  files.forEach(file => {
    if (updateFile(file)) {
      updatedCount++;
    }
  });

  console.log(`\n✨ Migration complete! Updated ${updatedCount} files.`);
  
  // List files that might need manual review
  console.log('\n📋 Files that may need manual review:');
  const reviewFiles = [
    'app/(auth)/AuthContext.tsx',
    'components/auth/FirebaseAuthProvider.tsx',
    'lib/auth-service.ts',
    'hooks/useAuthUser.ts',
  ];
  
  reviewFiles.forEach(file => {
    const fullPath = path.join(__dirname, '..', file);
    if (fs.existsSync(fullPath)) {
      console.log(`  - ${file}`);
    }
  });

  console.log('\n🎯 Next steps:');
  console.log('1. Remove Firebase dependencies: npm uninstall firebase');
  console.log('2. Install Supabase: npm install @supabase/supabase-js');
  console.log('3. Update environment variables (.env.local)');
  console.log('4. Test authentication flows');
}

// Run migration
migrateFiles();