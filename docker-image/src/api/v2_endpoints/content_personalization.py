"""
Universal content personalization endpoint - ensures ALL content gets personalized
"""

import logging
from flask import Blueprint, request, jsonify, g
from typing import Dict, Any

from core.decorators_unified import firebase_auth_required
from services.streaming_personalization_v2 import OptimizedStreamingPersonalizationService
from services.personalization_memory import PersonalizationMemoryService

logger = logging.getLogger(__name__)

content_personalization_bp = Blueprint('content_personalization', __name__)

@content_personalization_bp.route('/personalize-content', methods=['POST'])
@firebase_auth_required
def personalize_content_instant():
    """
    Instantly personalize any content based on user profile
    This endpoint can be used by any viewer to get personalized content
    
    Request body:
    {
        "content": "string - the raw content to personalize",
        "title": "string - optional title",
        "content_type": "string - optional (text/pdf/document)",
        "file_id": "string - optional file reference"
    }
    
    Returns personalized content immediately
    """
    try:
        data = request.get_json()
        content = data.get('content', '')
        title = data.get('title', 'Content')
        
        if not content:
            return jsonify({
                'status': 'error',
                'error': 'No content provided'
            }), 400
        
        # Get streaming service
        from api.v2_endpoints.personalization_v2 import get_streaming_service
        service = get_streaming_service()
        
        # Get user profile
        user_id = str(g.current_user.id)
        user = service.user_repo.get_by_id(user_id)
        
        if not user or not user.student_profile:
            return jsonify({
                'status': 'error',
                'error': 'User profile not found'
            }), 404
        
        # Extract user profile
        raw_profile = user.student_profile.onboard_answers or {}
        user_profile = {
            'user_id': user_id,
            'learning_style': raw_profile.get('learningStyle', 'visual'),
            'expertise_level': raw_profile.get('depth', 'intermediate'),
            'interests': service._normalize_interests(raw_profile.get('interests', [])),
            'tone_preference': raw_profile.get('traits', 'professional'),
            'topics': service._normalize_topics(raw_profile.get('topics', []))
        }
        
        # Create a temporary section for personalization
        from services.streaming_personalization_v2 import StreamingSection, PersonalizationContext
        
        section = StreamingSection(
            anchor='instant',
            title=title,
            content=content,
            order=0
        )
        
        context = PersonalizationContext(
            user_id=user_id,
            file_id=data.get('file_id', 'instant'),
            user_profile=user_profile,
            file_content=content,
            sections=[section]
        )
        
        # Get personalized content immediately
        personalized_content = service._personalize_section(section, context)
        
        # Track interaction for learning
        if hasattr(service, 'memory_service'):
            primary_interest = service._select_primary_interest(section, user_profile)
            content_domain = service._identify_content_domain(section)
            service.memory_service.track_section_interaction(
                user_id=user_id,
                section_id='instant',
                content_domain=content_domain,
                primary_interest=primary_interest
            )
        
        return jsonify({
            'status': 'success',
            'data': {
                'personalized_content': personalized_content,
                'original_length': len(content),
                'personalized_length': len(personalized_content),
                'primary_interest': service._select_primary_interest(section, user_profile),
                'content_domain': service._identify_content_domain(section)
            }
        })
        
    except Exception as e:
        logger.error(f"Error personalizing content: {str(e)}")
        return jsonify({
            'status': 'error',
            'error': 'Failed to personalize content'
        }), 500


@content_personalization_bp.route('/check-personalization', methods=['GET'])
@firebase_auth_required
def check_personalization_status():
    """
    Check if user has personalization enabled and properly configured
    """
    try:
        from api.v2_endpoints.personalization_v2 import get_streaming_service
        service = get_streaming_service()
        
        user_id = str(g.current_user.id)
        user = service.user_repo.get_by_id(user_id)
        
        if not user or not user.student_profile:
            return jsonify({
                'status': 'success',
                'data': {
                    'has_profile': False,
                    'personalization_ready': False,
                    'message': 'Please complete onboarding for personalized content'
                }
            })
        
        raw_profile = user.student_profile.onboard_answers or {}
        
        # Check required fields
        has_interests = bool(raw_profile.get('interests'))
        has_learning_style = bool(raw_profile.get('learningStyle') or raw_profile.get('learning_style'))
        has_preferences = bool(raw_profile.get('depth') or raw_profile.get('traits'))
        
        personalization_ready = has_interests and has_learning_style
        
        # Get learning insights
        insights = {}
        if hasattr(service, 'memory_service') and personalization_ready:
            insights = service.memory_service.get_learning_insights(user_id)
        
        return jsonify({
            'status': 'success',
            'data': {
                'has_profile': True,
                'personalization_ready': personalization_ready,
                'profile_completeness': {
                    'interests': has_interests,
                    'learning_style': has_learning_style,
                    'preferences': has_preferences
                },
                'user_interests': raw_profile.get('interests', []),
                'learning_insights': insights,
                'message': 'Personalization active' if personalization_ready else 'Complete profile for personalization'
            }
        })
        
    except Exception as e:
        logger.error(f"Error checking personalization: {str(e)}")
        return jsonify({
            'status': 'error',
            'error': 'Failed to check personalization status'
        }), 500