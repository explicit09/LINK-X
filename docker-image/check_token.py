#!/usr/bin/env python3
import json
import base64
from datetime import datetime

# Token from the logs
token = 'eyJhbGciOiJIUzI1NiIsImtpZCI6IlgzZnVuZVpMbnZnbzRrTTYiLCJ0eXAiOiJKV1QifQ.eyJpc3MiOiJodHRwczovL3RvcnNmZmFobml2bnpjbmpueGdjLnN1cGFiYXNlLmNvL2F1dGgvdjEiLCJzdWIiOiI5ZGJhNzNhNy1hNzJhLTQ5YzQtOGJhNy1hNzJhNDljNDhiYTciLCJhdWQiOiJhdXRoZW50aWNhdGVkIiwiZXhwIjoxNzMzNjI5NzY5LCJpYXQiOjE3MzM2MjYxNjksImVtYWlsIjoidGFkaXdhc2FuZGVyc29uQGdtYWlsLmNvbSIsInBob25lIjoiIiwiYXBwX21ldGFkYXRhIjp7InByb3ZpZGVyIjoiZW1haWwiLCJwcm92aWRlcnMiOlsiZW1haWwiXX0sInVzZXJfbWV0YWRhdGEiOnt9LCJyb2xlIjoiYXV0aGVudGljYXRlZCIsImFhbCI6ImFhbDEiLCJhbXIiOlt7Im1ldGhvZCI6InBhc3N3b3JkIiwidGltZXN0YW1wIjoxNzMzNjI2MTY5fV0sInNlc3Npb25faWQiOiJkNzJhNzNhNy1hNzJhLTQ5YzQtOGJhNy1hNzJhNDljNDhiYTcifQ.wZDPyZkW3KcDIBjEMAM5iA-WkCx2EksCuU32VgrIF8M'

print("Checking JWT token expiration...")

# Split token and decode payload
parts = token.split('.')
payload_b64 = parts[1]

# Add padding if needed
payload_b64 += '=' * (4 - len(payload_b64) % 4)

# Decode
payload_json = base64.b64decode(payload_b64)
payload = json.loads(payload_json)

# Check expiration
exp_timestamp = payload.get('exp')
if exp_timestamp:
    exp_date = datetime.fromtimestamp(exp_timestamp)
    now = datetime.now()
    print(f'Token expires: {exp_date}')
    print(f'Current time: {now}')
    print(f'Token expired: {exp_date < now}')
    print(f'Email: {payload.get("email")}')
    print(f'User ID: {payload.get("sub")}')
    
    if exp_date < now:
        print("\n❌ TOKEN IS EXPIRED! This is why authentication is failing.")
        print("The user needs to refresh their session or log in again.")
    else:
        print("\n✅ Token is still valid.")
else:
    print('No expiration found')

print(f"\nFull payload: {json.dumps(payload, indent=2)}") 