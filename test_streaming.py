#!/usr/bin/env python3
import requests
import json

# Test the streaming endpoint
url = "http://localhost:8080/ai-chat-stream"
payload = {
    "id": None,
    "fileId": "test-file-id",
    "userMessage": "What is machine learning?",
    "messages": []
}

headers = {
    "Content-Type": "application/json",
}

# Use session to handle cookies
session = requests.Session()

# First login if needed (adjust as necessary)
# session.post("http://localhost:8080/login", json={"email": "test@example.com", "password": "password"})

try:
    response = session.post(url, json=payload, headers=headers, stream=True)
    
    print(f"Status Code: {response.status_code}")
    print(f"Headers: {dict(response.headers)}")
    print("\nStreaming content:")
    
    for line in response.iter_lines():
        if line:
            decoded_line = line.decode('utf-8')
            print(f"Raw: {decoded_line}")
            
            if decoded_line.startswith('data: '):
                try:
                    data = json.loads(decoded_line[6:])
                    print(f"Parsed: {data}")
                except json.JSONDecodeError as e:
                    print(f"JSON Error: {e}")
                    
except Exception as e:
    print(f"Error: {e}")