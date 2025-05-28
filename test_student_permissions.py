#!/usr/bin/env python3
"""Test script to verify student permissions for modules and courses"""

import requests
import json

# Base URL
BASE_URL = "http://localhost:8080"

# Test credentials (you'll need to replace with actual credentials)
print("=== Testing Student Permissions ===")
print("\nNOTE: This test requires you to be logged in as a student.")
print("Please ensure you have a valid session cookie from logging in through the frontend.\n")

# Headers for requests (assuming cookies are needed)
headers = {
    "Content-Type": "application/json",
}

def test_endpoint(method, endpoint, data=None, description=""):
    """Test an API endpoint and report results"""
    print(f"\n{description}")
    print(f"{method} {endpoint}")
    
    try:
        if method == "GET":
            response = requests.get(f"{BASE_URL}{endpoint}", headers=headers)
        elif method == "POST":
            response = requests.post(f"{BASE_URL}{endpoint}", 
                                   headers=headers, 
                                   json=data)
        elif method == "PATCH":
            response = requests.patch(f"{BASE_URL}{endpoint}", 
                                    headers=headers, 
                                    json=data)
        elif method == "DELETE":
            response = requests.delete(f"{BASE_URL}{endpoint}", headers=headers)
        
        print(f"Status: {response.status_code}")
        if response.status_code < 400:
            print(f"✅ Success: {response.json()}")
        else:
            print(f"❌ Error: {response.text}")
        
        return response
        
    except Exception as e:
        print(f"❌ Exception: {str(e)}")
        return None

# Test 1: Check if student can list courses
print("\n" + "="*50)
print("TEST 1: List courses (should work for students)")
test_endpoint("GET", "/api/v1/courses", 
              description="Listing available courses")

# Test 2: Create a course as student
print("\n" + "="*50)
print("TEST 2: Create course as student")
course_data = {
    "title": "Student Created Course",
    "description": "A test course created by a student",
    "code": "STU101",
    "term": "Spring 2025"
}
response = test_endpoint("POST", "/api/v1/courses", 
                        data=course_data,
                        description="Creating a new course")

if response and response.status_code == 201:
    course_id = response.json().get('course', {}).get('id')
    print(f"\nCreated course ID: {course_id}")
    
    # Test 3: Create a module in the course
    print("\n" + "="*50)
    print("TEST 3: Create module as student")
    module_data = {
        "title": "Module 1: Introduction",
        "description": "First module created by student"
    }
    module_response = test_endpoint("POST", f"/api/v1/courses/{course_id}/modules", 
                                   data=module_data,
                                   description="Creating a module in the course")
    
    if module_response and module_response.status_code == 201:
        module_id = module_response.json().get('module', {}).get('id')
        print(f"\nCreated module ID: {module_id}")
        
        # Test 4: Update the module
        print("\n" + "="*50)
        print("TEST 4: Update module as student")
        update_data = {
            "title": "Module 1: Introduction (Updated)"
        }
        test_endpoint("PATCH", f"/api/v1/modules/{module_id}", 
                     data=update_data,
                     description="Updating the module title")
        
        # Test 5: Delete the module
        print("\n" + "="*50)
        print("TEST 5: Delete module as student")
        test_endpoint("DELETE", f"/api/v1/modules/{module_id}",
                     description="Deleting the module")

print("\n" + "="*50)
print("\n✅ All tests completed!")
print("\nNOTE: For authenticated tests to work properly, you need to:")
print("1. Log in through the frontend as a student")
print("2. Copy the session cookie from your browser")
print("3. Add it to the requests in this script")