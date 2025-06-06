// Run this in your browser console where you're logged into the LEARN-X app

// Method 1: Get from Supabase localStorage
const supabaseToken = localStorage.getItem('sb-torsffahnivnzcnjnxgc-auth-token');
if (supabaseToken) {
    try {
        const parsed = JSON.parse(supabaseToken);
        console.log('=== Supabase Session Found ===');
        console.log('User ID:', parsed.user?.id);
        console.log('Email:', parsed.user?.email);
        console.log('Access Token:', parsed.access_token);
        console.log('\nCopy this token for testing:');
        console.log(parsed.access_token);
    } catch (e) {
        console.log('Could not parse Supabase token');
    }
} else {
    console.log('No Supabase token found in localStorage');
}

// Method 2: Check for any auth-related items
console.log('\n=== All localStorage keys ===');
for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i);
    if (key.includes('auth') || key.includes('token') || key.includes('supabase')) {
        console.log(key, ':', localStorage.getItem(key).substring(0, 100) + '...');
    }
}