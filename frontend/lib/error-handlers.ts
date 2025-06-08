/**
 * Global error handlers for common application issues
 */

/**
 * Handle common storage/persistence errors
 */
export function handleStorageError(error: any): boolean {
  if (
    error?.message?.includes('IndexedDB') ||
    error?.message?.includes('transaction') ||
    error?.message?.includes('object store')
  ) {
    console.warn('Storage error detected:', error.message);
    
    // Try to clear any corrupted auth data
    try {
      if (typeof window !== 'undefined') {
        // Clear any Supabase auth data that might be corrupted
        const keys = Object.keys(localStorage);
        keys.forEach(key => {
          if (key.includes('supabase.auth')) {
            try {
              localStorage.removeItem(key);
            } catch (e) {
              console.warn('Failed to clear auth key:', key);
            }
          }
        });
      }
    } catch (cleanupError) {
      console.warn('Failed to cleanup corrupted auth data:', cleanupError);
    }
    
    return true; // Indicates this was a storage error
  }
  
  return false; // Not a storage error
}

/**
 * Setup global error handler for unhandled promise rejections
 */
export function setupGlobalErrorHandlers() {
  if (typeof window !== 'undefined') {
    // Handle unhandled promise rejections
    window.addEventListener('unhandledrejection', (event) => {
      if (handleStorageError(event.reason)) {
        // Prevent the error from appearing in console as unhandled
        event.preventDefault();
        console.log('Storage error handled gracefully');
      }
    });
    
    // Handle regular errors
    window.addEventListener('error', (event) => {
      if (handleStorageError(event.error)) {
        event.preventDefault();
        console.log('Storage error handled gracefully');
      }
    });
  }
}