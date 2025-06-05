/**
 * Test the improved streaming implementation
 */

const fileId = '4d8c5dda-dc65-47f4-9656-08c75a7154ee';

async function testImprovedStreaming() {
    console.log('🔄 Testing improved streaming implementation...');
    
    try {
        const response = await fetch(`http://localhost:8080/api/v2/personalization/stream?file_id=${fileId}`);
        console.log('Response status:', response.status);
        
        if (response.body) {
            const reader = response.body.getReader();
            const decoder = new TextDecoder();
            
            let eventCount = 0;
            let sections = new Map();
            
            console.log('📡 Starting to read SSE stream...\n');
            
            while (true) {
                const { done, value } = await reader.read();
                if (done) break;
                
                const chunk = decoder.decode(value);
                eventCount++;
                
                // Parse SSE data
                const lines = chunk.split('\n');
                for (const line of lines) {
                    if (line.startsWith('data: ')) {
                        try {
                            const data = JSON.parse(line.substring(6));
                            
                            switch (data.type) {
                                case 'error':
                                    console.log(`❌ Event ${eventCount}: ERROR - ${data.message}`);
                                    break;
                                case 'start':
                                    console.log(`🚀 Event ${eventCount}: STREAM START - ${data.total_sections} sections`);
                                    break;
                                case 'section_start':
                                    console.log(`📑 Event ${eventCount}: SECTION START - ${data.title} (${data.section_id})`);
                                    sections.set(data.section_id, '');
                                    break;
                                case 'content':
                                    const existing = sections.get(data.section_id) || '';
                                    sections.set(data.section_id, existing + data.content);
                                    console.log(`📝 Event ${eventCount}: CONTENT - ${data.section_id} (+${data.content.length} chars, total: ${sections.get(data.section_id).length})`);
                                    break;
                                case 'section_complete':
                                    console.log(`✅ Event ${eventCount}: SECTION COMPLETE - ${data.section_id}`);
                                    break;
                                case 'complete':
                                    console.log(`🎉 Event ${eventCount}: ALL COMPLETE - ${data.message}`);
                                    break;
                                default:
                                    console.log(`❓ Event ${eventCount}: UNKNOWN - ${data.type}`, data);
                            }
                        } catch (parseError) {
                            console.log(`⚠️ Event ${eventCount}: PARSE ERROR - ${parseError.message}`);
                            console.log('Raw data:', line);
                        }
                    }
                }
                
                // Stop after seeing errors (since we expect auth errors)
                if (eventCount >= 3) {
                    reader.cancel();
                    break;
                }
            }
            
            console.log('\n📊 Final sections state:');
            sections.forEach((content, sectionId) => {
                console.log(`  ${sectionId}: ${content.length} chars`);
            });
            
        }
    } catch (error) {
        console.error('Test Error:', error);
    }
}

// Check if this can actually test progressive streaming by measuring time gaps
async function testProgressiveStreaming() {
    console.log('\n⏱️  Testing progressive streaming timing...');
    
    // This would need a valid token to work properly
    // For now, just demonstrate the concept
    console.log('ℹ️  Progressive streaming test requires valid authentication.');
    console.log('   Use the debug-streaming.html tool with a real Firebase token to test timing.');
}

// Run tests
testImprovedStreaming().then(() => {
    testProgressiveStreaming();
}).catch(console.error);