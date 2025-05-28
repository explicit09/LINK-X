class LinkXException(Exception):
    """Base exception for LINK-X application"""
    status_code = 500
    message = "An error occurred"
    
    def __init__(self, message=None, status_code=None, payload=None):
        super().__init__()
        if message is not None:
            self.message = message
        if status_code is not None:
            self.status_code = status_code
        self.payload = payload
    
    def to_dict(self):
        rv = dict(self.payload or ())
        rv['error'] = self.message
        return rv

class ValidationError(LinkXException):
    """Raised when validation fails"""
    status_code = 400
    message = "Validation failed"

class AuthenticationError(LinkXException):
    """Raised when authentication fails"""
    status_code = 401
    message = "Authentication failed"

class AuthorizationError(LinkXException):
    """Raised when authorization fails"""
    status_code = 403
    message = "Insufficient permissions"

class NotFoundError(LinkXException):
    """Raised when resource is not found"""
    status_code = 404
    message = "Resource not found"

class ConflictError(LinkXException):
    """Raised when there's a conflict"""
    status_code = 409
    message = "Resource conflict"

class RateLimitError(LinkXException):
    """Raised when rate limit is exceeded"""
    status_code = 429
    message = "Rate limit exceeded"

class ExternalServiceError(LinkXException):
    """Raised when external service fails"""
    status_code = 503
    message = "External service unavailable"

class FileProcessingError(LinkXException):
    """Raised when file processing fails"""
    status_code = 422
    message = "File processing failed"

class DatabaseError(LinkXException):
    """Raised when database operation fails"""
    status_code = 500
    message = "Database operation failed"

def register_error_handlers(app):
    """Register error handlers with Flask app"""
    @app.errorhandler(LinkXException)
    def handle_linkx_exception(error):
        response = error.to_dict()
        return response, error.status_code
    
    @app.errorhandler(404)
    def handle_not_found(error):
        return {'error': 'Endpoint not found'}, 404
    
    @app.errorhandler(405)
    def handle_method_not_allowed(error):
        return {'error': 'Method not allowed'}, 405
    
    @app.errorhandler(500)
    def handle_internal_error(error):
        # Log the error
        app.logger.error(f"Internal error: {error}")
        return {'error': 'Internal server error'}, 500
    
    @app.errorhandler(Exception)
    def handle_unexpected_error(error):
        # Log the error
        app.logger.error(f"Unexpected error: {error}", exc_info=True)
        return {'error': 'An unexpected error occurred'}, 500