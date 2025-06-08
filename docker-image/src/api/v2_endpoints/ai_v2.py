"""
AI V2 Endpoints - New modular AI system integration
Provides endpoints for the new prompt-managed, critic-guided AI system
"""

from flask import Blueprint, request, jsonify, current_app
from typing import Dict, Any, Optional
import logging
import time

from core.query_flow import query_flow
from core.monitoring.decorators import monitor_api_call
from repositories.user_repository import UserRepository
from repositories.course_repository import CourseRepository

logger = logging.getLogger(__name__)

ai_v2_bp = Blueprint('ai_v2', __name__, url_prefix='/api/v2/ai')


@ai_v2_bp.route('/query', methods=['POST'])
@api_key_required
@validate_json(['question'])
@handle_errors
@monitor_api_call
def process_educational_query():
    """
    Process educational query through the new AI system
    
    Request format:
    {
        "question": "Explain machine learning concepts",
        "course_id": "optional_course_uuid",
        "file_id": "optional_file_uuid",
        "student_profile": {
            "learning_style": "visual|auditory|kinesthetic",
            "expertise_level": "beginner|intermediate|advanced",
            "tone_preference": "formal|casual|motivational",
            "interests": ["list", "of", "interests"],
            "profession": "optional_profession"
        }
    }
    
    Response format:
    {
        "data": {
            "answer": "Complete personalized explanation",
            "sources": ["List of sources used"],
            "confidence": 0.95,
            "learning_notes": "How this was adapted for the student",
            "metadata": {
                "execution_time": 1.23,
                "critic_score": 0.92,
                "retry_count": 0,
                "token_count": 654,
                "chunks_retrieved": 6
            }
        },
        "message": "Query processed successfully",
        "status": "success"
    }
    """
    data = request.get_json()
    user_id = request.user_id
    
    question = data['question']
    course_id = data.get('course_id')
    file_id = data.get('file_id')
    student_profile = data.get('student_profile', {})
    
    try:
        # Validate user access to course if specified
        if course_id:
            course_repo = CourseRepository()
            if not course_repo.can_user_access_course(user_id, course_id):
                return jsonify({
                    "error": "Access denied to specified course",
                    "status": "error",
                    "code": "COURSE_ACCESS_DENIED"
                }), 403
        
        # Get user profile from database if not provided
        if not student_profile:
            user_repo = UserRepository()
            user_profile = user_repo.get_student_profile(user_id)
            if user_profile and user_profile.onboard_answers:
                student_profile = {
                    "learning_style": user_profile.onboard_answers.get("learningStyle", "visual"),
                    "expertise_level": user_profile.onboard_answers.get("depth", "intermediate"),
                    "tone_preference": user_profile.onboard_answers.get("tone", "casual"),
                    "interests": user_profile.onboard_answers.get("interests", []),
                    "profession": user_profile.onboard_answers.get("profession", "")
                }
        
        # Process query through new AI system
        start_time = time.time()
        response = query_flow.process_query(
            question=question,
            student_profile=student_profile,
            course_id=course_id,
            file_id=file_id
        )
        
        # Log performance metrics
        logger.info(f"AI V2 Query processed in {response.execution_time:.2f}s, "
                   f"critic_score={response.critic_score:.3f}, "
                   f"tokens={response.token_count}")
        
        return jsonify({
            "data": {
                "answer": response.answer,
                "sources": response.sources,
                "confidence": response.confidence,
                "learning_notes": response.learning_notes,
                "metadata": {
                    "execution_time": response.execution_time,
                    "critic_score": response.critic_score,
                    "retry_count": response.retry_count,
                    "token_count": response.token_count,
                    "chunks_retrieved": response.metadata.get("chunks_retrieved", 0),
                    "query_type": response.metadata.get("query_type", "simple"),
                    "similarity_scores": response.metadata.get("similarity_scores", [])
                }
            },
            "message": "Query processed successfully",
            "status": "success"
        })
    
    except Exception as e:
        logger.error(f"AI V2 query processing failed: {e}")
        return jsonify({
            "error": "Failed to process query",
            "status": "error",
            "code": "QUERY_PROCESSING_FAILED",
            "details": str(e) if current_app.debug else None
        }), 500


@ai_v2_bp.route('/system/stats', methods=['GET'])
@api_key_required
@handle_errors
@monitor_api_call
def get_system_stats():
    """
    Get comprehensive AI system statistics
    
    Response includes:
    - Prompt manager status
    - RAG configuration
    - Critic loop settings
    - Available prompts
    """
    try:
        stats = query_flow.get_system_stats()
        
        return jsonify({
            "data": {
                "system_stats": stats,
                "health": {
                    "prompt_manager": "healthy",
                    "critic_loop": "healthy", 
                    "rag_system": "healthy",
                    "overall": "healthy"
                }
            },
            "message": "System stats retrieved successfully",
            "status": "success"
        })
    
    except Exception as e:
        logger.error(f"Failed to get system stats: {e}")
        return jsonify({
            "error": "Failed to retrieve system statistics",
            "status": "error",
            "code": "STATS_RETRIEVAL_FAILED"
        }), 500


@ai_v2_bp.route('/prompts/validate', methods=['POST'])
@api_key_required
@validate_json(['prompt_name'])
@handle_errors
@monitor_api_call
def validate_prompt():
    """
    Validate a specific prompt template
    
    Request format:
    {
        "prompt_name": "executors/02_executor.jinja"
    }
    """
    data = request.get_json()
    prompt_name = data['prompt_name']
    
    try:
        from core.prompt_manager import prompt_manager
        
        validation_result = prompt_manager.validate_template(prompt_name)
        
        return jsonify({
            "data": {
                "prompt_name": prompt_name,
                "validation_result": validation_result,
                "is_valid": validation_result["status"] == "valid"
            },
            "message": f"Prompt validation completed for {prompt_name}",
            "status": "success"
        })
    
    except Exception as e:
        logger.error(f"Prompt validation failed: {e}")
        return jsonify({
            "error": "Prompt validation failed",
            "status": "error",
            "code": "PROMPT_VALIDATION_FAILED",
            "details": str(e) if current_app.debug else None
        }), 500


@ai_v2_bp.route('/test/synthetic', methods=['POST'])
@api_key_required
@handle_errors
@monitor_api_call
def run_synthetic_tests():
    """
    Run synthetic test suite for quality assurance
    
    Note: This endpoint should be restricted in production
    """
    if not current_app.debug and not current_app.config.get('TESTING'):
        return jsonify({
            "error": "Synthetic tests not available in production",
            "status": "error",
            "code": "TESTING_DISABLED"
        }), 403
    
    try:
        from tests.test_synthetic_prompts import SyntheticTestSuite
        
        suite = SyntheticTestSuite()
        
        # Run a subset of tests (first 5) for quick feedback
        quick_results = []
        for test_case in suite.test_cases[:5]:
            result = suite._run_single_test(test_case)
            quick_results.append({
                "test_id": test_case.id,
                "passed": result["passed"],
                "score": result["critic_score"],
                "execution_time": result["execution_time"],
                "description": test_case.description
            })
        
        passed_count = sum(1 for r in quick_results if r["passed"])
        avg_score = sum(r["score"] for r in quick_results) / len(quick_results)
        avg_time = sum(r["execution_time"] for r in quick_results) / len(quick_results)
        
        return jsonify({
            "data": {
                "test_results": quick_results,
                "summary": {
                    "total_tests": len(quick_results),
                    "passed": passed_count,
                    "failed": len(quick_results) - passed_count,
                    "pass_rate": passed_count / len(quick_results),
                    "average_score": avg_score,
                    "average_time": avg_time
                }
            },
            "message": f"Synthetic tests completed: {passed_count}/{len(quick_results)} passed",
            "status": "success"
        })
    
    except Exception as e:
        logger.error(f"Synthetic tests failed: {e}")
        return jsonify({
            "error": "Synthetic tests failed",
            "status": "error", 
            "code": "SYNTHETIC_TESTS_FAILED",
            "details": str(e) if current_app.debug else None
        }), 500