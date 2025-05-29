from typing import List, Dict, Optional, Any, Generator
import openai
from openai import OpenAI
import json
import re
import time
from queue import Queue
import numpy as np
from sqlalchemy import text

from ..core.config import get_config
from ..core.cache import cache
from ..core.exceptions import ExternalServiceError

class AIService:
    """Service for AI-related operations"""
    
    def __init__(self):
        self.config = get_config()
        self.client = OpenAI(api_key=self.config.OPENAI_API_KEY)
        self.default_model = "gpt-4o"
        self.embedding_model = "text-embedding-ada-002"
    
    def generate_outline(self, content: str) -> Dict:
        """Generate document outline from content"""
        try:
            # Check cache
            cache_key = f"outline:{hash(content)}"
            cached = cache.get(cache_key)
            if cached:
                return cached
            
            # If no OpenAI API key, return mock outline
            if not self.config.OPENAI_API_KEY or self.config.OPENAI_API_KEY.strip() in ["", "your-openai-api-key-here"]:
                mock_outline = {
                    "title": "Document Overview",
                    "chapters": [
                        {
                            "id": "chapter-1",
                            "title": "Introduction",
                            "subsections": [
                                {
                                    "id": "subsection-1-1",
                                    "title": "Getting Started"
                                }
                            ]
                        },
                        {
                            "id": "chapter-2",
                            "title": "Main Content",
                            "subsections": [
                                {
                                    "id": "subsection-2-1",
                                    "title": "Key Concepts"
                                },
                                {
                                    "id": "subsection-2-2",
                                    "title": "Examples"
                                }
                            ]
                        },
                        {
                            "id": "chapter-3",
                            "title": "Summary",
                            "subsections": []
                        }
                    ]
                }
                cache.set(cache_key, mock_outline, timeout=3600)
                return mock_outline
            
            prompt = f"""
            Analyze the following content and generate a structured outline.
            Return a JSON object with the following structure:
            {{
                "title": "Document Title",
                "chapters": [
                    {{
                        "id": "chapter-1",
                        "title": "Chapter Title",
                        "subsections": [
                            {{
                                "id": "subsection-1-1",
                                "title": "Subsection Title"
                            }}
                        ]
                    }}
                ]
            }}
            
            Content:
            {content[:3000]}...
            """
            
            response = self.client.chat.completions.create(
                model=self.default_model,
                messages=[
                    {"role": "system", "content": "You are a helpful assistant that creates document outlines."},
                    {"role": "user", "content": prompt}
                ],
                temperature=0.3,
                response_format={"type": "json_object"}
            )
            
            outline = json.loads(response.choices[0].message.content)
            
            # Cache for 1 hour
            cache.set(cache_key, outline, timeout=3600)
            
            return outline
            
        except Exception as e:
            raise ExternalServiceError(f"Failed to generate outline: {str(e)}")
    
    def generate_examples(self, content: str, student_profile: Optional[Dict] = None) -> List[Dict]:
        """Generate examples based on content and student profile"""
        try:
            profile_context = ""
            if student_profile:
                profile_context = f"""
                Student Profile:
                - Learning Style: {student_profile.get('learning_style', 'general')}
                - Grade Level: {student_profile.get('grade_level', 'college')}
                - Preferences: {student_profile.get('onboard_answers', {})}
                """
            
            prompt = f"""
            Generate 3 practical examples that illustrate the following concept.
            Make the examples relevant and easy to understand.
            {profile_context}
            
            Concept:
            {content[:1000]}
            
            Return a JSON array of examples, each with:
            {{
                "title": "Example Title",
                "description": "Clear description",
                "code": "Code example if applicable",
                "explanation": "Why this example works"
            }}
            """
            
            response = self.client.chat.completions.create(
                model=self.default_model,
                messages=[
                    {"role": "system", "content": "You are an educational content creator."},
                    {"role": "user", "content": prompt}
                ],
                temperature=0.7,
                response_format={"type": "json_object"}
            )
            
            result = json.loads(response.choices[0].message.content)
            return result.get('examples', [])
            
        except Exception as e:
            return []  # Return empty list on error
    
    def generate_quiz(self, content: str, difficulty: str = 'medium', count: int = 5) -> List[Dict]:
        """Generate quiz questions from content"""
        try:
            difficulty_prompt = {
                'easy': 'Create simple, straightforward questions focusing on basic facts and definitions.',
                'medium': 'Create questions that require understanding and application of concepts.',
                'hard': 'Create challenging questions that require analysis, synthesis, and critical thinking.'
            }
            
            prompt = f"""
            Generate {count} multiple choice quiz questions based on the following content.
            {difficulty_prompt.get(difficulty, difficulty_prompt['medium'])}
            
            Content:
            {content[:3000]}
            
            Return a JSON array where each question has:
            {{
                "question": "The question text",
                "options": ["A) Option 1", "B) Option 2", "C) Option 3", "D) Option 4"],
                "correct": "B",
                "explanation": "Why this answer is correct"
            }}
            """
            
            response = self.client.chat.completions.create(
                model=self.default_model,
                messages=[
                    {"role": "system", "content": "You are an educational quiz creator."},
                    {"role": "user", "content": prompt}
                ],
                temperature=0.5,
                response_format={"type": "json_object"}
            )
            
            result = json.loads(response.choices[0].message.content)
            return result.get('questions', [])
            
        except Exception as e:
            raise ExternalServiceError(f"Failed to generate quiz: {str(e)}")
    
    def generate_brief_summary(self, content: str) -> List[Dict]:
        """Generate a brief summary of content"""
        try:
            prompt = f"""
            Create a brief summary (3-5 key points) of the following content.
            Focus on the most important concepts.
            
            Content:
            {content[:4000]}
            
            Return a JSON array of key points:
            [
                {{
                    "point": "Key point text",
                    "importance": "Why this matters"
                }}
            ]
            """
            
            response = self.client.chat.completions.create(
                model=self.default_model,
                messages=[
                    {"role": "system", "content": "You are a concise educational summarizer."},
                    {"role": "user", "content": prompt}
                ],
                temperature=0.3,
                response_format={"type": "json_object"}
            )
            
            result = json.loads(response.choices[0].message.content)
            return result.get('summary', [])
            
        except Exception as e:
            return [{"point": "Summary generation failed", "importance": str(e)}]
    
    def generate_detailed_summary(self, content: str) -> List[Dict]:
        """Generate a detailed summary with sections"""
        try:
            prompt = f"""
            Create a detailed summary of the following content.
            Organize it into logical sections with explanations.
            
            Content:
            {content[:6000]}
            
            Return a JSON array of sections:
            [
                {{
                    "title": "Section Title",
                    "content": "Detailed explanation",
                    "key_concepts": ["concept1", "concept2"]
                }}
            ]
            """
            
            response = self.client.chat.completions.create(
                model=self.default_model,
                messages=[
                    {"role": "system", "content": "You are a thorough educational summarizer."},
                    {"role": "user", "content": prompt}
                ],
                temperature=0.3,
                response_format={"type": "json_object"}
            )
            
            result = json.loads(response.choices[0].message.content)
            return result.get('sections', [])
            
        except Exception as e:
            return []
    
    def generate_key_points(self, content: str) -> List[Dict]:
        """Extract key points from content"""
        try:
            prompt = f"""
            Extract the key learning points from this content.
            Focus on actionable knowledge and important concepts.
            
            Content:
            {content[:4000]}
            
            Return a JSON array of key points:
            [
                {{
                    "title": "Point Title",
                    "description": "Clear explanation",
                    "category": "concept/fact/skill/principle"
                }}
            ]
            """
            
            response = self.client.chat.completions.create(
                model=self.default_model,
                messages=[
                    {"role": "system", "content": "You are an educational content analyzer."},
                    {"role": "user", "content": prompt}
                ],
                temperature=0.3,
                response_format={"type": "json_object"}
            )
            
            result = json.loads(response.choices[0].message.content)
            return result.get('points', [])
            
        except Exception as e:
            return []
    
    def split_into_sections(self, content: str) -> List[str]:
        """Split content into logical sections"""
        # Simple implementation - split by paragraphs or headers
        sections = []
        
        # Try to split by markdown headers first
        header_pattern = r'^#{1,3}\s+.+$'
        parts = re.split(header_pattern, content, flags=re.MULTILINE)
        
        if len(parts) > 1:
            sections = [part.strip() for part in parts if part.strip()]
        else:
            # Fall back to paragraph splitting
            paragraphs = content.split('\n\n')
            # Group paragraphs into sections of ~500 words
            current_section = []
            current_word_count = 0
            
            for para in paragraphs:
                word_count = len(para.split())
                if current_word_count + word_count > 500 and current_section:
                    sections.append('\n\n'.join(current_section))
                    current_section = [para]
                    current_word_count = word_count
                else:
                    current_section.append(para)
                    current_word_count += word_count
            
            if current_section:
                sections.append('\n\n'.join(current_section))
        
        return sections
    
    def personalize_content(self, content: str, profile: Optional[Dict] = None, 
                          learning_style: str = 'default') -> Dict:
        """Personalize content based on user profile and learning style"""
        try:
            style_prompts = {
                'visual': 'Add visual descriptions, diagrams, and spatial relationships.',
                'auditory': 'Include sound-based examples and verbal explanations.',
                'kinesthetic': 'Add hands-on activities and physical examples.',
                'default': 'Use a balanced approach with various learning methods.'
            }
            
            profile_context = ""
            if profile:
                profile_context = f"""
                Learner Profile:
                - Preferred Learning: {profile.get('learning_style', 'general')}
                - Background: {profile.get('onboard_answers', {})}
                - Quiz Preference: {profile.get('want_quizzes', True)}
                """
            
            prompt = f"""
            Personalize the following educational content.
            {style_prompts.get(learning_style, style_prompts['default'])}
            {profile_context}
            
            Original Content:
            {content}
            
            Return a JSON object with:
            {{
                "content": "Personalized content",
                "additions": ["Additional examples or explanations"],
                "style": "Learning style applied"
            }}
            """
            
            response = self.client.chat.completions.create(
                model=self.default_model,
                messages=[
                    {"role": "system", "content": "You are a personalized learning assistant."},
                    {"role": "user", "content": prompt}
                ],
                temperature=0.6,
                response_format={"type": "json_object"}
            )
            
            return json.loads(response.choices[0].message.content)
            
        except Exception as e:
            # Return original content on error
            return {
                "content": content,
                "additions": [],
                "style": "original"
            }
    
    def generate_chat_response(self, message: str, user_id: str, context: Dict, 
                             response_queue: Queue) -> None:
        """Generate streaming chat response"""
        try:
            # Build context from user's current learning
            system_prompt = """You are an AI learning assistant. 
            Help students understand concepts, answer questions, and provide guidance.
            Be encouraging, clear, and adaptive to their needs."""
            
            messages = [
                {"role": "system", "content": system_prompt}
            ]
            
            # Add context if available
            if context.get('current_file'):
                messages.append({
                    "role": "system", 
                    "content": f"The student is currently studying: {context['current_file']}"
                })
            
            messages.append({"role": "user", "content": message})
            
            # Stream response
            stream = self.client.chat.completions.create(
                model=self.default_model,
                messages=messages,
                temperature=0.7,
                stream=True
            )
            
            for chunk in stream:
                if chunk.choices[0].delta.content:
                    response_queue.put({
                        'type': 'content',
                        'data': chunk.choices[0].delta.content
                    })
            
            # Signal end of stream
            response_queue.put(None)
            
        except Exception as e:
            response_queue.put({
                'type': 'error',
                'message': str(e)
            })
            response_queue.put(None)
    
    def stream_personalized_content(self, prompt: str, system_message: str, temperature: float = 0.8) -> Generator[Dict, None, None]:
        """Stream personalized content generation"""
        try:
            # Check if OpenAI is available
            if not self.config.OPENAI_API_KEY or self.config.OPENAI_API_KEY.strip() in ["", "your-openai-api-key-here"]:
                # Return mock streaming data
                mock_content = """This is a personalized learning section tailored to your learning style and interests. 

The content has been customized based on your profile and preferences to help you understand the material more effectively.

This section builds upon previous concepts while introducing new ideas that align with your learning objectives."""
                
                # Simulate streaming by yielding chunks
                words = mock_content.split()
                for i in range(0, len(words), 3):
                    chunk = ' '.join(words[i:i+3]) + ' '
                    yield {'type': 'token', 'content': chunk}
                    time.sleep(0.1)
                
                yield {'type': 'complete'}
                return
            
            # Stream response from OpenAI
            stream = self.client.chat.completions.create(
                model=self.default_model,
                messages=[
                    {"role": "system", "content": system_message},
                    {"role": "user", "content": prompt}
                ],
                stream=True,
                temperature=temperature,
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
                        yield {'type': 'token', 'content': token_buffer}
                        token_buffer = ""
            
            # Flush any remaining tokens
            if token_buffer:
                yield {'type': 'token', 'content': token_buffer}
            
            # Send completion signal
            yield {'type': 'complete'}
            
        except Exception as e:
            yield {'type': 'error', 'message': str(e)}

    def generate_embeddings(self, text: str) -> List[float]:
        """Generate embeddings for text"""
        try:
            response = self.client.embeddings.create(
                model=self.embedding_model,
                input=text
            )
            return response.data[0].embedding
        except Exception as e:
            raise ExternalServiceError(f"Failed to generate embeddings: {str(e)}")


# Standalone function for backward compatibility
def retrieve_chunks_pgvector(db_session, query_embedding, course_id=None, file_id=None, limit=15, similarity_threshold=0.3):
    """
    Retrieve relevant chunks using pgvector with proper CTE optimization.
    
    Args:
        db_session: SQLAlchemy session
        query_embedding: Query embedding vector
        course_id: Optional course ID filter
        file_id: Optional file ID filter
        limit: Number of results to return
        similarity_threshold: Minimum similarity score
    
    Returns:
        List of chunk dictionaries
    """
    # Convert numpy array to list for PostgreSQL
    if isinstance(query_embedding, np.ndarray):
        query_embedding = query_embedding.tolist()
    
    # Build query with CTE for optimization
    query = """
    WITH q AS (SELECT :query_vec::vector AS v)
    SELECT 
        fc.content,
        fc.chunk_index,
        fc.chunk_metadata,
        f.title as file_title,
        f.filename,
        m.title as module_title,
        1 - (fc.embedding <=> q.v) AS similarity
    FROM q
    JOIN "FileChunk" fc ON TRUE
    JOIN "File" f ON fc.file_id = f.id
    JOIN "Module" m ON f.module_id = m.id
    WHERE 1=1
    """
    
    params = {"query_vec": query_embedding}
    
    if course_id:
        query += " AND fc.course_id = :course_id"
        params["course_id"] = course_id
        
    if file_id:
        query += " AND fc.file_id = :file_id"
        params["file_id"] = file_id
        
    query += """
    AND 1 - (fc.embedding <=> q.v) > :similarity_threshold
    ORDER BY fc.embedding <=> q.v
    LIMIT :limit
    """
    
    params["similarity_threshold"] = similarity_threshold
    params["limit"] = limit
    
    result = db_session.execute(text(query), params)
    
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