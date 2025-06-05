/**
 * Global error handlers for common Firebase/IndexedDB issues
 */

/**
 * Handle IndexedDB errors that commonly occur with Firebase Auth
 */
export function handleIndexedDBError(error: any): boolean {
  if (
    error?.message?.includes('IndexedDB') ||
    error?.message?.includes('transaction') ||
    error?.message?.includes('object store') ||
    error?.code === 'auth/internal-error'
  ) {
    console.warn('IndexedDB error detected:', error.message);
    
    // Try to clear corrupted auth data
    try {
      if (typeof window !== 'undefined') {
        // Clear potentially corrupted Firebase persistence
        localStorage.removeItem('firebase:authUser:');
        localStorage.removeItem('firebase:persistence:');
        
        // Clear any auth state that might be corrupted
        const keys = Object.keys(localStorage);
        keys.forEach(key => {
          if (key.startsWith('firebase:') || key.includes('auth')) {
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
    
    return true; // Indicates this was an IndexedDB error
  }
  
  return false; // Not an IndexedDB error
}

/**
 * Setup global error handler for unhandled promise rejections
 */
export function setupGlobalErrorHandlers() {
  if (typeof window !== 'undefined') {
    // Handle unhandled promise rejections
    window.addEventListener('unhandledrejection', (event) => {
      if (handleIndexedDBError(event.reason)) {
        // Prevent the error from appearing in console as unhandled
        event.preventDefault();
        console.log('IndexedDB error handled gracefully');
      }
    });
    
    // Handle regular errors
    window.addEventListener('error', (event) => {
      if (handleIndexedDBError(event.error)) {
        event.preventDefault();
        console.log('IndexedDB error handled gracefully');
      }
    });
  }
}