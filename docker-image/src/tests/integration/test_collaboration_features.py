"""
Integration tests for collaborative learning features
Tests the full flow of study groups, annotations, discussions, and collaborative notes
"""

import pytest
import json
from uuid import UUID, uuid4
from datetime import datetime
from unittest.mock import patch, MagicMock

from tests.conftest_unified import client, db_session
from db.schema import (
    StudyGroup, StudyGroupMember, SharedAnnotation, PeerDiscussion,
    DiscussionReply, CollaborativeNote, UserCollaborationPreferences,
    User, Course, File
)


@pytest.fixture
def sample_course(db_session):
    """Create a sample course for testing"""
    course = Course(
        title="Test Course",
        description="A test course for collaboration",
        allow_collaboration=True,
        collaboration_settings={
            "allow_study_groups": True,
            "allow_public_annotations": False,
            "max_group_size": 10
        }
    )
    db_session.add(course)
    db_session.commit()
    return course


@pytest.fixture
def sample_file(db_session, sample_course):
    """Create a sample file for testing"""
    file = File(
        title="Test Document",
        filename="test.pdf",
        file_type="application/pdf",
        file_size=1024,
        storage_type="database",
        module_id=uuid4()  # Would be linked to actual module in real scenario
    )
    db_session.add(file)
    db_session.commit()
    return file


@pytest.fixture
def sample_users(db_session):
    """Create sample users for testing"""
    users = []
    for i in range(3):
        user = User(
            email=f"testuser{i}@example.com",
            password="hashedpassword",
            firebase_uid=f"firebase_uid_{i}",
            collaboration_enabled=True
        )
        db_session.add(user)
        users.append(user)
    
    db_session.commit()
    return users


class TestStudyGroupManagement:
    """Test study group creation, joining, and management"""
    
    def test_create_study_group(self, client, sample_course, sample_users):
        """Test creating a new study group"""
        user = sample_users[0]
        
        with patch('core.decorators_unified.verify_firebase_token') as mock_verify:
            mock_verify.return_value = {'uid': user.firebase_uid}
            
            response = client.post('/api/v2/collaboration/study-groups', 
                                 json={
                                     'course_id': str(sample_course.id),
                                     'name': 'Test Study Group',
                                     'description': 'A group for testing',
                                     'is_public': True,
                                     'max_members': 5
                                 },
                                 headers={'Authorization': 'Bearer fake_token'})
        
        assert response.status_code == 201
        data = response.get_json()
        assert data['status'] == 'success'
        assert data['data']['name'] == 'Test Study Group'
        assert data['data']['is_public'] is True
        assert data['data']['max_members'] == 5
        assert 'invite_code' in data['data']
    
    def test_join_study_group_by_id(self, client, db_session, sample_course, sample_users):
        """Test joining a study group by ID"""
        creator = sample_users[0]
        joiner = sample_users[1]
        
        # Create study group
        study_group = StudyGroup(
            name="Test Group",
            course_id=sample_course.id,
            created_by=creator.id,
            is_public=True,
            max_members=10,
            invite_code="TESTCODE"
        )
        db_session.add(study_group)
        db_session.commit()
        
        # Add creator as admin
        creator_member = StudyGroupMember(
            group_id=study_group.id,
            user_id=creator.id,
            role='admin'
        )
        db_session.add(creator_member)
        db_session.commit()
        
        # Test joining
        with patch('core.decorators_unified.verify_firebase_token') as mock_verify:
            mock_verify.return_value = {'uid': joiner.firebase_uid}
            
            response = client.post('/api/v2/collaboration/study-groups/join',
                                 json={'group_id': str(study_group.id)},
                                 headers={'Authorization': 'Bearer fake_token'})
        
        assert response.status_code == 200
        data = response.get_json()
        assert data['status'] == 'success'
        assert data['data']['user_id'] == str(joiner.id)
        assert data['data']['role'] == 'member'
    
    def test_join_study_group_by_invite_code(self, client, db_session, sample_course, sample_users):
        """Test joining a study group using invite code"""
        creator = sample_users[0]
        joiner = sample_users[1]
        
        # Create study group
        study_group = StudyGroup(
            name="Test Group",
            course_id=sample_course.id,
            created_by=creator.id,
            is_public=True,
            max_members=10,
            invite_code="TESTCODE"
        )
        db_session.add(study_group)
        db_session.commit()
        
        # Test joining by invite code
        with patch('core.decorators_unified.verify_firebase_token') as mock_verify:
            mock_verify.return_value = {'uid': joiner.firebase_uid}
            
            response = client.post('/api/v2/collaboration/study-groups/join',
                                 json={'invite_code': 'TESTCODE'},
                                 headers={'Authorization': 'Bearer fake_token'})
        
        assert response.status_code == 200
        data = response.get_json()
        assert data['status'] == 'success'
    
    def test_get_user_study_groups(self, client, db_session, sample_course, sample_users):
        """Test retrieving user's study groups"""
        user = sample_users[0]
        
        # Create study groups
        for i in range(2):
            study_group = StudyGroup(
                name=f"Test Group {i}",
                course_id=sample_course.id,
                created_by=user.id,
                is_public=True,
                max_members=10,
                invite_code=f"CODE{i}"
            )
            db_session.add(study_group)
            db_session.flush()
            
            member = StudyGroupMember(
                group_id=study_group.id,
                user_id=user.id,
                role='admin'
            )
            db_session.add(member)
        
        db_session.commit()
        
        with patch('core.decorators_unified.verify_firebase_token') as mock_verify:
            mock_verify.return_value = {'uid': user.firebase_uid}
            
            response = client.get('/api/v2/collaboration/study-groups',
                                headers={'Authorization': 'Bearer fake_token'})
        
        assert response.status_code == 200
        data = response.get_json()
        assert data['status'] == 'success'
        assert len(data['data']) == 2


class TestSharedAnnotations:
    """Test shared annotation functionality"""
    
    def test_create_annotation(self, client, sample_file, sample_users):
        """Test creating a shared annotation"""
        user = sample_users[0]
        
        with patch('core.decorators_unified.verify_firebase_token') as mock_verify:
            mock_verify.return_value = {'uid': user.firebase_uid}
            
            response = client.post('/api/v2/collaboration/annotations',
                                 json={
                                     'file_id': str(sample_file.id),
                                     'annotation_type': 'highlight',
                                     'content': 'This is an important point',
                                     'position_data': {
                                         'page': 1,
                                         'coordinates': {'x': 100, 'y': 200, 'width': 150, 'height': 50}
                                     },
                                     'color': '#ffff00',
                                     'is_public': False
                                 },
                                 headers={'Authorization': 'Bearer fake_token'})
        
        assert response.status_code == 201
        data = response.get_json()
        assert data['status'] == 'success'
        assert data['data']['annotation_type'] == 'highlight'
        assert data['data']['content'] == 'This is an important point'
        assert data['data']['color'] == '#ffff00'
    
    def test_get_file_annotations(self, client, db_session, sample_file, sample_users):
        """Test retrieving annotations for a file"""
        user = sample_users[0]
        
        # Create annotation
        annotation = SharedAnnotation(
            file_id=sample_file.id,
            created_by=user.id,
            annotation_type='comment',
            content='Test annotation',
            position_data={'page': 1, 'coordinates': {'x': 10, 'y': 20, 'width': 100, 'height': 30}},
            color='#yellow',
            is_public=True
        )
        db_session.add(annotation)
        db_session.commit()
        
        with patch('core.decorators_unified.verify_firebase_token') as mock_verify:
            mock_verify.return_value = {'uid': user.firebase_uid}
            
            response = client.get(f'/api/v2/collaboration/files/{sample_file.id}/annotations',
                                headers={'Authorization': 'Bearer fake_token'})
        
        assert response.status_code == 200
        data = response.get_json()
        assert data['status'] == 'success'
        assert len(data['data']) == 1
        assert data['data'][0]['content'] == 'Test annotation'
    
    def test_add_annotation_reaction(self, client, db_session, sample_file, sample_users):
        """Test adding reaction to annotation"""
        user = sample_users[0]
        
        # Create annotation
        annotation = SharedAnnotation(
            file_id=sample_file.id,
            created_by=user.id,
            annotation_type='question',
            content='Is this correct?',
            position_data={'page': 1},
            color='#blue'
        )
        db_session.add(annotation)
        db_session.commit()
        
        with patch('core.decorators_unified.verify_firebase_token') as mock_verify:
            mock_verify.return_value = {'uid': user.firebase_uid}
            
            response = client.post(f'/api/v2/collaboration/annotations/{annotation.id}/reactions',
                                 json={'reaction_type': 'helpful'},
                                 headers={'Authorization': 'Bearer fake_token'})
        
        assert response.status_code == 201
        data = response.get_json()
        assert data['status'] == 'success'


class TestPeerDiscussions:
    """Test peer discussion functionality"""
    
    def test_create_discussion(self, client, sample_course, sample_users):
        """Test creating a peer discussion"""
        user = sample_users[0]
        
        with patch('core.decorators_unified.verify_firebase_token') as mock_verify:
            mock_verify.return_value = {'uid': user.firebase_uid}
            
            response = client.post('/api/v2/collaboration/discussions',
                                 json={
                                     'course_id': str(sample_course.id),
                                     'title': 'Question about Chapter 1',
                                     'content': 'I need help understanding this concept...',
                                     'discussion_type': 'question',
                                     'tags': ['chapter1', 'concepts']
                                 },
                                 headers={'Authorization': 'Bearer fake_token'})
        
        assert response.status_code == 201
        data = response.get_json()
        assert data['status'] == 'success'
        assert data['data']['title'] == 'Question about Chapter 1'
        assert data['data']['discussion_type'] == 'question'
        assert 'chapter1' in data['data']['tags']
    
    def test_add_discussion_reply(self, client, db_session, sample_course, sample_users):
        """Test adding reply to discussion"""
        user = sample_users[0]
        
        # Create discussion
        discussion = PeerDiscussion(
            title="Test Discussion",
            content="Original post content",
            course_id=sample_course.id,
            created_by=user.id,
            discussion_type='question'
        )
        db_session.add(discussion)
        db_session.commit()
        
        with patch('core.decorators_unified.verify_firebase_token') as mock_verify:
            mock_verify.return_value = {'uid': user.firebase_uid}
            
            response = client.post(f'/api/v2/collaboration/discussions/{discussion.id}/replies',
                                 json={'content': 'This is my reply to the discussion'},
                                 headers={'Authorization': 'Bearer fake_token'})
        
        assert response.status_code == 201
        data = response.get_json()
        assert data['status'] == 'success'
        assert data['data']['content'] == 'This is my reply to the discussion'
    
    def test_vote_on_discussion(self, client, db_session, sample_course, sample_users):
        """Test voting on discussion"""
        user = sample_users[0]
        
        # Create discussion
        discussion = PeerDiscussion(
            title="Test Discussion",
            content="Vote on this",
            course_id=sample_course.id,
            created_by=user.id,
            discussion_type='discussion'
        )
        db_session.add(discussion)
        db_session.commit()
        
        with patch('core.decorators_unified.verify_firebase_token') as mock_verify:
            mock_verify.return_value = {'uid': user.firebase_uid}
            
            response = client.post(f'/api/v2/collaboration/discussions/{discussion.id}/vote',
                                 json={'vote_type': 'upvote'},
                                 headers={'Authorization': 'Bearer fake_token'})
        
        assert response.status_code == 200
        data = response.get_json()
        assert data['status'] == 'success'


class TestCollaborativeNotes:
    """Test collaborative note functionality"""
    
    def test_create_collaborative_note(self, client, sample_course, sample_users):
        """Test creating a collaborative note"""
        user = sample_users[0]
        
        with patch('core.decorators_unified.verify_firebase_token') as mock_verify:
            mock_verify.return_value = {'uid': user.firebase_uid}
            
            response = client.post('/api/v2/collaboration/collaborative-notes',
                                 json={
                                     'course_id': str(sample_course.id),
                                     'title': 'Shared Study Notes',
                                     'content': {'text': 'These are our shared notes...', 'version': 1},
                                     'is_template': False
                                 },
                                 headers={'Authorization': 'Bearer fake_token'})
        
        assert response.status_code == 201
        data = response.get_json()
        assert data['status'] == 'success'
        assert data['data']['title'] == 'Shared Study Notes'
        assert data['data']['collaboration_mode'] == 'open'
    
    def test_get_collaborative_note(self, client, db_session, sample_course, sample_users):
        """Test retrieving a collaborative note"""
        user = sample_users[0]
        
        # Create note
        note = CollaborativeNote(
            title="Test Note",
            content={'text': 'Note content', 'version': 1},
            course_id=sample_course.id,
            created_by=user.id,
            collaboration_mode='open'
        )
        db_session.add(note)
        db_session.commit()
        
        with patch('core.decorators_unified.verify_firebase_token') as mock_verify:
            mock_verify.return_value = {'uid': user.firebase_uid}
            
            response = client.get(f'/api/v2/collaboration/collaborative-notes/{note.id}',
                                headers={'Authorization': 'Bearer fake_token'})
        
        assert response.status_code == 200
        data = response.get_json()
        assert data['status'] == 'success'
        assert data['data']['title'] == 'Test Note'


class TestUserCollaborationPreferences:
    """Test user collaboration preferences"""
    
    def test_get_collaboration_preferences(self, client, sample_users):
        """Test getting user collaboration preferences"""
        user = sample_users[0]
        
        with patch('core.decorators_unified.verify_firebase_token') as mock_verify:
            mock_verify.return_value = {'uid': user.firebase_uid}
            
            response = client.get('/api/v2/collaboration/preferences',
                                headers={'Authorization': 'Bearer fake_token'})
        
        assert response.status_code == 200
        data = response.get_json()
        assert data['status'] == 'success'
        # Should return default preferences if none exist
        assert 'allow_public_annotations' in data['data']
        assert 'collaboration_level' in data['data']
    
    def test_update_collaboration_preferences(self, client, sample_users):
        """Test updating user collaboration preferences"""
        user = sample_users[0]
        
        with patch('core.decorators_unified.verify_firebase_token') as mock_verify:
            mock_verify.return_value = {'uid': user.firebase_uid}
            
            response = client.put('/api/v2/collaboration/preferences',
                                json={
                                    'allow_public_annotations': True,
                                    'collaboration_level': 'active',
                                    'notification_preferences': {
                                        'group_invites': True,
                                        'annotation_replies': False,
                                        'discussion_mentions': True
                                    }
                                },
                                headers={'Authorization': 'Bearer fake_token'})
        
        assert response.status_code == 200
        data = response.get_json()
        assert data['status'] == 'success'
        assert data['data']['allow_public_annotations'] is True
        assert data['data']['collaboration_level'] == 'active'
    
    def test_get_collaboration_stats(self, client, sample_users):
        """Test getting user collaboration statistics"""
        user = sample_users[0]
        
        with patch('core.decorators_unified.verify_firebase_token') as mock_verify:
            mock_verify.return_value = {'uid': user.firebase_uid}
            
            response = client.get('/api/v2/collaboration/stats',
                                headers={'Authorization': 'Bearer fake_token'})
        
        assert response.status_code == 200
        data = response.get_json()
        assert data['status'] == 'success'
        assert 'study_groups_count' in data['data']
        assert 'annotations_count' in data['data']
        assert 'discussions_started' in data['data']


class TestCollaborationErrorHandling:
    """Test error handling in collaboration features"""
    
    def test_create_study_group_invalid_course(self, client, sample_users):
        """Test creating study group with invalid course ID"""
        user = sample_users[0]
        
        with patch('core.decorators_unified.verify_firebase_token') as mock_verify:
            mock_verify.return_value = {'uid': user.firebase_uid}
            
            response = client.post('/api/v2/collaboration/study-groups',
                                 json={
                                     'course_id': str(uuid4()),  # Non-existent course
                                     'name': 'Test Group',
                                     'description': 'Test'
                                 },
                                 headers={'Authorization': 'Bearer fake_token'})
        
        assert response.status_code == 403  # Authorization error
    
    def test_join_nonexistent_study_group(self, client, sample_users):
        """Test joining non-existent study group"""
        user = sample_users[0]
        
        with patch('core.decorators_unified.verify_firebase_token') as mock_verify:
            mock_verify.return_value = {'uid': user.firebase_uid}
            
            response = client.post('/api/v2/collaboration/study-groups/join',
                                 json={'group_id': str(uuid4())},
                                 headers={'Authorization': 'Bearer fake_token'})
        
        assert response.status_code == 404
    
    def test_create_annotation_invalid_file(self, client, sample_users):
        """Test creating annotation for invalid file"""
        user = sample_users[0]
        
        with patch('core.decorators_unified.verify_firebase_token') as mock_verify:
            mock_verify.return_value = {'uid': user.firebase_uid}
            
            response = client.post('/api/v2/collaboration/annotations',
                                 json={
                                     'file_id': str(uuid4()),  # Non-existent file
                                     'annotation_type': 'highlight',
                                     'content': 'Test',
                                     'position_data': {'page': 1}
                                 },
                                 headers={'Authorization': 'Bearer fake_token'})
        
        assert response.status_code == 403  # Authorization error


class TestCollaborationRateLimiting:
    """Test rate limiting for collaboration features"""
    
    def test_study_group_creation_rate_limit(self, client, sample_course, sample_users):
        """Test rate limiting on study group creation"""
        user = sample_users[0]
        
        with patch('core.decorators_unified.verify_firebase_token') as mock_verify:
            mock_verify.return_value = {'uid': user.firebase_uid}
            
            # Create multiple groups rapidly
            for i in range(12):  # Exceed the 10 per 5 minutes limit
                response = client.post('/api/v2/collaboration/study-groups',
                                     json={
                                         'course_id': str(sample_course.id),
                                         'name': f'Test Group {i}',
                                         'description': 'Rate limit test'
                                     },
                                     headers={'Authorization': 'Bearer fake_token'})
                
                if i < 10:
                    assert response.status_code in [201, 403]  # Success or auth error
                else:
                    # Should be rate limited after 10 requests
                    assert response.status_code == 429  # Too Many Requests


if __name__ == '__main__':
    pytest.main([__file__, '-v'])