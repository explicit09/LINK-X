"""
Streaming personalization endpoints for real-time content generation
Compatibility wrapper for the modular streaming components
"""
import logging
from .streaming import PersonalizationAPI

logger = logging.getLogger(__name__)


def register_streaming_routes(app, Session, openai_client):
    """
    Register all streaming personalization routes
    
    This function maintains backward compatibility by wrapping
    the new modular PersonalizationAPI implementation.
    """
    # Create API handler instance
    api = PersonalizationAPI(Session, openai_client)
    
    # Register routes with original paths and methods
    @app.route('/api/personalize/<file_id>/check', methods=['GET', 'OPTIONS'])
    def check_personalized_content(file_id):
        """Check if personalized content already exists for this user and file"""
        return api.check_personalized_content(file_id)
    
    @app.route('/api/personalize/<file_id>/save', methods=['POST', 'OPTIONS'])
    def save_personalized_content(file_id):
        """Save personalized content to database"""
        return api.save_personalized_content(file_id)
    
    @app.route('/api/personalize/<file_id>/outline', methods=['GET', 'OPTIONS'])
    def get_personalization_outline(file_id):
        """
        Get document outline immediately for skeleton UI
        Returns chapter structure without content
        """
        return api.get_personalization_outline(file_id)
    
    @app.route('/api/personalize/<file_id>/stream', methods=['POST', 'OPTIONS'])
    def stream_personalized_content(file_id):
        """
        Stream personalized content generation in real-time
        Client receives tokens as they're generated
        """
        return api.stream_personalized_content(file_id)
    
    logger.info("Streaming personalization routes registered successfully")