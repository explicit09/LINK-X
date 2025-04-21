from datetime import datetime
import os
import uuid
import tempfile
import faiss, pickle
import numpy as np
from flask import Flask, jsonify, request, Response, render_template
from flask_cors import CORS
import firebase_admin
from firebase_admin import auth, credentials
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from dotenv import load_dotenv
from src.db.schema import Base
import uuid
from openai import OpenAI
import json

from src.prompts import prompt1_create_course, prompt2_generate_course_outline, prompt2_generate_course_outline_RAG, prompt3_generate_module_content, prompt4_valid_query
from src.db.schema import Base
from src.db.queries import (
    # Professor / Student
    get_professor_by_id, get_student_by_id,
    create_professor, create_student, update_professor, update_student,
    # Onboarding
    get_onboarding_by_student, create_onboarding, update_onboarding,
    # Course
    get_course_by_id, get_courses_by_professor_id, get_courses_by_student_id,
    create_course, update_course, delete_course,
    # AccessCode / Enrollment
    get_access_code_by_code, create_access_code,
    get_enrollment, create_enrollment, delete_enrollment,
    # File
    get_file_by_id, get_files_by_course, create_file, update_file, delete_file,
    # PersonalizedFile
    get_personalized_file_by_id, get_personalized_files_by_student,
    create_personalized_file, update_personalized_file, delete_personalized_file,
    # Chat / Message
    get_chat_by_id, get_chats_by_student, create_chat, update_chat, delete_chat,
    get_message_by_id, get_messages_by_chat, create_message, delete_messages_after, 
    # Report
    get_report_by_id, get_reports_by_course, create_report, update_report, delete_report,
    # New helper
    get_students_by_course
)

load_dotenv()

app = Flask(__name__)
CORS(app, supports_credentials=True)

# Firebase init
cred = credentials.Certificate("firebaseKey.json")
firebase_admin.initialize_app(cred)

# DB setup
POSTGRES_URL = os.getenv("POSTGRES_URL")
if not POSTGRES_URL:
    raise ValueError("POSTGRES_URL not set")
engine = create_engine(POSTGRES_URL)
Session = sessionmaker(bind=engine, expire_on_commit=False)
Base.metadata.create_all(engine)


# --- Authentication helpers ---
def get_user_session():
    token = request.cookies.get('session')
    if not token:
        return {"error": "Missing session cookie"}
    try:
        return auth.verify_session_cookie(token, check_revoked=True)
    except Exception as e:
        return {"error": str(e)}

def verify_professor():
    user = get_user_session()
    if 'error' in user:
        return None, (jsonify(user), 401)
    db = Session()
    prof = get_professor_by_id(db, user['uid'])
    db.close()
    if not prof:
        return None, (jsonify({'error':'Forbidden'}), 403)
    return prof, None

def verify_student():
    user = get_user_session()
    if 'error' in user:
        return None, (jsonify(user), 401)
    db = Session()
    student = get_student_by_id(db, user['uid'])
    db.close()
    if not student:
        return None, (jsonify({'error':'Forbidden'}), 403)
    return student, None

# --- Session login/logout ---
@app.route('/sessionLogin', methods=['POST'])
def session_login():
    data = request.get_json()
    id_token = data.get('idToken')
    if not id_token:
        return jsonify({'error':'Missing idToken'}),400
    try:
        expires = 60*60*24*5
        session_cookie = auth.create_session_cookie(id_token, expires_in=expires)
        resp = jsonify({'message':'Session set'})
        resp.set_cookie('session', session_cookie, max_age=expires, httponly=True, samesite='Strict')
        return resp
    except Exception as e:
        return jsonify({'error':str(e)}),401

@app.route('/sessionLogout', methods=['POST'])
def session_logout():
    resp = jsonify({'message':'Logged out'})
    resp.set_cookie('session','',max_age=0)
    return resp

# --- Professor registration & profile ---
@app.route('/register/professor', methods=['POST'])
def register_professor():
    data = request.get_json()
    id_token = data.get('idToken')
    if not id_token:
        return jsonify({"error":"Missing ID token"}),400
    try:
        decoded = auth.verify_id_token(id_token)
        firebase_uid = decoded["uid"]
    except Exception as e:
        return jsonify({"error":f"Invalid ID token: {e}"}),401
    email = data.get("email"); password = data.get("password")
    if not email or not password:
        return jsonify({"error":"Email and password required"}),400
    db = Session()
    try:
        prof = create_professor(db, email, password, firebase_uid)
        return jsonify({"id":str(prof.id), "email":prof.email}),201
    except Exception as e:
        db.rollback(); return jsonify({"error":str(e)}),500
    finally:
        db.close()

@app.route('/professor/profile', methods=['PATCH'])
def update_professor_profile():
    prof, err = verify_professor()
    if err: return err
    data = request.get_json()
    updated = update_professor(Session(), professor_id=str(prof.id), **data)
    if not updated: return jsonify({'error':'Not found'}),404
    return jsonify({'id':str(updated.id),'email':updated.email}),200

# --- Student registration & profile ---
@app.route('/register/student', methods=['POST'])
def register_student():
    data = request.get_json()
    id_token = data.get('idToken')
    if not id_token:
        return jsonify({"error":"Missing ID token"}),400
    try:
        decoded = auth.verify_id_token(id_token)
        firebase_uid = decoded["uid"]
    except Exception as e:
        return jsonify({"error":f"Invalid ID token: {e}"}),401
    email = data.get("email"); password = data.get("password")
    if not email or not password:
        return jsonify({"error":"Email and password required"}),400
    db = Session()
    try:
        student = create_student(db, email, password, firebase_uid)
        return jsonify({"id":str(student.id),"email":student.email}),201
    except Exception as e:
        db.rollback(); return jsonify({"error":str(e)}),500
    finally:
        db.close()

@app.route('/student/profile', methods=['PATCH'])
def update_student_profile():
    student, err = verify_student()
    if err: return err
    data = request.get_json()
    updated = update_student(Session(), student_id=str(student.id), **data)
    if not updated: return jsonify({'error':'Not found'}),404
    return jsonify({'id':str(updated.id),'email':updated.email}),200

# --- Onboarding (student-only) ---
@app.route('/onboarding', methods=['POST'])
def create_onboarding_route():
    student, err = verify_student()
    if err: return err
    data = request.get_json()
    ob = create_onboarding(Session(),
                           student_id=str(student.id),
                           name=data['name'],
                           answers=data['answers'],
                           quizzes=data.get('quizzes',False))
    return jsonify({'id':str(ob.id)}),201

@app.route('/onboarding', methods=['GET'])
def get_onboarding_route():
    student, err = verify_student()
    if err: return err
    ob = get_onboarding_by_student(Session(), student_id=str(student.id))
    if not ob: return jsonify({'error':'Not found'}),404
    return jsonify({
        'id':str(ob.id),
        'name':ob.name,
        'answers':ob.answers,
        'quizzes':ob.quizzes,
        'created_at':ob.created_at.isoformat()
    }),200

@app.route('/onboarding', methods=['PATCH'])
def update_onboarding_route():
    student, err = verify_student()
    if err: return err
    ob = get_onboarding_by_student(Session(), student_id=str(student.id))
    if not ob: return jsonify({'error':'Not found'}),404
    data = request.get_json()
    updated = update_onboarding(Session(), onboarding_id=str(ob.id), **data)
    return jsonify({'id':str(updated.id)}),200

@app.route('/onboarding', methods=['DELETE'])
def delete_onboarding_route():
    student, err = verify_student()
    if err: return err
    ob = get_onboarding_by_student(Session(), student_id=str(student.id))
    if ob:
        # reuse delete_onboarding
        from src.db.queries import delete_onboarding
        delete_onboarding(Session(), onboarding_id=str(ob.id))
    return jsonify({'message':'Deleted'}),200


# --- Course Endpoints ---

# Prof creates a course + access code
@app.route('/courses', methods=['POST'])
def create_course_route():
    prof, err = verify_professor()
    if err: return err
    data = request.get_json()
    c = create_course(Session(),
                      title=data['title'],
                      description=data.get('description',''),
                      professor_id=str(prof.id))
    code = uuid.uuid4().hex[:8]
    create_access_code(Session(), course_id=str(c.id), code=code)
    return jsonify({'id':str(c.id),'accessCode':code}),201

# Prof lists their courses
@app.route('/courses', methods=['GET'])
def list_courses_professor():
    prof, err = verify_professor()
    if err: return err
    cs = get_courses_by_professor_id(Session(), professor_id=str(prof.id))
    return jsonify([{'id':str(c.id),'title':c.title} for c in cs]),200

# Student lists enrolled courses
@app.route('/courses/enrolled', methods=['GET'])
def list_courses_student():
    student, err = verify_student()
    if err: return err
    cs = get_courses_by_student_id(Session(), student_id=str(student.id))
    return jsonify([{'id':str(c.id),'title':c.title} for c in cs]),200

# Prof views & updates & deletes a course
@app.route('/courses/<course_id>', methods=['GET','PATCH','DELETE'])
def manage_course_route(course_id):
    prof, err = verify_professor()
    if err: return err
    c = get_course_by_id(Session(), course_id=course_id)
    if not c or str(c.professor_id)!=str(prof.id):
        return jsonify({'error':'Not found or unauthorized'}),404

    if request.method=='GET':
        return jsonify({
            'id':str(c.id),'title':c.title,
            'description':c.description,
            'created_at':c.created_at.isoformat()
        }),200

    if request.method=='PATCH':
        data = request.get_json()
        updated = update_course(Session(), course_id=course_id, **data)
        return jsonify({'id':str(updated.id)}),200

    # DELETE
    delete_course(Session(), course_id=course_id)
    return jsonify({'message':'Deleted'}),200

# --- Enrollment / AccessCode ---

@app.route('/enroll', methods=['POST'])
def enroll_route():
    student, err = verify_student()
    if err: return err
    code = request.get_json().get('accessCode')
    ac = get_access_code_by_code(Session(), code=code)
    if not ac:
        return jsonify({'error':'Invalid code'}),400
    if get_enrollment(Session(), student_id=str(student.id), course_id=str(ac.course_id)):
        return jsonify({'message':'Already enrolled'}),200
    create_enrollment(Session(), student_id=str(student.id), course_id=str(ac.course_id))
    return jsonify({'message':'Enrolled'}),200

@app.route('/courses/<course_id>/students', methods=['GET'])
def list_students_in_course(course_id):
    prof, err = verify_professor()
    if err: return err
    c = get_course_by_id(Session(), course_id=course_id)
    if not c or str(c.professor_id)!=str(prof.id):
        return jsonify({'error':'Forbidden'}),403
    sts = get_students_by_course(Session(), course_id=course_id)
    return jsonify(sts),200

@app.route('/courses/<course_id>/students/<student_id>', methods=['DELETE'])
def remove_student_route(course_id, student_id):
    prof, err = verify_professor()
    if err: return err
    c = get_course_by_id(Session(), course_id=course_id)
    if not c or str(c.professor_id)!=str(prof.id):
        return jsonify({'error':'Forbidden'}),403
    delete_enrollment(Session(), student_id=student_id, course_id=course_id)
    return jsonify({'message':'Removed'}),200

@app.route('/courses/<course_id>/files', methods=['GET'])
def list_course_files(course_id):
    student, err = verify_student()
    if err:
        return err

    db = Session()
    enrollment = get_enrollment(db, student_id=str(student.id), course_id=course_id)
    if not enrollment:
        db.close()
        return jsonify({'error': 'Forbidden'}), 403
    files = get_files_by_course(db, course_id=course_id)
    db.close()

    return jsonify([
        {
            'id':        str(f.id),
            'filename':  f.filename,
            'createdAt': f.created_at.isoformat()
        }
        for f in files
    ]), 200

# --- File CRUD ---

@app.route('/files', methods=['POST'])
def upload_file():
    prof, err = verify_professor()
    if err:
        return err

    course_id = request.args.get('course_id')
    fobj      = request.files.get('file')
    if not fobj or not course_id:
        return jsonify({'error':'Missing file or course_id'}),400

    data = fobj.read()
    new_file = create_file(
        Session(),
        filename=fobj.filename,
        file_type=fobj.content_type,
        file_size=len(data),
        file_data=data,
        course_id=course_id
    )

    db = Session()
    files = get_files_by_course(db, course_id)
    texts, metadata = [], {}
    for file in files:
        raw = extract_text(file.file_data, file.filename)
        chunks = split_text(raw)
        for i, chunk in enumerate(chunks):
            idx = len(texts)
            texts.append(chunk)
            metadata[idx] = {'file_id': str(file.id), 'chunk_index': i}

    embeddings = [embed_text(t) for t in texts]
    arr = np.vstack(embeddings).astype('float32')
    dim = arr.shape[1]

    index = faiss.IndexFlatL2(dim)
    index.add(arr)

    faiss_bytes = faiss.serialize_index(index)
    pkl_bytes   = pickle.dumps(metadata)

    update_course(
        db,
        course_id=course_id,
        index_faiss=faiss_bytes,
        index_pkl=pkl_bytes
    )
    db.close()

    return jsonify({'id': str(new_file.id)}), 201

@app.route('/files/<file_id>', methods=['GET','PATCH','DELETE'])
def manage_file(file_id):
    db = Session()
    f = get_file_by_id(db, file_id)
    if not f:
        db.close(); return jsonify({'error':'Not found'}),404

    # determine caller
    user = get_user_session()
    prof = get_professor_by_id(db, user.get('uid'))
    enrolled = get_enrollment(db, student_id=user.get('uid'), course_id=str(f.course_id))
    if request.method=='GET':
        # prof of own course OR enrolled student
        if not (prof and str(prof.id)==str(f.course.professor_id)) and not enrolled:
            db.close(); return jsonify({'error':'Forbidden'}),403
        resp = jsonify({
            'id':str(f.id),'filename':f.filename,
            'fileType':f.file_type,'fileSize':f.file_size,
            'created_at':f.created_at.isoformat(),
            'course_id':str(f.course_id)
        })
        db.close(); return resp,200

    if request.method=='PATCH':
        if not (prof and str(prof.id)==str(f.course.professor_id)):
            db.close(); return jsonify({'error':'Forbidden'}),403
        data = request.get_json()
        updated = update_file(Session(), file_id=file_id, **data)
        return jsonify({'id':str(updated.id)}),200

    # DELETE
    if not (prof and str(prof.id)==str(f.course.professor_id)):
        db.close(); return jsonify({'error':'Forbidden'}),403
    delete_file(Session(), file_id=file_id)
    return jsonify({'message':'Deleted'}),200

@app.route('/files/<file_id>/content', methods=['GET'])
def serve_file_content(file_id):
    db = Session()
    f = get_file_by_id(db, file_id)
    if not f:
        db.close(); return jsonify({'error':'Not found'}),404
    user = get_user_session()
    prof = get_professor_by_id(db, user.get('uid'))
    enrolled = get_enrollment(db, student_id=user.get('uid'), course_id=str(f.course_id))
    if not (prof and str(prof.id)==str(f.course.professor_id)) and not enrolled:
        db.close(); return jsonify({'error':'Forbidden'}),403
    data, mtype, fname = f.file_data, f.file_type, f.filename
    db.close()
    return Response(data, mimetype=mtype,
                    headers={"Content-Disposition":f"inline; filename={fname}"})

# --- PersonalizedFile (student-only) ---
@app.route('/personalized-files', methods=['GET'])
def list_pfiles_route():
    st, err = verify_student()
    if err: return err
    db = Session()
    pfs = get_personalized_files_by_student(db, str(st.id))
    db.close()
    return jsonify([{
        'id':str(p.id),
        'originalFileId':str(p.original_file_id) if p.original_file_id else None,
        'createdAt':p.created_at.isoformat()
    } for p in pfs]),200

@app.route('/personalized-files/from-file/<file_id>', methods=['POST'])
def create_pfile_from_file(file_id):
    st, err = verify_student()
    if err: return err
    db = Session()
    base = get_file_by_id(db, file_id)
    if not base:
        db.close()
        return jsonify({'error':'File not found'}),404

    temp = tempfile.mkdtemp()
    path = os.path.join(temp, base.filename)
    with open(path,'wb') as f: f.write(base.file_data)

    content = prompt2_generate_course_outline_RAG(temp)
    if content is None:
        db.close()
        return jsonify({'error':'LLM failure'}),500

    pf = create_personalized_file(db, str(st.id), file_id, content)
    db.close()
    return jsonify({'id':str(pf.id)}),201

@app.route('/personalized-files/<pf_id>', methods=['GET'])
def get_pfile_route(pf_id):
    st, err = verify_student()
    if err: return err
    db = Session()
    pf = get_personalized_file_by_id(db, pf_id)
    db.close()
    if not pf or str(pf.student_id) != str(st.id):
        return jsonify({'error':'Forbidden'}),403
    return jsonify({'id':str(pf.id),'content':pf.content}),200

@app.route('/personalized-files/<pf_id>', methods=['PATCH'])
def update_pfile_route(pf_id):
    st, err = verify_student()
    if err: return err
    data = request.get_json()
    db = Session()
    updated = update_personalized_file(db, pf_id, **data)
    db.close()
    if not updated:
        return jsonify({'error':'Not found'}),404
    return jsonify({'id':str(updated.id)}),200

@app.route('/personalized-files/<pf_id>', methods=['DELETE'])
def delete_pfile_route(pf_id):
    st, err = verify_student()
    if err: return err
    db = Session()
    delete_personalized_file(db, pf_id)
    db.close()
    return jsonify({'message':'Deleted'}),200

# --- Chat & Message (student-only) ---

@app.route('/chats/<chat_id>', methods=['GET'])
def get_chat_by_id_route(chat_id):
    student, err = verify_student()
    if err:
        return err

    db = Session()
    chat = get_chat_by_id(db, chat_id)
    if not chat or str(chat.student_id) != str(student.id):
        db.close()
        return jsonify({'error': 'Forbidden'}), 403

    chat_data = {
        'id':        str(chat.id),
        'title':     chat.title,
        'fileId':    str(chat.file_id) if chat.file_id else None,
        'createdAt': chat.created_at.isoformat()
    }
    db.close()
    return jsonify(chat_data), 200

@app.route('/chats', methods=['GET'])
def list_chats_route():
    st, err = verify_student()
    if err: return err
    db = Session()
    chats = get_chats_by_student(db, str(st.id))
    db.close()
    return jsonify([{
        'id':str(c.id),'title':c.title,'fileId':str(c.file_id) if c.file_id else None
    } for c in chats]),200

@app.route('/chats', methods=['POST'])
def create_chat_route():
    st, err = verify_student()
    if err: return err
    data = request.get_json()
    db = Session()
    c = create_chat(db, str(st.id), data['fileId'], data['title'])
    db.close()
    return jsonify({'id':str(c.id)}),201

@app.route('/chats/<chat_id>/messages', methods=['GET'])
def list_messages_route(chat_id):
    st, err = verify_student()
    if err: return err
    db = Session()
    msgs = get_messages_by_chat(db, chat_id)
    db.close()
    return jsonify([{
        'id':str(m.id),'role':m.role,'content':m.content,'createdAt':m.created_at.isoformat()
    } for m in msgs]),200

@app.route('/chats/<chat_id>/messages', methods=['POST'])
def create_message_route(chat_id):
    st, err = verify_student()
    if err: return err
    data = request.get_json()
    db = Session()
    m = create_message(db, chat_id, data['role'], data['content'])
    db.close()
    return jsonify({'id':str(m.id)}),201

@app.route('/messages/<message_id>', methods=['GET'])
def get_message_by_id_route(message_id):
    student, err = verify_student()
    if err:
        return err

    db = Session()
    msg = get_message_by_id(db, message_id)
    if not msg:
        db.close()
        return jsonify({'error': 'Not found'}), 404
    chat = get_chat_by_id(db, msg.chat_id)
    if not chat or str(chat.student_id) != str(student.id):
        db.close()
        return jsonify({'error': 'Forbidden'}), 403

    message_data = {
        'id':        str(msg.id),
        'chatId':    str(msg.chat_id),
        'role':      msg.role,
        'content':   msg.content,
        'createdAt': msg.created_at.isoformat()
    }
    db.close()
    return jsonify(message_data), 200

@app.route('/chats/<chat_id>', methods=['PATCH'])
def update_chat_route(chat_id):
    st, err = verify_student()
    if err: return err
    data = request.get_json()
    db = Session()
    updated = update_chat(db, chat_id, **data)
    db.close()
    if not updated:
        return jsonify({'error':'Not found'}),404
    return jsonify({'id':str(updated.id)}),200

@app.route('/chats/<chat_id>', methods=['DELETE'])
def delete_chat_route(chat_id):
    st, err = verify_student()
    if err: return err
    db = Session()
    delete_chat(db, chat_id)
    db.close()
    return jsonify({'message':'Deleted'}),200

# --- Report (professor-only) ---
@app.route('/reports/course/<course_id>', methods=['GET'])
def list_reports_route(course_id):
    prof, err = verify_professor()
    if err: return err
    db = Session()
    rpts = get_reports_by_course(db, course_id)
    db.close()
    return jsonify([{
        'id':str(r.id),'createdAt':r.created_at.isoformat()
    } for r in rpts]),200

@app.route('/reports/<report_id>', methods=['GET'])
def get_report_route(report_id):
    prof, err = verify_professor()
    if err: return err
    db = Session()
    r = get_report_by_id(db, report_id)
    db.close()
    if not r:
        return jsonify({'error':'Not found'}),404
    return jsonify({'id':str(r.id),'summary':r.summary}),200

@app.route('/reports', methods=['POST'])
def create_report_route():
    prof, err = verify_professor()
    if err: return err
    data = request.get_json()
    db = Session()
    r = create_report(db, data['courseId'], data.get('fileId'), data['summary'])
    db.close()
    return jsonify({'id':str(r.id)}),201

@app.route('/reports/<report_id>', methods=['PATCH'])
def update_report_route(report_id):
    prof, err = verify_professor()
    if err: return err
    data = request.get_json()
    db = Session()
    updated = update_report(db, report_id, **data)
    db.close()
    if not updated:
        return jsonify({'error':'Not found'}),404
    return jsonify({'id':str(updated.id)}),200

@app.route('/reports/<report_id>', methods=['DELETE'])
def delete_report_route(report_id):
    prof, err = verify_professor()
    if err: return err
    db = Session()
    delete_report(db, report_id)
    db.close()
    return jsonify({'message':'Deleted'}),200

@app.route('/delete-trailing-messages', methods=['POST'])
def delete_trailing_messages_route():
    student, err = verify_student()
    if err:
        return err

    data = request.get_json()
    message_id = data.get('id')
    if not message_id:
        return jsonify({'error': 'Message ID is required'}), 400

    db = Session()
    msg = get_message_by_id(db, message_id)
    if not msg:
        db.close()
        return jsonify({'error': 'Message not found'}), 404

    chat = get_chat_by_id(db, msg.chat_id)
    if not chat or str(chat.student_id) != str(student.id):
        db.close()
        return jsonify({'error': 'Forbidden'}), 403

    # Remove all messages in that chat after the given timestamp
    delete_messages_after(db, chat_id=str(chat.id), timestamp=msg.created_at)
    db.close()
    return jsonify({'message': 'Trailing messages deleted'}), 200

@app.route('/generate-title', methods=['POST'])
def generate_title_route():
    student, err = verify_student()
    if err:
        return err

    data = request.get_json()
    message = data.get('message')
    if not message:
        return jsonify({'error': 'Message is required'}), 400

    title = message[:80]
    return jsonify({'title': title}), 200

@app.route('/save-model-id', methods=['POST'])
def save_model_id_route():
    student, err = verify_student()
    if err:
        return err
    data = request.get_json()
    model = data.get('model')
    if not model:
        return jsonify({'error': 'Model ID is required'}), 400
    return jsonify({'message': f'Model ID {model} saved successfully'}), 200

@app.route('/ai-chat', methods=['POST'])
def ai_chat_route():
    student, err = verify_student()
    if err:
        return err
    data = request.get_json()
    chat_id      = data.get('id')
    user_message = data.get('userMessage') or data.get('message')
    history      = data.get('messages', [])

    if not user_message:
        return jsonify({'error': 'User message is required'}), 400
    db = Session()
    if chat_id:
        chat = get_chat_by_id(db, chat_id)
        if not chat or str(chat.student_id) != str(student.id):
            db.close()
            return jsonify({'error': 'Forbidden'}), 403
    else:
        chat = create_chat(db, str(student.id), file_id=None, title="New Chat")
        chat_id = str(chat.id)
    create_message(db, chat_id=chat_id, role='user', content=user_message)
    system_msg = {
        'role': 'system',
        'content': (
            "You are a friendly AI tutor. Keep answers concise (1–3 sentences), "
            "use examples when helpful, and only expand if asked."
        )
    }
    stack = [system_msg]
    for m in history:
        stack.append({'role': m['role'], 'content': m['content']})
    stack.append({'role': 'user', 'content': user_message})
    client = OpenAI(api_key=os.getenv("OPENAI_API_KEY"))
    response = client.chat.completions.create(
        model="gpt-3.5-turbo",
        messages=stack,
        max_tokens=300
    )
    assistant_content = response.choices[0].message.content.strip()
    create_message(db, chat_id=chat_id, role='assistant', content=assistant_content)
    db.close()
    return jsonify({'assistant': assistant_content, 'chatId': chat_id}), 200

@app.route('/courses/<course_id>/citations', methods=['GET'])
def citations_route(course_id):
    prof, err = verify_professor()
    if err: return err
    course = get_course_by_id(Session(), course_id)
    if not course.index_pkl:
        return jsonify({'error':'No index built'}), 404

    metadata = pickle.loads(course.index_pkl)
    citations = [
      {'source': md.get('source','Unknown'),
       'citation': f"Mock APA Citation for {md.get('filename')}"}
      for md in metadata.values()
    ]
    return jsonify({'citations': citations}), 200

@app.route('/chatwithpersona', methods=['POST'])
def chat_with_persona():
    # 1) Authenticate as a student
    student, err = verify_student()
    if err:
        return err

    # 2) Pull in the request payload
    data          = request.get_json() or {}
    name          = data.get("name")
    user_message  = data.get("message")
    profile       = data.get("userProfile", {})
    raw_expertise = data.get("expertise")

    # 3) Map expertise to a short summary
    expertise_map = {
        "beginner":     "They prefer simple, clear explanations suitable for someone new to the topic.",
        "intermediate": "They have some prior experience and prefer moderate technical depth.",
        "advanced":     "They want in-depth explanations with technical language.",
    }
    expertise         = str(raw_expertise or "beginner").lower()
    expertise_summary = expertise_map.get(expertise, expertise_map["beginner"])

    # 4) Build the persona bits
    persona_bits = []
    if name:                            persona_bits.append(f"The user’s name is **{name}**")
    if profile.get("role"):             persona_bits.append(f"they are a **{profile['role']}**")
    if profile.get("traits"):           persona_bits.append(f"they like their assistant to be **{profile['traits']}**")
    if profile.get("learningStyle"):    persona_bits.append(f"their preferred learning style is **{profile['learningStyle']}**")
    if profile.get("depth"):            persona_bits.append(f"they prefer **{profile['depth']}-level** explanations")
    if profile.get("interests"):        persona_bits.append(f"they’re interested in **{profile['interests']}**")
    if profile.get("personalization"):  persona_bits.append(f"they enjoy **{profile['personalization']}**")
    if profile.get("schedule"):         persona_bits.append(f"they study best **{profile['schedule']}**")
    full_persona = ". ".join(persona_bits)

    # 5) Validate
    if not user_message:
        return jsonify({"error": "Message is required"}), 400

    # 6) Call OpenAI
    try:
        client = OpenAI(api_key=os.getenv("OPENAI_API_KEY"))
        messages = [
            { "role": "system", "content": "You are a helpful and friendly AI tutor." },
            { "role": "system", "content": f"{full_persona}. {expertise_summary}" },
            { "role": "user",   "content": f"Now explain this topic: {user_message}" }
        ]
        resp = client.chat.completions.create(
            model="gpt-4o",
            messages=messages
        )
        reply = resp.choices[0].message.content.strip()
    except Exception as e:
        return jsonify({"error": str(e)}), 500

    # 7) (Optional) Persist into our Chat/Message tables
    try:
        db = Session()
        chat = create_chat(db, student_id=str(student.id), file_id=None, title="Persona Chat")
        create_message(db, chat_id=str(chat.id), role="user",      content=user_message)
        create_message(db, chat_id=str(chat.id), role="assistant", content=reply)
        db.close()
        chat_id = str(chat.id)
    except:
        chat_id = None

    # 8) Return
    out = {"response": reply}
    if chat_id:
        out["chatId"] = chat_id
    return jsonify(out), 200

if __name__ == '__main__':
    app.run(debug=True, host='0.0.0.0', port=8080)