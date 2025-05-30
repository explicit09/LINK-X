#!/usr/bin/env python3
"""Test the courses API endpoint with auth"""
import requests
import json

# First, we need to get an auth token
# This would normally come from the frontend auth flow

print("Testing /api/v2/courses endpoint...")
print("\nThis endpoint requires authentication.")
print("In the frontend, the auth token is automatically included.")
print("\nTo test manually, you would need:")
print("1. A valid Firebase ID token")
print("2. Or an existing session cookie")
print("\nThe frontend issue is likely related to:")
print("- Auth token not being sent properly")
print("- API response format mismatch")
print("- Frontend state management")

# Let's check what the API expects
print("\n--- API Endpoint Details ---")
print("Endpoint: GET /api/v2/courses")
print("Expected response format:")
print(json.dumps({
    "courses": [
        {
            "id": "course-id",
            "title": "Course Title",
            "description": "Description",
            "code": "CS101",
            "term": "Spring 2024",
            "published": True,
            "created_at": "2024-01-01T00:00:00",
            "updated_at": "2024-01-01T00:00:00"
        }
    ],
    "pagination": {
        "page": 1,
        "limit": 20,
        "total": 1
    }
}, indent=2))