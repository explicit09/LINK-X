import os
from dotenv import load_dotenv
load_dotenv()  # Load environment variables before other imports

import uuid
import tempfile
import pickle
import numpy as np
import json
import logging
from datetime import datetime, timedelta
from threading import Thread
from flask import Flask, jsonify, request, Response
from flask_cors import CORS
import firebase_admin
from firebase_admin import auth, credentials
from sqlalchemy import create_engine, text
from sqlalchemy.orm import sessionmaker

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)
from db.schema import Base, File, Module, PersonalizedFile, Todo, FileChunk
from openai import OpenAI
from transcriber import transcribe_audio
from indexer import store_file_embeddings
from io import BytesIO
from textUtils import openai_embed_text, embed_text

from db.queries import (
    # User & Role
    get_access_code_by_course, get_access_code_by_id, get_course_title, get_enrollment, get_file_metrics_for_course, get_files_without_raw_by_module, get_module_metrics_for_course, get_report_by_course, get_student_questions_for_course, get_user_by_id, get_user_by_email, get_user_by_firebase_uid,
    create_user, update_user, delete_user,
    get_role_by_user_id, set_role,
    # Profiles
    get_instructor_profile, create_instructor_profile, update_instructor_profile, delete_instructor_profile,
    get_student_profile, create_student_profile, update_student_profile, delete_student_profile,
    get_admin_profile, create_admin_profile, update_admin_profile, delete_admin_profile,
    # Domain
    get_course_by_id, get_courses_by_instructor_id, get_courses_by_student_id, create_course, update_course, delete_course,
    get_module_by_id, get_modules_by_course, create_module, update_module, delete_module,
    get_file_by_id, get_files_by_module, create_file, update_file, delete_file,
    get_access_code_by_code, create_access_code, delete_access_code,
    get_enrollment_by_student_course, create_enrollment, delete_enrollment, get_enrollments_by_student,
    get_personalized_file_by_id, get_personalized_files_by_student, create_personalized_file,
    update_personalized_file, delete_personalized_file,
    get_chat_by_id, get_chats_by_student, create_chat, update_chat, delete_chat,
    get_message_by_id, get_messages_by_chat, create_message, delete_messages_after,
    get_report_by_id, create_report, update_report, delete_report,
    # Todo
    get_todo_by_id, get_todos_by_user, get_todos_by_user_and_course, create_todo, update_todo, delete_todo,
)
from s3_storage import s3_storage
from functools import wraps
from werkzeug.http import http_date
import time

# Import Celery app to ensure tasks can be queued
from src.celery_app import app as celery_app

# Temporarily comment out problematic imports
# from src.prompts import (
#     prompt1_create_course,
#     prompt2_generate_course_outline, prompt2_generate_course_outline_RAG,
#     prompt3_generate_module_content, prompt3_generate_module_content_RAG, 
#     prompt4_valid_query,
#     prompt_course_faqs,
#     prompt_generate_personalized_file_content
# )

# Initialize Flask app
app = Flask(__name__)

# CORS will be configured below with detailed settings

# Add database migration endpoint
@app.route('/admin/migrate/add-module-description', methods=['POST'])
def add_module_description_column():
    try:
        # Verify admin access (you can implement proper authentication)
        # For now, we'll just run the migration
        
        # Get a database session
        db = Session()
        
        try:
            # Execute the ALTER TABLE statement
            db.execute(text('ALTER TABLE "Module" ADD COLUMN IF NOT EXISTS description TEXT;'))
            db.commit()
            return jsonify({
                'success': True,
                'message': 'Description column added to Module table'
            }), 200
        except Exception as e:
            db.rollback()
            return jsonify({
                'success': False,
                'error': str(e)
            }), 500
        finally:
            db.close()
    except Exception as e:
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500

# Initialize OpenAI client
openai_client = OpenAI(api_key=os.getenv("OPENAI_API_KEY"))

def retrieve_chunks_pgvector(db_session, query_embedding, course_id=None, file_id=None, limit=15, similarity_threshold=0.3):
    """
    Retrieve relevant chunks using pgvector with proper parameter binding.
    
    Args:
        db_session: SQLAlchemy session
        query_embedding: Query embedding vector
        course_id: Optional course ID filter
        file_id: Optional file ID filter
        limit: Number of results to return
        similarity_threshold: Minimum similarity score
    
    Returns:
        List of (chunk, similarity_score) tuples
    """
    # Convert numpy array to list for PostgreSQL
    if isinstance(query_embedding, np.ndarray):
        query_embedding = query_embedding.tolist()
    
    # Convert embedding list to PostgreSQL array format
    embedding_str = '[' + ','.join(map(str, query_embedding)) + ']'
    
    # Build base query using string formatting for the vector (since PostgreSQL casting doesn't work well with parameters)
    # but use parameters for other values for security
    query_text = f"""
    SELECT 
        fc.content,
        fc.chunk_index,
        fc.chunk_metadata,
        f.title as file_title,
        f.filename,
        m.title as module_title,
        1 - (fc.embedding <=> '{embedding_str}'::vector) AS similarity
    FROM "FileChunk" fc
    JOIN "File" f ON fc.file_id = f.id
    JOIN "Module" m ON f.module_id = m.id
    WHERE 1=1
    """
    
    params = {}
    
    if course_id:
        query_text += " AND fc.course_id = :course_id"
        params["course_id"] = course_id
        
    if file_id:
        query_text += " AND fc.file_id = :file_id"
        params["file_id"] = file_id
        
    query_text += f"""
    AND 1 - (fc.embedding <=> '{embedding_str}'::vector) > :similarity_threshold
    ORDER BY fc.embedding <=> '{embedding_str}'::vector
    LIMIT :limit
    """
    
    params["similarity_threshold"] = similarity_threshold
    params["limit"] = limit
    
    # Execute query
    result = db_session.execute(text(query_text), params)
    
    chunks = []
    for row in result:
        chunk_data = {
            "content": row.content,
            "chunk_index": row.chunk_index,
            "metadata": row.chunk_metadata or {},
            "file_title": row.file_title,
            "filename": row.filename,
            "module_title": row.module_title,
            "similarity": row.similarity
        }
        chunks.append(chunk_data)
    
    return chunks

def generate_personalized_content_pgvector(db_session, file_id, persona):
    """
    Generate personalized content using pgvector retrieval and OpenAI.
    """
    file = get_file_by_id(db_session, file_id)
    if not file:
        raise ValueError("File not found")
    
    # Get embedding for the persona to use for similarity search
    try:
        persona_embedding = openai_embed_text([persona])[0]  # Get first embedding from batch
    except Exception as e:
        logger.error(f"Error getting embedding for persona: {str(e)}")
        raise ValueError(f"Error generating embeddings: {str(e)}")
    
    # Retrieve relevant chunks using pgvector
    try:
        logger.info(f"Retrieving chunks for file_id: {file_id}")
        relevant_chunks = retrieve_chunks_pgvector(
            db_session=db_session,
            query_embedding=persona_embedding,
            file_id=file_id,
            limit=15,
            similarity_threshold=0.3
        )
    except Exception as e:
        logger.error(f"Error retrieving chunks: {str(e)}")
        logger.error(f"File ID type: {type(file_id)}, value: {file_id}")
        raise ValueError(f"Error retrieving content: {str(e)}")
    
    if not relevant_chunks:
        logger.warning(f"No relevant chunks found for file_id {file_id}")
        raise ValueError("No content found to personalize")
    
    # Prepare context from chunks
    chunk_texts = [chunk["content"] for chunk in relevant_chunks]
    context = "\n\n---\n\n".join(chunk_texts)
    
    # Create prompt for OpenAI
    prompt = f"""You are an expert educational content personalizer. Your task is to create a personalized study guide based on the following content.

User profile: {persona}

Original content:
{context}

Create a personalized study guide with the following structure:
1. An engaging title that reflects the content
2. 3-5 sections with appropriate headings
3. Each section should have detailed content and a personalized explanation

The output should be in JSON format with this structure:
{{
    "title": "Engaging personalized title",
    "courseName": "Course name if applicable",
    "chapters": [
        {{
            "chapterTitle": "Chapter title",
            "subsections": [
                {{
                    "title": "Section title",
                    "fullText": "The complete personalized content for this section, with explanations tailored to the user's profile"
                }}
            ]
        }}
    ]
}}

Make sure the content is accurate, engaging, and tailored to the user's profile. Each subsection should contain comprehensive content."""
    
    try:
        # Call OpenAI API
        response = openai_client.chat.completions.create(
            model="gpt-4-turbo",
            messages=[
                {"role": "system", "content": "You are an expert educational content personalizer."},
                {"role": "user", "content": prompt}
            ],
            temperature=0.7,
            max_tokens=4000
        )
        
        # Extract and parse the response
        result = response.choices[0].message.content.strip()
        
        # Try to parse as JSON, but handle the case where the response might not be valid JSON
        try:
            json_result = json.loads(result)
            # Validate the structure
            if not isinstance(json_result, dict) or "title" not in json_result or "chapters" not in json_result:
                raise ValueError("Invalid response structure")
            return json.dumps(json_result)
        except json.JSONDecodeError:
            # If it's not valid JSON, try to extract JSON from the text
            import re
            json_match = re.search(r'\{[\s\S]*\}', result)
            if json_match:
                try:
                    json_result = json.loads(json_match.group(0))
                    return json.dumps(json_result)
                except json.JSONDecodeError:
                    pass
            
            # If all else fails, create a structured response
            fallback_content = {
                "title": file.title + " (Personalized)",
                "courseName": file.title,
                "chapters": [{
                    "chapterTitle": "Main Content",
                    "subsections": [{
                        "title": "Personalized Content",
                        "fullText": f"{result}\n\nThis content has been personalized based on your profile: {persona}"
                    }]
                }]
            }
            return json.dumps(fallback_content)
            
    except Exception as e:
        logger.error(f"Error generating personalized content: {str(e)}")
        raise ValueError(f"Error generating personalized content: {str(e)}")

# Cache control decorator for GET endpoints
def cache_response(max_age=300, private=True):
    """Add cache control headers to responses"""
    def decorator(f):
        @wraps(f)
        def decorated_function(*args, **kwargs):
            response = f(*args, **kwargs)
            if isinstance(response, tuple):
                response_obj, status_code = response[0], response[1]
            else:
                response_obj, status_code = response, 200
            
            # Only cache successful GET requests
            if request.method == 'GET' and status_code == 200:
                if isinstance(response_obj, Response):
                    cache_type = 'private' if private else 'public'
                    response_obj.headers['Cache-Control'] = f'{cache_type}, max-age={max_age}'
                    response_obj.headers['Last-Modified'] = http_date(time.time())
            
            return (response_obj, status_code) if isinstance(response, tuple) else response_obj
        return decorated_function
    return decorator

# Configure CORS to allow all origins during development
# In production, this should be restricted to specific origins
CORS(app, supports_credentials=True, origins='*', allow_headers=['Content-Type', 'Authorization'], expose_headers=['Content-Type'], methods=['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'])

app.config['TESTING'] = False

cred = credentials.Certificate(os.getenv("FIREBASE_KEY_PATH", "firebaseKey.json"))
firebase_admin.initialize_app(cred)

# Import the enhanced database connection module
from db.connection import engine, get_db_session, with_db_retry, execute_with_retry
# Create the session factory - we'll use get_db_session() to create sessions
Session = get_db_session
# Create tables
Base.metadata.create_all(engine)

# ---------------------------------------------------------------------------
# Legacy-schema safeguard: some deployments created the "User" table without
# a **password** column (we now rely on Firebase).  SQLAlchemy includes that
# column in all generated SELECTs, so its absence causes 500 errors like:
#   column User.password does not exist
# We detect this at start-up and patch the table in-place if needed.
# ---------------------------------------------------------------------------
from sqlalchemy import inspect

insp = inspect(engine)
user_columns = [c['name'] for c in insp.get_columns('User')]
if 'password' not in user_columns:
    # Add column as nullable TEXT so legacy rows are still valid.
    with engine.connect() as conn:
        conn.execute(text('ALTER TABLE "User" ADD COLUMN password TEXT'))
        conn.commit()

# Older deployments might also miss the firebase_uid column which is required
# for linking Postgres rows to Firebase users.  If it's missing we add it as a
# nullable TEXT column as well.
if 'firebase_uid' not in user_columns:
    with engine.connect() as conn:
        conn.execute(text('ALTER TABLE "User" ADD COLUMN firebase_uid TEXT'))
        conn.commit()

# Ensure InstructorProfile has expected columns (e.g. university).
instr_cols = [c['name'] for c in insp.get_columns('InstructorProfile')]
if 'university' not in instr_cols:
    with engine.connect() as conn:
        conn.execute(text('ALTER TABLE "InstructorProfile" ADD COLUMN university VARCHAR(128)'))
        conn.commit()

def get_user_session():
    token = request.cookies.get('session')
    if not token:
        return {'error': 'Missing session cookie'}
    try:
        return auth.verify_session_cookie(token, check_revoked=True)
    except Exception as e:
        return {'error': str(e)}


def verify_role(required_role):
    session = get_user_session()
    if 'error' in session:
        return None, (jsonify(session), 401)

    firebase_uid = session['uid']

    db = Session()
    user = get_user_by_firebase_uid(db, firebase_uid)
    if not user:
        db.close()
        return None, (jsonify({'error': 'User not found'}), 404)

    role = get_role_by_user_id(db, user.id) 
    db.close()

    if not role or role.role_type != required_role:
        return None, (jsonify({'error': 'Forbidden'}), 403)

    return user.id, None


def verify_admin():    return verify_role('admin')
def verify_instructor(): return verify_role('instructor')
def verify_student():   return verify_role('student')


@app.route('/me', methods=['GET'])
@cache_response(max_age=60, private=True)
def me_get():
    session = get_user_session()
    if 'error' in session:
        return jsonify(session), 401

    firebase_uid = session['uid']
    db = Session()
    user = get_user_by_firebase_uid(db, firebase_uid)
    role = get_role_by_user_id(db, user.id)
    profile_data = None
    if role.role_type == 'instructor':
        prof = get_instructor_profile(db, user.id)
        if prof:
            profile_data = {
                'user_id':     str(prof.user_id),
                'name':        prof.name,
                'university':  prof.university
            }
    elif role.role_type == 'student':
        prof = get_student_profile(db, user.id)
        if prof:
            profile_data = {
                'user_id':          str(prof.user_id),
                'name':             prof.name,
                'onboard_answers':  prof.onboard_answers,
                'want_quizzes':     prof.want_quizzes,
                'model_preference': prof.model_preference
            }
    elif role.role_type == 'admin':
        prof = get_admin_profile(db, user.id)
        if prof:
            profile_data = {
                'user_id': str(prof.user_id),
                'name':    prof.name
            }

    db.close()

    return jsonify({
        'id':      str(user.id),
        'email':   user.email,
        'role':    role.role_type,
        'profile': profile_data
    }), 200


@app.route('/me', methods=['PATCH'])
def me_patch():
    session = get_user_session()
    if 'error' in session:
        return jsonify(session), 401

    firebase_uid = session['uid']
    data = request.get_json() or {}

    db = Session()
    user = get_user_by_firebase_uid(db, firebase_uid)
    if not user:
        db.close()
        return jsonify({'error': 'User not found'}), 404

    if 'email' in data:
        user.email = data['email']
    if 'password' in data:
        user.password = data['password']

    role = get_role_by_user_id(db, user.id)
    if role.role_type == 'student':
        prof = get_student_profile(db, user.id)
        if prof:
            if 'name' in data:
                prof.name = data['name']
            if 'onboard_answers' in data:
                prof.onboard_answers = data['onboard_answers']
            if 'want_quizzes' in data:
                prof.want_quizzes = data['want_quizzes']
            if 'model_preference' in data:
                prof.model_preference = data['model_preference']

    elif role.role_type == 'instructor':
        prof = get_instructor_profile(db, user.id)
        if prof:
            if 'name' in data:
                prof.name = data['name']
            if 'university' in data:
                prof.university = data['university']

    elif role.role_type == 'admin':
        prof = get_admin_profile(db, user.id)
        if prof and 'name' in data:
            prof.name = data['name']

    db.commit()
    db.refresh(user)
    response = {
        'id':    str(user.id),
        'email': user.email,
        'role':  role.role_type,
    }
    db.close()
    return jsonify(response), 200

@app.route('/me', methods=['DELETE'])
def me_delete():
    session = get_user_session()
    if 'error' in session:
        return jsonify(session), 401

    firebase_uid = session['uid']

    db = Session()
    user = get_user_by_firebase_uid(db, firebase_uid)
    if not user:
        db.close()
        return jsonify({'error': 'User not found'}), 404

    db.delete(user)
    db.commit()
    db.close()

    resp = jsonify({'message': 'Account deleted'})
    resp.set_cookie('session', '', max_age=0, httponly=True, samesite='Lax')
    return resp, 200

@app.route('/register/instructor', methods=['POST'])
def register_instructor():
    data = request.get_json() or {}
    id_token = data.get('idToken')
    if not id_token:
        return jsonify({'error':'Missing ID token'}), 400
    try:
        decoded = auth.verify_id_token(id_token)
        firebase_uid = decoded['uid']
    except Exception as e:
        return jsonify({'error': f'Invalid ID token: {e}'}), 401

    email = data.get('email')
    pwd   = data.get('password')
    name = data.get("name")
    university = data.get("university")

    if not email or not pwd or not name:
        return jsonify({'error':'Email, password, and name required'}), 400

    db = Session()
    user = create_user(db, email, pwd, firebase_uid, 'instructor')
    create_instructor_profile(db, user.id, name, university)
    db.close()

    return jsonify({'id': str(user.id), 'email': user.email}), 201


@app.route('/register/student', methods=['POST'])
def register_student():
    data = request.get_json() or {}
    id_token = data.get('idToken')
    if not id_token:
        return jsonify({'error':'Missing ID token'}), 400
    try:
        decoded = auth.verify_id_token(id_token)
        firebase_uid = decoded['uid']
    except Exception as e:
        return jsonify({'error': f'Invalid ID token: {e}'}), 401

    email = data.get('email')
    pwd   = data.get('password')
    if not email or not pwd:
        return jsonify({'error':'Email and password required'}), 400

    db = Session()
    user = create_user(db, email, pwd, firebase_uid, 'student')
    db.close()

    return jsonify({'id': str(user.id), 'email': user.email}), 201

@app.route('/instructor/profile', methods=['POST','GET','PATCH','DELETE'])
def instructor_profile():
    user_id, err = verify_instructor()
    if err:
        return err
    db = Session()

    if request.method == 'POST':
        data = request.get_json() or {}
        name       = data.get('name')
        university = data.get('university')
        if not name:
            db.close()
            return jsonify({'error':'Name required'}), 400

        prof = create_instructor_profile(db, user_id, name, university)
        db.close()

        out = {
            'user_id':  str(prof.user_id),
            'name':     prof.name,
            'university': prof.university
        }
        return jsonify(out), 201

    if request.method == 'GET':
        prof = get_instructor_profile(db, user_id)
        db.close()
        if not prof:
            return jsonify({'error':'Not found'}), 404

        out = {
            'user_id':  str(prof.user_id),
            'name':     prof.name,
            'university': prof.university
        }
        return jsonify(out), 200

    if request.method == 'PATCH':
        data = request.get_json() or {}
        updated = update_instructor_profile(db, user_id, **data)
        db.close()
        return jsonify({'user_id': str(updated.user_id)}), 200

    # DELETE
    delete_instructor_profile(db, user_id)
    delete_user(db, user_id)
    db.close()
    resp = jsonify({'message':'Instructor deleted'})
    resp.set_cookie('session','',max_age=0)
    return resp, 200

@app.route('/student/courses', methods=['GET'])
@cache_response(max_age=300, private=True)
def student_courses():
    user_id, err = verify_student()
    if err:
        return err
    db = Session()
    courses = get_courses_by_student_id(db, user_id)
    db.close()
    return jsonify([
    {
        'id': str(c.id),
        'title': c.title,
        'description': c.description,
        'code': c.code,
        'term': c.term,
        'published': c.published,
        'last_updated': c.last_updated.isoformat() if c.last_updated else None
    }
    for c in courses
]), 200

@app.route('/student/courses', methods=['POST', 'GET'])
def student_create_courses():
    user_id, err = verify_student()
    if err: 
        return err
        
    db = Session()
    if request.method == 'POST':
        data = request.get_json() or {}
        title = data.get('title')
        if not title:
            db.close()
            return jsonify({'error': 'Title is required'}), 400
            
        description = data.get('description', '')
        code = data.get('code', '')
        term = data.get('term', '')
        published = data.get('published', False)
        
        try:
            # Create course without an instructor
            course = create_course(
                db=db,
                title=title,
                description=description,
                creator_id=user_id,
                code=code,
                term=term,
                published=published
            )
            
            # Create an access code for the course
            access_code = uuid.uuid4().hex[:8]
            create_access_code(db, course_id=course.id, code=access_code)
            
            # Create default module for new course
            create_module(
                db=db,
                course_id=course.id,
                title="Getting Started",
                description="Introduction to the course"
            )
            
            # Enroll the student in their own course
            create_enrollment(db, user_id=user_id, course_id=course.id)
            
            db.commit()
            return jsonify({
                'id': str(course.id),
                'title': course.title,
                'accessCode': access_code
            }), 201
            
        except Exception as e:
            db.rollback()
            import traceback
            print('Module creation error:', traceback.format_exc())
            return jsonify({'error': str(e)}), 500
        finally:
            db.close()
            
    # GET: Return courses created by this student
    try:
        # Get all courses where creator_id matches the student's user_id
        stmt = text("""
            SELECT c.* FROM "Course" c
            WHERE c.creator_id = :user_id
            ORDER BY c.created_at DESC
        """)
        result = db.execute(stmt, {'user_id': user_id})
        courses = result.mappings().all()
        
        return jsonify([{
            'id': str(course['id']),
            'title': course['title'],
            'description': course['description'],
            'code': course['code'],
            'term': course['term'],
            'published': course['published'],
            'created_at': course['created_at'].isoformat() if course['created_at'] else None,
            'last_updated': course['last_updated'].isoformat() if course['last_updated'] else None
        } for course in courses]), 200
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500
    finally:
        db.close()

@app.route('/instructor/courses', methods=['POST', 'GET'])
def instructor_courses():
    user_id, err = verify_instructor()
    if err: 
        return err
    db = Session()
    if request.method == 'POST':
        data = request.get_json() or {}
        title = data.get('title')
        description = data.get('description', '')
        code = data.get('code')          
        term = data.get('term')  
        published = data.get('published', False)        
    
        c = create_course(
            db,
            title=title,
            description=description,
            creator_id=user_id,
            instructor_id=user_id,
            code=code,
            term=term,
            published=published,
        )

        access_code = uuid.uuid4().hex[:8]
        create_access_code(db, course_id=c.id, code=access_code)
        
        # Create default module for new course
        create_module(
            db=db,
            course_id=c.id,
            title="Getting Started"
        )

        db.close()
        return jsonify({'id': str(c.id), 'accessCode': access_code}), 201

    # GET request
    courses = get_courses_by_instructor_id(db, user_id)
    db.close()
    return jsonify([
    {
        'id': str(c.id),
        'title': c.title,
        'description': c.description,
        'code': c.code,
        'term': c.term,
        'published': c.published,
        'last_updated': c.last_updated.isoformat() if c.last_updated else None
    }
    for c in courses
]), 200


@app.route('/instructor/courses/<course_id>', methods=['GET', 'PATCH', 'DELETE'])
def instructor_manage_course(course_id):
    """Manage a single course owned by the instructor"""
    user_id, err = verify_instructor()
    if err:
        return err

    db = Session()
    try:
        course = get_course_by_id(db, course_id)
        if not course or str(course.instructor_id) != str(user_id):
            db.close()
            return jsonify({'error': 'Course not found or access denied'}), 404

        if request.method == 'GET':
            return jsonify({
                'id': str(course.id),
                'title': course.title,
                'description': course.description,
                'code': course.code,
                'term': course.term,
                'published': course.published,
                'created_at': course.created_at.isoformat() if course.created_at else None,
                'last_updated': course.last_updated.isoformat() if course.last_updated else None
            }), 200

        elif request.method == 'PATCH':
            data = request.get_json() or {}
            allowed_fields = ['title', 'description', 'code', 'term', 'published']
            update_data = {k: v for k, v in data.items() if k in allowed_fields}

            if not update_data:
                db.close()
                return jsonify({'error': 'No valid fields to update'}), 400

            updated_course = update_course(db, course_id, **update_data)
            db.commit()
            return jsonify({
                'id': str(updated_course.id),
                'message': 'Course updated successfully'
            }), 200

        elif request.method == 'DELETE':
            delete_course(db, course_id)
            db.commit()
            return jsonify({'message': 'Course deleted successfully'}), 200

    except Exception as e:
        db.rollback()
        return jsonify({'error': str(e)}), 500
    finally:
        db.close()

@app.route('/student/courses/<course_id>', methods=['GET', 'PATCH', 'DELETE'])
def student_manage_course(course_id):
    user_id, err = verify_student()
    if err:
        return err
        
    db = Session()
    try:
        # Get the course and verify ownership
        course = get_course_by_id(db, course_id)
        if not course or str(course.creator_id) != str(user_id):
            db.close()
            return jsonify({'error': 'Course not found or access denied'}), 404
            
        if request.method == 'GET':
            # Return course details
            return jsonify({
                'id': str(course.id),
                'title': course.title,
                'description': course.description,
                'code': course.code,
                'term': course.term,
                'published': course.published,
                'created_at': course.created_at.isoformat() if course.created_at else None,
                'last_updated': course.last_updated.isoformat() if course.last_updated else None
            }), 200
            
        elif request.method == 'PATCH':
            # Update course details
            data = request.get_json() or {}
            
            # Only allow certain fields to be updated
            allowed_fields = ['title', 'description', 'code', 'term', 'published']
            update_data = {k: v for k, v in data.items() if k in allowed_fields}
            
            if not update_data:
                db.close()
                return jsonify({'error': 'No valid fields to update'}), 400
                
            updated_course = update_course(db, course_id, **update_data)
            db.commit()
            return jsonify({
                'id': str(updated_course.id),
                'message': 'Course updated successfully'
            }), 200
            
        elif request.method == 'DELETE':
            # Delete the course
            delete_course(db, course_id)
            db.commit()
            return jsonify({'message': 'Course deleted successfully'}), 200
            
    except Exception as e:
        db.rollback()
        return jsonify({'error': str(e)}), 500
    finally:
        db.close()

@app.route('/student/courses/<course_id>/modules', methods=['GET', 'POST'])
def student_modules(course_id):
    user_id, err = verify_student()
    if err:
        return err
    
    db = Session()
    try:
        # Verify the course is owned by the student (for POST) or student is enrolled (for GET)
        course = get_course_by_id(db, course_id)
        if not course:
            return jsonify({'error': 'Course not found'}), 404
            
        if request.method == 'POST':
            print(f"[DEBUG] student_modules POST: user_id={user_id}, course_id={course_id}")
            print(f"[DEBUG] course: {course}")
            # For creating modules, student must own the course
            if str(course.creator_id) != str(user_id):
                print(f"[DEBUG] Access denied: creator_id={course.creator_id} user_id={user_id}")
                return jsonify({'error': 'Access denied - you can only create modules in courses you created'}), 403
                
            data = request.get_json() or {}
            print(f"[DEBUG] Incoming data: {data}")
            title = data.get('title')
            description = data.get('description', '')
            
            if not title:
                print("[DEBUG] Missing title")
                return jsonify({'error': 'Title is required'}), 400
                
            # Get the next ordering number
            existing_modules = get_modules_by_course(db, course_id)
            # Handle tuple format (id, course_id, title, ordering)
            next_ordering = max([row[3] for row in existing_modules], default=-1) + 1
            print(f"[DEBUG] next_ordering: {next_ordering}")
            
            try:
                print("[DEBUG] Calling create_module...")
                # Pass description to create_module now that the column exists
                module = create_module(
                    db=db,
                    course_id=course_id,
                    title=title,
                    description=description
                )
                print(f"[DEBUG] Module created: {module}")
            except Exception as e:
                import traceback
                print('[DEBUG] Exception in create_module:', traceback.format_exc())
                db.rollback()
                return jsonify({'error': str(e)}), 500
            
            # Create response using the module's description field
            response_data = {
                'id': str(module.id),
                'title': module.title,
                'description': module.description,  # Now we can use the actual stored description
                'course_id': str(module.course_id),
                'ordering': module.ordering
            }
            return jsonify(response_data), 201
            
        else:  # GET request
            # For viewing modules, student must be enrolled
            if not get_enrollment_by_student_course(db, user_id, course_id):
                return jsonify({'error': 'Forbidden'}), 403
            mods = get_modules_by_course(db, course_id)
            # Handle tuple format returned by updated get_modules_by_course
            response_data = []
            for row in mods:
                # Unpack tuple values (id, course_id, title, ordering)
                module_id, course_id, title, ordering = row
                module_data = {
                    'id': str(module_id), 
                    'title': title, 
                    'ordering': ordering,
                    'description': ''  # Default empty description
                }
                response_data.append(module_data)
                
            return jsonify(response_data), 200
            
    except Exception as e:
        db.rollback()
        return jsonify({'error': str(e)}), 500
    finally:
        db.close()

@app.route('/student/modules/<module_id>', methods=['GET', 'PATCH', 'PUT', 'DELETE'])
def student_manage_single_module(module_id):
    user_id, err = verify_student()
    if err:
        return err
        
    db = Session()
    try:
        # Get the module and verify ownership through the course
        module = get_module_by_id(db, module_id)
        if not module:
            db.close()
            return jsonify({'error': 'Module not found'}), 404
            
        # Verify the course is owned by the student
        course = get_course_by_id(db, module.course_id)
        if not course or str(course.creator_id) != str(user_id):
            db.close()
            return jsonify({'error': 'Access denied'}), 403
            
        if request.method == 'GET':
            # Return module details
            return jsonify({
                'id': str(module.id),
                'title': module.title,
                'description': module.description,
                'course_id': str(module.course_id),
                'ordering': module.ordering
            }), 200
            
        elif request.method in ['PATCH', 'PUT']:
            # Update module details (support both PATCH and PUT for frontend compatibility)
            data = request.get_json() or {}
            
            # Only allow certain fields to be updated
            allowed_fields = ['title', 'description', 'ordering']
            update_data = {k: v for k, v in data.items() if k in allowed_fields}
            
            if not update_data:
                return jsonify({'error': 'No valid fields to update'}), 400
                
            updated_module = update_module(db, module_id, **update_data)
            
            return jsonify({
                'id': str(updated_module.id),
                'title': updated_module.title,
                'description': updated_module.description,
                'ordering': updated_module.ordering,
                'course_id': str(updated_module.course_id)
            }), 200
            
        elif request.method == 'DELETE':
            # Delete the module
            delete_module(db, module_id)
            db.commit()
            return jsonify({'message': 'Module deleted successfully'}), 200
            
    except Exception as e:
        db.rollback()
        return jsonify({'error': str(e)}), 500
    finally:
        db.close()

@app.route('/student/modules/<module_id>/files', methods=['GET'])
@cache_response(max_age=300, private=True)
def student_files(module_id):
    user_id, err = verify_student()
    if err:
        return err
    db = Session()
    m = get_module_by_id(db, module_id)
    if not m or not get_enrollment_by_student_course(db, user_id, m.course_id):
        db.close()
        return jsonify({'error': 'Forbidden'}), 403
    files = get_files_by_module(db, module_id)
    db.close()
    return jsonify([{
        'id': str(f.id), 
        'title': f.title,
        'filename': f.filename,
        'file_type': f.file_type,
        'file_size': f.file_size,
        'module_id': str(f.module_id),
        'moduleName': m.title,
        'created_at': f.created_at.isoformat() if f.created_at else None
    } for f in files]), 200

@app.route('/student/personalized-files', methods=['GET'])
@cache_response(max_age=60, private=True)
def student_list_pfiles():
    user_id, err = verify_student()
    if err:
        return err
    db = Session()
    pfs = get_personalized_files_by_student(db, user_id)
    db.close()
    return jsonify([{
        'id': str(p.id),
        'originalFileId': str(p.original_file_id) if p.original_file_id else None,
        'createdAt': p.created_at.isoformat()
    } for p in pfs]), 200

@app.route('/generatepersonalizedfilecontent', methods=['POST'])
def generate_personalized_file_content():
    user_id, err = verify_student()
    if err:
        return err
    
    # Read and validate JSON body
    data = request.get_json()
    name = data.get("name")
    profile = data.get("userProfile", {})
    file_id = data.get("fileId")

    persona = []
    if name:
        persona.append(f"The user's name is **{name}**")
    if profile.get('role'):
        persona.append(f"they are a **{profile['role']}**")
    if profile.get('traits'):
        persona.append(f"they like their assistant to be **{profile['traits']}**")
    if profile.get('learningStyle'):
        persona.append(f"their preferred learning style is **{profile['learningStyle']}**")
    if profile.get('depth'):
        persona.append(f"they prefer **{profile['depth']}-level** explanations")
    if profile.get('interests'):
        persona.append(f"they're interested in **{profile['interests']}**")
    if profile.get('personalization'):
        persona.append(f"they enjoy **{profile['personalization']}**")
    if profile.get('schedule'):
        persona.append(f"they study best **{profile['schedule']}**")
    full_persona = ". ".join(persona)

    # Check if file exists and has been processed
    db_session = Session()
    try:
        file = get_file_by_id(db_session, file_id)
        if not file:
            return jsonify({"error": "File not found"}), 404
            
        # Check if file has been processed
        chunk_count = db_session.query(FileChunk).filter_by(file_id=file_id).count()
        if chunk_count == 0:
            return jsonify({
                "error": "PROCESSING", 
                "message": "File is still being processed for AI features. Please try again in a moment."
            }), 202  # 202 Accepted - indicates processing is still in progress
    finally:
        db_session.close()

    # Start async task for personalization
    def generate_file_personalization():
        db_session = Session()
        try:
            # Generate response using pgvector retrieval
            response = generate_personalized_content_pgvector(db_session, file_id, full_persona)
            
            # Verify JSON is valid
            try:
                response_json = json.loads(response)
            except (ValueError, AttributeError, IndexError) as e:
                raise ValueError(f"Invalid JSON returned from AI response: {str(e)}")
                
            # Save personalized file to DB
            db = Session()
            try:
                saved_file = create_personalized_file(
                    db=db,
                    user_id=user_id,
                    original_file_id=file_id,
                    content=response_json
                )
                db.commit()
                return {
                    "status": "completed",
                    "file_id": str(saved_file.id),
                    "content": response_json
                }
            except Exception as e:
                db.rollback()
                raise Exception(f"Error saving personalized file: {str(e)}")
            finally:
                db.close()
        except Exception as e:
            raise Exception(f"Error generating personalized content: {str(e)}")
        finally:
            db_session.close()

    # Start the async task
    task_id = start_async_task(generate_file_personalization)
    
    return jsonify({"task_id": task_id}), 202

@app.route('/student/personalized-files/<pf_id>', methods=['GET', 'DELETE'])
def student_manage_personalized_file(pf_id):
    user_id, err = verify_student()
    if err:
        return err

    db = Session()
    try:
        pf = get_personalized_file_by_id(db, pf_id)

        if not pf or str(pf.user_id) != str(user_id):
            return jsonify({'error': 'Not found or unauthorized'}), 404

        if request.method == 'GET':
            response = {
        'id': str(pf.id),
        'originalFileId': str(pf.original_file_id) if pf.original_file_id else None,
        'createdAt': pf.created_at.isoformat(),
        'content': pf.content  
    }
            return jsonify(response), 200

        elif request.method == 'DELETE':
            delete_personalized_file(db, pf_id)
            return jsonify({'message': 'Personalized file deleted successfully'}), 200

    except Exception as e:
        db.rollback()
        return jsonify({'error': str(e)}), 500
    finally:
        db.close()

@app.route('/student/chats', methods=['GET', 'POST'])
def student_chats():
    user_id, err = verify_student()
    if err:
        return err
    db = Session()
    if request.method == 'POST':
        data = request.get_json() or {}
        file_id = data.get('fileId')
        c = create_chat(db, user_id, file_id, data.get('title'))
        if file_id:
            f = get_file_by_id(db, file_id)
            f.chat_count += 1
            db.commit()
        db.close()
        return jsonify({'id': str(c.id)}), 201
    chats = get_chats_by_student(db, user_id)
    db.close()
    return jsonify([{'id': str(c.id), 'title': c.title} for c in chats]), 200

@app.route('/student/chats/<chat_id>', methods=['GET', 'PATCH', 'DELETE'])
def student_manage_chat(chat_id):
    user_id, err = verify_student()
    if err:
        return err
    db = Session()
    chat = get_chat_by_id(db, chat_id)
    if not chat or str(chat.user_id) != str(user_id):
        db.close()
        return jsonify({'error': 'Forbidden'}), 403
    if request.method == 'GET':
        out = {'id': str(chat.id), 'title': chat.title}
        db.close()
        return jsonify(out), 200
    if request.method == 'PATCH':
        data = request.get_json() or {}
        updated = update_chat(db, chat_id, **data)
        db.close()
        return jsonify({'id': str(updated.id)}), 200
    delete_chat(db, chat_id)
    db.close()
    return jsonify({'message': 'Deleted'}), 200


@app.route('/student/chats/<chat_id>/messages', methods=['GET', 'POST'])
def student_messages(chat_id):
    user_id, err = verify_student()
    if err:
        return err
    db = Session()
    if request.method == 'POST':
        data = request.get_json() or {}
        m = create_message(db, chat_id, data['role'], data['content'])
        db.close()
        return jsonify({'id': str(m.id)}), 201
    msgs = get_messages_by_chat(db, chat_id)
    db.close()
    return jsonify([{'id': str(m.id), 'role': m.role, 'content': m.content} for m in msgs]), 200


@app.route('/delete-trailing-messages', methods=['POST'])
def student_delete_trailing():
    user_id, err = verify_student()
    if err:
        return err
    data = request.get_json() or {}
    msg_id = data.get('id')
    if not msg_id:
        return jsonify({'error': 'Message ID required'}), 400
    db = Session()
    msg = get_message_by_id(db, msg_id)
    if not msg or str(msg.chat.user_id) != str(user_id):
        db.close()
        return jsonify({'error': 'Forbidden'}), 403
    delete_messages_after(db, chat_id=msg.chat_id, timestamp=msg.created_at)
    db.close()
    return jsonify({'message': 'Deleted trailing messages'}), 200


@app.route('/instructor/courses/<course_id>/reports', methods=['GET'])
def instructor_get_report(course_id):
    user_id, err = verify_instructor()
    if err:
        return err
    db = Session()
    try:
        course = get_course_by_id(db, course_id)
        if not course or str(course.instructor_id) != str(user_id):
            return jsonify({'error': 'Forbidden'}), 403
        rpt = get_report_by_course(db, course_id)
        if not rpt:
            return jsonify({'error': 'Not found'}), 404
        return jsonify({'id': str(rpt.id), 'summary': rpt.summary}), 200
    finally:
        db.close()


@app.route('/instructor/courses/<course_id>/reports', methods=['POST'])
def instructor_create_or_update_report(course_id):
    user_id, err = verify_instructor()
    if err:
        return err
    db = Session()
    try:
        course = get_course_by_id(db, course_id)
        if not course or str(course.instructor_id) != str(user_id):
            return jsonify({'error': 'Forbidden'}), 403
        file_metrics = get_file_metrics_for_course(db, course_id)
        module_metrics = get_module_metrics_for_course(db, course_id)
        questions = get_student_questions_for_course(db, course_id)
        title     = get_course_title(db, course_id)
        summary = {
            'fileMetrics': file_metrics,
            'moduleMetrics': module_metrics,
            'faqs': []  # faqs_obj.get('faqs', [])
        }
        existing = get_report_by_course(db, course_id)
        if existing:
            rpt, status = update_report(db, existing.id, summary=summary), 200
        else:
            rpt, status = create_report(db, course_id, summary), 201
        return jsonify({'id': str(rpt.id), 'summary': rpt.summary}), status
    finally:
        db.close()


@app.route('/instructor/reports/<report_id>', methods=['PATCH'])
def instructor_update_report(report_id):
    user_id, err = verify_instructor()
    if err:
        return err
    data = request.get_json() or {}
    if 'summary' not in data:
        return jsonify({'error': 'summary required'}), 400
    db = Session()
    try:
        rpt = get_report_by_id(db, report_id)
        if not rpt:
            return jsonify({'error': 'Not found'}), 404
        course = get_course_by_id(db, rpt.course_id)
        if not course or str(course.instructor_id) != str(user_id):
            return jsonify({'error': 'Forbidden'}), 403
        updated = update_report(db, report_id, summary=data['summary'])
        result = {'id': str(updated.id), 'summary': updated.summary}
    finally:
        db.close()
    return jsonify(result), 200


@app.route('/instructor/reports/<report_id>', methods=['DELETE'])
def instructor_delete_report(report_id):
    user_id, err = verify_instructor()
    if err:
        return err
    db = Session()
    try:
        rpt = get_report_by_id(db, report_id)
        if not rpt:
            return jsonify({'error': 'Not found'}), 404
        course = get_course_by_id(db, rpt.course_id)
        if not course or str(course.instructor_id) != str(user_id):
            return jsonify({'error': 'Forbidden'}), 403
        delete_report(db, report_id)
    finally:
        db.close()
    return '', 204

@app.route('/ai-chat', methods=['POST'])
def ai_chat():
    try:
        # 1. Verify student session
        user_id, err = verify_student()
        if err:
            return err

        # 2. Parse request
        data = request.get_json() or {}
        chat_id      = data.get('id')
        file_id      = data.get('fileId')
        user_message = data.get('userMessage') or data.get('message')
        history      = data.get('messages', [])

        if not user_message:
            return jsonify({'error': 'User message is required'}), 400

        db = Session()
        course_id = None
        f = get_file_by_id(db, file_id)
        print(f"Saving to chat ID: {chat_id}")
        
      # 3. Get or create Chat
        if chat_id:
            chat = get_chat_by_id(db, chat_id)
            if not chat or str(chat.user_id) != str(user_id):
                db.close()
                return jsonify({'error': 'Forbidden'}), 403
        else:
            if not file_id:
                db.close()
                return jsonify({'error': 'Missing fileId for new chat'}), 400

            # Look up the original file_id from the PersonalizedFile
            files = get_personalized_files_by_student(db, user_id)
            personalized_file = next(
                (pf for pf in files if str(pf.original_file_id) == str(file_id)),
                None
            )
            print("Personalized File ID:")
            print(personalized_file.id)
            if not personalized_file:
                db.close()
                return jsonify({'error': 'No personalized file found for this original fileId'}), 404

            chat = create_chat(db, user_id, file_id, title='New Chat')
            chat_id = str(chat.id)

            if f:
                f.chat_count += 1
                db.commit()

        if not f or not f.module:
            db.close()
            return jsonify({'error': 'File or module not found'}), 404

        course_id = f.module.course_id
        # 4. Save incoming user message
        create_message(db, chat_id, role='user', content=user_message)

        # 5. Embed query and retrieve top 5 chunks
        vector_list = openai_embed_text([user_message])[0].tolist()
        pgvector_str = f"[{','.join(map(str, vector_list))}]"

        sql = text("""
            SELECT content
            FROM "FileChunk"
            WHERE course_id = :cid
            ORDER BY embedding <-> :query_vec
            LIMIT 3
        """)
        rows = db.execute(sql, {"cid": course_id, "query_vec": pgvector_str}).fetchall()
        retrieved_chunks = [row[0] for row in rows if row[0]]

        # 6. Build messages for OpenAI
        messages = [
                {
                "role": "system",
                "content": (
                    "You are a helpful and knowledgeable AI tutor assisting a student. "
                    "You must use the student's background and interests to personalize each explanation and response. "
                    "If course content is relevant to the user's message, you must use it to answer. "
                    "If the question is relevant to course material, but not specifically included, you can use your greater knowledge outside of course content. "
                    "If it is not relevant, do not fabricate an answer. Instead, respond with:\n\n"
                    "\"I'm here to help with this course, but that question isn't related to the material we've covered.\"\n\n"
                    "Avoid speculation or answering based on general knowledge if the topic isn't in the course context."
                )
            }   
        ]

        if retrieved_chunks:
            context_string = "\n\n".join(
                [f"Chunk {i+1}:\n{chunk.strip()}" for i, chunk in enumerate(retrieved_chunks)]
            )
            material_prompt = {
                "role": "system",
                "content": (
                    "The following excerpts are from course materials. You must use them to answer the student's question if relevant:\n\n"
                    f"{context_string}"
                )
            }
            messages.append(material_prompt)

        # Add chat history
        for m in history:
            if m.get("role") and m.get("content"):
                messages.append({
                    "role": m["role"],
                    "content": m["content"]
                })

        messages.append({"role": "user", "content": user_message})

         # 7. Build persona prompt from StudentProfile
        sp = get_student_profile(db, user_id)
        if not sp:
            db.close()
            return jsonify({'error': 'Student profile not found'}), 404

        answers = sp.onboard_answers or {}
        name           = sp.name
        job            = answers.get('job')
        traits         = answers.get('traits')
        learning_style = answers.get('learningStyle')
        depth          = answers.get('depth')
        topics         = answers.get('topics')
        interests      = answers.get('interests')
        schedule       = answers.get('schedule')

        persona_bits = []
        if name:           persona_bits.append(f"Name: {name}")
        if job:            persona_bits.append(f"Occupation: {job}")
        if traits:         persona_bits.append(f"Preferred tone: {traits}")
        if learning_style: persona_bits.append(f"Learning style: {learning_style}")
        if depth:          persona_bits.append(f"Depth: {depth}")
        if topics:         persona_bits.append(f"Topics: {topics}")
        if interests:      persona_bits.append(f"Interests: {interests}")
        if schedule:       persona_bits.append(f"Schedule: {schedule}")
        persona_string = " • ".join(persona_bits)

        expertise_map = {
            'beginner':     'They prefer simple, clear explanations.',
            'intermediate': 'They want moderate technical depth.',
            'advanced':     'They want in-depth, technical explanations.',
        }
        expertise_summary = expertise_map.get(
            (depth or '').lower(),
            expertise_map['beginner']
        )

        persona_msg = {
            'role': 'system',
            'content': f"{persona_string}. {expertise_summary}"
        }

        messages.append(persona_msg)

        print(messages)

        # 8. Call OpenAI
        client = OpenAI(api_key=os.getenv("OPENAI_API_KEY"))
        resp = client.chat.completions.create(
            model="gpt-4o",
            messages=messages,
            temperature=0.5,
            max_tokens=300,
        )

        assistant_reply = resp.choices[0].message.content.strip()

        # 9. Save assistant reply (optional)
        create_message(db, chat_id, role="assistant", content=assistant_reply)

        db.close()

        # 10. Return result
        return jsonify({"assistant": assistant_reply, "chatId": chat_id}), 200

    except Exception as e:
        import traceback
        traceback.print_exc()
        return jsonify({"error": "Internal server error", "details": str(e)}), 500


@app.route('/courses/<course_id>/citations', methods=['GET'])
def citations_route(course_id):
    db = Session()
    try:
        course = get_course_by_id(db, course_id)
        if not course:
            return jsonify({'error': 'Course not found'}), 404
            
        # Get all files in the course
        modules = get_modules_by_course(db, course_id)
        citations = []
        
        for module in modules:
            files = get_files_by_module(db, module.id)
            for file in files:
                citations.append({
                    'source': file.filename,
                    'citation': f"Mock APA Citation for {file.filename}"
                })
        
        return jsonify({'citations': citations}), 200
    finally:
        db.close()

@app.route('/sessionLogin', methods=['POST'])
def session_login():
    data = request.get_json() or {}
    id_token = data.get('idToken')
    if not id_token:
        return jsonify({'error': 'Missing idToken'}), 400
    try:
        # Verify the Firebase ID token
        decoded_token = auth.verify_id_token(id_token)
        uid = decoded_token.get('uid')
        email = decoded_token.get('email')
        print(f'Firebase auth successful for UID: {uid}, Email: {email}')
        
        # Check if user exists in our database
        db = Session()
        user = get_user_by_firebase_uid(db, uid)
        
        # If user not found by Firebase UID, try to find by email
        if not user and email:
            user = get_user_by_email(db, email)
            if user:
                print(f'Found existing user by email: {email}. Updating Firebase UID from {user.firebase_uid} to {uid}')
                # Update the user's Firebase UID to the current one
                user.firebase_uid = uid
                db.commit()
                print(f'Updated Firebase UID for user {email}')
        
        # If still no user found, create a new one
        if not user and email:
            try:
                # For Google sign-ins, we don't have a password, so use a random one
                import secrets
                random_password = secrets.token_hex(16)
                
                # Create user with default role 'student'
                user = create_user(db, email, random_password, uid, 'student')
                print(f'Created new user in database for Firebase UID: {uid}, Email: {email}')
            except Exception as user_create_error:
                print(f'Error creating user in database: {str(user_create_error)}')
                # Continue even if user creation fails - they'll still get a session cookie
        
        # Set a longer expiration for better user experience
        expires = 60 * 60 * 24 * 14  # 14 days
        session_cookie = auth.create_session_cookie(id_token, expires_in=expires)
        
        # Create response
        resp = jsonify({
            'status': 'success',
            'message': 'Session cookie set successfully',
            'uid': uid,
            'email': email,
            'user_found': user is not None
        })
        
        # Set cookie with more permissive settings for development
        is_secure = os.environ.get('FLASK_ENV') != 'development'
        
        resp.set_cookie(
            'session',
            session_cookie,
            max_age=expires,
            httponly=True,  # Still keep HttpOnly for security
            secure=is_secure,  # Only require HTTPS in production
            samesite='Lax'  # Allow cross-site requests with top-level navigation
        )
        
        db.close()
        print(f'Session cookie set for user {uid}')
        return resp, 200
    except Exception as e:
        print(f'Session login error: {str(e)}')
        return jsonify({'error': str(e)}), 401

@app.route('/sessionLogout', methods=['POST'])
def session_logout():
    resp = jsonify({'message': 'Logged out'})
    resp.set_cookie('session', '', max_age=0)
    return resp, 200

@app.route('/admin/users', methods=['GET', 'POST'])
def admin_users():
    admin_id, err = verify_admin()
    if err:
        return err
    db = Session()
    if request.method == 'GET':
        from src.db.schema import User
        users = db.query(User).all()
        result = []
        for u in users:
            role = get_role_by_user_id(db, u.id)
            result.append({
                'id': str(u.id),
                'email': u.email,
                'role': role.role_type if role else None
            })
        db.close()
        return jsonify(result), 200

    data = request.get_json() or {}
    email = data.get('email')
    pwd = data.get('password')
    role_type = data.get('role_type')
    name = data.get('name')
    if not (email and pwd and role_type and name):
        db.close()
        return jsonify({'error': 'email, password, role_type, and name are required'}), 400
    user = create_user(db, email, pwd, firebase_uid='', role_type=role_type)
    if role_type == 'instructor':
        create_instructor_profile(db, user.id, name)
    elif role_type == 'student':
        create_student_profile(db, user.id, name, onboard_answers={}, want_quizzes=False)
    elif role_type == 'admin':
        create_admin_profile(db, user.id, name)
    db.close()
    return jsonify({'id': str(user.id), 'email': user.email, 'role': role_type}), 201

@app.route('/admin/users/<user_id>', methods=['GET', 'PATCH', 'DELETE'])
def admin_manage_user(user_id):
    admin_id, err = verify_admin()
    if err:
        return err
    db = Session()
    user = get_user_by_id(db, user_id)
    if not user:
        db.close()
        return jsonify({'error': 'Not found'}), 404

    if request.method == 'GET':
        role = get_role_by_user_id(db, user_id)
        db.close()
        return jsonify({
            'id': str(user.id),
            'email': user.email,
            'role': role.role_type if role else None
        }), 200

    if request.method == 'PATCH':
        data = request.get_json() or {}
        updated = update_user(db, user_id=user_id, **data)
        if 'role_type' in data:
            set_role(db, user_id, data['role_type'])
        db.close()
        return jsonify({'id': str(updated.id), 'email': updated.email}), 200

    delete_user(db, user_id)
    db.close()
    return jsonify({'message': 'Deleted'}), 200

@app.route('/admin/news', methods=['GET', 'POST'])
def admin_news():
    admin_id, err = verify_admin()
    if err:
        return err
    db = Session()
    from src.db.queries import list_news, create_news
    if request.method == 'GET':
        items = list_news(db)
        db.close()
        return jsonify([{
            'id': str(n.id), 'title': n.title, 'subject': n.subject, 'link': n.link
        } for n in items]), 200

    data = request.get_json() or {}
    title = data.get('title')
    subject = data.get('subject')
    link = data.get('link')
    if not (title and subject and link):
        db.close()
        return jsonify({'error': 'title, subject, and link required'}), 400
    n = create_news(db, title, subject, link)
    db.close()
    return jsonify({'id': str(n.id)}), 201

@app.route('/admin/news/<news_id>', methods=['GET', 'PATCH', 'DELETE'])
def admin_manage_news(news_id):
    admin_id, err = verify_admin()
    if err:
        return err
    db = Session()
    from src.db.queries import get_news_by_id, update_news, delete_news
    n = get_news_by_id(db, news_id)
    if not n:
        db.close()
        return jsonify({'error': 'Not found'}), 404

    if request.method == 'GET':
        db.close()
        return jsonify({
            'id': str(n.id), 'title': n.title, 'subject': n.subject, 'link': n.link
        }), 200

    if request.method == 'PATCH':
        data = request.get_json() or {}
        updated = update_news(db, news_id, **data)
        db.close()
        return jsonify({'id': str(updated.id)}), 200

    delete_news(db, news_id)
    db.close()
    return jsonify({'message': 'Deleted'}), 200

@app.route('/admin/market', methods=['GET', 'POST'])
def admin_market():
    admin_id, err = verify_admin()
    if err:
        return err
    db = Session()
    from src.db.queries import list_market, create_market
    if request.method == 'GET':
        items = list_market(db)
        db.close()
        return jsonify([{
            'id': str(m.id), 'snp500': float(m.snp500), 'date': m.date.isoformat()
        } for m in items]), 200

    data = request.get_json() or {}
    snp500 = data.get('snp500')
    date = data.get('date')
    if snp500 is None or date is None:
        db.close()
        return jsonify({'error': 'snp500 and date required'}), 400
    m = create_market(db, snp500, date)
    db.close()
    return jsonify({'id': str(m.id)}), 201

@app.route('/admin/market/<market_id>', methods=['GET', 'PATCH', 'DELETE'])
def admin_manage_market(market_id):
    admin_id, err = verify_admin()
    if err:
        return err
    db = Session()
    from src.db.queries import get_market_by_id, update_market, delete_market
    m = get_market_by_id(db, market_id)
    if not m:
        db.close()
        return jsonify({'error': 'Not found'}), 404

    if request.method == 'GET':
        db.close()
        return jsonify({
            'id': str(m.id), 'snp500': float(m.snp500), 'date': m.date.isoformat()
        }), 200

    if request.method == 'PATCH':
        data = request.get_json() or {}
        updated = update_market(db, market_id, **data)
        db.close()
        return jsonify({'id': str(updated.id)}), 200

    delete_market(db, market_id)
    db.close()
    return jsonify({'message': 'Deleted'}), 200

@app.route('/generate-title', methods=['POST'])
def generate_title():
    data = request.get_json() or {}
    message = data.get('message')
    if not message:
        return jsonify({'error': 'Message is required'}), 400

    title = message[:80]
    return jsonify({'title': title}), 200

@app.route('/save-model-id', methods=['POST'])
def save_model_id():
    user_id, err = verify_student()
    if err:
        return err

    data = request.get_json() or {}
    model = data.get('model')
    if not model:
        return jsonify({'error': 'Model ID is required'}), 400

    db = Session()
    updated = update_student_profile(db, user_id, model_preference=model)
    db.close()

    return jsonify({
        'message': f'Model ID {model} saved successfully',
        'model_preference': updated.model_preference
    }), 200

# Analytics Routes

@app.route('/student/files/<file_id>/view-raw', methods=['POST'])
def raw_file_view(file_id):
    user_id, err = verify_student()
    if err:
        return err
    db = Session()
    f = get_file_by_id(db, file_id)
    if not f:
        db.close()
        return jsonify({'error': 'File not found'}), 404
    m = get_module_by_id(db, f.module_id)
    if not m or not get_enrollment_by_student_course(db, user_id, m.course_id):
        db.close()
        return jsonify({'error': 'Forbidden'}), 403
    f.view_count_raw += 1
    db.commit()
    db.close()
    return '', 204

@app.route('/student/files/<file_id>/view-personalized', methods=['POST'])
def personalized_file_view(file_id):
    user_id, err = verify_student()
    if err:
        return err
    db = Session()
    f = get_file_by_id(db, file_id)
    if not f:
        db.close()
        return jsonify({'error': 'File not found'}), 404
    m = get_module_by_id(db, f.module_id)
    if not m or not get_enrollment_by_student_course(db, user_id, m.course_id):
        db.close()
        return jsonify({'error': 'Forbidden'}), 403
    f.view_count_personalized += 1
    db.commit()
    db.close()
    return '', 204

@app.route('/instructor/courses/<course_id>/faqs', methods=['GET'])
def instructor_course_faqs(course_id):
    user_id, err = verify_instructor()
    if err:
        return err
    db = Session()
    try:
        course = get_course_by_id(db, course_id)
        if not course or str(course.instructor_id) != str(user_id):
            return jsonify({'error': 'Forbidden'}), 403
        questions = get_student_questions_for_course(db, course_id)
        title     = get_course_title(db, course_id)
    finally:
        db.close()
    # faqs_payload = prompt_course_faqs(title, questions)
    # return jsonify(faqs_payload), 200
    return jsonify({'faqs': []}), 200

# ---------------------------------------------------------------------------
# Missing endpoints that frontend expects
# ---------------------------------------------------------------------------

@app.route('/student/courses/<course_id>/discussions', methods=['GET', 'POST'])
def student_course_discussions(course_id):
    """Handle course discussions for students."""
    user_id, err = verify_student()
    if err:
        return err
    
    db = Session()
    try:
        # Verify student has access to this course
        enrollment = get_enrollment_by_student_course(db, user_id, course_id)
        if not enrollment:
            return jsonify({'error': 'Access denied'}), 403
        
        if request.method == 'GET':
            # For now, return empty discussions - this can be expanded later
            return jsonify([]), 200
        
        elif request.method == 'POST':
            # For now, return success - this can be expanded later
            data = request.get_json() or {}
            return jsonify({'message': 'Discussion posted successfully'}), 201
    
    except Exception as e:
        return jsonify({'error': str(e)}), 500
    finally:
        db.close()

@app.route('/student/courses/<course_id>/files', methods=['POST'])
def student_course_files_upload(course_id):
    """Handle file uploads for student courses."""
    user_id, err = verify_student()
    if err:
        return err
    
    db = Session()
    try:
        # Verify student is enrolled in this course (not that they own it)
        enrollment = get_enrollment_by_student_course(db, user_id, course_id)
        if not enrollment:
            return jsonify({'error': 'Access denied - not enrolled in course'}), 403
        
        # Get the file from the request
        file = request.files.get('file')
        if not file:
            return jsonify({'error': 'No file provided'}), 400
        
        # Get title, description, and moduleId from form data
        title = request.form.get('title', file.filename)
        description = request.form.get('description', '')
        provided_module_id = request.form.get('moduleId')  # CRITICAL: Get moduleId from frontend
        
        app.logger.info(f"[DEBUG] File upload: provided_module_id={provided_module_id}, course_id={course_id}")
        
        target_module = None
        
        # If moduleId is provided, use it (preferred)
        if provided_module_id:
            target_module = get_module_by_id(db, provided_module_id)
            app.logger.info(f"[DEBUG] Found module: {target_module}, module.course_id={target_module.course_id if target_module else None}")
            # Verify the module belongs to this course
            if target_module and str(target_module.course_id) == str(course_id):
                # Module is valid and belongs to this course - use it
                app.logger.info(f"[DEBUG] Using provided module: {target_module.title} (ID: {target_module.id})")
                pass
            else:
                app.logger.warning(f"[DEBUG] Module validation failed - target_module={target_module}, course_id mismatch")
                target_module = None  # Invalid module for this course
        
        # Fallback: If no module specified, create or find "Student Uploads" module
        if not target_module:
            app.logger.warning(f"[DEBUG] No valid module found, falling back to 'Student Uploads' module")
            # Look for existing "Student Uploads" module
            modules = get_modules_by_course(db, course_id)
            for module in modules:
                if module.title.lower() == "student uploads":
                    target_module = module
                    app.logger.info(f"[DEBUG] Found existing 'Student Uploads' module: {module.id}")
                    break
            
            # If not found, create it
            if not target_module:
                target_module = create_module(
                    db=db,
                    course_id=course_id,
                    title="Student Uploads",
                    description="Student uploaded files"
                )
                app.logger.info(f"[DEBUG] Created 'Student Uploads' module for course {course_id}: {target_module.id}")
        
        app.logger.info(f"[DEBUG] Final target module: {target_module.title} (ID: {target_module.id})")
        
        # Use the FileUploadHandler for background processing
        from src.file_upload_handler import FileUploadHandler
        
        handler = FileUploadHandler(db)
        result = handler.process_upload(
            file_obj=file,
            module_id=str(target_module.id),
            title=title,
            user_id=user_id,
            process_immediately=False  # Use background processing
        )
        
        # Return the result from the handler
        return jsonify(result), 201
    
    except Exception as e:
        db.rollback()
        app.logger.error(f"Student file upload error: {str(e)}")
        return jsonify({'error': str(e)}), 500
    finally:
        db.close()

# ---------------------------------------------------------------------------
# Global error handler: ensures **all** uncaught exceptions respond with a JSON
# payload instead of the default HTML error page.  This prevents client-side
# `response.json()` calls from throwing a `SyntaxError` and provides clearer
# diagnostics in the browser/dev-tools network tab.
# ---------------------------------------------------------------------------
from werkzeug.exceptions import HTTPException


@app.errorhandler(Exception)
def handle_unexpected_error(err):  # noqa: D401 – simple handler name
    """Return JSON for any uncaught exception.

    If the error is an instance of :class:`HTTPException` we keep its status
    code, otherwise we default to **500**.  The error message is stringified
    so that internal errors still surface something useful to the frontend
    without leaking full tracebacks.
    """

    status_code = err.code if isinstance(err, HTTPException) else 500

    # Log full traceback to the server console for debugging/monitoring.
    import traceback, sys  # local import to avoid polluting global namespace

    traceback.print_exc(file=sys.stderr)

    return jsonify({
        'error': str(err),
    }), status_code

@app.route('/student/personalized-files/check/<file_id>', methods=['GET'])
def check_personalized_file_exists(file_id):
    """Check if a personalized file already exists for the given original file ID"""
    user_id, err = verify_student()
    if err:
        return err

    db = Session()
    try:
        # Get all personalized files for this student
        personalized_files = get_personalized_files_by_student(db, user_id)
        
        # Check if any personalized file has this original_file_id
        for pf in personalized_files:
            if pf.original_file_id and str(pf.original_file_id) == str(file_id):
                db.close()
                return jsonify({
                    'exists': True,
                    'personalizedDocumentId': str(pf.id),
                    'createdAt': pf.created_at.isoformat()
                }), 200
        
        # No personalized file found for this original file
        db.close()
        return jsonify({'exists': False}), 200
        
    except Exception as e:
        db.close()
        return jsonify({'error': str(e)}), 500

# Add dashboard stats and activity tracking endpoints
@app.route('/student/dashboard/stats', methods=['GET'])
@cache_response(max_age=60, private=True)
def student_dashboard_stats():
    user_id, err = verify_student()
    if err:
        return err
    
    db = Session()
    try:
        # Get simple stats that don't depend on complex queries
        enrollments = get_enrollments_by_student(db, user_id)
        
        # Count personalized files (safe query)
        personalized_files_count = 0
        try:
            personalized_files = get_personalized_files_by_student(db, user_id)
            personalized_files_count = len(personalized_files) if personalized_files else 0
        except:
            personalized_files_count = 0
        
        # Count chats (safe query)
        chats_count = 0
        try:
            chats = get_chats_by_student(db, user_id)
            chats_count = len(chats) if chats else 0
        except:
            chats_count = 0
        
        # Simple calculations
        total_ai_interactions = personalized_files_count + chats_count
        weekly_hours = round(max(total_ai_interactions * 0.5, 0.1), 1)  # Estimate 30 min per interaction
        
        return jsonify({
            'aiInteractions': total_ai_interactions,
            'weeklyHours': weekly_hours,
            'personalizedFilesCount': personalized_files_count,
            'fileViewsThisWeek': chats_count
        }), 200
        
    except Exception as e:
        print(f"Dashboard stats error: {str(e)}")
        # Return default values instead of failing
        return jsonify({
            'aiInteractions': 0,
            'weeklyHours': 0.1,
            'personalizedFilesCount': 0,
            'fileViewsThisWeek': 0
        }), 200
    finally:
        db.close()

@app.route('/student/courses/<course_id>/progress', methods=['GET'])
@with_db_retry()  # Apply retry logic to the entire endpoint
def student_course_progress(course_id):
    user_id, err = verify_student()
    if err:
        return err
    
    db = get_db_session()
    try:
        # Verify student is enrolled in the course
        enrollment = get_enrollment_by_student_course(db, user_id, course_id)
        if not enrollment:
            return jsonify({'error': 'Not enrolled in this course'}), 403
        
        # Get all course files/materials with safer query and retry logic
        try:
            # Use execute_with_retry for the specific database query
            def get_course_files():
                return db.query(File).join(Module).filter(
                    Module.course_id == course_id
                ).all()
            
            course_files = execute_with_retry(get_course_files)
        except Exception as query_error:
            logger.error(f"Error querying course files: {str(query_error)}")
            # Fallback to basic counting
            return jsonify({
                'totalMaterials': 0,
                'viewedMaterials': 0,
                'personalizedMaterials': 0,
                'progressPercentage': 0,
                'todayTimeMinutes': 0,
                'weeklyTimeMinutes': 0,
                'aiInteractions': 0
            }), 200
        
        total_materials = len(course_files)
        
        # Count viewed materials (both raw and personalized views)
        viewed_materials = 0
        personalized_materials = 0
        today_time_minutes = 0
        weekly_time_minutes = 0
        
        try:
            today_start = datetime.now().replace(hour=0, minute=0, second=0, microsecond=0)
            week_start = datetime.now() - timedelta(days=7)
        except Exception as date_error:
            logger.error(f"Error calculating dates: {str(date_error)}")
            today_start = datetime.now()
            week_start = datetime.now()
        
        for file in course_files:
            try:
                # Count as viewed if either raw or personalized views > 0
                raw_views = getattr(file, 'view_count_raw', 0) or 0
                personalized_views = getattr(file, 'view_count_personalized', 0) or 0
                
                if raw_views > 0 or personalized_views > 0:
                    viewed_materials += 1
                
                # Count personalized materials
                if personalized_views > 0:
                    personalized_materials += 1
            except Exception as file_error:
                logger.error(f"Error processing file {file.id}: {str(file_error)}")
                continue
                
        # Get personalized files for this course with safer query and retry logic
        try:
            def get_personalized_files():
                return db.query(PersonalizedFile).join(File).join(Module).filter(
                    PersonalizedFile.user_id == user_id,
                    Module.course_id == course_id
                ).all()
            
            course_personalized_files = execute_with_retry(get_personalized_files)
        except Exception as pf_error:
            logger.error(f"Error querying personalized files: {str(pf_error)}")
            course_personalized_files = []
        
        # Estimate time based on activity
        for pf in course_personalized_files:
            try:
                # Each personalized file represents ~30-45 minutes of learning
                weekly_time_minutes += 35
                
                # If created today, add to today's time
                if hasattr(pf, 'created_at') and pf.created_at and pf.created_at >= today_start:
                    today_time_minutes += 35
            except Exception as time_error:
                logger.error(f"Error calculating time for personalized file {pf.id}: {str(time_error)}")
                continue
        
        # Add time for regular file views (estimate 10 minutes per view)
        for file in course_files:
            try:
                weekly_views_raw = getattr(file, 'view_count_raw', 0) or 0
                weekly_time_minutes += min(weekly_views_raw * 10, 60)  # Cap at 60 mins per file
            except Exception as view_error:
                logger.error(f"Error calculating view time for file {file.id}: {str(view_error)}")
                continue
        
        # Calculate progress percentage
        progress_percentage = round((viewed_materials / total_materials) * 100) if total_materials > 0 else 0
        
        return jsonify({
            'totalMaterials': total_materials,
            'viewedMaterials': viewed_materials,
            'personalizedMaterials': personalized_materials,
            'progressPercentage': progress_percentage,
            'todayTimeMinutes': min(today_time_minutes, 120),  # Cap at 2 hours
            'weeklyTimeMinutes': min(weekly_time_minutes, 600),  # Cap at 10 hours
            'aiInteractions': personalized_materials  # Each personalized file is an AI interaction
        }), 200
        
    except Exception as e:
        logger.error(f"Course progress error: {str(e)}")
        import traceback
        traceback.print_exc()
        return jsonify({'error': 'Failed to calculate course progress'}), 500
    finally:
        db.close()

@app.route('/student/activity/log', methods=['POST'])
def log_student_activity():
    """Log student activity for better time tracking"""
    user_id, err = verify_student()
    if err:
        return err
    
    data = request.get_json()
    activity_type = data.get('type')  # 'file_view', 'ai_chat', 'quiz', 'upload'
    file_id = data.get('fileId')
    course_id = data.get('courseId')
    duration_minutes = data.get('durationMinutes', 0)
    
    db = Session()
    try:
        # For now, we'll increment view counts on files
        # In the future, you could create a separate ActivityLog table
        
        if activity_type == 'file_view' and file_id:
            file = get_file_by_id(db, file_id)
            if file:
                file.view_count_raw += 1
                db.commit()
                
        elif activity_type == 'personalized_view' and file_id:
            file = get_file_by_id(db, file_id)
            if file:
                file.view_count_personalized += 1
                db.commit()
        
        return jsonify({'status': 'logged'}), 200
        
    except Exception as e:
        print(f"Activity logging error: {str(e)}")
        return jsonify({'error': 'Failed to log activity'}), 500
    finally:
        db.close()

@app.route('/student/recent-activities', methods=['GET'])
def get_student_recent_activities():
    """Get recent activities for a student based on real data"""
    user_id, err = verify_student()
    if err:
        return err
    
    db = Session()
    try:
        activities = []
        
        # Get recent personalized files safely
        try:
            recent_personalized = get_personalized_files_by_student(db, user_id)
            if recent_personalized:
                # Get the 3 most recent ones
                for pf in recent_personalized[-3:]:
                    activities.append({
                        'id': str(pf.id),
                        'type': 'ai_chat',
                        'course': 'Course Materials',
                        'title': f"AI interaction with document",
                        'timestamp': pf.created_at.isoformat() if pf.created_at else datetime.now().isoformat()
                    })
        except Exception as e:
            print(f"Error loading personalized files: {str(e)}")
        
        # Get recent chats safely
        try:
            recent_chats = get_chats_by_student(db, user_id)
            if recent_chats:
                # Get the 3 most recent ones
                for chat in recent_chats[-3:]:
                    activities.append({
                        'id': str(chat.id),
                        'type': 'ai_chat',
                        'course': 'General',
                        'title': f"AI chat: {chat.title[:30]}..." if chat.title else "AI chat session",
                        'timestamp': chat.created_at.isoformat() if chat.created_at else datetime.now().isoformat()
                    })
        except Exception as e:
            print(f"Error loading chats: {str(e)}")
        
        # If no activities, provide a helpful default
        if not activities:
            activities.append({
                'id': 'welcome',
                'type': 'info',
                'course': 'Getting Started',
                'title': 'Welcome! Upload some materials to get started',
                'timestamp': datetime.now().isoformat()
            })
        
        # Sort by timestamp (newest first)
        activities.sort(key=lambda x: x['timestamp'], reverse=True)
        return jsonify(activities[:10]), 200
        
    except Exception as e:
        print(f"Recent activities error: {str(e)}")
        # Return helpful default instead of error
        return jsonify([{
            'id': 'default',
            'type': 'info',
            'course': 'System',
            'title': 'Getting started with your learning platform',
            'timestamp': datetime.now().isoformat()
        }]), 200
    finally:
        db.close()

@app.route('/student/todo-items', methods=['GET', 'POST'])
def student_todo_items():
    """Get or create todo items for student"""
    user_id, err = verify_student()
    if err:
        return err
    
    db = Session()
    try:
        if request.method == 'GET':
            # Get existing todos from database
            todos = get_todos_by_user(db, user_id)
            
            todo_items = []
            for todo in todos:
                # Format due date
                due_date = 'No due date'
                if todo.due_date:
                    if todo.due_date.date() == datetime.now().date():
                        due_date = 'Today'
                    elif todo.due_date.date() == (datetime.now() + timedelta(days=1)).date():
                        due_date = 'Tomorrow'
                    elif todo.due_date < datetime.now():
                        due_date = 'Overdue'
                    else:
                        due_date = todo.due_date.strftime('%b %d')
                
                # Get course title if todo is associated with a course
                course_title = 'General'
                if todo.course_id:
                    try:
                        course = get_course_by_id(db, todo.course_id)
                        if course:
                            course_title = course.title
                    except:
                        pass
                
                todo_items.append({
                    'id': str(todo.id),
                    'title': todo.title,
                    'description': todo.description,
                    'course': course_title,
                    'dueDate': due_date,
                    'type': todo.todo_type,
                    'priority': todo.priority,
                    'completed': todo.completed
                })
            
            # If no todos exist, return an empty list instead of defaults
            if not todo_items:
                return jsonify([]), 200
            
            return jsonify(todo_items), 200
            
        elif request.method == 'POST':
            # Create a new todo
            data = request.get_json() or {}
            title = data.get('title')
            description = data.get('description')
            course_id = data.get('course_id')
            todo_type = data.get('type', 'reading')
            priority = data.get('priority', 'medium')
            due_date = data.get('due_date')
            
            if not title:
                return jsonify({'error': 'Title is required'}), 400
            
            # Parse due_date if provided
            parsed_due_date = None
            if due_date:
                try:
                    parsed_due_date = datetime.fromisoformat(due_date.replace('Z', '+00:00'))
                except:
                    pass
            
            todo = create_todo(
                db,
                user_id=user_id,
                title=title,
                description=description,
                course_id=course_id,
                todo_type=todo_type,
                priority=priority,
                due_date=parsed_due_date
            )
            
            # Get course title for response
            course_title = 'General'
            if todo.course_id:
                try:
                    course = get_course_by_id(db, todo.course_id)
                    if course:
                        course_title = course.title
                except:
                    pass
            
            return jsonify({
                'id': str(todo.id),
                'title': todo.title,
                'description': todo.description,
                'course': course_title,
                'dueDate': 'No due date' if not todo.due_date else todo.due_date.strftime('%b %d'),
                'type': todo.todo_type,
                'priority': todo.priority,
                'completed': todo.completed
            }), 201
            
    except Exception as e:
        print(f"Todo items error: {str(e)}")
        # Return an empty list on error instead of mock data
        return jsonify([]), 200
    finally:
        db.close()

@app.route('/student/todo-items/<todo_id>', methods=['PATCH', 'DELETE'])
def student_manage_todo(todo_id):
    """Update or delete a specific todo item"""
    user_id, err = verify_student()
    if err:
        return err
    
    db = Session()
    try:
        todo = get_todo_by_id(db, todo_id)
        if not todo:
            return jsonify({'error': 'Todo not found'}), 404
        
        # Verify the todo belongs to the current user
        if str(todo.user_id) != str(user_id):
            return jsonify({'error': 'Forbidden'}), 403
        
        if request.method == 'PATCH':
            data = request.get_json() or {}
            
            # Parse due_date if provided
            if 'due_date' in data and data['due_date']:
                try:
                    data['due_date'] = datetime.fromisoformat(data['due_date'].replace('Z', '+00:00'))
                except:
                    data['due_date'] = None
            
            updated_todo = update_todo(db, todo_id, **data)
            if not updated_todo:
                return jsonify({'error': 'Failed to update todo'}), 500
            
            # Get course title for response
            course_title = 'General'
            if updated_todo.course_id:
                try:
                    course = get_course_by_id(db, updated_todo.course_id)
                    if course:
                        course_title = course.title
                except:
                    pass
            
            # Format due date
            due_date = 'No due date'
            if updated_todo.due_date:
                if updated_todo.due_date.date() == datetime.now().date():
                    due_date = 'Today'
                elif updated_todo.due_date.date() == (datetime.now() + timedelta(days=1)).date():
                    due_date = 'Tomorrow'
                elif updated_todo.due_date < datetime.now():
                    due_date = 'Overdue'
                else:
                    due_date = updated_todo.due_date.strftime('%b %d')
            
            return jsonify({
                'id': str(updated_todo.id),
                'title': updated_todo.title,
                'description': updated_todo.description,
                'course': course_title,
                'dueDate': due_date,
                'type': updated_todo.todo_type,
                'priority': updated_todo.priority,
                'completed': updated_todo.completed
            }), 200
        
        elif request.method == 'DELETE':
            success = delete_todo(db, todo_id)
            if success:
                return jsonify({'message': 'Todo deleted successfully'}), 200
            else:
                return jsonify({'error': 'Failed to delete todo'}), 500
    
    except Exception as e:
        print(f"Todo management error: {str(e)}")
        return jsonify({'error': 'Internal server error'}), 500
    finally:
        db.close()

@app.route('/student/profile', methods=['POST','GET','PATCH','DELETE'])
def student_profile():
    user_id, err = verify_student()
    if err:
        return err
    db = Session()

    if request.method == 'POST':
        data = request.get_json() or {}
        name            = data.get('name')
        onboard_answers = data.get('onboard_answers')
        want_quizzes    = data.get('want_quizzes')
        if not name:
            db.close()
            return jsonify({'error':'Name required'}), 400

        # Check if profile already exists
        existing_profile = get_student_profile(db, user_id)
        
        if existing_profile:
            # Update existing profile
            prof = update_student_profile(
                db,
                user_id,
                name=name,
                onboard_answers=onboard_answers,
                want_quizzes=want_quizzes
            )
            db.commit()
            status_code = 200  # OK for update
        else:
            # Create new profile
            prof = create_student_profile(
                db,
                user_id,
                name,
                onboard_answers,
                want_quizzes
            )
            db.commit()
            status_code = 201  # Created for new

        db.close()

        out = {
            'user_id':       str(prof.user_id),
            'name':          prof.name,
            'onboard_answers': prof.onboard_answers,
            'want_quizzes':  prof.want_quizzes,
            'model_preference': prof.model_preference
        }
        return jsonify(out), status_code

    if request.method == 'GET':
        sp = get_student_profile(db, user_id)
        db.close()
        if not sp:
            return jsonify({'error':'Not found'}), 404

        out = {
            'user_id':       str(sp.user_id),
            'name':          sp.name,
            'onboard_answers': sp.onboard_answers,
            'want_quizzes':  sp.want_quizzes,
            'model_preference': sp.model_preference
        }
        return jsonify(out), 200

    if request.method == 'PATCH':
        data = request.get_json() or {}
        updated = update_student_profile(db, user_id, **data)
        db.close()
        return jsonify({'user_id': str(updated.user_id)}), 200

    # DELETE
    delete_student_profile(db, user_id)
    delete_user(db, user_id)
    db.close()
    resp = jsonify({'message':'Student deleted'})
    resp.set_cookie('session','',max_age=0)
    return resp, 200

@app.route('/student/enrollments', methods=['POST', 'GET'])
def student_enrollments():
    user_id, err = verify_student()
    if err:
        return err
    db = Session()
    if request.method == 'POST':
        code = request.get_json().get('accessCode')
        ac = get_access_code_by_code(db, code=code)
        if not ac:
            db.close()
            return jsonify({'error': 'Invalid code'}), 400
        if get_enrollment_by_student_course(db, user_id, ac.course_id):
            db.close()
            return jsonify({'message': 'Already enrolled'}), 200
        
        # Check if student profile exists, create one if it doesn't
        student_profile = get_student_profile(db, user_id)
        if not student_profile:
            try:
                # Get user info to use for profile creation
                user = get_user_by_id(db, user_id)
                if user:
                    # Create a basic profile with default values
                    create_student_profile(
                        db,
                        user_id,
                        user.email.split('@')[0],  # Use part of email as name
                        {},  # Empty onboard_answers
                        False  # Default want_quizzes
                    )
            except Exception as e:
                db.close()
                return jsonify({'error': f'Failed to create student profile: {str(e)}'}), 400
        
        try:
            e = create_enrollment(db, user_id, ac.course_id)
            db.close()
            return jsonify({'id': str(e.id)}), 201
        except Exception as e:
            db.close()
            error_msg = str(e)
            return jsonify({'error': f'Enrollment failed: {error_msg}'}), 400
            
    ens = get_enrollments_by_student(db, user_id)
    db.close()
    return jsonify([{
        'id':        str(e.id),
        'courseId':  str(e.course_id),
        'enrolledAt': e.enrolled_at.isoformat()
    } for e in ens]), 200

@app.route('/student/files/<file_id>/content', methods=['GET'])
def student_file_content(file_id):
    user_id, err = verify_student()
    if err:
        return err

    db = Session()

    f = get_file_by_id(db, file_id)
    if not f:
        db.close()
        return jsonify({'error': 'Not found'}), 404

    mod = get_module_by_id(db, f.module_id)
    if not mod or not get_enrollment_by_student_course(db, user_id, mod.course_id):
        db.close()
        return jsonify({'error': 'Forbidden'}), 403

    # Check storage type
    if hasattr(f, 'storage_type') and f.storage_type == 's3' and hasattr(f, 's3_key') and f.s3_key:
        # Generate presigned URL for S3 file
        try:
            presigned_url = s3_storage.generate_presigned_url(
                s3_key=f.s3_key,
                expiration=3600,  # 1 hour
                download=False    # inline display
            )
            db.close()
            # Return redirect to presigned URL
            return jsonify({
                'url': presigned_url,
                'type': 'presigned',
                'expires_in': 3600
            }), 200
        except Exception as e:
            db.close()
            return jsonify({'error': f'Failed to generate URL: {str(e)}'}), 500
    else:
        # Traditional database storage
        data, mimetype, fname = f.file_data, f.file_type, f.filename
        db.close()
        return Response(
            data,
            mimetype=mimetype,
            headers={'Content-Disposition': f'inline; filename={fname}'}
        )

@app.route('/student/enrollments/<enrollment_id>', methods=['DELETE'])
def student_unenroll(enrollment_id):
    user_id, err = verify_student()
    if err:
        return err
    db = Session()
    e = get_enrollment(db, enrollment_id)
    if not e or str(e.user_id) != str(user_id):
        db.close()
        return jsonify({'error': 'Forbidden'}), 403
    delete_enrollment(db, user_id, e.course_id)
    db.close()
    return jsonify({'message': 'Unenrolled'}), 200

@app.route('/courses/<course_id>/moduleswithfiles', methods=['GET'])
def moduleswithfiles(course_id):
    session = get_user_session()
    if 'error' in session:
        return jsonify(session), 401

    firebase_uid = session['uid']
    db = Session()
    user = get_user_by_firebase_uid(db, firebase_uid)
    role = get_role_by_user_id(db, user.id)

    if role.role_type == 'student':
        if not get_enrollment_by_student_course(db, user.id, course_id):
            db.close()
            return jsonify({'error':'Forbidden'}), 403
    elif role.role_type == 'instructor':
        course = get_course_by_id(db, course_id)
        if not course or str(course.instructor_id) != str(user.id):
            db.close()
            return jsonify({'error':'Forbidden'}), 403
    else:
        db.close()
        return jsonify({'error':'Forbidden'}), 403

    modules = get_modules_by_course(db, course_id)
    out = []
    for m in modules:
        rows = get_files_without_raw_by_module(db, m.id)
        out.append({
            'id':       str(m.id),
            'title':    m.title,
            'ordering': m.ordering,
            'files': [
                {
                  'id':          str(row.id),
                  'title':       row.title,
                  'type':        'pdf' if row.file_type and 'pdf' in row.file_type.lower() else
                                'audio' if row.file_type and 'audio' in row.file_type.lower() else
                                'video' if row.file_type and 'video' in row.file_type.lower() else 'document',
                  'size':        f"{row.file_size / 1024:.1f} KB" if row.file_size else "Unknown",
                  'uploadedAt':  row.created_at.isoformat() if row.created_at else "",
                  'processed':   True,  # Assume files are processed if they're in the database
                  'moduleId':    str(row.module_id),  # CRITICAL: Include moduleId
                  'moduleName':  m.title,
                  'ordering':    row.ordering,
                }
                for row in rows
            ]
        })

    db.close()
    return jsonify(out), 200

@app.route('/debug/link-account', methods=['POST'])
def debug_link_account():
    """Debug endpoint to manually link Firebase UID to existing user account"""
    data = request.get_json() or {}
    email = data.get('email')
    firebase_uid = data.get('firebase_uid')
    
    if not email or not firebase_uid:
        return jsonify({'error': 'email and firebase_uid required'}), 400
    
    db = Session()
    try:
        # Find user by email
        user = get_user_by_email(db, email)
        if not user:
            return jsonify({'error': f'No user found with email {email}'}), 404
        
        # Update Firebase UID
        old_uid = user.firebase_uid
        user.firebase_uid = firebase_uid
        db.commit()
        
        # Check for student profile
        from src.db.queries import get_student_profile
        profile = get_student_profile(db, user.id)
        
        return jsonify({
            'message': 'Account linked successfully',
            'user_id': str(user.id),
            'email': user.email,
            'old_firebase_uid': old_uid,
            'new_firebase_uid': firebase_uid,
            'has_profile': profile is not None,
            'profile_name': profile.name if profile else None
        }), 200
        
    except Exception as e:
        db.rollback()
        return jsonify({'error': str(e)}), 500
    finally:
        db.close()

@app.route('/debug/auth-status', methods=['GET'])
def debug_auth_status():
    """Debug endpoint to check current authentication status"""
    session = get_user_session()
    if 'error' in session:
        return jsonify({
            'authenticated': False,
            'session_error': session['error']
        }), 200
    
    firebase_uid = session['uid']
    db = Session()
    try:
        user = get_user_by_firebase_uid(db, firebase_uid)
        if not user:
            return jsonify({
                'authenticated': True,
                'firebase_uid': firebase_uid,
                'user_found': False,
                'message': 'Valid Firebase session but no user in database'
            }), 200
        
        # Check for student profile
        from src.db.queries import get_student_profile
        profile = get_student_profile(db, user.id)
        
        return jsonify({
            'authenticated': True,
            'firebase_uid': firebase_uid,
            'user_found': True,
            'user_id': str(user.id),
            'email': user.email,
            'has_profile': profile is not None,
            'profile_name': profile.name if profile else None,
            'onboard_answers': profile.onboard_answers if profile else None
        }), 200
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500
    finally:
        db.close()

@app.route('/student/files/<file_id>/download', methods=['GET'])
def student_file_download(file_id):
    user_id, err = verify_student()
    if err:
        return err

    db = Session()

    f = get_file_by_id(db, file_id)
    if not f:
        db.close()
        return jsonify({'error': 'Not found'}), 404

    mod = get_module_by_id(db, f.module_id)
    if not mod or not get_enrollment_by_student_course(db, user_id, mod.course_id):
        db.close()
        return jsonify({'error': 'Forbidden'}), 403

    # Check storage type
    if hasattr(f, 'storage_type') and f.storage_type == 's3' and hasattr(f, 's3_key') and f.s3_key:
        # Generate presigned URL for S3 file download
        try:
            presigned_url = s3_storage.generate_presigned_url(
                s3_key=f.s3_key,
                expiration=3600,  # 1 hour
                download=True     # force download
            )
            db.close()
            # Return redirect to presigned URL
            return jsonify({
                'url': presigned_url,
                'type': 'presigned_download',
                'filename': f.filename,
                'expires_in': 3600
            }), 200
        except Exception as e:
            db.close()
            return jsonify({'error': f'Failed to generate download URL: {str(e)}'}), 500
    else:
        # Traditional database storage
        data, mimetype, fname = f.file_data, f.file_type, f.filename
        db.close()
        return Response(
            data,
            mimetype=mimetype,
            headers={
                'Content-Disposition': f'attachment; filename={fname}',
                'Content-Length': str(len(data))
            }
        )

@app.route('/student/files/<file_id>', methods=['GET', 'PATCH', 'DELETE'])
def student_manage_file(file_id):
    user_id, err = verify_student()
    if err:
        return err

    db = Session()
    try:
        f = get_file_by_id(db, file_id)
        if not f:
            return jsonify({"error": "Not found"}), 404

        mod = get_module_by_id(db, f.module_id)
        if not mod:
            return jsonify({"error": "Module not found"}), 404

        course = get_course_by_id(db, mod.course_id)
        if not course or str(course.creator_id) != str(user_id):
            return jsonify({'error': 'Forbidden'}), 403

        if request.method == 'GET':
            response = {
            'id': str(f.id),
            'title': f.title,
            'filename': f.filename,
            'file_type': f.file_type,
            'file_size': f.file_size,
            'module_id': str(f.module_id),
            'moduleName': mod.title,
            'created_at': f.created_at.isoformat() if f.created_at else None
            }
            return jsonify(response), 200

        elif request.method == 'PATCH':
            data = request.get_json() or {}
            allowed_fields = ['title']
            update_data = {k: v for k, v in data.items() if k in allowed_fields}

            if not update_data:
                return jsonify({"error": "No valid fields to update"}), 400

            updated_file = update_file(db, file_id, **update_data)
            return jsonify({
            'id': str(updated_file.id),
            'title': updated_file.title,
            'filename': updated_file.filename,
            'file_type': updated_file.file_type,
            'file_size': updated_file.file_size,
            'module_id': str(updated_file.module_id),
            'moduleName': mod.title,
            'created_at': updated_file.created_at.isoformat() if updated_file.created_at else None
            }), 200

        elif request.method == 'DELETE':
            delete_file(db, file_id)
            return jsonify({'message': 'File deleted successfully'}), 200

    except Exception as e:
        db.rollback()
        return jsonify({"error": str(e)}), 500
    finally:
        db.close()

# ===== NEW INSTRUCTOR FILE & MODULE MANAGEMENT ENDPOINTS =====

@app.route('/instructor/courses/<course_id>/modules', methods=['GET', 'POST'])
def instructor_course_modules(course_id):
    """Handle instructor course module management"""
    user_id, err = verify_instructor()
    if err:
        return err
    
    db = Session()
    try:
        # Verify the course belongs to the instructor
        course = get_course_by_id(db, course_id)
        if not course or str(course.instructor_id) != str(user_id):
            return jsonify({'error': 'Forbidden'}), 403
        
        if request.method == 'GET':
            modules = get_modules_by_course(db, course_id)
            response_data = []
            for row in modules:
                # Unpack tuple values (id, course_id, title, ordering)
                module_id, course_id_val, title, ordering = row
                module_data = {
                    'id': str(module_id),
                    'title': title,
                    'description': '',  # Default empty description
                    'course_id': str(course_id_val),
                    'ordering': ordering
                }
                response_data.append(module_data)
            return jsonify(response_data), 200
            
        elif request.method == 'POST':
            data = request.get_json() or {}
            title = data.get('title')
            description = data.get('description', '')
            
            if not title:
                return jsonify({'error': 'Title is required'}), 400
                
            # Get the next ordering number
            existing_modules = get_modules_by_course(db, course_id)
            next_ordering = max([m.ordering for m in existing_modules], default=-1) + 1
            
            # Pass description to create_module now that the column exists
            module = create_module(
                db=db,
                course_id=course_id,
                title=title,
                description=description
            )
            
            response_data = {
                'id': str(module.id),
                'title': module.title,
                'description': module.description,  # Now we can use the actual stored description
                'course_id': str(module.course_id),
                'ordering': module.ordering
            }
            return jsonify(response_data), 201
            
    except Exception as e:
        db.rollback()
        return jsonify({'error': str(e)}), 500
    finally:
        db.close()

@app.route('/instructor/modules/<module_id>', methods=['GET', 'PATCH', 'PUT', 'DELETE'])
def instructor_manage_module(module_id):
    """Handle individual module management for instructors"""
    user_id, err = verify_instructor()
    if err:
        return err
        
    db = Session()
    try:
        # Get the module and verify ownership
        module = get_module_by_id(db, module_id)
        if not module:
            return jsonify({'error': 'Module not found'}), 404
            
        # Verify the course belongs to the instructor
        course = get_course_by_id(db, module.course_id)
        if not course or str(course.instructor_id) != str(user_id):
            return jsonify({'error': 'Forbidden'}), 403
            
        if request.method == 'GET':
            return jsonify({
                'id': str(module.id),
                'title': module.title,
                'description': module.description,
                'course_id': str(module.course_id),
                'ordering': module.ordering
            }), 200
            
        elif request.method in ['PATCH', 'PUT']:
            data = request.get_json() or {}
            allowed_fields = ['title', 'description', 'ordering']
            update_data = {k: v for k, v in data.items() if k in allowed_fields}
            
            if not update_data:
                return jsonify({'error': 'No valid fields to update'}), 400
                
            updated_module = update_module(db, module_id, **update_data)
            
            return jsonify({
                'id': str(updated_module.id),
                'title': updated_module.title,
                'description': updated_module.description,
                'ordering': updated_module.ordering,
                'course_id': str(updated_module.course_id)
            }), 200
            
        elif request.method == 'DELETE':
            # Delete the module and all its files
            delete_module(db, module_id)
            return jsonify({'message': 'Module deleted successfully'}), 200
            
    except Exception as e:
        db.rollback()
        return jsonify({'error': str(e)}), 500
    finally:
        db.close()

@app.route('/instructor/modules/<module_id>/files', methods=['GET', 'POST'])
def instructor_module_files(module_id):
    """Handle instructor module file management"""
    user_id, err = verify_instructor()
    if err:
        return err
    
    db = Session()
    try:
        # Verify module ownership
        module = get_module_by_id(db, module_id)
        if not module:
            return jsonify({'error': 'Module not found'}), 404
            
        course = get_course_by_id(db, module.course_id)
        if not course or str(course.instructor_id) != str(user_id):
            return jsonify({'error': 'Forbidden'}), 403
        
        if request.method == 'GET':
            files = get_files_by_module(db, module_id)
            return jsonify([{
                'id': str(f.id),
                'title': f.title,
                'filename': f.filename,
                'file_type': f.file_type,
                'file_size': f.file_size,
                'module_id': str(f.module_id),
                'moduleName': module.title,
                'created_at': f.created_at.isoformat() if f.created_at else None,
                'view_count_raw': f.view_count_raw,
                'view_count_personalized': f.view_count_personalized
            } for f in files]), 200
            
        elif request.method == 'POST':
            # Handle file upload using FileUploadHandler for background processing
            uploaded_file = request.files.get('file')
            if not uploaded_file:
                return jsonify({'error': 'No file provided'}), 400
            
            title = request.form.get('title', uploaded_file.filename)
            
            # Use the FileUploadHandler for background processing
            from src.file_upload_handler import FileUploadHandler
            
            handler = FileUploadHandler(db)
            result = handler.process_upload(
                file_obj=uploaded_file,
                module_id=module_id,
                title=title,
                user_id=user_id,
                process_immediately=False  # Use background processing
            )
            
            # Return the result from the handler
            return jsonify(result), 201
            
    except Exception as e:
        db.rollback()
        return jsonify({'error': str(e)}), 500
    finally:
        db.close()

@app.route('/instructor/modules/<module_id>/files/upload', methods=['POST'])
def instructor_upload_file_to_module(module_id):
    """Alternative endpoint for file uploads to modules (for compatibility)"""
    return instructor_module_files(module_id)

@app.route('/instructor/files/<file_id>', methods=['GET', 'PATCH', 'DELETE'])
def instructor_manage_file(file_id):
    """Handle individual file management for instructors"""
    user_id, err = verify_instructor()
    if err:
        return err
        
    db = Session()
    try:
        # Get the file and verify ownership
        file_obj = get_file_by_id(db, file_id)
        if not file_obj:
            return jsonify({'error': 'File not found'}), 404
            
        # Verify ownership through module -> course -> instructor
        module = get_module_by_id(db, file_obj.module_id)
        if not module:
            return jsonify({'error': 'Module not found'}), 404
            
        course = get_course_by_id(db, module.course_id)
        if not course or str(course.instructor_id) != str(user_id):
            return jsonify({'error': 'Forbidden'}), 403
            
        if request.method == 'GET':
            return jsonify({
                'id': str(file_obj.id),
                'title': file_obj.title,
                'filename': file_obj.filename,
                'file_type': file_obj.file_type,
                'file_size': file_obj.file_size,
                'module_id': str(file_obj.module_id),
                'moduleName': module.title,
                'created_at': file_obj.created_at.isoformat() if file_obj.created_at else None,
                'view_count_raw': file_obj.view_count_raw,
                'view_count_personalized': file_obj.view_count_personalized
            }), 200
            
        elif request.method == 'PATCH':
            data = request.get_json() or {}
            allowed_fields = ['title']
            update_data = {k: v for k, v in data.items() if k in allowed_fields}
            
            if not update_data:
                return jsonify({'error': 'No valid fields to update'}), 400
                
            updated_file = update_file(db, file_id, **update_data)
            
            return jsonify({
                'id': str(updated_file.id),
                'title': updated_file.title,
                'filename': updated_file.filename,
                'file_type': updated_file.file_type,
                'file_size': updated_file.file_size,
                'module_id': str(updated_file.module_id),
                'moduleName': module.title,
                'created_at': updated_file.created_at.isoformat() if updated_file.created_at else None
            }), 200
            
        elif request.method == 'DELETE':
            # Delete the file
            delete_file(db, file_id)
            return jsonify({'message': 'File deleted successfully'}), 200
            
    except Exception as e:
        db.rollback()
        return jsonify({'error': str(e)}), 500
    finally:
        db.close()

# ===== END NEW INSTRUCTOR ENDPOINTS =====

@app.route('/instructor/files/<file_id>/content', methods=['GET'])
def instructor_file_content(file_id):
    """Get file content for instructors"""
    user_id, err = verify_instructor()
    if err:
        return err
    
    db = Session()
    try:
        try:
            # Get the file and verify ownership
            file_obj = get_file_by_id(db, file_id)
            if not file_obj:
                return jsonify({'error': 'File not found'}), 404
                
            # Verify ownership through module -> course -> instructor
            module = get_module_by_id(db, file_obj.module_id)
            if not module:
                return jsonify({'error': 'Module not found'}), 404
                
            course = get_course_by_id(db, module.course_id)
            if not course or str(course.instructor_id) != str(user_id):
                return jsonify({'error': 'Forbidden'}), 403
            
            # Check storage type
            if hasattr(file_obj, 'storage_type') and file_obj.storage_type == 's3' and hasattr(file_obj, 's3_key') and file_obj.s3_key:
                # Generate presigned URL for S3 file
                try:
                    presigned_url = s3_storage.generate_presigned_url(
                        s3_key=file_obj.s3_key,
                        expiration=3600,  # 1 hour
                        download=False    # inline display
                    )
                    # Return JSON with presigned URL
                    return jsonify({
                        'url': presigned_url,
                        'type': 'presigned',
                        'expires_in': 3600
                    }), 200
                except Exception as e:
                    return jsonify({'error': f'Failed to generate URL: {str(e)}'}), 500
            else:
                # Traditional database storage
                return Response(
                    file_obj.file_data,
                    mimetype=file_obj.file_type,
                    headers={'Content-Disposition': f'inline; filename={file_obj.filename}'}
                )
                
        except Exception as e:
            return jsonify({'error': str(e)}), 500
    finally:
        db.close()

@app.route('/instructor/files/<file_id>/download', methods=['GET'])
def instructor_file_download(file_id):
    """Download file for instructors"""
    user_id, err = verify_instructor()
    if err:
        return err
    
    db = Session()
    try:
        # Get the file and verify ownership
        file_obj = get_file_by_id(db, file_id)
        if not file_obj:
            return jsonify({'error': 'File not found'}), 404
            
        # Verify ownership through module -> course -> instructor
        module = get_module_by_id(db, file_obj.module_id)
        if not module:
            return jsonify({'error': 'Module not found'}), 404
            
        course = get_course_by_id(db, module.course_id)
        if not course or str(course.instructor_id) != str(user_id):
            return jsonify({'error': 'Forbidden'}), 403
        
        # Check storage type
        if hasattr(file_obj, 'storage_type') and file_obj.storage_type == 's3' and hasattr(file_obj, 's3_key') and file_obj.s3_key:
            # Generate presigned URL for S3 file download
            try:
                presigned_url = s3_storage.generate_presigned_url(
                    s3_key=file_obj.s3_key,
                    expiration=3600,  # 1 hour
                    download=True     # force download
                )
                # Return JSON with presigned URL
                return jsonify({
                    'url': presigned_url,
                    'type': 'presigned_download',
                    'filename': file_obj.filename,
                    'expires_in': 3600
                }), 200
            except Exception as e:
                return jsonify({'error': f'Failed to generate download URL: {str(e)}'}), 500
        else:
            # Traditional database storage
            return Response(
                file_obj.file_data,
                mimetype=file_obj.file_type,
                headers={
                    'Content-Disposition': f'attachment; filename={file_obj.filename}',
                    'Content-Length': str(len(file_obj.file_data))
                }
            )
    except Exception as e:
        return jsonify({'error': str(e)}), 500
    finally:
        db.close()
            
# ===== ASYNC TASK MANAGEMENT =====
# Note: Imports are moved to the top of the file

# In-memory storage for async tasks (in production, use Redis or a database)
async_tasks = {}

def start_async_task(task_func, *args, **kwargs):
    """Start an async task and return a task ID"""
    task_id = str(uuid.uuid4())
    async_tasks[task_id] = {
        'status': 'processing',
        'started_at': datetime.utcnow(),
        'result': None,
        'error': None
    }
    
    def task_wrapper():
        try:
            result = task_func(*args, **kwargs)
            async_tasks[task_id].update({
                'status': 'completed',
                'result': result,
                'completed_at': datetime.utcnow()
            })
        except Exception as e:
            logger.error(f"Error in async task {task_id}: {str(e)}")
            async_tasks[task_id].update({
                'status': 'failed',
                'error': str(e),
                'failed_at': datetime.utcnow()
            })
    
    # Start the task in a separate thread
    thread = Thread(target=task_wrapper)
    thread.daemon = True
    thread.start()
    
    return task_id

def cleanup_old_tasks():
    """Clean up tasks older than 1 hour"""
    cutoff = datetime.utcnow() - timedelta(hours=1)
    to_delete = [
        task_id for task_id, task in async_tasks.items()
        if task.get('completed_at', task.get('failed_at', datetime.max)) < cutoff
    ]
    for task_id in to_delete:
        async_tasks.pop(task_id, None)

# ===== S3 DIRECT UPLOAD ENDPOINTS =====

@app.route('/instructor/modules/<module_id>/files/upload-url', methods=['POST'])
def instructor_get_upload_url(module_id):
    """Generate presigned URL for direct browser upload to S3"""
    user_id, err = verify_instructor()
    if err:
        return err
    
    db = Session()
    try:
        # Verify module ownership
        module = get_module_by_id(db, module_id)
        if not module:
            return jsonify({'error': 'Module not found'}), 404
            
        course = get_course_by_id(db, module.course_id)
        if not course or str(course.instructor_id) != str(user_id):
            return jsonify({'error': 'Forbidden'}), 403
        
        # Get request data
        data = request.get_json()
        if not data or 'filename' not in data:
            return jsonify({'error': 'Filename required'}), 400
        
        filename = data['filename']
        content_type = data.get('content_type', 'application/octet-stream')
        
        # Generate upload URL
        file_id = str(uuid.uuid4())
        upload_data = s3_storage.generate_upload_url(
            course_id=str(course.id),
            module_id=module_id,
            file_id=file_id,
            filename=filename,
            content_type=content_type
        )
        
        return jsonify({
            'file_id': file_id,
            'upload_url': upload_data['upload_url'],
            'upload_fields': upload_data['upload_fields'],
            's3_key': upload_data['s3_key']
        }), 200
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500
    finally:
        db.close()

@app.route('/instructor/modules/<module_id>/files/confirm-upload', methods=['POST'])
def instructor_confirm_upload(module_id):
    """Confirm file upload and create database record"""
    user_id, err = verify_instructor()
    if err:
        return err
    
    db = Session()
    try:
        # Verify module ownership
        module = get_module_by_id(db, module_id)
        if not module:
            return jsonify({'error': 'Module not found'}), 404
            
        course = get_course_by_id(db, module.course_id)
        if not course or str(course.instructor_id) != str(user_id):
            return jsonify({'error': 'Forbidden'}), 403
        
        # Get confirmation data
        data = request.get_json()
        required_fields = ['file_id', 's3_key', 'filename', 'file_size']
        if not all(field in data for field in required_fields):
            return jsonify({'error': 'Missing required fields'}), 400
        
        # Create file record
        file_obj = create_file(
            db=db,
            module_id=module_id,
            title=data.get('title', data['filename']),
            filename=data['filename'],
            file_type=data.get('content_type', 'application/octet-stream'),
            file_size=data['file_size'],
            s3_key=data['s3_key'],
            s3_bucket=s3_storage.bucket_name,
            storage_type='s3'
        )
        
        return jsonify({
            'id': str(file_obj.id),
            'title': file_obj.title,
            'filename': file_obj.filename,
            'file_type': file_obj.file_type,
            'file_size': file_obj.file_size,
            'storage_type': file_obj.storage_type,
            'created_at': file_obj.created_at.isoformat() if file_obj.created_at else None
        }), 201
        
    except Exception as e:
        db.rollback()
        return jsonify({'error': str(e)}), 500
    finally:
        db.close()

# ===== END S3 DIRECT UPLOAD ENDPOINTS =====

@app.route('/generatepersonalizedmodulecontent', methods=['POST', 'OPTIONS'])
def generate_personalized_module_content():
    # Handle CORS preflight request
    if request.method == 'OPTIONS':
        return '', 200
    
    # Bypass authentication for testing
    # user_id, err = verify_student()
    # if err:
    #     return err
    user_id = 'test-user-123'  # Test user ID
    
    # Read and validate JSON body
    data = request.get_json()
    module_id = data.get("moduleId") or data.get("module_id")  # Accept both formats
    name = data.get("name")
    user_profile = data.get("userProfile", {})
    
    if not module_id:
        return jsonify({"error": "Module ID is required"}), 400
    
    # Build user persona from profile data
    persona = []
    if name:
        persona.append(f"The user's name is **{name}**")
    if user_profile.get('role'):
        persona.append(f"they are a **{user_profile['role']}**")
    if user_profile.get('traits'):
        persona.append(f"they like their assistant to be **{user_profile['traits']}**")
    if user_profile.get('learningStyle'):
        persona.append(f"their preferred learning style is **{user_profile['learningStyle']}**")
    if user_profile.get('depth'):
        persona.append(f"they prefer **{user_profile['depth']}-level** explanations")
    if user_profile.get('interests'):
        persona.append(f"they're interested in **{user_profile['interests']}**")
    if user_profile.get('personalization'):
        persona.append(f"they enjoy **{user_profile['personalization']}**")
    if user_profile.get('schedule'):
        persona.append(f"they study best **{user_profile['schedule']}**")
    user_persona = ". ".join(persona)

    # Use pgvector for retrieval
    db_session = Session()
    try:
        module = get_module_by_id(db_session, module_id)
        if not module:
            return jsonify({"error": "Module not found"}), 404
            
        # Get all files in the module
        files = db_session.query(File).filter_by(module_id=module_id).all()
        if not files:
            return jsonify({"error": "No files found in this module"}), 404
            
        # Check if files have been processed
        total_chunks = 0
        unprocessed_files = []
        for file in files:
            chunk_count = db_session.query(FileChunk).filter_by(file_id=file.id).count()
            total_chunks += chunk_count
            if chunk_count == 0:
                unprocessed_files.append(file.title)
        
        if total_chunks == 0:
            return jsonify({
                "error": "PROCESSING", 
                "message": "Files in this module are still being processed for AI features. Please try again in a moment.",
                "unprocessed_files": unprocessed_files
            }), 202  # 202 Accepted - indicates processing is still in progress
            
        # Start async task for content generation
        task_id = start_async_task(
            generate_and_save_personalized_content,
            module_id, 
            user_id, 
            user_persona,
            files
        )
        
        return jsonify({
            "task_id": task_id,
            "status": "processing",
            "message": "Personalized content generation has started. Please check back in a moment.",
            "check_status_url": f"/api/personalization/status/{task_id}"
        }), 202
        
    except Exception as e:
        logger.error(f"Error starting personalized content generation: {str(e)}")
        return jsonify({"error": "Failed to start content generation", "details": str(e)}), 500
    finally:
        db_session.close()
        # Clean up old tasks
        cleanup_old_tasks()

def generate_and_save_personalized_content(module_id, user_id, user_persona, files):
    """Generate and save personalized content (runs in background)"""
    db_session = Session()
    try:
        # Generate response using pgvector retrieval for all files in module
        response = generate_personalized_module_content_pgvector(db_session, module_id, user_persona)
        
        # Verify JSON is valid
        try:
            response_json = json.loads(response)
        except (ValueError, AttributeError, IndexError) as e:
            error_msg = f"Invalid JSON returned from AI response: {str(e)}"
            logger.error(error_msg)
            raise ValueError(error_msg)
            
        # Save personalized file to DB with module reference
        db = Session()
        try:
            # For module-level personalization, we can use the module ID as a reference
            if 'moduleId' not in response_json:
                response_json['moduleId'] = module_id
                
            # Get the first file's ID for reference
            original_file_id = None
            if files:
                try:
                    # Convert to string - create_personalized_file expects a string
                    original_file_id = str(files[0].id)
                except (AttributeError, TypeError) as e:
                    logger.error(f"Invalid file ID format: {files[0].id}, error: {str(e)}")
                    # Continue without file ID if there's an error
            
            # Create the personalized file
            saved_file = create_personalized_file(
                db=db,
                user_id=user_id,
                original_file_id=original_file_id,
                content=response_json
            )
            db.commit()
            return {
                "status": "completed",
                "file_id": str(saved_file.id),
                "content": response_json
            }
        except Exception as e:
            db.rollback()
            error_msg = f"Error saving personalized module content: {str(e)}"
            logger.error(error_msg)
            raise Exception(error_msg)
        finally:
            db.close()
    except Exception as e:
        error_msg = f"Error in generate_and_save_personalized_content: {str(e)}"
        logger.error(error_msg)
        raise Exception(error_msg)
    finally:
        db_session.close()

@app.route('/api/personalization/status/<task_id>', methods=['GET'])
def check_personalization_status(task_id):
    """Check the status of a personalization task"""
    task = async_tasks.get(task_id)
    if not task:
        return jsonify({"error": "Task not found"}), 404
    
    response = {
        "task_id": task_id,
        "status": task['status'],
        "started_at": task['started_at'].isoformat() if task.get('started_at') else None
    }
    
    if task['status'] == 'completed':
        response.update({
            "completed_at": task['completed_at'].isoformat(),
            "result": task['result']
        })
    elif task['status'] == 'failed':
        response.update({
            "failed_at": task['failed_at'].isoformat(),
            "error": task['error']
        })
    
    return jsonify(response)

def generate_personalized_module_content_pgvector(db_session, module_id, persona):
    """
    Generate personalized content for an entire module using pgvector retrieval.
    """
    module = get_module_by_id(db_session, module_id)
    if not module:
        raise ValueError("Module not found")
    
    # Get all files in the module
    files = db_session.query(File).filter_by(module_id=module_id).all()
    if not files:
        raise ValueError("No files found in module")
    
    # Get chunks from all files in the module
    all_chunks = []
    for file in files:
        chunks = db_session.query(FileChunk).filter_by(file_id=file.id).limit(20).all()
        all_chunks.extend(chunks)
    
    if not all_chunks:
        raise ValueError("No processed content found in module")
    
    # Group chunks by file for better organization
    file_chunks = {}
    for chunk in all_chunks:
        if chunk.file_id not in file_chunks:
            file_chunks[chunk.file_id] = []
        file_chunks[chunk.file_id].append(chunk.content)
    
    # Create prompt for module-level personalization
    prompt = f"""You are an expert educational content personalizer. Create a comprehensive personalized study guide for an entire module.

Module: {module.title}
Number of files: {len(files)}
User profile: {persona}

File contents to integrate:
"""
    
    # Add content from each file
    for file in files[:5]:  # Limit to first 5 files to avoid token limits
        if file.id in file_chunks:
            file_content = "\n".join(file_chunks[file.id][:3])  # First 3 chunks per file
            prompt += f"\n\nFile: {file.title}\nContent:\n{file_content[:1000]}...\n"
    
    prompt += """

Create a comprehensive study guide that:
1. Integrates content from all files into a coherent narrative
2. Personalizes explanations based on the user's profile
3. Organizes content into logical chapters and sections
4. Adds relevant examples and analogies that match the user's interests

Output in JSON format:
{
    "title": "Engaging module title",
    "courseName": "Module name - Personalized",
    "chapters": [
        {
            "chapterTitle": "Chapter title",
            "subsections": [
                {
                    "title": "Section title",
                    "fullText": "Complete personalized content with explanations"
                }
            ]
        }
    ]
}"""
    
    try:
        # Call OpenAI API
        response = openai_client.chat.completions.create(
            model="gpt-4-turbo",
            messages=[
                {"role": "system", "content": "You are an expert at creating personalized educational content."},
                {"role": "user", "content": prompt}
            ],
            temperature=0.7,
            max_tokens=4000,
            response_format={"type": "json_object"}
        )
        
        result = response.choices[0].message.content.strip()
        content_json = json.loads(result)
        
        # Enhance with module metadata
        content_json["moduleId"] = str(module_id)
        content_json["fileCount"] = len(files)
        
        return json.dumps(content_json)
        
    except Exception as e:
        logger.error(f"Error generating module content: {str(e)}")
        
        # Fallback structure
        fallback_content = {
            "title": f"{module.title} - Personalized Study Guide",
            "courseName": f"{module.title} - Personalized Learning",
            "moduleId": str(module_id),
            "fileCount": len(files),
            "chapters": [
                {
                    "chapterTitle": f"Overview of {module.title}",
                    "subsections": [
                        {
                            "title": "Module Introduction",
                            "fullText": f"This personalized study guide covers all materials from '{module.title}'. The content has been tailored for someone who {persona}.\n\nThis module contains {len(files)} files with comprehensive learning materials."
                        }
                    ]
                }
            ]
        }
        return json.dumps(fallback_content)

if __name__ == '__main__':
    app.run(debug=True, host='0.0.0.0', port=8080)
