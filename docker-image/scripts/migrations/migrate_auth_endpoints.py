#!/usr/bin/env python3
"""
Migration script to move authentication endpoints from monolithic app.py 
to the new modular structure
"""
import os
import sys

def create_migration_map():
    """Map old endpoints to new structure"""
    return {
        # Authentication endpoints
        '/me GET': 'api/auth.py - get_current_user()',
        '/me PATCH': 'api/auth.py - update_current_user()', 
        '/me DELETE': 'api/auth.py - delete_current_user()',
        '/register/instructor': 'api/auth.py - register() with role=instructor',
        '/register/student': 'api/auth.py - register() with role=student',
        
        # These need to be migrated from old to new structure
        'verify_role()': 'core/decorators.py - require_role()',
        'get_user_session()': 'core/decorators.py - firebase_auth_required',
    }

def update_auth_blueprint():
    """Update the auth blueprint with migrated endpoints"""
    auth_code = '''# Additional auth endpoints migrated from app.py

@bp.route('/me', methods=['GET'])
@firebase_auth_required
@cache_response(expiration=60)
def get_current_user():
    """Get current user profile"""
    user = g.current_user
    
    # Get profile based on role
    profile_data = None
    if user.role.value == 'instructor':
        profile = user.instructor_profile
        if profile:
            profile_data = {
                'user_id': str(profile.user_id),
                'name': profile.name,
                'university': profile.university
            }
    elif user.role.value == 'student':
        profile = user.student_profile
        if profile:
            profile_data = {
                'user_id': str(profile.user_id),
                'name': profile.name,
                'onboard_answers': profile.onboard_answers,
                'want_quizzes': profile.want_quizzes,
                'model_preference': profile.model_preference
            }
    elif user.role.value == 'admin':
        profile = user.admin_profile
        if profile:
            profile_data = {
                'user_id': str(profile.user_id),
                'name': profile.name
            }
    
    return jsonify({
        'id': str(user.id),
        'email': user.email,
        'role': user.role.value,
        'profile': profile_data
    }), 200

@bp.route('/me', methods=['PATCH'])
@firebase_auth_required
@validate_json([])
def update_current_user():
    """Update current user profile"""
    user = g.current_user
    data = request.get_json()
    
    try:
        # Update user fields
        if 'email' in data:
            user = AuthService.update_email(user.id, data['email'])
        
        # Update profile based on role
        profile_updates = {}
        if user.role.value == 'student':
            allowed_fields = ['name', 'onboard_answers', 'want_quizzes', 'model_preference']
        elif user.role.value == 'instructor':
            allowed_fields = ['name', 'university']
        elif user.role.value == 'admin':
            allowed_fields = ['name']
        else:
            allowed_fields = []
        
        for field in allowed_fields:
            if field in data:
                profile_updates[field] = data[field]
        
        if profile_updates:
            AuthService.update_profile(user.id, user.role.value, **profile_updates)
        
        return jsonify({
            'id': str(user.id),
            'email': user.email,
            'role': user.role.value
        }), 200
        
    except ValidationError as e:
        return jsonify({'error': str(e)}), 400

@bp.route('/me', methods=['DELETE'])
@firebase_auth_required
def delete_current_user():
    """Delete current user account"""
    user = g.current_user
    
    try:
        AuthService.delete_user(user.id)
        
        resp = jsonify({'message': 'Account deleted'})
        # Clear any session cookies
        resp.set_cookie('session', '', max_age=0, httponly=True, samesite='Lax')
        return resp, 200
        
    except Exception as e:
        return jsonify({'error': 'Failed to delete account'}), 500
'''
    return auth_code

def update_auth_service():
    """Add new methods to auth service"""
    service_code = '''
    @staticmethod
    def update_email(user_id: str, new_email: str) -> Dict:
        """Update user email"""
        user_repo = UserRepository()
        
        # Validate email format
        import re
        if not re.match(r'^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\\.[a-zA-Z]{2,}$', new_email):
            raise ValidationError("Invalid email format")
        
        # Check if email already exists
        existing = user_repo.find_by_email(new_email)
        if existing and str(existing.id) != str(user_id):
            raise ValidationError("Email already in use")
        
        return user_repo.update(user_id, email=new_email)
    
    @staticmethod
    def update_profile(user_id: str, role: str, **kwargs) -> bool:
        """Update user profile fields"""
        user_repo = UserRepository()
        return user_repo.update_profile(user_id, role, **kwargs)
    
    @staticmethod
    def delete_user(user_id: str) -> bool:
        """Delete user account and all associated data"""
        user_repo = UserRepository()
        
        # TODO: Delete all user data (courses, files, etc.)
        # This should be done in a transaction
        
        return user_repo.delete(user_id)
'''
    return service_code

def create_compatibility_layer():
    """Create a compatibility layer for gradual migration"""
    compat_code = '''"""
Compatibility layer for gradual migration from monolithic app.py
to modular structure. This allows both old and new endpoints to work
during the migration period.
"""
from flask import Flask, request, jsonify, g
from functools import wraps
import firebase_admin.auth as firebase_auth

def get_user_session():
    """Legacy function - maps to new firebase_auth_required decorator"""
    auth_header = request.headers.get('Authorization')
    if not auth_header or not auth_header.startswith('Bearer '):
        return {'error': 'Authorization header missing or invalid'}
    
    token = auth_header.split(' ')[1]
    try:
        decoded_token = firebase_auth.verify_id_token(token)
        return decoded_token
    except Exception as e:
        return {'error': str(e)}

def verify_role(required_role):
    """Legacy function - maps to new require_role decorator"""
    def decorator(f):
        @wraps(f)
        def decorated_function(*args, **kwargs):
            from ..repositories.user_repository import UserRepository
            
            session = get_user_session()
            if 'error' in session:
                return jsonify(session), 401
            
            firebase_uid = session['uid']
            user_repo = UserRepository()
            user = user_repo.find_by_firebase_uid(firebase_uid)
            
            if not user:
                return jsonify({'error': 'User not found'}), 404
            
            if user.role.value != required_role:
                return jsonify({'error': 'Forbidden'}), 403
            
            g.current_user_id = user.id
            return f(*args, **kwargs)
        
        return decorated_function
    return decorator

# Legacy role verification functions
verify_admin = lambda: verify_role('admin')
verify_instructor = lambda: verify_role('instructor')
verify_student = lambda: verify_role('student')
'''
    return compat_code

def main():
    print("Authentication Endpoint Migration Plan")
    print("=" * 50)
    
    migration_map = create_migration_map()
    
    print("\nEndpoint Migration Mapping:")
    for old, new in migration_map.items():
        print(f"  {old} -> {new}")
    
    print("\n\nSteps to complete migration:")
    print("1. Add new endpoints to api/auth.py")
    print("2. Update AuthService with new methods")
    print("3. Create compatibility layer for gradual migration")
    print("4. Update tests for new endpoints")
    print("5. Switch frontend to use new endpoints")
    print("6. Remove old endpoints from app.py")
    
    print("\n\nGenerating migration code...")
    
    # Generate the updated files
    auth_updates = update_auth_blueprint()
    service_updates = update_auth_service()
    compat_layer = create_compatibility_layer()
    
    print("\nMigration code generated successfully!")
    print("Review the generated code and apply it to the respective files.")

if __name__ == "__main__":
    main()