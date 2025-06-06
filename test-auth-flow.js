#!/usr/bin/env node
/**
 * Test the complete authentication flow with Supabase
 */

const fetch = require('node-fetch');

// Test configuration
const BACKEND_URL = 'http://localhost:8080';
const TEST_TOKEN = process.argv[2];

if (!TEST_TOKEN) {
    console.error('Usage: node test-auth-flow.js <JWT_TOKEN>');
    console.error('Get the token from browser localStorage: localStorage.getItem("sb-torsffahnivnzcnjnxgc-auth-token")');
    process.exit(1);
}

async function testAuth() {
    console.log('Testing authentication flow...\n');
    
    // Parse the token from localStorage format
    let accessToken = TEST_TOKEN;
    try {
        const parsed = JSON.parse(TEST_TOKEN);
        if (parsed.access_token) {
            accessToken = parsed.access_token;
            console.log('Extracted access token from session object');
        }
    } catch (e) {
        // Token is already in the right format
    }
    
    console.log(`Token: ${accessToken.substring(0, 50)}...`);
    
    // Test 1: Health check (no auth required)
    console.log('\n1. Testing health endpoint (no auth):');
    try {
        const res = await fetch(`${BACKEND_URL}/health`);
        console.log(`   Status: ${res.status} ${res.statusText}`);
        const data = await res.json();
        console.log(`   Response:`, data);
    } catch (error) {
        console.error(`   Error:`, error.message);
    }
    
    // Test 2: Get courses (requires auth)
    console.log('\n2. Testing courses endpoint (requires auth):');
    try {
        const res = await fetch(`${BACKEND_URL}/api/v2/courses`, {
            headers: {
                'Authorization': `Bearer ${accessToken}`,
                'Content-Type': 'application/json'
            }
        });
        console.log(`   Status: ${res.status} ${res.statusText}`);
        const data = await res.json();
        console.log(`   Response:`, data);
    } catch (error) {
        console.error(`   Error:`, error.message);
    }
    
    // Test 3: User profile
    console.log('\n3. Testing user profile endpoint:');
    try {
        const res = await fetch(`${BACKEND_URL}/api/v2/auth/me`, {
            headers: {
                'Authorization': `Bearer ${accessToken}`,
                'Content-Type': 'application/json'
            }
        });
        console.log(`   Status: ${res.status} ${res.statusText}`);
        if (res.ok) {
            const data = await res.json();
            console.log(`   User:`, data);
        } else {
            const text = await res.text();
            console.log(`   Error response:`, text);
        }
    } catch (error) {
        console.error(`   Error:`, error.message);
    }
}

testAuth().catch(console.error);