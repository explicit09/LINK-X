from datetime import date, datetime
import os
import firebase_admin
from firebase_admin import auth, credentials
from flask import Flask, Response, render_template, jsonify, request
from flask_cors import CORS
import faiss
import pickle
import numpy as np
from dotenv import load_dotenv
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from src.db.schema import Base, Suggestion, Chat, Message
from alembic import command
from alembic.config import Config
import uuid
from openai import OpenAI
import json
from transcriber import transcribe_audio
from werkzeug.utils import secure_filename
import hashlib

from src.prompts import (prompt1_create_course, prompt2_generate_course_outline, prompt2_generate_course_outline_RAG, prompt3_generate_module_content, prompt4_valid_query)

from src.db.queries import (
    create_course, create_file, delete_course_by_id, delete_market_item_by_id, delete_news_by_id, delete_onboarding_by_user_id, delete_user_by_firebase_uid, get_all_news, 
    get_course_by_id, get_courses_by_user_id, get_file_by_id, get_market_item_by_id, get_news_by_id, get_onboarding, 
    get_recent_market_prices, create_user, save_chat, delete_chat_by_id, get_chats_by_user_id,
    get_chat_by_id, save_market_item, save_messages, get_messages_by_chat_id, save_news_item, update_course, update_file, update_onboarding_by_user_id, update_user_by_firebase_uid, vote_message,
    get_votes_by_chat_id, save_document, get_documents_by_id, get_document_by_id,
    delete_documents_by_id_after_timestamp, save_suggestions, get_suggestions_by_document_id,
    get_message_by_id, delete_messages_by_chat_id_after_timestamp, update_chat_visibility_by_id, 
    create_onboarding, get_user_by_firebase_uid, save_transcript
)

from src.item_01_database_creation_FAISS import create_database
from src.item_02_generate_citations_APA_FAISS import generate_citations
from src.item_03_replace_source_by_citation import replace_sources

load_dotenv()

# Initialize Flask
app = Flask(__name__)
CORS(app, supports_credentials=True)

# Initialize Firebase Admin
cred = credentials.Certificate("firebaseKey.json")
firebase_admin.initialize_app(cred)

# SQLAlchemy configuration
POSTGRES_URL = os.getenv("POSTGRES_URL")
if not POSTGRES_URL:
    raise ValueError("POSTGRES_URL is not defined in the environment")

# Create engine, session, and tables
engine = create_engine(POSTGRES_URL)
Session = sessionmaker(bind=engine, expire_on_commit=False)
Base.metadata.create_all(engine)

# INDEX_PATH = "/app/"
# PICKLE_PATH = "/app/"

# try:
#     faiss_index = faiss.read_index("/app/index.faiss")
#     print("FAISS index successfully loaded from /app/index.faiss")
# except Exception as e:
#     print(f"Error loading FAISS index: {e}")
#     faiss_index = None

# try:
#     with open("/app/index.pkl", "rb") as f:
#         metadata = pickle.load(f)
#     print("Metadata successfully loaded from /app/index.pkl")
# except Exception as e:
#     print(f"Error loading metadata: {e}")
#     metadata = None


# This one returns plain data — safe to use in backend logic like chat
def get_user_from_session():
    session_cookie = request.cookies.get('session')
    if not session_cookie:
        return {"error": "Unauthorized - Missing session cookie"}

    try:
        return auth.verify_session_cookie(session_cookie, check_revoked=True)
    except Exception as e:
        return {"error": str(e)}

# This one is for routes your teammates use — returns Flask-style response
def verify_session_cookie():
    user = get_user_from_session()
    if "error" in user:
        return jsonify(user), 401
    return user



# Unprotected Routes
@app.route('/')
def home():
    """Serve the main UI."""
    return render_template('index.html')

@app.route('/citations', methods=['GET'])
def citations():
    """Example unprotected route that returns citation data (if you want it public)."""
    try:
        citation_data = []
        if metadata:
            for idx, doc in enumerate(metadata.values()):
                citation_data.append({
                    "source": doc.metadata.get("source", "Unknown"),
                    "citation": f"Mock APA Citation for Document {idx + 1}"
                })
        return jsonify({"citations": citation_data})
    except Exception as e:
        return jsonify({"error": f"Error generating citations: {e}"}), 500

@app.route('/migrate', methods=['POST'])
def migrate():

    try:
        alembic_cfg = Config("alembic.ini")
        alembic_cfg.set_main_option("sqlalchemy.url", POSTGRES_URL)

        print("⏳ Running migrations...")
        command.upgrade(alembic_cfg, "head")
        print("✅ Migrations completed.")

        return jsonify({"message": "Migrations completed successfully!"}), 200
    except Exception as e:
        return jsonify({"error": f"Error running migrations: {str(e)}"}), 500


# Protected Routes

@app.route('/onboarding', methods=['POST'])
def create_onboarding_route():
    user_claims = verify_session_cookie()
    if isinstance(user_claims, dict) and "error" in user_claims:
        return user_claims

    firebase_uid = user_claims["uid"]

    db_session = Session()
    postgres_user = get_user_by_firebase_uid(db_session, firebase_uid)
    if not postgres_user:
        return jsonify({"error": "User not found in database"}), 404

    data = request.get_json()
    required_fields = ["name", "answers", "quizzes"]
    if not all(field in data for field in required_fields):
        return jsonify({"error": "Missing required fields"}), 400

    try:
        new_onboarding = create_onboarding(
            db=db_session,
            user_id=postgres_user.id,
            name=data["name"],
            answers=data["answers"],
            quizzes=data["quizzes"]
        )
        return jsonify({
            "message": "Onboarding record created",
            "id": str(new_onboarding.id)
        }), 201
    except Exception as e:
        print("Error creating onboarding record:", e)
        db_session.rollback()
        return jsonify({"error": str(e)}), 500

@app.route('/onboarding', methods=['GET'])
def get_onboarding_route():

    user_claims = verify_session_cookie()
    if isinstance(user_claims, dict) and "error" in user_claims:
        return user_claims

    firebase_uid = user_claims["uid"]
    db_session = Session()
    try:
        postgres_user = get_user_by_firebase_uid(db_session, firebase_uid)
        if not postgres_user:
            return jsonify({"error": "User not found"}), 404

        onboarding = get_onboarding(db_session, postgres_user.id)
        if not onboarding:
            return jsonify({"error": "Onboarding record not found"}), 404

        onboarding_data = {
            "id": str(onboarding.id),
            "name": onboarding.name,
            "answers": onboarding.answers,
            "quizzes": onboarding.quizzes,
            "createdAt": onboarding.createdAt.isoformat()
        }
        return jsonify(onboarding_data), 200
    except Exception as e:
        return jsonify({"error": str(e)}), 500
    finally:
        db_session.close()

@app.route('/onboarding', methods=['PATCH'])
def update_onboarding():

    user_claims = verify_session_cookie()
    if isinstance(user_claims, dict) and "error" in user_claims:
        return user_claims

    firebase_uid = user_claims["uid"]
    data = request.get_json()
    db_session = Session()
    try:
        postgres_user = get_user_by_firebase_uid(db_session, firebase_uid)
        if not postgres_user:
            return jsonify({"error": "User not found"}), 404

        updated_onboarding = update_onboarding_by_user_id(db_session, postgres_user.id, data)
        onboarding_data = {
            "id": str(updated_onboarding.id),
            "name": updated_onboarding.name,
            "answers": updated_onboarding.answers,
            "quizzes": updated_onboarding.quizzes,
            "createdAt": updated_onboarding.createdAt.isoformat()
        }
        return jsonify(onboarding_data), 200
    except Exception as e:
        return jsonify({"error": str(e)}), 500
    finally:
        db_session.close()

@app.route('/onboarding', methods=['DELETE'])
def delete_onboarding():

    user_claims = verify_session_cookie()
    if isinstance(user_claims, dict) and "error" in user_claims:
        return user_claims

    firebase_uid = user_claims["uid"]
    db_session = Session()
    try:
        postgres_user = get_user_by_firebase_uid(db_session, firebase_uid)
        if not postgres_user:
            return jsonify({"error": "User not found"}), 404

        delete_onboarding_by_user_id(db_session, postgres_user.id)
        return jsonify({"message": "Onboarding record deleted successfully"}), 200
    except Exception as e:
        return jsonify({"error": str(e)}), 500
    finally:
        db_session.close()

@app.route('/createUser', methods=['POST'])
def create_user_route():
    data = request.get_json()
    
    id_token = data.get("idToken")
    if not id_token:
        return jsonify({"error": "Missing ID token"}), 400

    try:
        decoded_claims = auth.verify_id_token(id_token)
        firebase_uid = decoded_claims["uid"]
    except Exception as e:
        return jsonify({"error": "Invalid ID token: " + str(e)}), 401

    email = data.get("email")
    password = data.get("password")
    if not email or not password:
        return jsonify({"error": "Email and password are required"}), 400

    db_session = Session()
    try:
        new_user = create_user(db_session, email, password, firebase_uid=firebase_uid)
        return jsonify({"id": str(new_user.id), "email": new_user.email}), 201
    except Exception as e:
        return jsonify({"error": str(e)}), 500
    finally:
        db_session.close()

@app.route('/sessionLogout', methods=['POST'])
def session_logout():

    response = jsonify({'message': 'Logged out'})
    response.set_cookie('session', '', max_age=0)
    return response

@app.route('/sessionLogin', methods=['POST'])
def session_login():
    data = request.get_json()
    id_token = data.get('idToken')
    if not id_token:
        return jsonify({'error': 'Missing ID token'}), 400

    try:
        expires_in = 60 * 60 * 24 * 5
        session_cookie = auth.create_session_cookie(id_token, expires_in=expires_in)
        response = jsonify({'message': 'Session cookie set'})
        response.set_cookie(
            'session',
            session_cookie,
            max_age=expires_in, 
            httponly=True,
            secure=False,
            samesite='Strict'
        )
        return response
    except Exception as e:
        return jsonify({'error': str(e)}), 401
    
@app.route('/chats', methods=['GET'])
def get_chats():
    """Retrieve chats for the authenticated user."""
    user = verify_session_cookie()
    if isinstance(user, dict) and "error" in user:
        return user

    user_id = user["uid"]
    try:
        chats = get_chats_by_user_id(db=Session(), user_id=user_id)
        return jsonify(chats), 200
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@app.route('/chat', methods=['POST'])
def chat():
     user_claims = verify_session_cookie()
     if isinstance(user_claims, dict) and "error" in user_claims:
         return user_claims
 
     data = request.get_json()
     user_message = data.get("message")
     
     if not user_message:
         return jsonify({"error": "Message is required"}), 400
 
     try:
         client = OpenAI()
 
         response = client.chat.completions.create(
             model="gpt-4o",  # or gpt-3.5-turbo
             messages=[
                 {"role": "system", "content": "You are a helpful assistant."},
                 {"role": "user", "content": user_message}
             ]
         )
 
         reply_text = response.choices[0].message.content
 
         return jsonify({"response": reply_text})
     
     except Exception as e:
         return jsonify({"error": str(e)}), 500
     
@app.route('/chatwithpersona', methods=['POST'])
def chat_with_persona():
    user_claims = verify_session_cookie()
    if isinstance(user_claims, dict) and "error" in user_claims:
        return user_claims

    data = request.get_json()
    name = data.get("name")
    user_message = data.get("message")
    profile = data.get("userProfile", {})
    raw_expertise = data.get("expertise")
    #course_id = data.get("courseId")

    expertise_map = {
    "beginner": "They prefer simple, clear explanations suitable for someone new to the topic.",
    "intermediate": "They have some prior experience and prefer moderate technical depth.",
    "advanced": "They want in-depth explanations with technical language.",
    }
     
    expertise = str(raw_expertise).lower() if raw_expertise else "beginner"
    expertise_summary = expertise_map.get(expertise, expertise_map["beginner"]) 


    persona = []

    if name:
        persona.append(f'The user’s name is **{name}**')
    if profile.get("role"):
        persona.append(f'they are a **{profile["role"]}**')
    if profile.get("traits"):
        persona.append(f'they like their assistant to be **{profile["traits"]}**')
    if profile.get("learningStyle"):
        persona.append(f'their preferred learning style is **{profile["learningStyle"]}**')
    if profile.get("depth"):
        persona.append(f'they prefer **{profile["depth"]}-level** explanations')
    if profile.get("interests"):
        persona.append(f'they’re interested in **{profile["interests"]}**')
    if profile.get("personalization"):
        persona.append(f'they enjoy **{profile["personalization"]}**')
    if profile.get("schedule"):
        persona.append(f'they study best **{profile["schedule"]}**')

    full_persona = ". ".join(persona)
    
    if not user_message:
        return jsonify({"error": "Message is required"}), 400

    try:
        client = OpenAI()

        response = client.chat.completions.create(
            model="gpt-4o",  # or gpt-3.5-turbo
            messages=[
            { "role": "system", "content": "You are a helpful and friendly AI tutor." },
            { "role": "user", "content": f"{full_persona}. {expertise_summary}" },
            { "role": "user", "content": f"Now explain this topic: {user_message}" }
        ]
        )

        reply_text = response.choices[0].message.content
        #SAVE COURSE CONTENT BROKEN RN
        # if course_id and user_message:
        #     db = Session()
        #     try:
        #         course = get_course_by_id(db, course_id)
        #         if not course:
        #             raise Exception("Course not found")

        #         content = course.content or {}
                
        #         # Ensure we have a 'lessonContent' map
        #         if "lessonContent" not in content:
        #             content["lessonContent"] = {}

        #         # Update the lesson content using the metadata string (user_message)
        #         content["lessonContent"][user_message] = reply_text

        #         update_course(
        #             db=db,
        #             course_id=course_id,
        #             update_data={"content": content}
        #         )

        #     except Exception as e:
        #         print(f"Error saving generated lesson content: {e}")
        #         db.rollback()
        #     finally:
        #         db.close()

        return jsonify({"response": reply_text})
    
    except Exception as e:
        return jsonify({"error": str(e)}), 500
     
@app.route('/chats', methods=['DELETE'])
def delete_chat_param_missing():
    return jsonify({"error": "chat_id is required in the URL"}), 400

@app.route('/chat/<chat_id>', methods=['GET'])
def get_chat_by_id_route(chat_id):
    """Get a single chat by ID."""
    user = verify_session_cookie()
    if isinstance(user, dict) and "error" in user:
        return user

    db_session = Session()
    try:
        chat = db_session.query(Chat).filter(Chat.id == chat_id).first()
        if not chat:
            return jsonify({"error": "Chat not found"}), 404

        if str(chat.userId) != user["uid"]:
            return jsonify({"error": "Unauthorized"}), 401

        chat_data = {
            "id": str(chat.id),
            "createdAt": chat.createdAt.isoformat(),
            "title": chat.title,
            "userId": str(chat.userId),
            "visibility": chat.visibility
        }
        return jsonify(chat_data), 200
    except Exception as e:
        return jsonify({"error": str(e)}), 500
    finally:
        db_session.close()

@app.route('/chat/<chat_id>', methods=['DELETE'])
def delete_chat_by_id_route(chat_id):
    """Delete a chat by its ID."""
    user = verify_session_cookie()
    if isinstance(user, dict) and "error" in user:
        return user

    try:
        delete_chat_by_id(db=Session(), chat_id=chat_id)
        return jsonify({"message": "Chat and its associated messages deleted successfully"}), 200
    except Exception as e:
        return jsonify({"error": f"Error deleting chat: {str(e)}"}), 500

@app.route('/messages/<chat_id>', methods=['GET'])
def get_messages_by_chat(chat_id):
    """Retrieve messages for a specific chat."""
    user_claims = verify_session_cookie()
    if isinstance(user_claims, dict) and "error" in user_claims:
        return user_claims

    db_session = Session()
    try:
        # 🔍 Step 1: Look up Postgres user using Firebase UID
        postgres_user = get_user_by_firebase_uid(db_session, user_claims["uid"])
        if not postgres_user:
            return jsonify({"error": "User not found"}), 404

        # ✅ Step 2: Get chat and compare using internal UUID
        chat = db_session.query(Chat).filter(Chat.id == chat_id).first()
        if not chat:
            return jsonify({"error": "Chat not found"}), 404

        if str(chat.userId) != str(postgres_user.id):
            print(f"Unauthorized: Chat.userId = {chat.userId}, Requesting user = {postgres_user.id}")
            return jsonify({"error": "Unauthorized"}), 401

        # ✅ Step 3: Return messages
        messages = get_messages_by_chat_id(db=db_session, chat_id=chat_id)
        if not messages:
            return jsonify([]), 200

        return jsonify([
            {
                "role": msg.role,
                "content": msg.content,
                "createdAt": msg.createdAt.isoformat()
            }
            for msg in messages
        ]), 200

    except Exception as e:
        print(f"Error in get_messages_by_chat: {str(e)}")
        return jsonify({"error": str(e)}), 500
    finally:
        db_session.close()



@app.route('/message', methods=['POST'])
def save_message():
    """Save messages for a chat."""
    user = verify_session_cookie()
    if isinstance(user, dict) and "error" in user:
        return user

    data = request.json
    messages = data.get('messages')

    if not messages:
        return jsonify({"error": "Messages are required"}), 400

    try:
        saved = save_messages(db=Session(), messages=messages)
        return jsonify(saved), 201
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@app.route('/message/vote', methods=['POST'])
def vote_on_message():
    """Vote on a message in a chat."""
    user = verify_session_cookie()
    if isinstance(user, dict) and "error" in user:
        return user

    data = request.json
    chat_id = data.get('chatId')
    message_id = data.get('messageId')
    vote_type = data.get('type')

    if not chat_id or not message_id or not vote_type:
        return jsonify({"error": "Chat ID, message ID, and vote type are required"}), 400

    try:
        vote = vote_message(db=Session(), chat_id=chat_id, message_id=message_id, vote_type=vote_type)
        return jsonify(vote), 200
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@app.route('/vote/<chat_id>', methods=['GET'])
def get_votes_for_chat(chat_id):
    """Get votes for a particular chat."""
    user = verify_session_cookie()
    if isinstance(user, dict) and "error" in user:
        return user

    try:
        votes = get_votes_by_chat_id(db=Session(), chat_id=chat_id)
        return jsonify(votes), 200
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@app.route('/documents', methods=['GET'])
def get_documents_route():
    """Get documents belonging to authenticated user."""
    user = verify_session_cookie()
    if isinstance(user, dict) and "error" in user:
        return user

    user_id = user["uid"]
    document_id = request.args.get('id')

    if not document_id:
        return jsonify({'error': 'Missing id'}), 400

    documents = get_documents_by_id(db=Session(), id=document_id)
    if not documents:
        return jsonify({'error': 'Document not found'}), 404

    if documents[0]['userId'] != user_id:
        return jsonify({'error': 'Unauthorized'}), 401

    return jsonify(documents), 200

@app.route('/documents', methods=['POST'])
def save_document_route():
    """Save a document for the authenticated user."""
    user = verify_session_cookie()
    if isinstance(user, dict) and "error" in user:
        return user

    user_id = user["uid"]
    document_id = request.args.get('id')
    if not document_id:
        return jsonify({'error': 'Missing id'}), 400

    data = request.get_json()
    content = data.get('content')
    title = data.get('title')
    kind = data.get('kind')

    if not content or not title or not kind:
        return jsonify({'error': 'Content, title, and kind are required'}), 400

    document = save_document(
        db=Session(),
        id=document_id,
        content=content,
        title=title,
        kind=kind,
        user_id=user_id
    )

    return jsonify(document), 200

@app.route('/documents', methods=['PATCH'])
def delete_documents_by_timestamp():
    """Delete documents after a certain timestamp for the authenticated user."""
    user = verify_session_cookie()
    if isinstance(user, dict) and "error" in user:
        return user

    user_id = user["uid"]
    document_id = request.args.get('id')
    if not document_id:
        return jsonify({'error': 'Missing id'}), 400

    data = request.get_json()
    timestamp_str = data.get('timestamp')

    if not timestamp_str:
        return jsonify({'error': 'Timestamp is required'}), 400

    from datetime import datetime
    try:
        timestamp = datetime.fromisoformat(timestamp_str)
    except ValueError:
        return jsonify({'error': 'Invalid timestamp format'}), 400

    documents = get_documents_by_id(db=Session(), id=document_id)

    if not documents:
        return jsonify({'error': 'Document not found'}), 404

    if documents[0]['userId'] != user_id:
        return jsonify({'error': 'Unauthorized'}), 401

    delete_documents_by_id_after_timestamp(
        db=Session(),
        id=document_id,
        timestamp=timestamp
    )

    return jsonify({'message': 'Documents deleted successfully'}), 200

@app.route('/document/<document_id>', methods=['GET'])
def get_document_by_id_endpoint(document_id):
    """Retrieve a single document by its ID."""
    user = verify_session_cookie()
    if isinstance(user, dict) and "error" in user:
        return user

    try:
        doc = get_document_by_id(db=Session(), document_id=document_id)
        if not doc:
            return jsonify({"error": "Document not found"}), 404

        if doc['userId'] != user["uid"]:
            return jsonify({'error': 'Unauthorized'}), 401

        return jsonify(doc), 200
    except Exception as e:
        return jsonify({"error": f"Error retrieving document: {str(e)}"}), 500

@app.route('/suggestions', methods=['GET'])
def get_suggestions_route():
    """Fetch suggestions for a specific document ID."""
    user = verify_session_cookie()
    if isinstance(user, dict) and "error" in user:
        return user

    document_id = request.args.get('documentId')
    if not document_id:
        return jsonify({"error": "Document ID is required"}), 400

    try:
        suggestions = get_suggestions_by_document_id(document_id)
        if not suggestions:
            return jsonify([]), 200

        if suggestions[0]["userId"] != user["uid"]:
            return jsonify({"error": "Unauthorized"}), 401

        return jsonify(suggestions), 200
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@app.route('/suggestions', methods=['POST'])
def save_suggestions_endpoint():
    """Save suggestions for a specific document."""
    user = verify_session_cookie()
    if isinstance(user, dict) and "error" in user:
        return user

    data = request.get_json()
    document_id = data.get('documentId')
    original_text = data.get('originalText')
    suggested_text = data.get('suggestedText')
    description = data.get('description')
    user_id = user["uid"]

    if not document_id or not original_text or not suggested_text:
        return jsonify({"error": "documentId, originalText, and suggestedText are required"}), 400

    try:
        from datetime import datetime
        suggestions = [
            Suggestion(
                documentId=document_id,
                originalText=original_text,
                suggestedText=suggested_text,
                description=description,
                userId=user_id,
                documentCreatedAt=datetime.utcnow()
            )
        ]
        db_session = Session()
        save_suggestions(db_session, suggestions)
        return jsonify({"message": "Suggestions saved successfully"}), 201
    except Exception as e:
        return jsonify({"error": f"Error saving suggestions: {str(e)}"}), 500

@app.route('/delete-trailing-messages', methods=['POST'])
def delete_trailing_messages():
    """Delete messages after a given timestamp in a chat."""
    user = verify_session_cookie()
    if isinstance(user, dict) and "error" in user:
        return user

    data = request.get_json()
    message_id = data.get('id')

    if not message_id:
        return jsonify({"error": "Message ID is required"}), 400

    msg = get_message_by_id(id=message_id)
    if not msg:
        return jsonify({"error": "Message not found"}), 404

    delete_messages_by_chat_id_after_timestamp(chatId=msg.chatId, timestamp=msg.createdAt)
    return jsonify({"message": "Trailing messages deleted"}), 200

@app.route('/update-chat-visibility', methods=['POST'])
def update_chat_visibility():
    """Update the visibility status of a chat."""
    user = verify_session_cookie()
    if isinstance(user, dict) and "error" in user:
        return user

    data = request.get_json()
    chat_id = data.get('chatId')
    visibility = data.get('visibility')

    if not chat_id or not visibility:
        return jsonify({"error": "Chat ID and visibility are required"}), 400

    update_chat_visibility_by_id(db=Session(), chat_id=chat_id, visibility=visibility)

    return jsonify({"message": "Chat visibility updated successfully"}), 200

@app.route('/save-model-id', methods=['POST'])
def save_model_id():
    """Save the selected AI model ID. Optionally protect this route."""
    user = verify_session_cookie()
    if isinstance(user, dict) and "error" in user:
        return user

    data = request.get_json()
    model_id = data.get('model')

    if not model_id:
        return jsonify({"error": "Model ID is required"}), 400

    return jsonify({"message": f"Model ID {model_id} saved successfully"}), 200

@app.route('/generate-title', methods=['POST'])
def generate_title_from_message():
    """Generate a short title from the user's first message."""
    user = verify_session_cookie()
    if isinstance(user, dict) and "error" in user:
        return user

    data = request.get_json()
    message = data.get('message')

    if not message:
        return jsonify({"error": "Message is required"}), 400

    title = message[:80]
    return jsonify({"title": title}), 200

@app.route('/ai-chat', methods=['POST'])
def ai_chat():
    try:
        user = get_user_from_session()
        if "error" in user:
            return jsonify(user), 401

        data = request.get_json()
        chat_id       = data.get("id")
        user_message  = data.get("userMessage")
        conversation  = data.get("messages", [])

        if not user_message:
            return jsonify({"error": "User message is required"}), 400

        db_session = Session()

        # ——— Get or create chat ———
        chat = get_chat_by_id(db_session, chat_id) if chat_id else None
        pg_user = get_user_by_firebase_uid(db_session, user["uid"])
        if not chat:
            if not pg_user:
                return jsonify({"error": "User not found in database"}), 404
            chat = save_chat(db_session, user_id=pg_user.id, title="New Chat")
            chat_id = str(chat.id)

        # ——— Save the incoming user message ———
        user_msg = Message(
            id=str(uuid.uuid4()),
            chatId=chat_id,
            role="user",
            content=user_message,
            createdAt=datetime.utcnow()
        )
        save_messages(db_session, messages=[user_msg])

        # ——— Fetch onboarding/persona info ———
        onboarding = get_onboarding(db_session, pg_user.id)
        if not onboarding:
            return jsonify({"error": "User onboarding profile not found"}), 404

        name, job, traits, learningStyle, depth, topics, interests, schedule = (
            onboarding.name,
            *onboarding.answers
        )

        # Build a short persona summary
        persona_bits = []
        if name:   persona_bits.append(f"Name: {name}")
        if job:    persona_bits.append(f"Occupation: {job}")
        if traits: persona_bits.append(f"Preferred tone: {traits}")
        if learningStyle:
                   persona_bits.append(f"Learning style: {learningStyle}")
        if depth:  persona_bits.append(f"Depth: {depth}")
        if topics: persona_bits.append(f"Topics: {topics}")
        if interests:
                   persona_bits.append(f"Interests: {interests}")
        if schedule:
                   persona_bits.append(f"Schedule: {schedule}")
        persona_string = " • ".join(persona_bits)

        expertise_map = {
            "beginner":     "They prefer simple, clear explanations.",
            "intermediate": "They want moderate technical depth.",
            "advanced":     "They want in-depth, technical explanations."
        }
        expertise = depth.lower() if depth else "beginner"
        expertise_summary = expertise_map.get(expertise, expertise_map["beginner"])

        # ——— Compose system & persona prompts ———
        system_msg = {
            "role": "system",
            "content": (
                "You are a friendly AI tutor. By default, utilize the user's occupation, "
                "favorite topics, and interests to give examples in every response."
            )
        }
        persona_msg = {
            "role": "system",
            "content": f"{persona_string}. {expertise_summary}"
        }

        # ——— Build the full message stack ———
        messages = [system_msg, persona_msg] + conversation + [
            {"role": "user", "content": user_message}
        ]

        # ——— Call OpenAI with a max token limit to enforce brevity ———
        client = OpenAI(api_key=os.getenv("OPENAI_API_KEY"))
        response = client.chat.completions.create(
            model="gpt-4o",
            messages=messages,
            max_tokens=150,
            temperature=0.5,
        )

        assistant_content = response.choices[0].message.content.strip()

        # ——— Save the assistant’s reply ———
        assistant_msg = Message(
            id=str(uuid.uuid4()),
            chatId=chat_id,
            role="assistant",
            content=assistant_content,
            createdAt=datetime.utcnow()
        )
        save_messages(db_session, messages=[assistant_msg])

        return jsonify({
            "assistant": assistant_content,
            "chatId":    chat_id
        }), 200

    except Exception as e:
        print("Error in /ai-chat:", str(e))
        return jsonify({"error": "Server error: " + str(e)}), 500


@app.route('/create-course', methods=['POST'])
def learn_from_question():
    try:
        user = get_user_from_session()
        if "error" in user:
            return jsonify(user), 401

        # Get form data (or JSON)
        data = request.form or request.get_json()
        question = data.get("question")
        if not question:
            return jsonify({"error": "Missing question"}), 400

        topic_expertise = prompt1_create_course(question)

        # Verify Topic & Expertise JSON is valid
        try:
            topic_expertise_parsed = json.loads(topic_expertise.choices[0].message.content)
        except (ValueError, AttributeError, IndexError) as e:
            return jsonify({"error": "Invalid JSON returned from AI response", "details": str(e)}), 400
        
        topic = topic_expertise_parsed.get("topic")
        expertise = topic_expertise_parsed.get("expertise")

        if not topic or not expertise:
            return jsonify({"error": "Invalid GPT response"}), 400
        
        pdf_file = request.files.get("file")
        
        faiss_bytes = None
        pkl_bytes = None

        if pdf_file:
            # TODO integrate BLOB storage so PDFs and Index files aren't stored locally

            # Read PDF content into bytes
            file_bytes = pdf_file.read()

            # Generate MD5 hash of the content
            pdf_id = hashlib.md5(file_bytes).hexdigest()

            # Store the PDF file locally (For testing ONLY)
            upload_dir = os.path.join(os.path.dirname(__file__), "faiss_generated", pdf_id)
            os.makedirs(upload_dir, exist_ok=True)

            filename = f"{pdf_id}.pdf"
            file_path = os.path.join(upload_dir, filename)

            if not os.path.exists(file_path):
                with open(file_path, "wb") as f:
                    f.write(file_bytes)

            # FAISS database creation
            create_database(upload_dir, pdf_id)
            generate_citations(upload_dir)
            replace_sources(upload_dir)
            # Generate course outline using the PDF content and expertise
            outline = prompt2_generate_course_outline_RAG(upload_dir, expertise)

            index_faiss_path = os.path.join(upload_dir, "index.faiss")
            index_pkl_path = os.path.join(upload_dir, "index.pkl")

            with open(index_faiss_path, "rb") as f:
                faiss_bytes = f.read()

            with open(index_pkl_path, "rb") as f:
                pkl_bytes = f.read()

            # TODO Delete local course files after posted to DB
        else:
            pdf_id = None
            # Generate course outline using the provided topic and expertise
            outline = prompt2_generate_course_outline(topic, expertise)

        # Verify Course Outline JSON is valid
        try:
            outline_parsed = json.loads(outline)
        except (ValueError, AttributeError, IndexError) as e:
            return jsonify({"error": "Invalid JSON returned from AI response", "details": str(e)}), 400

        # Retrieve Postgres user record
        db_session = Session()
        postgres_user = get_user_by_firebase_uid(db_session, user["uid"])
        if not postgres_user:
            return jsonify({"error": "User not found"}), 404

        # Create the new course record
        new_course = create_course(
            db=db_session,
            user_id=str(postgres_user.id),
            topic=topic,
            expertise=expertise,
            content=outline_parsed,  # Course outline (JSON)
            pkl=pkl_bytes,
            index=faiss_bytes,
            file_id=pdf_id
        )
        db_session.close()
        import time
        time.sleep(0.5)
        # Return the new course ID to the client
        return jsonify({"message": "Course created successfully", "courseId": str(new_course.id)}), 200

    except Exception as e:
        print("Error in /create-course:", str(e))
        return jsonify({"error": str(e)}), 500

@app.route('/upload', methods=['POST'])
def upload_audio():
    if 'audio' not in request.files:
        return jsonify({"error": "No file part in request"}), 400

    file = request.files['audio']
    if file.filename == '':
        return jsonify({"error": "No selected file"}), 400

    db_session = Session()

    try:
        text = transcribe_audio(file)  # 🎤 transcribe first
        transcript = save_transcript(db_session, file.filename, text)  # 💾 save to DB

        return jsonify({
            "message": "Transcription successful",
            "filename": transcript.filename,
            "text": transcript.text
        }), 200

    except Exception as e:
        db_session.rollback()
        print(f"Upload error: {e}")
        return jsonify({"error": str(e)}), 500

    finally:
        db_session.close()  # ✅ always close the session


if __name__ == '__main__':
    app.run(debug=True, host='0.0.0.0', port=8080)

@app.route('/market', methods=['POST'])
def create_market_item():
    user = verify_session_cookie()
    if isinstance(user, dict) and "error" in user:
        return user

    data = request.get_json()
    snp500 = data.get("snp500")
    date_str = data.get("date")

    if snp500 is None or not date_str:
        return jsonify({"error": "snp500 and date are required"}), 400

    try:
        market_date = date.fromisoformat(date_str)
    except ValueError:
        return jsonify({"error": "Invalid date format (use YYYY-MM-DD)"}), 400

    db_session = Session()
    try:
        new_item = save_market_item(
            db=db_session,
            snp500=snp500,
            date_value=market_date
        )
        return jsonify({
            "id": str(new_item.id),
            "snp500": float(new_item.snp500),
            "date": new_item.date.isoformat()
        }), 201
    except Exception as e:
        db_session.rollback()
        return jsonify({"error": str(e)}), 500
    finally:
        db_session.close()


@app.route('/market/recent', methods=['GET'])
def get_recent_market_data():
    user = verify_session_cookie()
    if isinstance(user, dict) and "error" in user:
        return user

    limit_count = request.args.get("limit", default=30, type=int)

    db_session = Session()
    try:
        results = get_recent_market_prices(db_session, limit_count=limit_count)
        return jsonify([
            {
                "price": float(item.snp500),
                "date": item.date.isoformat()
            }
            for item in results
        ]), 200
    except Exception as e:
        return jsonify({"error": str(e)}), 500
    finally:
        db_session.close()


@app.route('/market/<market_id>', methods=['GET'])
def get_single_market_item(market_id):
    user = verify_session_cookie()
    if isinstance(user, dict) and "error" in user:
        return user

    db_session = Session()
    try:
        item = get_market_item_by_id(db_session, market_id)
        if not item:
            return jsonify({"error": "Market item not found"}), 404

        return jsonify({
            "id": str(item[0].id) if isinstance(item, list) else str(item.id),
            "snp500": float(item[0].snp500) if isinstance(item, list) else float(item.snp500),
            "date": (item[0].date.isoformat()
                     if isinstance(item, list)
                     else item.date.isoformat())
        }), 200
    except Exception as e:
        return jsonify({"error": str(e)}), 500
    finally:
        db_session.close()


@app.route('/market/<market_id>', methods=['DELETE'])
def remove_market_item(market_id):
    user = verify_session_cookie()
    if isinstance(user, dict) and "error" in user:
        return user

    db_session = Session()
    try:
        delete_market_item_by_id(db_session, market_id)
        return jsonify({"message": "Market item deleted"}), 200
    except Exception as e:
        db_session.rollback()
        return jsonify({"error": str(e)}), 500
    finally:
        db_session.close()

@app.route('/news', methods=['POST'])
def create_news_item():
    user = verify_session_cookie()
    if isinstance(user, dict) and "error" in user:
        return user

    data = request.get_json()
    title = data.get("title")
    subject = data.get("subject")
    link = data.get("link")

    if not title or not subject or not link:
        return jsonify({"error": "title, subject, and link are required"}), 400

    db_session = Session()
    try:
        new_article = save_news_item(
            db=db_session,
            title=title,
            subject=subject,
            link=link
        )
        return jsonify({
            "id": str(new_article.id),
            "title": new_article.title,
            "subject": new_article.subject,
            "link": new_article.link
        }), 201
    except Exception as e:
        db_session.rollback()
        return jsonify({"error": str(e)}), 500
    finally:
        db_session.close()


@app.route('/news', methods=['GET'])
def get_all_news_items():
    user = verify_session_cookie()
    if isinstance(user, dict) and "error" in user:
        return user

    db_session = Session()
    try:
        articles = get_all_news(db_session)
        return jsonify([
            {
                "id": str(a.id),
                "title": a.title,
                "subject": a.subject,
                "link": a.link
            }
            for a in articles
        ]), 200
    except Exception as e:
        return jsonify({"error": str(e)}), 500
    finally:
        db_session.close()


@app.route('/news/<news_id>', methods=['GET'])
def get_news_item_by_id(news_id):
    user = verify_session_cookie()
    if isinstance(user, dict) and "error" in user:
        return user

    db_session = Session()
    try:
        article = get_news_by_id(db_session, news_id)
        if not article:
            return jsonify({"error": "News article not found"}), 404
        item = article[0] if isinstance(article, list) else article
        return jsonify({
            "id": str(item.id),
            "title": item.title,
            "subject": item.subject,
            "link": item.link
        }), 200
    except Exception as e:
        return jsonify({"error": str(e)}), 500
    finally:
        db_session.close()


@app.route('/news/<news_id>', methods=['DELETE'])
def remove_news_item(news_id):
    user = verify_session_cookie()
    if isinstance(user, dict) and "error" in user:
        return user

    db_session = Session()
    try:
        delete_news_by_id(db_session, news_id)
        return jsonify({"message": "News article deleted"}), 200
    except Exception as e:
        db_session.rollback()
        return jsonify({"error": str(e)}), 500
    finally:
        db_session.close()

@app.route('/courses/<course_id>', methods=['GET'])
def get_course_route(course_id):
    user = verify_session_cookie()
    if isinstance(user, dict) and "error" in user:
        return user

    db_session = Session()
    try:
        # Retrieve the course record
        course = get_course_by_id(db=db_session, course_id=course_id)
        if not course:
            return jsonify({"error": "Course not found"}), 404

        # Retrieve the Postgres user record using Firebase UID
        postgres_user = get_user_by_firebase_uid(db_session, user["uid"])
        if not postgres_user:
            return jsonify({"error": "User not found"}), 404

        # Compare course.userId with the Postgres user’s ID
        if str(course.userId) != str(postgres_user.id):
            return jsonify({"error": "Unauthorized"}), 401

        return jsonify({
            "id": str(course.id),
            "topic": course.topic,
            "expertise": course.expertise,
            "content": course.content,
            "createdAt": course.createdAt.isoformat(),
            "fileId": str(course.fileId) if course.fileId else None
        }), 200
    except Exception as e:
        return jsonify({"error": str(e)}), 500
    finally:
        db_session.close()

@app.route('/courses', methods=['GET'])
def get_courses_route():
    user = verify_session_cookie()
    if isinstance(user, dict) and "error" in user:
        return user
    
    db_session = Session()
    try:
        firebase_uid = user["uid"]
        postgres_user = get_user_by_firebase_uid(db_session, firebase_uid)
        if not postgres_user:
            return jsonify({"error": "User not found"}), 404
        
        courses = get_courses_by_user_id(db=db_session, user_id=postgres_user.id)
        result = [{
            "id": str(c.id),
            "topic": c.topic.title(),
            "expertise": c.expertise,
            "content": c.content,
            "createdAt": c.createdAt.isoformat(),
            "fileId": str(c.fileId) if c.fileId else None
        } for c in courses]
        return jsonify(result), 200
    except Exception as e:
        return jsonify({"error": str(e)}), 500
    finally:
        db_session.close()

@app.route('/courses/<course_id>', methods=['DELETE'])
def delete_course_route(course_id):
    user = verify_session_cookie()
    if isinstance(user, dict) and "error" in user:
        return user

    db_session = Session()
    try:
        course = get_course_by_id(db=db_session, course_id=course_id)
        if not course:
            return jsonify({"error": "Course not found"}), 404
        if str(course.userId) != user["uid"]:
            return jsonify({"error": "Unauthorized"}), 401

        delete_course_by_id(db=db_session, course_id=course_id)
        return jsonify({"message": "Course deleted successfully"}), 200
    except Exception as e:
        return jsonify({"error": str(e)}), 500
    finally:
        db_session.close()

@app.route('/files', methods=['POST'])
def upload_file_route():
    user = verify_session_cookie()
    if isinstance(user, dict) and "error" in user:
        return user

    if 'file' not in request.files:
        return jsonify({"error": "No file part in the request"}), 400

    file_obj = request.files['file']
    if file_obj.filename == '':
        return jsonify({"error": "No selected file"}), 400

    file_data = file_obj.read()
    filename = file_obj.filename
    file_type = file_obj.content_type
    file_size = len(file_data)

    db_session = Session()
    try:
        new_file = create_file(
            db=db_session,
            filename=filename,
            file_type=file_type,
            file_size=file_size,
            file_data=file_data
        )
        return jsonify({
            "id": str(new_file.id),
            "filename": new_file.filename,
            "fileType": new_file.fileType,
            "fileSize": new_file.fileSize,
            "createdAt": new_file.createdAt.isoformat()
        }), 201
    except Exception as e:
        return jsonify({"error": str(e)}), 500
    finally:
        db_session.close()

@app.route('/files/<file_id>', methods=['GET'])
def get_file_route(file_id):
    user = verify_session_cookie()
    if isinstance(user, dict) and "error" in user:
        return user

    db_session = Session()
    try:
        file_record = get_file_by_id(db=db_session, file_id=file_id)
        if not file_record:
            return jsonify({"error": "File not found"}), 404

        return jsonify({
            "id": str(file_record.id),
            "filename": file_record.filename,
            "fileType": file_record.fileType,
            "fileSize": file_record.fileSize,
            "createdAt": file_record.createdAt.isoformat()
        }), 200
    except Exception as e:
        return jsonify({"error": str(e)}), 500
    finally:
        db_session.close()

@app.route('/files/<file_id>', methods=['DELETE'])
def delete_file_route(file_id):
    user = verify_session_cookie()
    if isinstance(user, dict) and "error" in user:
        return user

    db_session = Session()
    try:
        file_record = get_file_by_id(db=db_session, file_id=file_id)
        if not file_record:
            return jsonify({"error": "File not found"}), 404

        db_session.delete(file_record)
        db_session.commit()
        return jsonify({"message": "File deleted successfully"}), 200
    except Exception as e:
        db_session.rollback()
        return jsonify({"error": str(e)}), 500
    finally:
        db_session.close()

@app.route('/files/<file_id>/content', methods=['GET'])
def serve_file_content(file_id):
    user = verify_session_cookie()
    if isinstance(user, dict) and "error" in user:
        return user

    db_session = Session()
    try:
        file_record = get_file_by_id(db=db_session, file_id=file_id)
        if not file_record:
            return jsonify({"error": "File not found"}), 404

        return Response(
            file_record.fileData,
            mimetype=file_record.fileType,
            headers={"Content-Disposition": f"inline; filename={file_record.filename}"}
        )
    except Exception as e:
        return jsonify({"error": str(e)}), 500
    finally:
        db_session.close()

@app.route('/courses/<course_id>', methods=['PATCH'])
def update_course_route(course_id):
    user = verify_session_cookie()
    if isinstance(user, dict) and "error" in user:
        return user

    update_fields = request.get_json()
    if not update_fields:
        return jsonify({"error": "Request JSON payload is required"}), 400

    db_session = Session()
    try:

        course = get_course_by_id(db=db_session, course_id=course_id)
        if not course:
            return jsonify({"error": "Course not found"}), 404
        if str(course.userId) != user["uid"]:
            return jsonify({"error": "Unauthorized"}), 401

        updated_course = update_course(db=db_session, course_id=course_id, update_data=update_fields)
        return jsonify({
            "id": str(updated_course.id),
            "topic": updated_course.topic,
            "expertise": updated_course.expertise,
            "content": updated_course.content,
            "createdAt": updated_course.createdAt.isoformat(),
            "fileId": str(updated_course.fileId) if updated_course.fileId else None
        }), 200
    except Exception as e:
        return jsonify({"error": str(e)}), 500
    finally:
        db_session.close()

@app.route('/files/<file_id>', methods=['PATCH'])
def update_file_route(file_id):
    user = verify_session_cookie()
    if isinstance(user, dict) and "error" in user:
        return user

    update_fields = request.get_json()
    if not update_fields:
        return jsonify({"error": "Request JSON payload is required"}), 400

    db_session = Session()
    try:
        file_record = get_file_by_id(db=db_session, file_id=file_id)
        if not file_record:
            return jsonify({"error": "File not found"}), 404

        updated_file = update_file(db=db_session, file_id=file_id, update_data=update_fields)
        return jsonify({
            "id": str(updated_file.id),
            "filename": updated_file.filename,
            "fileType": updated_file.fileType,
            "fileSize": updated_file.fileSize,
            "createdAt": updated_file.createdAt.isoformat()
        }), 200
    except Exception as e:
        return jsonify({"error": str(e)}), 500
    finally:
        db_session.close()

@app.route('/user', methods=['GET'])
def get_user():

    user_claims = verify_session_cookie()
    if isinstance(user_claims, dict) and "error" in user_claims:
        return user_claims

    firebase_uid = user_claims["uid"]
    db_session = Session()
    try:
        postgres_user = get_user_by_firebase_uid(db_session, firebase_uid)
        if not postgres_user:
            return jsonify({"error": "User not found"}), 404

        user_data = {
            "id": str(postgres_user.id),
            "email": postgres_user.email,
            "firebase_uid": postgres_user.firebase_uid
        }
        return jsonify(user_data), 200
    except Exception as e:
        return jsonify({"error": str(e)}), 500
    finally:
        db_session.close()

@app.route('/user', methods=['PATCH'])
def update_user():
    user_claims = verify_session_cookie()
    if isinstance(user_claims, dict) and "error" in user_claims:
        return user_claims

    firebase_uid = user_claims["uid"]
    data = request.get_json()
    db_session = Session()
    try:
        if "email" in data or "password" in data:
            update_args = {}
            if "email" in data:
                update_args["email"] = data["email"]
            if "password" in data:
                update_args["password"] = data["password"]
            auth.update_user(firebase_uid, **update_args)

        updated_user = update_user_by_firebase_uid(db_session, firebase_uid, data)
        user_data = {
            "id": str(updated_user.id),
            "email": updated_user.email,
            "firebase_uid": updated_user.firebase_uid
        }
        return jsonify(user_data), 200
    except Exception as e:
        db_session.rollback()
        return jsonify({"error": str(e)}), 500
    finally:
        db_session.close()

@app.route('/user', methods=['DELETE'])
def delete_user():

    user_claims = verify_session_cookie()
    if isinstance(user_claims, dict) and "error" in user_claims:
        return user_claims

    firebase_uid = user_claims["uid"]
    db_session = Session()
    try:
        delete_user_by_firebase_uid(db_session, firebase_uid)
        return jsonify({"message": "User deleted successfully"}), 200
    except Exception as e:
        return jsonify({"error": str(e)}), 500
    finally:
        db_session.close()