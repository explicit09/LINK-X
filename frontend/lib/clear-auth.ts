// Utility to clear auth state - run this in browser console if needed
export function clearAuthState() {
  if (typeof window !== 'undefined') {
    localStorage.removeItem('authState');
  }
}

// You can run this in the browser console:
// localStorage.removeItem('authState');
