// Force Authentication Fix - Run this in your browser console
// Go to http://localhost:3001, open browser console (F12), and paste this code

console.log('🔧 Starting Force Authentication Fix...');

async function forceAuthFix() {
    try {
        // Step 1: Check if Firebase is available
        if (typeof firebase === 'undefined' && typeof window.firebase === 'undefined') {
            console.error('❌ Firebase not found. Make sure you\'re on the main app page.');
            return false;
        }

        // Step 2: Get Firebase auth instance
        const auth = window.firebase?.auth?.() || firebase.auth();
        const currentUser = auth.currentUser;

        if (!currentUser) {
            console.log('⚠️ No Firebase user found. Please sign in first.');
            console.log('Go to: http://localhost:3001/login');
            return false;
        }

        console.log(`✅ Firebase user found: ${currentUser.email}`);

        // Step 3: Get fresh Firebase token
        console.log('🎫 Getting fresh authentication token...');
        const idToken = await currentUser.getIdToken(true);
        console.log('✅ Got Firebase token');

        // Step 4: Establish backend session
        console.log('🔗 Establishing backend session...');
        const sessionResponse = await fetch('http://localhost:8080/api/v1/auth/sessionLogin', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ idToken }),
            credentials: 'include',
        });

        console.log(`Session response: ${sessionResponse.status}`);

        if (!sessionResponse.ok) {
            if (sessionResponse.status === 404) {
                console.log('⚠️ User needs to complete registration');
                console.log('Please complete registration in your app first');
                return false;
            }
            throw new Error(`Session failed: ${sessionResponse.status}`);
        }

        const sessionData = await sessionResponse.json();
        console.log('✅ Backend session established');

        // Step 5: Update localStorage with auth state
        console.log('💾 Updating local authentication state...');
        const authState = {
            isAuthenticated: true,
            isRegistered: true,
            tokens: {
                accessToken: sessionData.access_token || sessionData.token,
                expiresAt: Date.now() + 24 * 60 * 60 * 1000, // 24 hours
            },
            user: sessionData.user || null,
        };

        localStorage.setItem('authState', JSON.stringify(authState));
        console.log('✅ Auth state saved to localStorage');

        // Step 6: Test file access
        console.log('📁 Testing file access...');
        const testResponse = await fetch('http://localhost:8080/api/v1/auth/me', {
            headers: {
                'Authorization': `Bearer ${idToken}`,
                'Content-Type': 'application/json',
            },
            credentials: 'include',
        });

        if (testResponse.ok) {
            console.log('🎉 SUCCESS! Authentication fixed!');
            console.log('✅ File access should now work');
            console.log('🔄 Refresh the page to see the changes');
            return true;
        } else {
            throw new Error(`Auth test failed: ${testResponse.status}`);
        }

    } catch (error) {
        console.error('❌ Authentication fix failed:', error);
        console.log('💡 Try these steps:');
        console.log('1. Make sure you\'re signed in to Firebase');
        console.log('2. Go to http://localhost:3001/login if not signed in');
        console.log('3. Run this script again');
        return false;
    }
}

// Auto-run the fix
forceAuthFix().then(success => {
    if (success) {
        console.log('');
        console.log('🎯 NEXT STEPS:');
        console.log('1. Refresh this page (Ctrl+R or Cmd+R)');
        console.log('2. Try viewing files again');
        console.log('3. The 401 errors should be gone!');
        console.log('');
    }
});

// Also expose the function for manual use
window.forceAuthFix = forceAuthFix; 