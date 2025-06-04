#!/usr/bin/env node

/**
 * Test script for enhanced personalization EventSource connection
 * This tests the SSE streaming endpoint directly
 */

const EventSource = require('eventsource');

// Configuration
const API_URL = process.env.API_URL || 'http://localhost:8080';
const FILE_ID = process.env.FILE_ID || 'test-file-id';
const TOKEN = process.env.TOKEN || 'test-token'; // Replace with actual token

// Build URL with token as query parameter
const url = `${API_URL}/api/personalization/v2/stream/${FILE_ID}?token=${TOKEN}`;

console.log('🔗 Connecting to:', url);

// Create EventSource connection
const eventSource = new EventSource(url);

// Track connection state
let connected = false;
let messageCount = 0;

// Handle connection open
eventSource.onopen = () => {
  console.log('✅ Connection opened successfully');
  connected = true;
};

// Handle messages
eventSource.onmessage = (event) => {
  messageCount++;
  console.log(`📨 Message #${messageCount}:`, event.data);
  
  try {
    const data = JSON.parse(event.data);
    console.log('📦 Parsed data:', data);
    
    // Handle different message types
    switch (data.type) {
      case 'outline':
        console.log('📋 Received outline with', data.data?.length || 0, 'sections');
        break;
      case 'content':
        console.log('📄 Received content for section:', data.section_id);
        break;
      case 'complete':
        console.log('✅ Streaming complete');
        eventSource.close();
        process.exit(0);
        break;
      case 'error':
        console.error('❌ Error:', data.data);
        break;
    }
  } catch (error) {
    console.error('Failed to parse message:', error);
  }
};

// Handle errors
eventSource.onerror = (error) => {
  console.error('❌ EventSource error:', error);
  console.error('Error type:', error.type);
  console.error('Ready state:', eventSource.readyState);
  
  if (eventSource.readyState === EventSource.CLOSED) {
    console.log('🔌 Connection closed');
    if (!connected) {
      console.error('Failed to establish initial connection');
      console.error('Check that:');
      console.error('1. Backend is running on', API_URL);
      console.error('2. Token is valid');
      console.error('3. CORS is properly configured');
    }
    process.exit(1);
  }
};

// Handle process termination
process.on('SIGINT', () => {
  console.log('\n🛑 Closing connection...');
  eventSource.close();
  process.exit(0);
});

// Timeout after 30 seconds if no complete message
setTimeout(() => {
  console.log('⏱️  Timeout reached, closing connection');
  eventSource.close();
  process.exit(0);
}, 30000);

console.log('🔍 Waiting for messages...');