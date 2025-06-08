"""
API endpoints for collaborative learning features
Handles study groups, annotations, discussions, and collaborative notes.
"""

from flask import Blueprint, request, jsonify, g
from uuid import UUID
from typing import Dict, Any, List

from core.decorators_unified import auth_required
from core.exceptions import ValidationError, NotFoundError, AuthorizationError
from services.collaboration_service import CollaborationService

bp = Blueprint('collaboration_v2', __name__)
collaboration_service = CollaborationService()

# Study Group Endpoints

@bp.route('/study-groups', methods=['POST'])
@auth_required()
# Rate limiting disabled for now
def create_study_group():
    """Create a new study group"""
    try:
        data = request.get_json()
        
        # Validate required fields
        required_fields = ['course_id', 'name']
        for field in required_fields:
            if field not in data:
                return jsonify({'error': f'{field} is required'}), 400
        
        result = collaboration_service.create_study_group(
            user_id=UUID(g.current_user.id),
            course_id=UUID(data['course_id']),
            name=data['name'],
            description=data.get('description'),
            is_public=data.get('is_public', True),
            max_members=data.get('max_members', 10)
        )
        
        return jsonify({
            'status': 'success',
            'data': result,
            'message': 'Study group created successfully'
        }), 201
        
    except ValidationError as e:
        return jsonify({'error': str(e)}), 400
    except AuthorizationError as e:
        return jsonify({'error': str(e)}), 403
    except Exception as e:
        return jsonify({'error': 'Failed to create study group'}), 500

@bp.route('/study-groups/<group_id>', methods=['GET'])
@auth_required()
def get_study_group(group_id):
    """Get study group details"""
    try:
        result = collaboration_service.get_study_group(
            user_id=UUID(g.current_user.id),
            group_id=UUID(group_id)
        )
        
        return jsonify({
            'status': 'success',
            'data': result
        }), 200
        
    except NotFoundError as e:
        return jsonify({'error': str(e)}), 404
    except AuthorizationError as e:
        return jsonify({'error': str(e)}), 403
    except Exception as e:
        return jsonify({'error': 'Failed to get study group'}), 500

@bp.route('/study-groups', methods=['GET'])
@auth_required()
def get_user_study_groups():
    """Get user's study groups"""
    try:
        course_id = request.args.get('course_id')
        course_uuid = UUID(course_id) if course_id else None
        
        result = collaboration_service.get_user_study_groups(
            user_id=UUID(g.current_user.id),
            course_id=course_uuid
        )
        
        return jsonify({
            'status': 'success',
            'data': result
        }), 200
        
    except Exception as e:
        return jsonify({'error': 'Failed to get study groups'}), 500

@bp.route('/courses/<course_id>/study-groups', methods=['GET'])
@auth_required()
def get_course_study_groups(course_id):
    """Get public study groups for a course"""
    try:
        result = collaboration_service.get_course_study_groups(
            user_id=UUID(g.current_user.id),
            course_id=UUID(course_id)
        )
        
        return jsonify({
            'status': 'success',
            'data': result
        }), 200
        
    except AuthorizationError as e:
        return jsonify({'error': str(e)}), 403
    except Exception as e:
        return jsonify({'error': 'Failed to get course study groups'}), 500

@bp.route('/study-groups/join', methods=['POST'])
@auth_required()
# Rate limiting disabled for now
def join_study_group():
    """Join a study group by ID or invite code"""
    try:
        data = request.get_json()
        
        group_id = data.get('group_id')
        invite_code = data.get('invite_code')
        
        if not group_id and not invite_code:
            return jsonify({'error': 'Either group_id or invite_code is required'}), 400
        
        result = collaboration_service.join_study_group(
            user_id=UUID(g.current_user.id),
            group_id=UUID(group_id) if group_id else None,
            invite_code=invite_code
        )
        
        return jsonify({
            'status': 'success',
            'data': result,
            'message': 'Successfully joined study group'
        }), 200
        
    except ValidationError as e:
        return jsonify({'error': str(e)}), 400
    except NotFoundError as e:
        return jsonify({'error': str(e)}), 404
    except AuthorizationError as e:
        return jsonify({'error': str(e)}), 403
    except Exception as e:
        return jsonify({'error': 'Failed to join study group'}), 500

@bp.route('/study-groups/<group_id>/leave', methods=['POST'])
@auth_required()
def leave_study_group(group_id):
    """Leave a study group"""
    try:
        collaboration_service.leave_study_group(
            user_id=UUID(g.current_user.id),
            group_id=UUID(group_id)
        )
        
        return jsonify({
            'status': 'success',
            'message': 'Successfully left study group'
        }), 200
        
    except Exception as e:
        return jsonify({'error': 'Failed to leave study group'}), 500

@bp.route('/study-groups/<group_id>', methods=['PUT'])
@auth_required()
def update_study_group(group_id):
    """Update study group (admin only)"""
    try:
        data = request.get_json()
        
        result = collaboration_service.update_study_group(
            user_id=UUID(g.current_user.id),
            group_id=UUID(group_id),
            **data
        )
        
        return jsonify({
            'status': 'success',
            'data': result,
            'message': 'Study group updated successfully'
        }), 200
        
    except AuthorizationError as e:
        return jsonify({'error': str(e)}), 403
    except Exception as e:
        return jsonify({'error': 'Failed to update study group'}), 500

# Annotation Endpoints

@bp.route('/annotations', methods=['POST'])
@auth_required()
# Rate limiting disabled  # 50 annotations per 5 minutes
def create_annotation():
    """Create a shared annotation"""
    try:
        data = request.get_json()
        
        # Validate required fields
        required_fields = ['file_id', 'annotation_type', 'content', 'position_data']
        for field in required_fields:
            if field not in data:
                return jsonify({'error': f'{field} is required'}), 400
        
        result = collaboration_service.create_annotation(
            user_id=UUID(g.current_user.id),
            file_id=UUID(data['file_id']),
            annotation_type=data['annotation_type'],
            content=data['content'],
            position_data=data['position_data'],
            group_id=UUID(data['group_id']) if data.get('group_id') else None,
            color=data.get('color', '#ffff00'),
            is_public=data.get('is_public', False)
        )
        
        return jsonify({
            'status': 'success',
            'data': result,
            'message': 'Annotation created successfully'
        }), 201
        
    except ValidationError as e:
        return jsonify({'error': str(e)}), 400
    except AuthorizationError as e:
        return jsonify({'error': str(e)}), 403
    except Exception as e:
        return jsonify({'error': 'Failed to create annotation'}), 500

@bp.route('/files/<file_id>/annotations', methods=['GET'])
@auth_required()
def get_file_annotations(file_id):
    """Get annotations for a file"""
    try:
        group_id = request.args.get('group_id')
        group_uuid = UUID(group_id) if group_id else None
        
        result = collaboration_service.get_file_annotations(
            user_id=UUID(g.current_user.id),
            file_id=UUID(file_id),
            group_id=group_uuid
        )
        
        return jsonify({
            'status': 'success',
            'data': result
        }), 200
        
    except AuthorizationError as e:
        return jsonify({'error': str(e)}), 403
    except Exception as e:
        return jsonify({'error': 'Failed to get annotations'}), 500

@bp.route('/annotations/<annotation_id>/reactions', methods=['POST'])
@auth_required()
# Rate limiting disabled  # 100 reactions per 5 minutes
def add_annotation_reaction(annotation_id):
    """Add reaction to annotation"""
    try:
        data = request.get_json()
        
        if 'reaction_type' not in data:
            return jsonify({'error': 'reaction_type is required'}), 400
        
        result = collaboration_service.add_annotation_reaction(
            user_id=UUID(g.current_user.id),
            annotation_id=UUID(annotation_id),
            reaction_type=data['reaction_type']
        )
        
        return jsonify({
            'status': 'success',
            'data': result,
            'message': 'Reaction added successfully'
        }), 201
        
    except ValidationError as e:
        return jsonify({'error': str(e)}), 400
    except NotFoundError as e:
        return jsonify({'error': str(e)}), 404
    except Exception as e:
        return jsonify({'error': 'Failed to add reaction'}), 500

# Discussion Endpoints

@bp.route('/discussions', methods=['POST'])
@auth_required()
# Rate limiting disabled  # 20 discussions per 5 minutes
def create_discussion():
    """Create a peer discussion"""
    try:
        data = request.get_json()
        
        # Validate required fields
        required_fields = ['course_id', 'title', 'content']
        for field in required_fields:
            if field not in data:
                return jsonify({'error': f'{field} is required'}), 400
        
        result = collaboration_service.create_discussion(
            user_id=UUID(g.current_user.id),
            course_id=UUID(data['course_id']),
            title=data['title'],
            content=data['content'],
            discussion_type=data.get('discussion_type', 'question'),
            file_id=UUID(data['file_id']) if data.get('file_id') else None,
            annotation_id=UUID(data['annotation_id']) if data.get('annotation_id') else None,
            group_id=UUID(data['group_id']) if data.get('group_id') else None,
            tags=data.get('tags')
        )
        
        return jsonify({
            'status': 'success',
            'data': result,
            'message': 'Discussion created successfully'
        }), 201
        
    except ValidationError as e:
        return jsonify({'error': str(e)}), 400
    except AuthorizationError as e:
        return jsonify({'error': str(e)}), 403
    except Exception as e:
        return jsonify({'error': 'Failed to create discussion'}), 500

@bp.route('/courses/<course_id>/discussions', methods=['GET'])
@auth_required()
def get_course_discussions(course_id):
    """Get discussions for a course"""
    try:
        discussion_type = request.args.get('type')
        group_id = request.args.get('group_id')
        group_uuid = UUID(group_id) if group_id else None
        
        result = collaboration_service.get_course_discussions(
            user_id=UUID(g.current_user.id),
            course_id=UUID(course_id),
            discussion_type=discussion_type,
            group_id=group_uuid
        )
        
        return jsonify({
            'status': 'success',
            'data': result
        }), 200
        
    except AuthorizationError as e:
        return jsonify({'error': str(e)}), 403
    except Exception as e:
        return jsonify({'error': 'Failed to get discussions'}), 500

@bp.route('/discussions/<discussion_id>/replies', methods=['POST'])
@auth_required()
# Rate limiting disabled  # 50 replies per 5 minutes
def add_discussion_reply(discussion_id):
    """Add reply to discussion"""
    try:
        data = request.get_json()
        
        if 'content' not in data:
            return jsonify({'error': 'content is required'}), 400
        
        result = collaboration_service.add_discussion_reply(
            user_id=UUID(g.current_user.id),
            discussion_id=UUID(discussion_id),
            content=data['content'],
            parent_reply_id=UUID(data['parent_reply_id']) if data.get('parent_reply_id') else None
        )
        
        return jsonify({
            'status': 'success',
            'data': result,
            'message': 'Reply added successfully'
        }), 201
        
    except ValidationError as e:
        return jsonify({'error': str(e)}), 400
    except NotFoundError as e:
        return jsonify({'error': str(e)}), 404
    except AuthorizationError as e:
        return jsonify({'error': str(e)}), 403
    except Exception as e:
        return jsonify({'error': 'Failed to add reply'}), 500

@bp.route('/discussions/<discussion_id>/vote', methods=['POST'])
@auth_required()
# Rate limiting disabled  # 100 votes per 5 minutes
def vote_on_discussion(discussion_id):
    """Vote on discussion"""
    try:
        data = request.get_json()
        
        if 'vote_type' not in data:
            return jsonify({'error': 'vote_type is required'}), 400
        
        if data['vote_type'] not in ['upvote', 'downvote']:
            return jsonify({'error': 'vote_type must be upvote or downvote'}), 400
        
        result = collaboration_service.vote_on_discussion(
            user_id=UUID(g.current_user.id),
            discussion_id=UUID(discussion_id),
            vote_type=data['vote_type']
        )
        
        return jsonify({
            'status': 'success',
            'data': result,
            'message': 'Vote recorded successfully'
        }), 200
        
    except ValidationError as e:
        return jsonify({'error': str(e)}), 400
    except Exception as e:
        return jsonify({'error': 'Failed to record vote'}), 500

# Collaborative Notes Endpoints

@bp.route('/collaborative-notes', methods=['POST'])
@auth_required()
# Rate limiting disabled  # 20 notes per 5 minutes
def create_collaborative_note():
    """Create a collaborative note"""
    try:
        data = request.get_json()
        
        # Validate required fields
        required_fields = ['course_id', 'title', 'content']
        for field in required_fields:
            if field not in data:
                return jsonify({'error': f'{field} is required'}), 400
        
        result = collaboration_service.create_collaborative_note(
            user_id=UUID(g.current_user.id),
            course_id=UUID(data['course_id']),
            title=data['title'],
            content=data['content'],
            file_id=UUID(data['file_id']) if data.get('file_id') else None,
            group_id=UUID(data['group_id']) if data.get('group_id') else None,
            is_template=data.get('is_template', False)
        )
        
        return jsonify({
            'status': 'success',
            'data': result,
            'message': 'Collaborative note created successfully'
        }), 201
        
    except ValidationError as e:
        return jsonify({'error': str(e)}), 400
    except AuthorizationError as e:
        return jsonify({'error': str(e)}), 403
    except Exception as e:
        return jsonify({'error': 'Failed to create collaborative note'}), 500

@bp.route('/collaborative-notes/<note_id>', methods=['GET'])
@auth_required()
def get_collaborative_note(note_id):
    """Get collaborative note"""
    try:
        result = collaboration_service.get_collaborative_note(
            user_id=UUID(g.current_user.id),
            note_id=UUID(note_id)
        )
        
        return jsonify({
            'status': 'success',
            'data': result
        }), 200
        
    except NotFoundError as e:
        return jsonify({'error': str(e)}), 404
    except AuthorizationError as e:
        return jsonify({'error': str(e)}), 403
    except Exception as e:
        return jsonify({'error': 'Failed to get collaborative note'}), 500

@bp.route('/files/<file_id>/collaborative-notes', methods=['GET'])
@auth_required()
def get_file_collaborative_notes(file_id):
    """Get collaborative notes for a file"""
    try:
        result = collaboration_service.get_file_notes(
            user_id=UUID(g.current_user.id),
            file_id=UUID(file_id)
        )
        
        return jsonify({
            'status': 'success',
            'data': result
        }), 200
        
    except AuthorizationError as e:
        return jsonify({'error': str(e)}), 403
    except Exception as e:
        return jsonify({'error': 'Failed to get collaborative notes'}), 500

# User Preferences Endpoints

@bp.route('/preferences', methods=['GET'])
@auth_required()
def get_collaboration_preferences():
    """Get user's collaboration preferences"""
    try:
        result = collaboration_service.get_collaboration_preferences(
            user_id=UUID(g.current_user.id)
        )
        
        return jsonify({
            'status': 'success',
            'data': result
        }), 200
        
    except Exception as e:
        return jsonify({'error': 'Failed to get preferences'}), 500

@bp.route('/preferences', methods=['PUT'])
@auth_required()
def update_collaboration_preferences():
    """Update user's collaboration preferences"""
    try:
        data = request.get_json()
        
        result = collaboration_service.update_collaboration_preferences(
            user_id=UUID(g.current_user.id),
            **data
        )
        
        return jsonify({
            'status': 'success',
            'data': result,
            'message': 'Preferences updated successfully'
        }), 200
        
    except ValidationError as e:
        return jsonify({'error': str(e)}), 400
    except Exception as e:
        return jsonify({'error': 'Failed to update preferences'}), 500

@bp.route('/stats', methods=['GET'])
@auth_required()
def get_collaboration_stats():
    """Get collaboration statistics for user"""
    try:
        result = collaboration_service.get_collaboration_stats(
            user_id=UUID(g.current_user.id)
        )
        
        return jsonify({
            'status': 'success',
            'data': result
        }), 200
        
    except Exception as e:
        return jsonify({'error': 'Failed to get collaboration stats'}), 500