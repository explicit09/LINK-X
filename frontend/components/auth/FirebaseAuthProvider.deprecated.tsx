/**
 * DEPRECATED: This file was used for Firebase authentication
 * It has been replaced by Supabase authentication
 * 
 * If you need an auth provider, use:
 * - /contexts/SupabaseAuthContext.tsx
 * - /app/(auth)/AuthContext.tsx
 * 
 * This file is kept for reference only and should be removed
 */

export function FirebaseAuthProvider({ children }: { children: React.ReactNode }) {
  console.warn('FirebaseAuthProvider is deprecated. Use SupabaseAuthProvider instead.');
  return <>{children}</>;
}