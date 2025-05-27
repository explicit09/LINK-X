"""
Streaming personalization endpoints for real-time content generation
"""
from flask import Response, request, jsonify
import json
import time
import uuid as uuid_lib
from datetime import datetime
import datetime as dt
from db.queries import *
from db.schema import PersonalizedFile, FileChunk
# from prompts import generate_personalized_content_stream  # Removed to avoid circular import
import logging
from sqlalchemy.dialects.postgresql import insert

logger = logging.getLogger(__name__)

def register_streaming_routes(app, Session, openai_client):
    """Register all streaming personalization routes"""
    
    @app.route('/api/personalize/<file_id>/check', methods=['GET', 'OPTIONS'])
    def check_personalized_content(file_id):
        """Check if personalized content already exists for this user and file"""
        if request.method == 'OPTIONS':
            return '', 204
            
        try:
            db = Session()
            
            # Get user ID from authentication
            firebase_uid = request.cookies.get('firebase_uid')
            if not firebase_uid:
                # For now, allow anonymous access with a warning
                logger.warning("No firebase_uid in cookies, using anonymous access")
                return jsonify({'exists': False}), 200
            
            # Get user from firebase UID
            user = get_user_by_firebase_uid(db, firebase_uid)
            if not user:
                logger.warning(f"User not found for firebase_uid: {firebase_uid}")
                return jsonify({'exists': False}), 200
            
            # Get student profile
            student_profile = get_student_profile(db, user.id)
            if not student_profile:
                logger.warning(f"Student profile not found for user: {user.id}")
                return jsonify({'exists': False}), 200
            
            user_id = student_profile.user_id
            
            # Check if personalized content exists
            personalized = db.query(PersonalizedFile).filter(
                PersonalizedFile.user_id == user_id,
                PersonalizedFile.original_file_id == file_id
            ).order_by(PersonalizedFile.created_at.desc()).first()
            
            if personalized:
                return jsonify({
                    'exists': True,
                    'personalizedFileId': str(personalized.id),
                    'content': personalized.content,
                    'createdAt': personalized.created_at.isoformat()
                }), 200
            else:
                return jsonify({'exists': False}), 200
                
        except Exception as e:
            logger.error(f"Error checking personalized content: {str(e)}", exc_info=True)
            return jsonify({'error': str(e)}), 500
        finally:
            db.close()
    
    @app.route('/api/personalize/<file_id>/save', methods=['POST', 'OPTIONS'])
    def save_personalized_content(file_id):
        """Save personalized content to database"""
        if request.method == 'OPTIONS':
            return '', 204
            
        try:
            db = Session()
            data = request.get_json() or {}
            
            # Get user ID from authentication
            firebase_uid = request.cookies.get('firebase_uid')
            if not firebase_uid:
                logger.warning("No firebase_uid in cookies for save operation")
                return jsonify({'error': 'Authentication required'}), 401
            
            # Get user from firebase UID
            user = get_user_by_firebase_uid(db, firebase_uid)
            if not user:
                logger.warning(f"User not found for firebase_uid: {firebase_uid}")
                return jsonify({'error': 'User not found'}), 404
            
            # Get student profile
            student_profile = get_student_profile(db, user.id)
            if not student_profile:
                logger.warning(f"Student profile not found for user: {user.id}")
                return jsonify({'error': 'Student profile required'}), 404
            
            user_id = student_profile.user_id
            content = data.get('content', {})
            
            # Check if personalized content already exists
            existing = db.query(PersonalizedFile).filter(
                PersonalizedFile.user_id == user_id,
                PersonalizedFile.original_file_id == file_id
            ).first()
            
            if existing:
                # Update existing content
                existing.content = content
                existing.created_at = datetime.now(dt.timezone.utc)
            else:
                # Create new personalized file
                personalized = PersonalizedFile(
                    user_id=user_id,
                    original_file_id=file_id,
                    content=content
                )
                db.add(personalized)
            
            db.commit()
            
            return jsonify({'success': True}), 200
            
        except Exception as e:
            logger.error(f"Error saving personalized content: {str(e)}", exc_info=True)
            db.rollback()
            return jsonify({'error': str(e)}), 500
        finally:
            db.close()
    
    @app.route('/api/personalize/<file_id>/outline', methods=['GET', 'OPTIONS'])
    def get_personalization_outline(file_id):
        """
        Get document outline immediately for skeleton UI
        Returns chapter structure without content
        """
        # Handle OPTIONS request for CORS
        if request.method == 'OPTIONS':
            return '', 204
            
        try:
            db = Session()
            
            logger.info(f"Getting outline for file_id: {file_id}")
            
            # Try to get the file
            file = None
            file_name = "Document"
            
            try:
                # Validate it's a valid UUID
                uuid_lib.UUID(file_id)
                
                # Try to get file directly
                file = get_file_by_id(db, file_id)
                if file:
                    file_name = file.filename
                    logger.info(f"Found file: {file_name}")
                else:
                    # Check if it's a personalized file
                    personalized_file = db.query(PersonalizedFile).filter(
                        PersonalizedFile.id == file_id
                    ).first()
                    
                    if personalized_file and personalized_file.original_file_id:
                        file = get_file_by_id(db, personalized_file.original_file_id)
                        if file:
                            file_name = file.filename
                            logger.info(f"Found original file via personalized file: {file_name}")
                            
            except Exception as e:
                logger.warning(f"Error looking up file {file_id}: {e}")
                # Continue with generic outline
            
            # Always return an outline, even if file not found
            outline = {
                "fileId": file_id,
                "fileName": file_name,
                "chapters": [
                    {
                        "id": "chapter-1",
                        "title": "Introduction & Overview",
                        "estimatedTokens": 2000,
                        "subsections": [
                            {"id": "1.1", "title": "Welcome & Context", "estimatedTokens": 500},
                            {"id": "1.2", "title": "Key Concepts", "estimatedTokens": 600},
                            {"id": "1.3", "title": "Learning Objectives", "estimatedTokens": 500},
                            {"id": "1.4", "title": "How to Use This Guide", "estimatedTokens": 400}
                        ]
                    },
                    {
                        "id": "chapter-2",
                        "title": "Core Content",
                        "estimatedTokens": 2500,
                        "subsections": [
                            {"id": "2.1", "title": "Fundamental Principles", "estimatedTokens": 700},
                            {"id": "2.2", "title": "Detailed Explanations", "estimatedTokens": 600},
                            {"id": "2.3", "title": "Examples & Applications", "estimatedTokens": 600},
                            {"id": "2.4", "title": "Common Patterns", "estimatedTokens": 600}
                        ]
                    },
                    {
                        "id": "chapter-3",
                        "title": "Practice & Mastery",
                        "estimatedTokens": 2000,
                        "subsections": [
                            {"id": "3.1", "title": "Hands-on Exercises", "estimatedTokens": 600},
                            {"id": "3.2", "title": "Real-world Scenarios", "estimatedTokens": 500},
                            {"id": "3.3", "title": "Tips & Best Practices", "estimatedTokens": 500},
                            {"id": "3.4", "title": "Next Steps", "estimatedTokens": 400}
                        ]
                    }
                ],
                "totalEstimatedTokens": 6500
            }
            
            db.close()
            return jsonify(outline), 200
            
        except Exception as e:
            logger.error(f"Error generating outline: {str(e)}", exc_info=True)
            # Return generic outline even on error
            return jsonify({
                "fileId": file_id,
                "fileName": "Document",
                "chapters": [
                    {
                        "id": "chapter-1",
                        "title": "Introduction & Overview",
                        "estimatedTokens": 2000,
                        "subsections": [
                            {"id": "1.1", "title": "Getting Started", "estimatedTokens": 500},
                            {"id": "1.2", "title": "Core Concepts", "estimatedTokens": 600},
                            {"id": "1.3", "title": "Key Objectives", "estimatedTokens": 500},
                            {"id": "1.4", "title": "Learning Path", "estimatedTokens": 400}
                        ]
                    }
                ],
                "totalEstimatedTokens": 2000
            }), 200
    
    @app.route('/api/personalize/<file_id>/stream', methods=['POST', 'OPTIONS'])
    def stream_personalized_content(file_id):
        """
        Stream personalized content generation in real-time
        Client receives tokens as they're generated
        """
        # Handle OPTIONS request for CORS
        if request.method == 'OPTIONS':
            return '', 204
            
        try:
            db = Session()
            
            logger.info(f"Streaming personalized content for file_id: {file_id}")
            
            # Get request data
            data = request.get_json() or {}
            # Get user ID from authentication
            firebase_uid = request.cookies.get('firebase_uid')
            if firebase_uid:
                user = get_user_by_firebase_uid(db, firebase_uid)
                user_id = user.id if user else None
            else:
                user_id = None
            
            chapter_id = data.get('chapterId')
            subsection_id = data.get('subsectionId')
            previous_sections = data.get('previousSections', [])
            regenerate = data.get('regenerate', False)
            
            # Try to get file context
            context = None
            file_name = "Document"
            
            try:
                # Validate UUID
                uuid_lib.UUID(file_id)
                
                # Try to get file
                file = get_file_by_id(db, file_id)
                if file:
                    file_name = file.filename
                    # Get chunks
                    chunks = db.query(FileChunk).filter_by(file_id=file_id).order_by(FileChunk.ordering).limit(10).all()
                    if chunks:
                        context = "\n\n".join([chunk.content for chunk in chunks if chunk.content])
                else:
                    # Check personalized file
                    personalized_file = db.query(PersonalizedFile).filter(
                        PersonalizedFile.id == file_id
                    ).first()
                    
                    if personalized_file and personalized_file.original_file_id:
                        file = get_file_by_id(db, personalized_file.original_file_id)
                        if file:
                            file_name = file.filename
                            chunks = db.query(FileChunk).filter_by(
                                file_id=personalized_file.original_file_id
                            ).order_by(FileChunk.ordering).limit(10).all()
                            if chunks:
                                context = "\n\n".join([chunk.content for chunk in chunks if chunk.content])
                                
            except Exception as e:
                logger.warning(f"Error getting file context: {e}")
            
            # Get user profile
            persona = "General learner seeking comprehensive understanding"
            try:
                if user_id:
                    student_profile = get_student_profile(db, user_id)
                else:
                    student_profile = None
                if student_profile and student_profile.onboard_answers:
                    answers = student_profile.onboard_answers
                    persona_parts = []
                    if student_profile.name:
                        persona_parts.append(f"Name: {student_profile.name}")
                    if answers.get('learningStyle'):
                        persona_parts.append(f"Learning style: {answers['learningStyle']}")
                    if answers.get('interests'):
                        persona_parts.append(f"Interests: {answers['interests']}")
                    if answers.get('depth'):
                        persona_parts.append(f"Expertise level: {answers['depth']}")
                    if persona_parts:
                        persona = " | ".join(persona_parts)
            except Exception as e:
                logger.warning(f"Error getting user profile: {e}")
            
            # Default context if none found
            if not context:
                context = f"""This is a personalized learning experience for {file_name}. 
                The content will be generated in real-time based on your profile and learning preferences.
                Each section is carefully crafted to match your learning style and pace."""
            
            def generate():
                try:
                    # Send initial metadata
                    yield f"data: {json.dumps({'type': 'start', 'chapterId': chapter_id, 'subsectionId': subsection_id})}\n\n"
                    
                    # Extract key topics from document context
                    doc_keywords = []
                    if context:
                        # Simple keyword extraction from first 500 chars
                        context_preview = context[:500].lower()
                        # Look for technical terms, concepts
                        import re
                        words = re.findall(r'\b[a-z]+\b', context_preview)
                        # Filter common words and get unique technical terms
                        common_words = {'the', 'and', 'of', 'to', 'a', 'in', 'is', 'it', 'that', 'for', 'with', 'as', 'on', 'at', 'by', 'an', 'be', 'this', 'which', 'or', 'from', 'are', 'was', 'were', 'been', 'have', 'has', 'had', 'do', 'does', 'did', 'will', 'would', 'could', 'should', 'may', 'might', 'must', 'can', 'shall'}
                        doc_keywords = [w for w in words if len(w) > 4 and w not in common_words][:5]
                    
                    # Dynamic topic mapping based on document and section
                    if subsection_id.startswith("1."):
                        # Introduction chapter - focus on overview and context
                        subsection_topics = {
                            "1.1": {"topic": f"Introduction to {file_name}", "focus": f"Understanding the purpose and relevance of {', '.join(doc_keywords[:2]) if doc_keywords else 'this topic'}"},
                            "1.2": {"topic": f"Core concepts in {file_name}", "focus": f"Essential terminology and foundations specific to {', '.join(doc_keywords[2:4]) if len(doc_keywords) > 2 else 'this subject'}"},
                            "1.3": {"topic": f"Learning goals for {file_name}", "focus": "Your personal objectives and expected outcomes"},
                            "1.4": {"topic": f"Study approach for {file_name}", "focus": "Effective strategies tailored to your learning style"}
                        }
                    elif subsection_id.startswith("2."):
                        # Main content chapter - focus on depth
                        subsection_topics = {
                            "2.1": {"topic": f"Fundamental principles of {doc_keywords[0] if doc_keywords else 'the subject'}", "focus": "Core theoretical framework and underlying concepts"},
                            "2.2": {"topic": f"Deep dive into {doc_keywords[1] if len(doc_keywords) > 1 else 'key mechanisms'}", "focus": "Detailed analysis and interconnections"},
                            "2.3": {"topic": f"Applying {doc_keywords[2] if len(doc_keywords) > 2 else 'concepts'} in practice", "focus": "Real-world use cases and implementations"},
                            "2.4": {"topic": f"Advanced patterns in {file_name}", "focus": "Best practices and common challenges"}
                        }
                    else:
                        # Practice chapter - focus on application
                        subsection_topics = {
                            "3.1": {"topic": f"Hands-on with {doc_keywords[0] if doc_keywords else 'practical exercises'}", "focus": "Guided practice with immediate feedback"},
                            "3.2": {"topic": f"Real scenarios involving {doc_keywords[1] if len(doc_keywords) > 1 else 'case studies'}", "focus": "Industry examples and problem-solving"},
                            "3.3": {"topic": f"Mastering {doc_keywords[2] if len(doc_keywords) > 2 else 'advanced techniques'}", "focus": "Expert tips and optimization strategies"},
                            "3.4": {"topic": f"Beyond {file_name}: Next steps", "focus": "Future learning paths and career applications"}
                        }
                    
                    section_info = subsection_topics.get(subsection_id, {"topic": f"Section {subsection_id} of {file_name}", "focus": "Personalized learning content"})
                    topic = section_info["topic"]
                    focus = section_info["focus"]
                    
                    # Build varied prompts based on section type
                    prompt = f"""
                    You are creating section {subsection_id} of a personalized learning experience.
                    
                    SECTION DETAILS:
                    Topic: {topic}
                    Focus: {focus}
                    Section Number: {subsection_id}
                    
                    STUDENT PROFILE:
                    {persona}
                    
                    DOCUMENT CONTEXT:
                    File: {file_name}
                    Relevant Content:
                    {context[:1500]}
                    """
                    
                    # Add previous sections context to avoid repetition
                    if previous_sections:
                        prompt += "\n\nPREVIOUSLY COVERED (DO NOT REPEAT):\n"
                        for prev_section in previous_sections[-3:]:  # Only last 3 sections
                            section_id = prev_section.get('section', '')
                            section_content = prev_section.get('content', '')
                            if section_content:
                                # Include more context from previous sections
                                preview = section_content[:250].replace('\n', ' ').strip()
                                prompt += f"\nSection {section_id} covered:\n{preview}...\n"
                    
                    prompt += f"""
                    
                    STRICT INSTRUCTIONS:
                    1. Create content SPECIFICALLY for "{topic}" focusing on "{focus}"
                    2. Use information from the document context above
                    3. Write 350-450 tokens (about 3-4 paragraphs)
                    4. Each paragraph should be 3-4 sentences
                    5. Be conversational but informative
                    6. Include specific examples from the document when possible
                    7. CRITICAL: Do NOT repeat any concepts, examples, or explanations from previous sections
                    8. Build upon previous knowledge without restating it
                    9. Make this section unique and valuable on its own
                    
                    For section {subsection_id}, you should specifically:
                    """
                    
                    # Add section-specific instructions
                    if subsection_id == "1.1":
                        prompt += "- Welcome the student warmly and introduce the document's main topic\n- Explain why this material matters to them personally\n- Set expectations for what they'll learn"
                    elif subsection_id == "1.2":
                        prompt += "- Define key terms and concepts from the document\n- Use simple analogies to explain complex ideas\n- Focus on building foundational understanding"
                    elif subsection_id == "1.3":
                        prompt += "- Outline specific learning objectives\n- Connect objectives to real-world applications\n- Personalize goals based on their profile"
                    elif subsection_id == "1.4":
                        prompt += "- Provide a roadmap for studying this material\n- Suggest personalized learning strategies\n- Give tips specific to their learning style"
                    elif subsection_id == "2.1":
                        prompt += "- Explain the core principles in depth\n- Use examples directly from the document\n- Connect to what they learned in chapter 1"
                    elif subsection_id == "2.2":
                        prompt += "- Dive deeper into mechanisms and relationships\n- Analyze how components interact\n- Use technical details from the document"
                    elif subsection_id == "2.3":
                        prompt += "- Show practical applications\n- Provide real-world scenarios\n- Connect theory to practice"
                    elif subsection_id == "2.4":
                        prompt += "- Discuss advanced patterns and best practices\n- Highlight common pitfalls to avoid\n- Share expert insights"
                    elif subsection_id == "3.1":
                        prompt += "- Create a hands-on exercise\n- Provide step-by-step guidance\n- Include self-check questions"
                    elif subsection_id == "3.2":
                        prompt += "- Present a realistic case study\n- Walk through problem-solving process\n- Encourage critical thinking"
                    elif subsection_id == "3.3":
                        prompt += "- Share advanced tips and tricks\n- Discuss optimization strategies\n- Provide expert-level insights"
                    elif subsection_id == "3.4":
                        prompt += "- Suggest next learning steps\n- Connect to broader topics\n- Inspire continued growth"
                    
                    if regenerate:
                        prompt += "\n\nIMPORTANT: The student has requested NEW content for this section. Provide a COMPLETELY DIFFERENT perspective, examples, and explanations than what might have been generated before. Use different analogies, different examples, and a different approach while still covering the same topic."
                    
                    prompt += "\n\nBegin your response directly with the content, no titles or section headers:"
                    
                    # Build system message with context awareness
                    system_message = f"You are an expert educator personalizing content for a student. You adapt your teaching style to match their preferences. For this section on {topic}, focus on {focus}. Use natural, conversational language with varied paragraph structures."
                    
                    if previous_sections:
                        system_message += " IMPORTANT: You have been provided with previously generated sections. You must NOT repeat any content, examples, or explanations from those sections. Build upon them instead of duplicating information."
                    
                    # Stream response from OpenAI
                    # Use higher temperature for regeneration to get more varied content
                    temperature = 1.0 if regenerate else 0.8
                    
                    stream = openai_client.chat.completions.create(
                        model="gpt-4o",
                        messages=[
                            {"role": "system", "content": system_message},
                            {"role": "user", "content": prompt}
                        ],
                        stream=True,
                        temperature=temperature,  # Higher for regeneration
                        max_tokens=600
                    )
                    
                    # Buffer to batch tokens for better performance
                    token_buffer = ""
                    token_count = 0
                    
                    for chunk in stream:
                        if chunk.choices[0].delta.content:
                            token = chunk.choices[0].delta.content
                            token_buffer += token
                            token_count += 1
                            
                            # Send immediately for first few tokens (fast first paint)
                            # Then batch in groups of 5-10 for efficiency
                            if token_count <= 3 or len(token_buffer) >= 20:
                                yield f"data: {json.dumps({'type': 'token', 'content': token_buffer})}\n\n"
                                token_buffer = ""
                    
                    # Flush any remaining tokens
                    if token_buffer:
                        yield f"data: {json.dumps({'type': 'token', 'content': token_buffer})}\n\n"
                    
                    # Send completion signal
                    yield f"data: {json.dumps({'type': 'complete'})}\n\n"
                    
                except Exception as e:
                    logger.error(f"Error in streaming: {str(e)}", exc_info=True)
                    yield f"data: {json.dumps({'type': 'error', 'message': str(e)})}\n\n"
                finally:
                    db.close()
            
            return Response(generate(), mimetype='text/event-stream')
            
        except Exception as e:
            logger.error(f"Error in stream endpoint: {str(e)}", exc_info=True)
            return jsonify({'error': str(e)}), 500