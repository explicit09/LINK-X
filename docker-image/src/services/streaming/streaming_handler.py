"""
Streaming handler for Server-Sent Events (SSE)
"""
import json
import logging
from typing import Generator, Dict, Any, List, Optional, AsyncGenerator
from dataclasses import dataclass

logger = logging.getLogger(__name__)


@dataclass
class StreamEvent:
    """Represents a server-sent event"""
    type: str
    data: Dict[str, Any]
    
    def to_sse(self) -> str:
        """Convert to SSE format"""
        return f"data: {json.dumps({'type': self.type, **self.data})}\n\n"


class StreamingHandler:
    """Handles streaming content generation"""
    
    def __init__(self, openai_client):
        self.openai_client = openai_client
        self.logger = logging.getLogger(__name__)
    
    def send_start_event(self, chapter_id: str, subsection_id: str) -> str:
        """Send initial metadata event"""
        event = StreamEvent(
            type='start',
            data={'chapterId': chapter_id, 'subsectionId': subsection_id}
        )
        return event.to_sse()
    
    def send_token_event(self, content: str) -> str:
        """Send token content event"""
        event = StreamEvent(
            type='token',
            data={'content': content}
        )
        return event.to_sse()
    
    def send_complete_event(self) -> str:
        """Send completion event"""
        event = StreamEvent(
            type='complete',
            data={}
        )
        return event.to_sse()
    
    def send_error_event(self, message: str) -> str:
        """Send error event"""
        event = StreamEvent(
            type='error',
            data={'message': message}
        )
        return event.to_sse()
    
    def stream_content(
        self,
        prompt: str,
        system_message: str,
        temperature: float = 0.8,
        max_tokens: int = 600,
        model: str = "gpt-4o"
    ) -> Generator[str, None, None]:
        """Stream content from OpenAI"""
        try:
            # Create chat completion stream
            stream = self.openai_client.chat.completions.create(
                model=model,
                messages=[
                    {"role": "system", "content": system_message},
                    {"role": "user", "content": prompt}
                ],
                stream=True,
                temperature=temperature,
                max_tokens=max_tokens
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
                        yield self.send_token_event(token_buffer)
                        token_buffer = ""
            
            # Flush any remaining tokens
            if token_buffer:
                yield self.send_token_event(token_buffer)
            
            # Send completion signal
            yield self.send_complete_event()
            
        except Exception as e:
            self.logger.error(f"Error in streaming: {str(e)}", exc_info=True)
            yield self.send_error_event(str(e))
    
    def generate_personalized_stream(
        self,
        chapter_id: str,
        subsection_id: str,
        prompt: str,
        system_message: str,
        temperature: float = 0.8,
        max_tokens: int = 600,
        model: str = "gpt-4o"
    ) -> Generator[str, None, None]:
        """Generate complete personalized content stream"""
        try:
            # Send start event
            yield self.send_start_event(chapter_id, subsection_id)
            
            # Stream content
            yield from self.stream_content(
                prompt=prompt,
                system_message=system_message,
                temperature=temperature,
                max_tokens=max_tokens,
                model=model
            )
            
        except Exception as e:
            self.logger.error(f"Error in personalized stream: {str(e)}", exc_info=True)
            yield self.send_error_event(str(e))


class TokenBuffer:
    """Manages token buffering for optimal streaming performance"""
    
    def __init__(self, initial_burst: int = 3, batch_size: int = 20):
        self.initial_burst = initial_burst
        self.batch_size = batch_size
        self.buffer = ""
        self.token_count = 0
    
    def should_flush(self) -> bool:
        """Check if buffer should be flushed"""
        # Send immediately for first few tokens
        if self.token_count <= self.initial_burst:
            return True
        # Then batch for efficiency
        return len(self.buffer) >= self.batch_size
    
    def add_token(self, token: str) -> Optional[str]:
        """Add token to buffer and return content if should flush"""
        self.buffer += token
        self.token_count += 1
        
        if self.should_flush():
            content = self.buffer
            self.buffer = ""
            return content
        
        return None
    
    def flush(self) -> Optional[str]:
        """Force flush any remaining content"""
        if self.buffer:
            content = self.buffer
            self.buffer = ""
            return content
        return None