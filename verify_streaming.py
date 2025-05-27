#!/usr/bin/env python3
"""Verify that streaming is working properly"""

import requests
import time
import json

print("Testing LINK-X1 Streaming...")

# Test the test-stream endpoint first
print("\n1. Testing basic SSE endpoint...")
try:
    response = requests.get('http://localhost:8080/test-stream', stream=True)
    print(f"Status: {response.status_code}")
    print(f"Content-Type: {response.headers.get('content-type')}")
    
    if response.status_code == 200:
        print("\nStreaming data:")
        for line in response.iter_lines():
            if line:
                print(f"  {line.decode('utf-8')}")
        print("✅ Basic streaming works!")
    else:
        print("❌ Basic streaming failed")
except Exception as e:
    print(f"❌ Error: {e}")

# Test the AI chat streaming endpoint
print("\n2. Testing AI chat streaming...")
try:
    # You might need to login first
    payload = {
        "userMessage": "What is 2+2?",
        "messages": []
    }
    
    response = requests.post(
        'http://localhost:8080/ai-chat-stream',
        json=payload,
        stream=True,
        headers={'Content-Type': 'application/json'}
    )
    
    print(f"Status: {response.status_code}")
    print(f"Content-Type: {response.headers.get('content-type')}")
    
    if response.status_code == 200 and 'event-stream' in response.headers.get('content-type', ''):
        print("\nStreaming tokens:")
        token_count = 0
        start_time = time.time()
        
        for line in response.iter_lines():
            if line:
                line_str = line.decode('utf-8')
                if line_str.startswith('data: '):
                    try:
                        data = json.loads(line_str[6:])
                        if data['type'] == 'token':
                            print(data['content'], end='', flush=True)
                            token_count += 1
                        elif data['type'] == 'done':
                            elapsed = time.time() - start_time
                            print(f"\n\n✅ Streaming complete!")
                            print(f"   Tokens: {token_count}")
                            print(f"   Time: {elapsed:.2f}s")
                            print(f"   Speed: {token_count/elapsed:.1f} tokens/sec")
                    except:
                        pass
    else:
        print("❌ AI streaming not working properly")
        print("Response:", response.text[:200])
except Exception as e:
    print(f"❌ Error: {e}")

print("\n" + "="*50)
print("If streaming is working, you should see:")
print("1. Words appearing one by one (not all at once)")
print("2. Content-Type: text/event-stream")
print("3. Multiple 'data:' lines with tokens")