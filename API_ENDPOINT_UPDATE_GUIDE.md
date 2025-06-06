# API Endpoint Update Guide for Supabase Migration

## Overview
This guide shows how to update existing API endpoints to use the new Supabase authentication system.

## Step 1: Update Imports

### Before (Firebase)
```python
from core.firebase_config import auth
from core.decorators_unified import require_auth
from firebase_admin import auth as firebase_auth
```

### After (Supabase)
```python
from core.auth.decorators import require_auth, require_role, optional_auth
from services.auth.supabase_auth_service import get_auth_service
```

## Step 2: Update Endpoint Protection

### Simple Authentication

**Before:**
```python
@bp.route('/courses', methods=['GET'])
@require_auth
def get_courses():
    user_id = g.current_user_id  # Old way
    # ... rest of code
```

**After:**
```python
@bp.route('/courses', methods=['GET'])
@require_auth  # Same decorator, new implementation
def get_courses():
    user = g.current_user  # Now you get full AuthUser object
    user_id = user.id
    user_role = user.role
    # ... rest of code
```

### Role-Based Access

**Before:**
```python
@bp.route('/admin/users', methods=['GET'])
@require_auth
def admin_users():
    # Manual role check
    if g.current_user.get('role') != 'admin':
        return jsonify({'error': 'Forbidden'}), 403
    # ... rest of code
```

**After:**
```python
@bp.route('/admin/users', methods=['GET'])
@require_role('admin')  # Clean, declarative
def admin_users():
    # No manual check needed
    # ... rest of code
```

### Multiple Roles

**After:**
```python
@bp.route('/courses', methods=['POST'])
@require_role('instructor', 'admin')  # Either role works
def create_course():
    user = g.current_user
    # ... rest of code
```

## Step 3: Update User Creation

### Before (Firebase)
```python
@bp.route('/auth/register', methods=['POST'])
def register():
    data = request.json
    
    # Create Firebase user
    firebase_user = firebase_auth.create_user(
        email=data['email'],
        password=data['password']
    )
    
    # Create local user
    user = User(
        firebase_uid=firebase_user.uid,
        email=data['email'],
        role=data.get('role', 'student')
    )
    db.session.add(user)
    db.session.commit()
```

### After (Supabase)
```python
@bp.route('/auth/register', methods=['POST'])
def register():
    data = request.json
    
    # Let frontend handle Supabase signup
    # Backend just creates profile after successful signup
    # This endpoint is called by frontend after Supabase signup
    
    auth_service = get_auth_service()
    profile = auth_service.create_user_profile(
        supabase_user=data['user'],  # From frontend
        role=data.get('role', 'student'),
        full_name=data.get('full_name')
    )
    
    return jsonify(profile)
```

## Step 4: Common Patterns

### 1. Getting Current User
```python
# Anywhere in a protected endpoint
user = g.current_user
print(f"User ID: {user.id}")
print(f"Email: {user.email}")
print(f"Role: {user.role}")
print(f"Is Instructor: {user.is_instructor}")
```

### 2. Optional Authentication
```python
@bp.route('/courses/public', methods=['GET'])
@optional_auth  # User might be logged in or not
def public_courses():
    if g.current_user:
        # Personalize for logged-in user
        user_id = g.current_user.id
    else:
        # Show generic content
        user_id = None
```

### 3. Resource Ownership
```python
def get_course(course_id):
    return Course.query.get(course_id)

@bp.route('/courses/<course_id>', methods=['PUT'])
@require_ownership(get_course)
def update_course(course_id):
    # Only course owner or admin can update
    course = g.resource  # Automatically available
    # ... update logic
```

### 4. Email Verification
```python
@bp.route('/verified-only', methods=['POST'])
@require_verified_email
def verified_action():
    # Only users with verified emails
    # ... rest of code
```

## Step 5: Update Auth Endpoints

### Login Endpoint
```python
@bp.route('/auth/login', methods=['POST'])
def login():
    # Frontend handles Supabase login
    # Backend can verify the session if needed
    data = request.json
    token = data.get('access_token')
    
    auth_service = get_auth_service()
    user = auth_service.verify_token(token)
    
    if user:
        # Update last login, etc.
        return jsonify({
            'user': {
                'id': user.id,
                'email': user.email,
                'role': user.role
            }
        })
    
    return jsonify({'error': 'Invalid token'}), 401
```

## Step 6: Update Service Layer

### Example: CourseService
```python
class CourseService:
    @staticmethod
    def get_user_courses(user: AuthUser):
        if user.is_instructor:
            # Get courses they teach
            return Course.query.filter_by(instructor_id=user.id).all()
        else:
            # Get enrolled courses
            return Course.query.join(Enrollment).filter(
                Enrollment.user_id == user.id
            ).all()
```

## Migration Checklist

For each endpoint:
- [ ] Update imports
- [ ] Replace `@require_auth` implementation (same decorator name)
- [ ] Add `@require_role()` where needed
- [ ] Update user access from `g.current_user_id` to `g.current_user`
- [ ] Remove manual role checks (use decorators)
- [ ] Update any Firebase-specific code

## Testing After Migration

```python
# Test protected endpoint
curl -H "Authorization: Bearer YOUR_SUPABASE_TOKEN" \
     http://localhost:8080/api/v2/courses

# Test role-based endpoint
curl -H "Authorization: Bearer YOUR_ADMIN_TOKEN" \
     http://localhost:8080/api/v2/admin/users
```

## Benefits of New System

1. **Cleaner Code**: Decorators handle all auth logic
2. **Type Safety**: `AuthUser` object with properties
3. **Better Performance**: Built-in caching
4. **Consistent Errors**: Standardized error responses
5. **Easier Testing**: Mock one service

## Example: Complete Endpoint Migration

### Before (Firebase)
```python
@bp.route('/api/v2/courses/<course_id>/files', methods=['POST'])
@require_auth
def upload_file(course_id):
    # Get user
    user_id = g.current_user_id
    user = User.query.filter_by(firebase_uid=user_id).first()
    
    # Check permissions
    if user.role != 'instructor':
        course = Course.query.get(course_id)
        if course.instructor_id != user.id:
            return jsonify({'error': 'Forbidden'}), 403
    
    # Handle upload
    # ... rest of code
```

### After (Supabase)
```python
@bp.route('/api/v2/courses/<course_id>/files', methods=['POST'])
@require_role('instructor', 'admin')
def upload_file(course_id):
    user = g.current_user
    
    # Verify course ownership
    course = Course.query.get_or_404(course_id)
    if user.role == 'instructor' and course.instructor_id != user.id:
        return jsonify({'error': 'Not your course'}), 403
    
    # Handle upload
    # ... rest of code
```

Much cleaner!