#!/bin/bash

# Test token from the logs (truncated for testing)
TOKEN="eyJhbGciOiJIUzI1NiIsImtpZCI6IlgzZnVuZVpMbnZKREJoRGhqQXVNSTk2YkNSU0RzQ0RoUm1OcHZsc2V9In0.eyJhdWQiOiJhdXRoZW50aWNhdGVkIiwiZXhwIjoxNzQ5MTU3NjU0LCJpYXQiOjE3NDkxNTQwNTQsImlzcyI6Imh0dHBzOi8vdG9yc2ZmYWhub"

echo "Testing backend auth with Supabase token..."
curl -v http://localhost:8080/api/v2/auth/me \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json"