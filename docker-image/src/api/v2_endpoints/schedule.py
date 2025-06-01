"""
Schedule API v2 Endpoints
Provides comprehensive REST API for session scheduling, AI optimization, and analytics
"""
from flask import Blueprint, request, jsonify, g
from datetime import datetime, date, timedelta
from typing import Dict, List, Any, Optional
import uuid
from core.decorators_unified import auth_required, validate_json
from core.exceptions import ValidationError, ResourceNotFoundError
from core.database import db_manager
from repositories.schedule_repository import (
    ScheduleRepository, 
    SchedulePreferencesRepository,
    SessionNotesRepository,
    SessionAnalyticsRepository,
    AISessionSuggestionRepository
)
from services.ai.ai_service import AIService
import logging

logger = logging.getLogger(__name__)
schedule_bp = Blueprint('schedule_v2', __name__)

# Repository instances
def get_repositories():
    """Get repository instances with session factory"""
    session_factory = db_manager.session_factory
    return {
        'schedule': ScheduleRepository(session_factory),
        'preferences': SchedulePreferencesRepository(session_factory),
        'notes': SessionNotesRepository(session_factory),
        'analytics': SessionAnalyticsRepository(session_factory),
        'ai_suggestions': AISessionSuggestionRepository(session_factory)
    }

ai_service = AIService()

# ===============================
# SESSION MANAGEMENT ENDPOINTS
# ===============================

@schedule_bp.route('/sessions', methods=['GET'])
@auth_required
def get_user_sessions():
    """Get user's study sessions with filtering and pagination"""
    try:
        repos = get_repositories()
        user_id = g.user_id
        
        # Parse query parameters
        start_date = request.args.get('start_date')
        end_date = request.args.get('end_date')
        course_id = request.args.get('course_id')
        status = request.args.get('status')
        session_type = request.args.get('session_type')
        limit = int(request.args.get('limit', 50))
        offset = int(request.args.get('offset', 0))
        
        # Convert date strings
        start_dt = datetime.fromisoformat(start_date) if start_date else None
        end_dt = datetime.fromisoformat(end_date) if end_date else None
        
        sessions = repos['schedule'].get_user_sessions(
            user_id=user_id,
            start_date=start_dt,
            end_date=end_dt,
            course_id=uuid.UUID(course_id) if course_id else None,
            status=status,
            session_type=session_type,
            limit=limit,
            offset=offset
        )
        
        return jsonify({
            'data': sessions,
            'message': 'Sessions retrieved successfully',
            'status': 'success'
        })
        
    except Exception as e:
        logger.error(f"Error retrieving sessions: {e}")
        return jsonify({
            'error': 'Failed to retrieve sessions',
            'status': 'error'
        }), 500

@schedule_bp.route('/sessions', methods=['POST'])
@auth_required
@validate_json(['title', 'scheduled_start', 'scheduled_end', 'duration_minutes'])
def create_session():
    """Create a new study session"""
    try:
        repos = get_repositories()
        user_id = g.user_id
        data = request.json
        
        # Validate required fields
        session_data = {
            'user_id': user_id,
            'title': data['title'],
            'description': data.get('description'),
            'scheduled_start': datetime.fromisoformat(data['scheduled_start']),
            'scheduled_end': datetime.fromisoformat(data['scheduled_end']),
            'duration_minutes': data['duration_minutes'],
            'course_id': uuid.UUID(data['course_id']) if data.get('course_id') else None,
            'study_plan_id': uuid.UUID(data['study_plan_id']) if data.get('study_plan_id') else None,
            'study_goal_id': uuid.UUID(data['study_goal_id']) if data.get('study_goal_id') else None,
            'session_type': data.get('session_type', 'study'),
            'cognitive_load': data.get('cognitive_load', 'medium'),
            'urgency': data.get('urgency', 'later'),
            'priority_score': float(data.get('priority_score', 0.5)),
            'xp_reward': int(data.get('xp_reward', 0)),
            'is_ai_suggested': bool(data.get('is_ai_suggested', False)),
            'calendar_position': data.get('calendar_position')
        }
        
        # Check for conflicts
        conflicts = repos['schedule'].check_session_conflicts(
            user_id=user_id,
            start_time=session_data['scheduled_start'],
            end_time=session_data['scheduled_end'],
            exclude_session_id=None
        )
        
        if conflicts:
            return jsonify({
                'error': 'Session conflicts with existing sessions',
                'conflicts': conflicts,
                'status': 'error'
            }), 409
        
        session = repos['schedule'].create_session(session_data)
        
        # Log analytics event
        repos['analytics'].log_session_event(
            user_id=user_id,
            session_id=session['id'],
            event_type='session_created',
            metadata={'created_manually': not session_data['is_ai_suggested']}
        )
        
        return jsonify({
            'data': session,
            'message': 'Session created successfully',
            'status': 'success'
        }), 201
        
    except ValidationError as e:
        return jsonify({
            'error': str(e),
            'status': 'error'
        }), 400
    except Exception as e:
        logger.error(f"Error creating session: {e}")
        return jsonify({
            'error': 'Failed to create session',
            'status': 'error'
        }), 500

@schedule_bp.route('/sessions/<session_id>', methods=['PUT'])
@auth_required
def update_session(session_id):
    """Update an existing study session"""
    try:
        repos = get_repositories()
        user_id = g.user_id
        data = request.json
        session_uuid = uuid.UUID(session_id)
        
        # Verify session ownership
        existing_session = repos['schedule'].get_session_by_id(session_uuid, user_id)
        if not existing_session:
            raise ResourceNotFoundError("Session not found")
        
        # Prepare update data
        update_data = {}
        allowed_fields = [
            'title', 'description', 'scheduled_start', 'scheduled_end', 
            'duration_minutes', 'course_id', 'study_plan_id', 'study_goal_id',
            'session_type', 'cognitive_load', 'urgency', 'priority_score',
            'xp_reward', 'calendar_position', 'session_notes'
        ]
        
        for field in allowed_fields:
            if field in data:
                if field in ['scheduled_start', 'scheduled_end']:
                    update_data[field] = datetime.fromisoformat(data[field])
                elif field in ['course_id', 'study_plan_id', 'study_goal_id']:
                    update_data[field] = uuid.UUID(data[field]) if data[field] else None
                elif field == 'priority_score':
                    update_data[field] = float(data[field])
                else:
                    update_data[field] = data[field]
        
        # Check for conflicts if times are being changed
        if 'scheduled_start' in update_data or 'scheduled_end' in update_data:
            start_time = update_data.get('scheduled_start', existing_session['scheduled_start'])
            end_time = update_data.get('scheduled_end', existing_session['scheduled_end'])
            
            conflicts = repos['schedule'].check_session_conflicts(
                user_id=user_id,
                start_time=start_time,
                end_time=end_time,
                exclude_session_id=session_uuid
            )
            
            if conflicts:
                return jsonify({
                    'error': 'Updated session conflicts with existing sessions',
                    'conflicts': conflicts,
                    'status': 'error'
                }), 409
        
        updated_session = repos['schedule'].update_session(session_uuid, update_data)
        
        # Log analytics event
        repos['analytics'].log_session_event(
            user_id=user_id,
            session_id=session_uuid,
            event_type='session_updated',
            metadata={'updated_fields': list(update_data.keys())}
        )
        
        return jsonify({
            'data': updated_session,
            'message': 'Session updated successfully',
            'status': 'success'
        })
        
    except ResourceNotFoundError as e:
        return jsonify({
            'error': str(e),
            'status': 'error'
        }), 404
    except Exception as e:
        logger.error(f"Error updating session: {e}")
        return jsonify({
            'error': 'Failed to update session',
            'status': 'error'
        }), 500

@schedule_bp.route('/sessions/<session_id>', methods=['DELETE'])
@auth_required
def delete_session(session_id):
    """Delete a study session"""
    try:
        repos = get_repositories()
        user_id = g.user_id
        session_uuid = uuid.UUID(session_id)
        
        # Verify session ownership
        session = repos['schedule'].get_session_by_id(session_uuid, user_id)
        if not session:
            raise ResourceNotFoundError("Session not found")
        
        success = repos['schedule'].delete_session(session_uuid)
        
        if success:
            # Log analytics event
            repos['analytics'].log_session_event(
                user_id=user_id,
                session_id=session_uuid,
                event_type='session_deleted',
                metadata={'session_status': session.get('status')}
            )
            
            return jsonify({
                'message': 'Session deleted successfully',
                'status': 'success'
            })
        else:
            return jsonify({
                'error': 'Failed to delete session',
                'status': 'error'
            }), 500
            
    except ResourceNotFoundError as e:
        return jsonify({
            'error': str(e),
            'status': 'error'
        }), 404
    except Exception as e:
        logger.error(f"Error deleting session: {e}")
        return jsonify({
            'error': 'Failed to delete session',
            'status': 'error'
        }), 500

@schedule_bp.route('/sessions/bulk', methods=['PUT'])
@auth_required
@validate_json(['sessions'])
def bulk_update_sessions():
    """Update multiple sessions (for drag-and-drop operations)"""
    try:
        repos = get_repositories()
        user_id = g.user_id
        sessions_data = request.json['sessions']
        
        # Validate all sessions belong to user
        session_ids = [uuid.UUID(s['id']) for s in sessions_data]
        existing_sessions = repos['schedule'].get_sessions_by_ids(session_ids, user_id)
        
        if len(existing_sessions) != len(session_ids):
            return jsonify({
                'error': 'One or more sessions not found',
                'status': 'error'
            }), 404
        
        # Process bulk updates
        update_operations = []
        for session_data in sessions_data:
            session_id = uuid.UUID(session_data['id'])
            update_data = {}
            
            # Extract updateable fields
            if 'scheduled_start' in session_data:
                update_data['scheduled_start'] = datetime.fromisoformat(session_data['scheduled_start'])
            if 'scheduled_end' in session_data:
                update_data['scheduled_end'] = datetime.fromisoformat(session_data['scheduled_end'])
            if 'calendar_position' in session_data:
                update_data['calendar_position'] = session_data['calendar_position']
            if 'duration_minutes' in session_data:
                update_data['duration_minutes'] = session_data['duration_minutes']
            
            update_operations.append((session_id, update_data))
        
        # Execute bulk update
        updated_sessions = repos['schedule'].bulk_update_sessions(update_operations)
        
        # Log analytics event
        repos['analytics'].log_session_event(
            user_id=user_id,
            event_type='bulk_session_update',
            metadata={
                'session_count': len(updated_sessions),
                'operation_type': 'drag_drop_reorder'
            }
        )
        
        return jsonify({
            'data': updated_sessions,
            'message': f'Successfully updated {len(updated_sessions)} sessions',
            'status': 'success'
        })
        
    except Exception as e:
        logger.error(f"Error in bulk update: {e}")
        return jsonify({
            'error': 'Failed to update sessions',
            'status': 'error'
        }), 500

@schedule_bp.route('/sessions/<session_id>/start', methods=['POST'])
@auth_required
def start_session(session_id):
    """Start a study session"""
    try:
        repos = get_repositories()
        user_id = g.user_id
        session_uuid = uuid.UUID(session_id)
        
        session = repos['schedule'].get_session_by_id(session_uuid, user_id)
        if not session:
            raise ResourceNotFoundError("Session not found")
        
        # Update session status and start time
        update_data = {
            'status': 'in_progress',
            'actual_start': datetime.utcnow()
        }
        
        updated_session = repos['schedule'].update_session(session_uuid, update_data)
        
        # Log analytics event
        repos['analytics'].log_session_event(
            user_id=user_id,
            session_id=session_uuid,
            event_type='session_started',
            metadata={
                'planned_start': session['scheduled_start'].isoformat(),
                'actual_start': update_data['actual_start'].isoformat()
            }
        )
        
        return jsonify({
            'data': updated_session,
            'message': 'Session started successfully',
            'status': 'success'
        })
        
    except ResourceNotFoundError as e:
        return jsonify({
            'error': str(e),
            'status': 'error'
        }), 404
    except Exception as e:
        logger.error(f"Error starting session: {e}")
        return jsonify({
            'error': 'Failed to start session',
            'status': 'error'
        }), 500

@schedule_bp.route('/sessions/<session_id>/complete', methods=['POST'])
@auth_required
def complete_session(session_id):
    """Complete a study session"""
    try:
        repos = get_repositories()
        user_id = g.user_id
        session_uuid = uuid.UUID(session_id)
        data = request.json or {}
        
        session = repos['schedule'].get_session_by_id(session_uuid, user_id)
        if not session:
            raise ResourceNotFoundError("Session not found")
        
        now = datetime.utcnow()
        
        # Calculate actual duration
        actual_start = session.get('actual_start') or session['scheduled_start']
        actual_duration = int((now - actual_start).total_seconds() / 60)
        
        # Update session completion
        update_data = {
            'status': 'completed',
            'actual_end': now,
            'actual_duration_minutes': actual_duration,
            'completion_percentage': data.get('completion_percentage', 100),
            'effectiveness_rating': data.get('effectiveness_rating'),
            'focus_score': data.get('focus_score'),
            'xp_earned': session.get('xp_reward', 0)
        }
        
        if data.get('session_notes'):
            update_data['session_notes'] = data['session_notes']
        
        updated_session = repos['schedule'].update_session(session_uuid, update_data)
        
        # Log analytics event
        repos['analytics'].log_session_event(
            user_id=user_id,
            session_id=session_uuid,
            event_type='session_completed',
            metadata={
                'planned_duration': session['duration_minutes'],
                'actual_duration': actual_duration,
                'completion_percentage': update_data['completion_percentage'],
                'effectiveness_rating': update_data.get('effectiveness_rating'),
                'xp_earned': update_data['xp_earned']
            }
        )
        
        return jsonify({
            'data': updated_session,
            'message': 'Session completed successfully',
            'status': 'success'
        })
        
    except ResourceNotFoundError as e:
        return jsonify({
            'error': str(e),
            'status': 'error'
        }), 404
    except Exception as e:
        logger.error(f"Error completing session: {e}")
        return jsonify({
            'error': 'Failed to complete session',
            'status': 'error'
        }), 500

# ===============================
# USER PREFERENCES ENDPOINTS
# ===============================

@schedule_bp.route('/preferences', methods=['GET'])
@auth_required
def get_user_preferences():
    """Get user's schedule preferences"""
    try:
        repos = get_repositories()
        user_id = g.user_id
        preferences = repos['preferences'].get_user_preferences(user_id)
        
        return jsonify({
            'data': preferences,
            'message': 'Preferences retrieved successfully',
            'status': 'success'
        })
        
    except Exception as e:
        logger.error(f"Error retrieving preferences: {e}")
        return jsonify({
            'error': 'Failed to retrieve preferences',
            'status': 'error'
        }), 500

@schedule_bp.route('/preferences', methods=['PUT'])
@auth_required
def update_user_preferences():
    """Update user's schedule preferences"""
    try:
        repos = get_repositories()
        user_id = g.user_id
        data = request.json
        
        # Validate preference data
        allowed_fields = [
            'core_start_hour', 'core_end_hour', 'timezone',
            'default_session_length', 'default_break_length', 'max_daily_study_hours',
            'preferred_high_cognitive_slots', 'avoided_time_slots',
            'enable_ai_optimization', 'enable_ai_suggestions', 'optimization_aggressiveness',
            'enable_session_reminders', 'reminder_minutes_before', 'enable_deadline_alerts',
            'default_view', 'show_weekends', 'calendar_start_hour', 'calendar_end_hour',
            'course_colors'
        ]
        
        update_data = {k: v for k, v in data.items() if k in allowed_fields}
        
        preferences = repos['preferences'].update_user_preferences(user_id, update_data)
        
        return jsonify({
            'data': preferences,
            'message': 'Preferences updated successfully',
            'status': 'success'
        })
        
    except Exception as e:
        logger.error(f"Error updating preferences: {e}")
        return jsonify({
            'error': 'Failed to update preferences',
            'status': 'error'
        }), 500

# ===============================
# AI OPTIMIZATION ENDPOINTS
# ===============================

@schedule_bp.route('/ai/optimize', methods=['POST'])
@auth_required
def optimize_schedule():
    """AI-powered schedule optimization"""
    try:
        repos = get_repositories()
        user_id = g.user_id
        data = request.json or {}
        
        # Get current schedule and preferences
        start_date = datetime.fromisoformat(data.get('start_date', datetime.now().isoformat()))
        end_date = start_date + timedelta(days=data.get('days_ahead', 7))
        
        current_sessions = repos['schedule'].get_user_sessions(
            user_id=user_id,
            start_date=start_date,
            end_date=end_date
        )
        
        preferences = repos['preferences'].get_user_preferences(user_id)
        
        # Run AI optimization
        optimization_result = ai_service.optimize_schedule(
            sessions=current_sessions,
            preferences=preferences,
            user_id=user_id,
            optimization_params=data.get('params', {})
        )
        
        # Store AI suggestions
        for suggestion in optimization_result.get('suggestions', []):
            suggestion_data = {
                'user_id': user_id,
                'suggestion_type': 'schedule_optimization',
                'title': suggestion['title'],
                'description': suggestion['description'],
                'suggested_start': suggestion.get('suggested_start'),
                'suggested_duration': suggestion.get('suggested_duration'),
                'suggested_course_id': suggestion.get('course_id'),
                'suggested_cognitive_load': suggestion.get('cognitive_load'),
                'confidence_score': suggestion['confidence_score'],
                'reasoning': suggestion.get('reasoning'),
                'algorithm_version': 'v1.0',
                'priority_score': suggestion.get('priority_score', 0.5),
                'suggestion_metadata': suggestion.get('metadata', {})
            }
            repos['ai_suggestions'].create_suggestion(suggestion_data)
        
        return jsonify({
            'data': optimization_result,
            'message': 'Schedule optimization completed',
            'status': 'success'
        })
        
    except Exception as e:
        logger.error(f"Error in schedule optimization: {e}")
        return jsonify({
            'error': 'Failed to optimize schedule',
            'status': 'error'
        }), 500

@schedule_bp.route('/ai/suggestions', methods=['GET'])
@auth_required
def get_ai_suggestions():
    """Get AI-generated schedule suggestions"""
    try:
        repos = get_repositories()
        user_id = g.user_id
        suggestion_type = request.args.get('type')
        status = request.args.get('status', 'pending')
        limit = int(request.args.get('limit', 10))
        
        suggestions = repos['ai_suggestions'].get_user_suggestions(
            user_id=user_id,
            suggestion_type=suggestion_type,
            status=status,
            limit=limit
        )
        
        return jsonify({
            'data': suggestions,
            'message': 'AI suggestions retrieved successfully',
            'status': 'success'
        })
        
    except Exception as e:
        logger.error(f"Error retrieving AI suggestions: {e}")
        return jsonify({
            'error': 'Failed to retrieve suggestions',
            'status': 'error'
        }), 500

@schedule_bp.route('/ai/suggestions/<suggestion_id>/apply', methods=['POST'])
@auth_required
def apply_ai_suggestion(suggestion_id):
    """Apply an AI suggestion to create/modify sessions"""
    try:
        repos = get_repositories()
        user_id = g.user_id
        suggestion_uuid = uuid.UUID(suggestion_id)
        
        suggestion = repos['ai_suggestions'].get_suggestion_by_id(suggestion_uuid, user_id)
        if not suggestion:
            raise ResourceNotFoundError("Suggestion not found")
        
        # Apply the suggestion based on type
        if suggestion['suggestion_type'] == 'schedule_optimization':
            # Create new session from suggestion
            session_data = {
                'user_id': user_id,
                'title': suggestion['title'],
                'description': suggestion['description'],
                'scheduled_start': suggestion['suggested_start'],
                'scheduled_end': suggestion['suggested_start'] + timedelta(minutes=suggestion['suggested_duration']),
                'duration_minutes': suggestion['suggested_duration'],
                'course_id': suggestion['suggested_course_id'],
                'cognitive_load': suggestion['suggested_cognitive_load'],
                'is_ai_suggested': True,
                'optimization_score': suggestion['confidence_score']
            }
            
            created_session = repos['schedule'].create_session(session_data)
            
            # Update suggestion status
            repos['ai_suggestions'].update_suggestion(suggestion_uuid, {
                'status': 'applied',
                'applied_at': datetime.utcnow()
            })
            
            result_data = {'created_session': created_session}
        
        # Log analytics
        repos['analytics'].log_session_event(
            user_id=user_id,
            event_type='ai_suggestion_applied',
            metadata={
                'suggestion_id': str(suggestion_uuid),
                'suggestion_type': suggestion['suggestion_type'],
                'confidence_score': suggestion['confidence_score']
            }
        )
        
        return jsonify({
            'data': result_data,
            'message': 'AI suggestion applied successfully',
            'status': 'success'
        })
        
    except ResourceNotFoundError as e:
        return jsonify({
            'error': str(e),
            'status': 'error'
        }), 404
    except Exception as e:
        logger.error(f"Error applying AI suggestion: {e}")
        return jsonify({
            'error': 'Failed to apply suggestion',
            'status': 'error'
        }), 500

# ===============================
# ANALYTICS ENDPOINTS
# ===============================

@schedule_bp.route('/analytics/dashboard', methods=['GET'])
@auth_required
def get_schedule_analytics():
    """Get comprehensive schedule analytics for dashboard"""
    try:
        repos = get_repositories()
        user_id = g.user_id
        days_back = int(request.args.get('days_back', 30))
        
        analytics_data = repos['analytics'].get_user_analytics_dashboard(user_id, days_back)
        
        return jsonify({
            'data': analytics_data,
            'message': 'Analytics data retrieved successfully',
            'status': 'success'
        })
        
    except Exception as e:
        logger.error(f"Error retrieving analytics: {e}")
        return jsonify({
            'error': 'Failed to retrieve analytics',
            'status': 'error'
        }), 500

@schedule_bp.route('/analytics/insights', methods=['GET'])
@auth_required
def get_schedule_insights():
    """Get AI-powered schedule insights and recommendations"""
    try:
        repos = get_repositories()
        user_id = g.user_id
        
        # Get recent analytics data
        analytics_data = repos['analytics'].get_user_analytics_dashboard(user_id, 30)
        
        # Generate AI insights
        insights = ai_service.generate_schedule_insights(analytics_data, user_id)
        
        return jsonify({
            'data': insights,
            'message': 'Schedule insights generated successfully',
            'status': 'success'
        })
        
    except Exception as e:
        logger.error(f"Error generating insights: {e}")
        return jsonify({
            'error': 'Failed to generate insights',
            'status': 'error'
        }), 500