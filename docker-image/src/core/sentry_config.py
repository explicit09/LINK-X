"""Sentry configuration for LEARN-X production monitoring"""
import os
import sentry_sdk
from sentry_sdk.integrations.flask import FlaskIntegration
from sentry_sdk.integrations.sqlalchemy import SqlalchemyIntegration
from sentry_sdk.integrations.redis import RedisIntegration
from sentry_sdk.integrations.celery import CeleryIntegration
from sentry_sdk.integrations.logging import LoggingIntegration
import logging


def init_sentry(app=None):
    """Initialize Sentry monitoring with proper configuration"""
    
    # Only initialize in production
    if os.getenv('FLASK_ENV') != 'production':
        return
    
    sentry_dsn = os.getenv('SENTRY_DSN')
    if not sentry_dsn:
        logging.warning("SENTRY_DSN not configured, skipping Sentry initialization")
        return
    
    # Configure logging integration
    sentry_logging = LoggingIntegration(
        level=logging.INFO,  # Capture info and above as breadcrumbs
        event_level=logging.ERROR  # Send errors as events
    )
    
    # Initialize Sentry
    sentry_sdk.init(
        dsn=sentry_dsn,
        integrations=[
            FlaskIntegration(
                transaction_style='endpoint',
                failed_request_status_codes=[400, 401, 403, 404, 405, 500, 502, 503, 504]
            ),
            SqlalchemyIntegration(),
            RedisIntegration(),
            CeleryIntegration(
                monitor_beat_tasks=True,
                propagate_traces=True
            ),
            sentry_logging
        ],
        
        # Performance monitoring
        traces_sample_rate=float(os.getenv('SENTRY_TRACES_SAMPLE_RATE', '0.1')),
        profiles_sample_rate=float(os.getenv('SENTRY_PROFILES_SAMPLE_RATE', '0.1')),
        
        # Environment configuration
        environment=os.getenv('SENTRY_ENVIRONMENT', 'production'),
        release=os.getenv('APP_VERSION', 'unknown'),
        
        # Options
        attach_stacktrace=True,
        send_default_pii=False,  # Don't send personally identifiable information
        
        # Before send hook for filtering
        before_send=before_send_filter,
        
        # Breadcrumb filtering
        before_breadcrumb=before_breadcrumb_filter,
        
        # Additional options
        max_breadcrumbs=50,
        debug=False,
        
        # Ignore specific errors
        ignore_errors=[
            KeyboardInterrupt,
            SystemExit,
            'werkzeug.exceptions.NotFound',
            'werkzeug.exceptions.MethodNotAllowed',
        ]
    )
    
    # Set user context if available
    if app:
        @app.before_request
        def sentry_set_user_context():
            """Set user context for Sentry error tracking"""
            from flask import g
            if hasattr(g, 'current_user') and g.current_user:
                sentry_sdk.set_user({
                    "id": g.current_user.id,
                    "email": g.current_user.email,
                    "role": g.current_user.role
                })
                
        @app.after_request
        def sentry_add_transaction_info(response):
            """Add transaction info to Sentry"""
            from flask import request
            sentry_sdk.set_tag("endpoint", request.endpoint or "unknown")
            sentry_sdk.set_tag("method", request.method)
            sentry_sdk.set_tag("status_code", response.status_code)
            return response


def before_send_filter(event, hint):
    """Filter sensitive data before sending to Sentry"""
    
    # Filter out sensitive headers
    if 'request' in event and 'headers' in event['request']:
        sensitive_headers = ['authorization', 'cookie', 'x-api-key', 'x-auth-token']
        for header in sensitive_headers:
            if header in event['request']['headers']:
                event['request']['headers'][header] = '[FILTERED]'
    
    # Filter out sensitive data from request body
    if 'request' in event and 'data' in event['request']:
        if isinstance(event['request']['data'], dict):
            sensitive_fields = ['password', 'token', 'secret', 'api_key', 'private_key']
            for field in sensitive_fields:
                if field in event['request']['data']:
                    event['request']['data'][field] = '[FILTERED]'
    
    # Filter out sensitive query parameters
    if 'request' in event and 'query_string' in event['request']:
        # Parse and filter query string
        from urllib.parse import parse_qs, urlencode
        qs = parse_qs(event['request']['query_string'])
        for param in ['token', 'api_key', 'secret']:
            if param in qs:
                qs[param] = ['[FILTERED]']
        event['request']['query_string'] = urlencode(qs, doseq=True)
    
    # Add custom tags
    event['tags'] = event.get('tags', {})
    event['tags']['app'] = 'learn-x'
    
    return event


def before_breadcrumb_filter(crumb, hint):
    """Filter breadcrumbs before recording"""
    
    # Filter out noisy breadcrumbs
    if crumb.get('category') == 'query' and 'select 1' in str(crumb.get('message', '')).lower():
        # Skip health check queries
        return None
    
    # Filter sensitive data from log messages
    if crumb.get('category') == 'log':
        message = str(crumb.get('message', ''))
        sensitive_patterns = ['password=', 'token=', 'Bearer ', 'api_key=']
        for pattern in sensitive_patterns:
            if pattern in message:
                crumb['message'] = '[FILTERED - Contains sensitive data]'
                break
    
    return crumb


def capture_message(message, level='info', **kwargs):
    """Wrapper for Sentry capture_message with additional context"""
    if os.getenv('FLASK_ENV') == 'production':
        sentry_sdk.capture_message(message, level=level, **kwargs)


def capture_exception(exception, **kwargs):
    """Wrapper for Sentry capture_exception with additional context"""
    if os.getenv('FLASK_ENV') == 'production':
        sentry_sdk.capture_exception(exception, **kwargs)