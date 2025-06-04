#!/usr/bin/env node

/**
 * Script to get authentication token for testing
 * 
 * There are several ways to get a valid auth token:
 * 
 * 1. From Browser DevTools (Easiest):
 *    - Log into the LEARN-X application at http://localhost:3000
 *    - Open Browser DevTools (F12)
 *    - Go to Application/Storage > Local Storage > http://localhost:3000
 *    - Look for 'authToken' or similar keys
 *    - Or go to Network tab, find any API request, and copy the Authorization header
 * 
 * 2. From Firebase Console:
 *    - The Firebase token is in the browser after login
 *    - In DevTools Console, run: firebase.auth().currentUser.getIdToken().then(token => console.log(token))
 * 
 * 3. Using this script (requires existing auth):
 *    - This script will attempt to get the token from your current session
 */

console.log(`
===========================================
How to Get an Auth Token for Testing
===========================================

OPTION 1: Browser DevTools (Recommended)
----------------------------------------
1. Open LEARN-X in your browser: http://localhost:3000
2. Log in with your account
3. Open DevTools (F12)
4. Try one of these methods:

   Method A - Network Tab:
   • Go to Network tab
   • Refresh the page or trigger any API call
   • Click on any request to the backend (8080)
   • Look in Request Headers for:
     - Authorization: Bearer <token>
     - X-Firebase-Token: <token>
   • Copy the token value

   Method B - Console:
   • Go to Console tab
   • Run this command:
     firebase.auth().currentUser?.getIdToken().then(token => {
       console.log('Your Firebase token:');
       console.log(token);
       navigator.clipboard.writeText(token);
       console.log('Token copied to clipboard!');
     });

   Method C - Application Tab:
   • Go to Application/Storage tab
   • Look in Local Storage for localhost:3000
   • Find keys like 'authToken', 'firebaseToken', etc.

OPTION 2: Create Test Token (Development)
-----------------------------------------
For testing, you can use the test user credentials:
• Email: student@test.com
• Password: Test123!

Or create a new account through the UI.

OPTION 3: Use Backend Test Endpoint
------------------------------------
If you have access to the backend shell:

docker-compose exec backend python
>>> from core.firebase_config import initialize_firebase
>>> from firebase_admin import auth
>>> initialize_firebase()
>>> # Create a custom token for testing
>>> custom_token = auth.create_custom_token('test-user-123')
>>> print(custom_token.decode())

===========================================
Testing the Token
===========================================

Once you have a token, test it with:

1. Browser test page:
   http://localhost:3000/test-personalization-sse.html
   
2. Command line:
   export TOKEN="your-token-here"
   export FILE_ID="your-file-id"  # Get from the UI or database
   node test-enhanced-personalization.js

3. Direct curl test:
   curl -H "Authorization: Bearer YOUR_TOKEN" \\
        http://localhost:8080/api/v2/auth/me

===========================================
`);

// If running in a browser-like environment, try to get the token
if (typeof window !== 'undefined' && window.firebase) {
  window.firebase.auth().currentUser?.getIdToken().then(token => {
    console.log('\nCurrent user token found:');
    console.log(token);
  }).catch(err => {
    console.log('\nNo active Firebase session found.');
  });
}