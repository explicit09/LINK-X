"""
Chat service for AI-powered conversations
"""

import time
from queue import Queue
from typing import Dict, Generator, Optional
from ..base import BaseChatService


class ChatService(BaseChatService):
    """Service for handling AI chat interactions"""
    
    def __init__(self, client):
        super().__init__(client)
    
    def generate_response(self, message: str, user_id: str, context: Dict, 
                         response_queue: Queue) -> None:
        """Generate streaming chat response"""
        try:
            # Build context-aware system prompt
            system_prompt = self._build_system_prompt(context)
            
            messages = [{"role": "system", "content": system_prompt}]
            
            # Add context if available
            if context.get('current_file'):
                messages.append({
                    "role": "system", 
                    "content": f"The student is currently studying: {context['current_file']}"
                })
            
            # Add conversation history if available
            if context.get('conversation_history'):
                messages.extend(context['conversation_history'][-5:])  # Last 5 messages
            
            messages.append({"role": "user", "content": message})
            
            # Stream response
            stream = self.client.create_chat_completion(
                model=self.client.default_model,
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
    
    def stream_personalized_content(self, prompt: str, system_message: str, 
                                   temperature: float = 0.8) -> Generator[Dict, None, None]:
        """Stream personalized content generation"""
        try:
            # Check if OpenAI is available
            if not self.client.is_available():
                # Return mock streaming data
                yield from self._mock_streaming_response()
                return
            
            # Stream response from OpenAI with optimized token batching
            stream = self.client.create_chat_completion(
                model=self.client.default_model,
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
    
    def _build_system_prompt(self, context: Dict) -> str:
        """Build context-aware system prompt"""
        base_prompt = """You are an AI learning assistant. 
        Help students understand concepts, answer questions, and provide guidance.
        Be encouraging, clear, and adaptive to their needs."""
        
        # Add student profile context
        if context.get('student_profile'):
            profile = context['student_profile']
            learning_style = profile.get('learning_style', 'visual')
            level = profile.get('level', 'intermediate')
            
            base_prompt += f"""
            
            Student Profile:
            - Learning Style: {learning_style}
            - Level: {level}
            - Adapt your responses to match their preferred learning style and level.
            """
        
        # Add course context
        if context.get('course_info'):
            course = context['course_info']
            base_prompt += f"""
            
            Course Context:
            - Course: {course.get('title', 'Unknown')}
            - Subject: {course.get('subject', 'General')}
            - Focus on helping with course-related questions.
            """
        
        return base_prompt
    
    def _mock_streaming_response(self) -> Generator[Dict, None, None]:
        """Generate mock streaming response when OpenAI is not available"""
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
    
    def generate_contextual_response(self, message: str, context: Dict) -> str:
        """Generate a single contextual response (non-streaming)"""
        try:
            system_prompt = self._build_system_prompt(context)
            
            response = self.client.create_chat_completion(
                model=self.client.default_model,
                messages=[
                    {"role": "system", "content": system_prompt},
                    {"role": "user", "content": message}
                ],
                temperature=0.7,
                max_tokens=300
            )
            
            return response.choices[0].message.content
            
        except Exception as e:
            return f"I apologize, but I'm having trouble generating a response right now. Error: {str(e)}"