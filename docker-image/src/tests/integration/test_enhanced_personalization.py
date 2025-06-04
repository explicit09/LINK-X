"""
Integration tests for enhanced personalization system
"""
import pytest
import json
import asyncio
from unittest.mock import Mock, patch
from datetime import datetime

from services.personalization_integration import PersonalizationIntegrationService
from services.document_outline_generator import DocumentOutlineGenerator
from db.schema import StudentProfile, File, Module, Course, Chunk, User
from repositories.user_repository import UserRepository


class TestEnhancedPersonalization:
    """Test suite for enhanced personalization integration"""
    
    @pytest.fixture
    def mock_db_session(self):
        """Create a mock database session"""
        session = Mock()
        return session
    
    @pytest.fixture
    def mock_student_profile(self):
        """Create a mock student profile"""
        profile = Mock(spec=StudentProfile)
        profile.user_id = 'test-user-123'
        profile.onboard_answers = {
            'learningStyle': 'visual',
            'depth': 'intermediate',
            'interests': ['technology', 'science'],
            'goals': ['career advancement'],
            'availability': '1-2 hours daily',
            'background': 'Computer Science student'
        }
        profile.created_at = datetime.utcnow()
        return profile
    
    @pytest.fixture
    def mock_file(self):
        """Create a mock file"""
        file = Mock(spec=File)
        file.id = 'test-file-123'
        file.filename = 'test_document.pdf'
        file.file_type = 'pdf'
        file.module_id = 'test-module-123'
        file.s3_key = 'courses/test/test_document.pdf'
        return file
    
    @pytest.fixture
    def integration_service(self, mock_db_session):
        """Create personalization integration service"""
        with patch('services.personalization_integration.get_enhanced_personalization_engine'):
            with patch('services.personalization_integration.FastPathProcessor'):
                with patch('services.personalization_integration.MicroAgentOrchestrator'):
                    service = PersonalizationIntegrationService(mock_db_session)
                    return service
    
    def test_map_student_profile(self, integration_service, mock_student_profile):
        """Test student profile mapping"""
        mapped = integration_service.map_student_profile(mock_student_profile)
        
        assert mapped['user_id'] == 'test-user-123'
        assert mapped['learning_style'] == 'visual'
        assert mapped['expertise_level'] == 'intermediate'
        assert mapped['interests'] == ['technology', 'science']
        assert mapped['goals'] == ['career advancement']
        assert mapped['time_availability'] == '1-2 hours daily'
        assert mapped['background_knowledge'] == 'Computer Science student'
    
    @pytest.mark.asyncio
    async def test_generate_document_outline(self, integration_service, mock_db_session, mock_file):
        """Test document outline generation"""
        # Mock chunk data
        mock_chunks = [
            Mock(chunk_index=0, content="# Introduction\nThis is the introduction"),
            Mock(chunk_index=1, content="## Chapter 1: Basics\nBasic concepts"),
            Mock(chunk_index=2, content="### Section 1.1: Getting Started\nHow to begin"),
            Mock(chunk_index=3, content="## Chapter 2: Advanced\nAdvanced topics"),
        ]
        
        mock_db_session.execute.return_value.scalars.return_value.all.return_value = mock_chunks
        
        # Generate outline
        outline = await integration_service.generate_document_outline('test-file-123')
        
        assert len(outline) > 0
        assert outline[0]['title'] == 'Introduction'
        assert outline[0]['level'] == 1
        assert 'anchor' in outline[0]
        assert 'keywords' in outline[0]
    
    @pytest.mark.asyncio
    async def test_personalize_simple_section(self, integration_service, mock_db_session):
        """Test personalization of simple section"""
        section = {
            'title': 'Introduction',
            'level': 1,
            'chunk_start': 0,
            'chunk_end': 0,
            'anchor': 'introduction',
            'content_preview': 'This is the introduction'
        }
        
        student_profile = {
            'learning_style': 'visual',
            'expertise_level': 'beginner',
            'interests': ['technology']
        }
        
        # Mock chunks
        mock_chunk = Mock(content="This is a simple introduction to the topic.")
        mock_db_session.execute.return_value.scalars.return_value.all.return_value = [mock_chunk]
        
        # Mock fast path processor response
        integration_service.fast_path_processor.process_question.return_value = {
            'answer': 'Personalized introduction content',
            'confidence': 0.9,
            'sources': []
        }
        
        result = await integration_service.personalize_section(
            'test-file-123', section, student_profile
        )
        
        assert 'section_id' in result
        assert 'content' in result
        assert result['section_id'] == 'introduction'
    
    @pytest.mark.asyncio
    async def test_personalize_complex_section(self, integration_service, mock_db_session):
        """Test personalization of complex section"""
        section = {
            'title': 'Advanced Machine Learning Algorithms',
            'level': 2,
            'chunk_start': 5,
            'chunk_end': 8,
            'anchor': 'advanced-ml',
            'content_preview': 'Complex ML algorithms and implementations'
        }
        
        student_profile = {
            'learning_style': 'practical',
            'expertise_level': 'advanced',
            'interests': ['machine learning', 'AI'],
            'goals': ['research']
        }
        
        # Mock chunks with substantial content
        mock_chunks = [
            Mock(content="Neural networks are complex systems..."),
            Mock(content="Deep learning architectures include..."),
            Mock(content="Optimization algorithms for training..."),
            Mock(content="Practical implementation considerations...")
        ]
        mock_db_session.execute.return_value.scalars.return_value.all.return_value = mock_chunks
        
        # Mock micro-agent response
        integration_service.micro_agent.process_complex_request.return_value = {
            'response': 'Detailed personalized content about ML algorithms',
            'confidence': 0.85,
            'reasoning_steps': ['analyze', 'personalize', 'optimize']
        }
        
        result = await integration_service.personalize_section(
            'test-file-123', section, student_profile, {'course_name': 'Advanced ML'}
        )
        
        assert 'content' in result
        assert 'personalization_score' in result
    
    @pytest.mark.asyncio
    async def test_stream_personalized_content(self, integration_service, mock_db_session, 
                                               mock_student_profile, mock_file):
        """Test streaming personalized content"""
        # Setup mocks
        mock_db_session.execute.return_value.scalar_one_or_none.side_effect = [
            mock_student_profile,  # First call returns student profile
            mock_file,  # Second call returns file
            Mock(course_id='test-course'),  # Module
            Mock(name='Test Course', description='A test course')  # Course
        ]
        
        # Mock chunks for outline
        mock_chunks = [
            Mock(chunk_index=0, content="# Introduction\nIntro content"),
            Mock(chunk_index=1, content="## Section 1\nSection content"),
        ]
        mock_db_session.execute.return_value.scalars.return_value.all.return_value = mock_chunks
        
        # Mock personalization responses
        integration_service.fast_path_processor.process_question.return_value = {
            'answer': 'Personalized content',
            'confidence': 0.9
        }
        
        # Collect streamed events
        events = []
        async for event in integration_service.stream_personalized_content('test-file-123', 'test-user-123'):
            events.append(event)
            if len(events) > 10:  # Prevent infinite loop
                break
        
        # Verify events
        assert len(events) > 0
        assert events[0]['type'] == 'outline'
        assert any(e['type'] == 'content' for e in events)
    
    def test_section_classification(self, integration_service):
        """Test simple vs complex section classification"""
        simple_section = {
            'title': 'Introduction',
            'content_preview': 'Brief intro'
        }
        simple_content = "This is a short introduction to the topic."
        
        complex_section = {
            'title': 'Advanced Neural Network Architectures',
            'content_preview': 'Complex technical content'
        }
        complex_content = " ".join(["Complex content"] * 100)  # 200 words
        
        assert integration_service._is_simple_section(simple_content, simple_section) == True
        assert integration_service._is_simple_section(complex_content, complex_section) == False
    
    @pytest.mark.asyncio
    async def test_error_handling(self, integration_service, mock_db_session):
        """Test error handling in personalization"""
        # Mock database error
        mock_db_session.execute.side_effect = Exception("Database error")
        
        events = []
        async for event in integration_service.stream_personalized_content('test-file-123', 'test-user-123'):
            events.append(event)
            if event['type'] == 'error':
                break
        
        assert len(events) > 0
        assert events[0]['type'] == 'error'
        assert 'Database error' in events[0]['data']
    
    @pytest.mark.asyncio
    async def test_natural_personalization_style(self, integration_service, mock_db_session):
        """Test that personalization uses natural language without forced transitions"""
        section = {
            'title': 'Data Structures',
            'level': 2,
            'chunk_start': 0,
            'chunk_end': 0,
            'anchor': 'data-structures',
            'content_preview': 'Introduction to data structures'
        }
        
        student_profile = {
            'learning_style': 'visual',
            'expertise_level': 'beginner',
            'interests': ['gaming', 'web development'],
            'background_knowledge': 'Some programming experience'
        }
        
        # Mock chunk
        mock_chunk = Mock(content="Data structures are ways to organize and store data.")
        mock_db_session.execute.return_value.scalars.return_value.all.return_value = [mock_chunk]
        
        # Mock personalization response
        personalized_content = """
        Data structures are like the storage systems in your favorite games. 
        Just as a game needs to efficiently store player stats, inventory items, 
        and world data, your programs need smart ways to organize information.
        
        Think of an array as a row of storage boxes, each numbered so you can 
        quickly grab what you need. In web development, you might use arrays 
        to store a list of user comments or product items.
        """
        
        integration_service.fast_path_processor.process_question.return_value = {
            'answer': personalized_content,
            'confidence': 0.9
        }
        
        result = await integration_service.personalize_section(
            'test-file-123', section, student_profile
        )
        
        # Verify natural language style
        assert 'since you' not in result['content'].lower()
        assert 'given your interest' not in result['content'].lower()
        assert 'gaming' in result['content'].lower() or 'game' in result['content'].lower()