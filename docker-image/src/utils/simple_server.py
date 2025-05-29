from flask import Flask, jsonify, request
from flask_cors import CORS
import json

app = Flask(__name__)
CORS(app, supports_credentials=True, origins='*', allow_headers=['Content-Type', 'Authorization'], expose_headers=['Content-Type'], methods=['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'])

@app.route('/generatepersonalizedmodulecontent', methods=['POST', 'OPTIONS'])
def generate_personalized_module_content():
    # Handle CORS preflight request
    if request.method == 'OPTIONS':
        return '', 200
    
    # Mock authentication - in real app this would verify the user
    print("Received request for module personalization")
    
    # Read and validate JSON body
    data = request.get_json()
    module_id = data.get("module_id")
    user_persona = data.get("user_persona")

    if not module_id:
        return jsonify({"error": "Module ID is required"}), 400
    
    if not user_persona:
        return jsonify({"error": "User persona is required"}), 400

    print(f"Module ID: {module_id}")
    print(f"User Persona: {user_persona}")

    # Mock response - in real app this would generate actual personalized content
    mock_response = {
        "title": "Sample Module - Personalized Study Guide",
        "courseName": "Sample Module - Personalized Learning",
        "moduleId": str(module_id),
        "fileCount": 3,
        "chapters": [
            {
                "chapterTitle": "Introduction to the Module",
                "subsections": [
                    {
                        "title": "Getting Started",
                        "fullText": f"This personalized study guide has been created based on your preferences: {user_persona}. This module contains comprehensive learning materials tailored to your learning style."
                    },
                    {
                        "title": "Key Concepts",
                        "fullText": "Here are the main concepts you'll learn in this module, presented in a way that matches your learning preferences."
                    }
                ]
            },
            {
                "chapterTitle": "Core Learning Materials",
                "subsections": [
                    {
                        "title": "Main Content",
                        "fullText": "The core content of this module has been personalized to match your learning style and preferences."
                    }
                ]
            }
        ]
    }

    # Mock saving to database - return a fake ID
    fake_id = "mock-personalized-file-id-123"
    
    return jsonify({"id": fake_id, "content": mock_response}), 200

@app.route('/me', methods=['GET'])
def me_get():
    # Mock user endpoint for testing
    return jsonify({
        "id": "test-user-id",
        "email": "test@example.com",
        "role": "student"
    }), 200

@app.route('/student/profile', methods=['GET'])
def student_profile():
    # Mock student profile endpoint
    return jsonify({
        "onboard_answers": {
            "name": "Test Student",
            "role": "student",
            "traits": "helpful and encouraging",
            "learningStyle": "visual",
            "depth": "intermediate",
            "interests": "technology and science",
            "personalization": "interactive examples",
            "schedule": "in the evenings"
        }
    }), 200

if __name__ == '__main__':
    print("Starting simple test server on port 8081...")
    app.run(debug=True, host='0.0.0.0', port=8081) 