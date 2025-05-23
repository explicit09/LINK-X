// This script helps with Firebase authentication in development environments
// It handles cross-origin authentication issues

(function() {
  // Check if we're on 127.0.0.1 and redirect to localhost equivalent
  if (window.location.hostname === '127.0.0.1') {
    const port = window.location.port;
    const path = window.location.pathname;
    const search = window.location.search;
    const localhostUrl = `http://localhost:${port}${path}${search}`;
    console.log('Redirecting from 127.0.0.1 to localhost for Firebase auth compatibility');
    window.location.href = localhostUrl;
  }

  // Send a message to the parent window if we're in an iframe
  if (window.parent !== window) {
    window.parent.postMessage({
      type: 'firebase-auth-helper-ready',
      origin: window.location.origin
    }, '*');
  }

  // Listen for messages from the parent window
  window.addEventListener('message', (event) => {
    if (event.data && event.data.type === 'firebase-auth-request') {
      // Respond to the parent window
      event.source.postMessage({
        type: 'firebase-auth-response',
        status: 'success',
        origin: window.location.origin
      }, event.origin);
    }
  });
})();
