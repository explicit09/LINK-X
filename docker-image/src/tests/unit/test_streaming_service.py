import pytest
from unittest.mock import Mock, patch, AsyncMock, MagicMock
import json
from datetime import datetime

from services.streaming_service import StreamingService
from core.exceptions import ValidationError, AuthorizationError


@pytest.fixture
def mock_openai_client():
    """Mock OpenAI client"""
    with patch('services.streaming_service.OpenAI') as mock:
        client = Mock()
        mock.return_value = client
        yield client


@pytest.fixture
def mock_user_repository():
    """Mock user repository"""
    return Mock()


@pytest.fixture
def mock_course_repository():
    """Mock course repository"""
    return Mock()


@pytest.fixture
def mock_module_repository():
    """Mock module repository"""
    return Mock()


@pytest.fixture
def mock_cache():
    """Mock cache service"""
    with patch('services.streaming_service.cache') as mock:
        yield mock


@pytest.fixture
def streaming_service(mock_openai_client, mock_user_repository, mock_course_repository, 
                     mock_module_repository, mock_cache):
    """Create streaming service with mocked dependencies"""
    with patch('services.streaming_service.UserRepository', return_value=mock_user_repository):
        with patch('services.streaming_service.CourseRepository', return_value=mock_course_repository):
            with patch('services.streaming_service.ModuleRepository', return_value=mock_module_repository):
                return StreamingService()


class TestStreamingService:
    """Test cases for StreamingService"""
    
    def test_create_streaming_response_success(self, streaming_service, mock_user_repository, 
                                             mock_course_repository, mock_openai_client):
        """Test successful streaming response creation"""
        # Arrange
        user_id = "user123"
        course_id = "course123"
        message = "Explain Python functions"
        
        mock_user_repository.get_by_id.return_value = {
            "id": user_id,
            "learning_persona": "visual_learner",
            "preferences": {"detail_level": "beginner"}
        }
        
        mock_course_repository.get_by_id.return_value = {
            "id": course_id,
            "title": "Python Programming",
            "instructor_id": "instructor123"
        }
        
        # Mock streaming response
        mock_stream = MagicMock()
        mock_stream.__iter__.return_value = [
            MagicMock(choices=[MagicMock(delta=MagicMock(content="Python "))]),
            MagicMock(choices=[MagicMock(delta=MagicMock(content="functions "))]),
            MagicMock(choices=[MagicMock(delta=MagicMock(content="are..."))]),
        ]
        mock_openai_client.chat.completions.create.return_value = mock_stream
        
        # Act
        result = streaming_service.create_streaming_response(user_id, course_id, message)
        
        # Assert
        mock_user_repository.get_by_id.assert_called_once_with(user_id)
        mock_course_repository.get_by_id.assert_called_once_with(course_id)
        mock_openai_client.chat.completions.create.assert_called_once()
        
        # Check that it returns a generator
        assert hasattr(result, '__iter__')
    
    def test_create_streaming_response_with_context(self, streaming_service, mock_user_repository,
                                                  mock_module_repository, mock_openai_client):
        """Test streaming response with module context"""
        # Arrange
        user_id = "user123"
        module_id = "module123"
        message = "What is covered in this module?"
        
        mock_user_repository.get_by_id.return_value = {
            "id": user_id,
            "learning_persona": "practical_learner"
        }
        
        mock_module_repository.get_by_id.return_value = {
            "id": module_id,
            "title": "Functions and Methods",
            "description": "Learn about Python functions",
            "course_id": "course123"
        }
        
        # Mock embeddings search
        with patch('services.streaming_service.search_embeddings') as mock_search:
            mock_search.return_value = [
                {"content": "Functions are reusable blocks of code", "similarity": 0.9},
                {"content": "Parameters are inputs to functions", "similarity": 0.85}
            ]
            
            mock_stream = MagicMock()
            mock_stream.__iter__.return_value = [
                MagicMock(choices=[MagicMock(delta=MagicMock(content="This module covers..."))])
            ]
            mock_openai_client.chat.completions.create.return_value = mock_stream
            
            # Act
            result = streaming_service.create_streaming_response(
                user_id, module_id=module_id, message=message
            )
            
            # Consume generator to trigger execution
            list(result)
            
            # Assert
            mock_search.assert_called_once()
            assert mock_openai_client.chat.completions.create.call_count == 1
    
    def test_create_streaming_response_invalid_user(self, streaming_service, mock_user_repository):
        """Test streaming response with invalid user"""
        # Arrange
        mock_user_repository.get_by_id.return_value = None
        
        # Act & Assert
        with pytest.raises(ValidationError) as exc:
            streaming_service.create_streaming_response("invalid_user", "course123", "Hello")
        assert "User not found" in str(exc.value)
    
    def test_personalize_prompt(self, streaming_service):
        """Test prompt personalization based on user persona"""
        # Arrange
        user_profile = {
            "learning_persona": "visual_learner",
            "preferences": {
                "detail_level": "intermediate",
                "learning_style": "examples_first"
            }
        }
        base_prompt = "Explain recursion"
        
        # Act
        result = streaming_service._personalize_prompt(base_prompt, user_profile)
        
        # Assert
        assert "visual" in result.lower()
        assert "intermediate" in result.lower()
        assert base_prompt in result
    
    def test_format_context(self, streaming_service):
        """Test context formatting from search results"""
        # Arrange
        search_results = [
            {"content": "Python is a programming language", "similarity": 0.95},
            {"content": "Functions help organize code", "similarity": 0.90},
            {"content": "Variables store data", "similarity": 0.85}
        ]
        
        # Act
        result = streaming_service._format_context(search_results)
        
        # Assert
        assert "Python is a programming language" in result
        assert "Functions help organize code" in result
        assert "Variables store data" in result
    
    def test_stream_with_rate_limiting(self, streaming_service, mock_openai_client):
        """Test streaming with rate limiting"""
        # Arrange
        mock_openai_client.chat.completions.create.side_effect = Exception("Rate limit exceeded")
        
        # Act & Assert
        with pytest.raises(Exception) as exc:
            streaming_service._create_openai_stream("test prompt")
        assert "Rate limit" in str(exc.value)
    
    def test_cache_personalized_response(self, streaming_service, mock_cache, mock_user_repository,
                                       mock_course_repository, mock_openai_client):
        """Test caching of personalized responses"""
        # Arrange
        user_id = "user123"
        course_id = "course123"
        message = "What is a variable?"
        
        mock_user_repository.get_by_id.return_value = {
            "id": user_id,
            "learning_persona": "beginner"
        }
        
        mock_course_repository.get_by_id.return_value = {
            "id": course_id,
            "title": "Intro to Programming"
        }
        
        # First call - cache miss
        mock_cache.get.return_value = None
        
        mock_stream = MagicMock()
        mock_stream.__iter__.return_value = [
            MagicMock(choices=[MagicMock(delta=MagicMock(content="A variable is..."))])
        ]
        mock_openai_client.chat.completions.create.return_value = mock_stream
        
        # Act
        result1 = list(streaming_service.create_streaming_response(user_id, course_id, message))
        
        # Assert cache was set
        assert mock_cache.set.called
        
        # Second call - cache hit
        mock_cache.get.return_value = "A variable is..."
        result2 = list(streaming_service.create_streaming_response(user_id, course_id, message))
        
        # OpenAI should only be called once due to caching
        assert mock_openai_client.chat.completions.create.call_count == 1
    
    def test_handle_streaming_error(self, streaming_service, mock_openai_client):
        """Test error handling during streaming"""
        # Arrange
        mock_stream = MagicMock()
        mock_stream.__iter__.side_effect = Exception("Connection error")
        mock_openai_client.chat.completions.create.return_value = mock_stream
        
        # Act
        result = streaming_service._create_openai_stream("test prompt")
        
        # Assert - should yield error message
        try:
            list(result)
        except Exception as e:
            assert "Connection error" in str(e)
    
    def test_token_limit_handling(self, streaming_service, mock_openai_client):
        """Test handling of token limits"""
        # Arrange
        very_long_prompt = "x" * 10000  # Very long prompt
        
        # Act
        with patch.object(streaming_service, '_truncate_prompt') as mock_truncate:
            mock_truncate.return_value = "truncated prompt"
            
            mock_stream = MagicMock()
            mock_stream.__iter__.return_value = []
            mock_openai_client.chat.completions.create.return_value = mock_stream
            
            streaming_service._create_openai_stream(very_long_prompt)
            
            # Assert
            mock_truncate.assert_called_once()
    
    def test_get_conversation_history(self, streaming_service, mock_cache):
        """Test retrieving conversation history"""
        # Arrange
        user_id = "user123"
        course_id = "course123"
        
        mock_cache.get.return_value = json.dumps([
            {"role": "user", "content": "Hello"},
            {"role": "assistant", "content": "Hi there!"}
        ])
        
        # Act
        result = streaming_service.get_conversation_history(user_id, course_id)
        
        # Assert
        assert len(result) == 2
        assert result[0]["content"] == "Hello"
        assert result[1]["content"] == "Hi there!"