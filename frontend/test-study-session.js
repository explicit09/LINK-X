#!/usr/bin/env node

/**
 * Test study session tracking endpoints
 */

const axios = require('axios');

const API_URL = 'http://localhost:8000';

// You need to get a valid token first
const TOKEN = 'YOUR_AUTH_TOKEN_HERE';

async function testStudySessionEndpoints() {
  console.log('Testing Study Session Endpoints');
  console.log('================================\n');

  const headers = {
    'Authorization': `Bearer ${TOKEN}`,
    'Content-Type': 'application/json'
  };

  try {
    // 1. Test GET study time
    console.log('1. Testing GET /api/v2/analytics/study-time...');
    const studyTimeResponse = await axios.get(
      `${API_URL}/api/v2/analytics/study-time`,
      { headers }
    );
    console.log('   Status:', studyTimeResponse.status);
    console.log('   Study Time Data:', JSON.stringify(studyTimeResponse.data, null, 2));
    console.log('   ✅ Success\n');

    // 2. Test start session
    console.log('2. Testing POST /api/v2/analytics/study-time/session...');
    const startResponse = await axios.post(
      `${API_URL}/api/v2/analytics/study-time/session`,
      {
        title: 'Test Study Session',
        session_type: 'study'
      },
      { headers }
    );
    console.log('   Status:', startResponse.status);
    console.log('   Session Started:', JSON.stringify(startResponse.data, null, 2));
    console.log('   ✅ Success\n');

    const sessionId = startResponse.data.data.session_id;

    // Wait a bit
    console.log('3. Waiting 5 seconds...\n');
    await new Promise(resolve => setTimeout(resolve, 5000));

    // 3. Test end session
    console.log('4. Testing PUT /api/v2/analytics/study-time/session/{id}/end...');
    const endResponse = await axios.put(
      `${API_URL}/api/v2/analytics/study-time/session/${sessionId}/end`,
      {
        focus_score: 8,
        effectiveness_rating: 4,
        notes: 'Test session completed successfully'
      },
      { headers }
    );
    console.log('   Status:', endResponse.status);
    console.log('   Session Ended:', JSON.stringify(endResponse.data, null, 2));
    console.log('   ✅ Success\n');

    // 4. Verify updated study time
    console.log('5. Verifying updated study time...');
    const updatedResponse = await axios.get(
      `${API_URL}/api/v2/analytics/study-time`,
      { headers }
    );
    console.log('   Total Sessions:', updatedResponse.data.data.summary.total_sessions);
    console.log('   Total Minutes:', updatedResponse.data.data.summary.total_minutes);
    console.log('   ✅ Success\n');

  } catch (error) {
    console.error('❌ Error:', error.response?.data || error.message);
  }
}

// Instructions
console.log('INSTRUCTIONS:');
console.log('1. First get an auth token by logging in');
console.log('2. Update the TOKEN variable in this file');
console.log('3. Run: node test-study-session.js\n');

// Uncomment to run tests
// testStudySessionEndpoints();