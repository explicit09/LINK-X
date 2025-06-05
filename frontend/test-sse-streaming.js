/**
 * Test script to check SSE streaming endpoint directly
 */

const fileId = '4d8c5dda-dc65-47f4-9656-08c75a7154ee';

// First, let's try to get a token (you'll need to replace this with actual auth)
async function testSSEStreaming() {
    console.log('🧪 Testing SSE Streaming for file:', fileId);
    
    // Try without token first to see the auth error
    console.log('\n1. Testing without auth...');
    try {
        const response = await fetch(`http://localhost:8080/api/v2/personalization/stream?file_id=${fileId}`);
        console.log('Response status:', response.status);
        console.log('Response headers:', Object.fromEntries(response.headers.entries()));
        
        if (response.body) {
            const reader = response.body.getReader();
            const decoder = new TextDecoder();
            
            let eventCount = 0;
            while (true) {
                const { done, value } = await reader.read();
                if (done) break;
                
                const chunk = decoder.decode(value);
                console.log(`Event ${++eventCount}:`, chunk);
                
                // Stop after 5 events for testing
                if (eventCount >= 5) {
                    reader.cancel();
                    break;
                }
            }
        }
    } catch (error) {
        console.error('SSE Error:', error);
    }
    
    console.log('\n2. Testing outline endpoint...');
    try {
        const outlineResponse = await fetch('http://localhost:8080/api/v2/personalization/outline', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ file_id: fileId })
        });
        
        console.log('Outline status:', outlineResponse.status);
        const outlineData = await outlineResponse.text();
        console.log('Outline response:', outlineData);
        
    } catch (error) {
        console.error('Outline Error:', error);
    }
}

// Run test if this is called directly
if (typeof window === 'undefined') {
    testSSEStreaming().catch(console.error);
}

module.exports = { testSSEStreaming, fileId };