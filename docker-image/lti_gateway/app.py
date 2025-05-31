#!/usr/bin/env python3
"""
LTI 1.3 Gateway - Security-hardened microservice for LMS integration
BRUTAL EXECUTION: No shortcuts, IMS compliance only
"""

import os
import json
import time
import logging
from typing import Dict, Any, Optional
from flask import Flask, request, session, redirect, jsonify, render_template_string
from flask_cors import CORS
from pylti1p3.contrib.flask import FlaskOIDCLogin, FlaskMessageLaunch, FlaskRequest
from pylti1p3.tool_config import ToolConfJsonFile
from pylti1p3.registration import Registration
from pylti1p3.message_launch import MessageLaunch
from pylti1p3.deep_link import DeepLink
from pylti1p3.grade import Grade
from pylti1p3.names_roles import NamesRolesProvisioningService
import structlog
from database.db_manager import db_manager, LTIPlatform
from ags_service import ags_service, GradeScore
from nrps_service import nrps_service
from deep_linking_service import deep_linking_service
from learn_x_integration import learn_x_integration

# Initialize structured logging
structlog.configure(
    processors=[
        structlog.stdlib.filter_by_level,
        structlog.stdlib.add_logger_name,
        structlog.stdlib.add_log_level,
        structlog.stdlib.PositionalArgumentsFormatter(),
        structlog.processors.TimeStamper(fmt="iso"),
        structlog.processors.StackInfoRenderer(),
        structlog.processors.format_exc_info,
        structlog.processors.UnicodeDecoder(),
        structlog.processors.JSONRenderer()
    ],
    context_class=dict,
    logger_factory=structlog.stdlib.LoggerFactory(),
    wrapper_class=structlog.stdlib.BoundLogger,
    cache_logger_on_first_use=True,
)

logger = structlog.get_logger()

# Flask app configuration
app = Flask(__name__)
app.secret_key = os.environ.get('FLASK_SECRET_KEY', 'dev-key-change-in-production')

# CORS configuration
CORS(app, origins=os.environ.get('ALLOWED_ORIGINS', '*').split(','))

# LTI configuration paths
LTI_CONFIG_PATH = os.environ.get('LTI_CONFIG_PATH', './configs/lti_config.json')
LTI_PRIVATE_KEY_PATH = os.environ.get('LTI_PRIVATE_KEY_PATH', './configs/private.key')

# LEARN-X Core API configuration
LEARN_X_API_BASE = os.environ.get('LEARN_X_API_BASE', 'http://localhost:5000')
LEARN_X_AUTH_TOKEN = os.environ.get('LEARN_X_AUTH_TOKEN', 'dev-token')

class LTIGateway:
    """
    LTI 1.3 Gateway - Security-hardened implementation
    
    Features:
    - Multi-tenant isolation (iss + client_id + deployment_id)
    - JWT validation with nonce protection
    - Grade passback via background queue
    - Names & Roles provisioning
    - Deep linking support
    """
    
    def __init__(self):
        self.tool_config = ToolConfJsonFile(LTI_CONFIG_PATH)
        self.launch_data_storage = {}  # TODO: Replace with Redis in production
        self.nonce_storage = set()     # TODO: Replace with Redis with TTL
        self._request = None           # Store current request for LaunchDataStorage interface
        
    def get_launch_data(self, launch_id: str) -> Optional[Dict[str, Any]]:
        """Retrieve launch data by ID"""
        return self.launch_data_storage.get(launch_id)
    
    def set_launch_data(self, launch_id: str, data: Dict[str, Any]) -> None:
        """Store launch data with ID"""
        self.launch_data_storage[launch_id] = data
    
    def set_request(self, request) -> None:
        """Set current request (LaunchDataStorage interface)"""
        self._request = request
    
    def get_request(self):
        """Get current request (LaunchDataStorage interface)"""
        return self._request
    
    def check_nonce(self, nonce: str) -> bool:
        """Check and consume nonce (prevents replay attacks)"""
        if nonce in self.nonce_storage:
            return False  # Nonce already used
        self.nonce_storage.add(nonce)
        # TODO: Add TTL cleanup for nonces (12 hours)
        return True

# Initialize LTI Gateway
lti_gateway = LTIGateway()

def get_tool_conf():
    """Get tool configuration for current request"""
    return lti_gateway.tool_config

@app.route('/health', methods=['GET'])
def health_check():
    """Health check endpoint for load balancer"""
    # Check database connectivity
    db_health = db_manager.health_check()
    
    overall_status = 'healthy' if db_health['status'] == 'healthy' else 'unhealthy'
    
    return jsonify({
        'status': overall_status,
        'service': 'lti-gateway',
        'database': db_health,
        'timestamp': time.time(),
        'version': '1.0.0'
    }), 200 if overall_status == 'healthy' else 503

@app.route('/login', methods=['POST'])
def login():
    """
    LTI 1.3 OIDC Login Flow - Step 1
    Validates login request and redirects to platform auth
    """
    start_time = time.time()
    
    try:
        # Initialize OIDC login
        tool_conf = get_tool_conf()
        flask_request = FlaskOIDCLogin(
            FlaskRequest(),
            tool_conf
        )
        
        # Get platform registration
        iss = request.form.get('iss')
        client_id = request.form.get('client_id')
        deployment_id = request.form.get('lti_deployment_id')
        
        if not iss or not client_id:
            logger.error("Missing required OIDC parameters", 
                        iss=iss, client_id=client_id)
            return "Missing required parameters", 400
        
        # SECURITY: Validate platform is registered (multi-tenant isolation)
        platform = db_manager.get_platform(iss, client_id, deployment_id)
        if not platform:
            logger.error("Unregistered platform attempted access",
                        iss=iss, client_id=client_id, deployment_id=deployment_id)
            return "Platform not registered", 403
        
        # Log login attempt
        logger.info("LTI OIDC Login", 
                   iss=iss, 
                   client_id=client_id,
                   user_agent=request.headers.get('User-Agent', ''))
        
        # Redirect to platform authorization  
        launch_url = request.form.get('target_link_uri', f"{request.host_url}launch")
        redirect_response = flask_request.redirect(launch_url)
        
        # Log successful login redirect
        latency_ms = (time.time() - start_time) * 1000
        logger.info("OIDC Login Success", 
                   iss=iss,
                   client_id=client_id,
                   latency_ms=latency_ms)
        
        return redirect_response
        
    except Exception as e:
        latency_ms = (time.time() - start_time) * 1000
        logger.error("OIDC Login Failed", 
                    error=str(e),
                    latency_ms=latency_ms,
                    exc_info=True)
        return f"Login failed: {str(e)}", 500

@app.route('/launch', methods=['POST'])
def launch():
    """
    LTI 1.3 Launch Flow - Step 2
    Validates JWT and launches into LEARN-X
    """
    start_time = time.time()
    
    try:
        # Initialize message launch
        tool_conf = get_tool_conf()
        flask_request = FlaskMessageLaunch(
            FlaskRequest(),
            tool_conf
        )
        
        # Validate launch
        message_launch = flask_request.validate()
        
        # Extract launch claims
        launch_data = message_launch.get_launch_data()
        iss = launch_data.get('iss')
        client_id = launch_data.get('aud')[0] if launch_data.get('aud') else None
        deployment_id = launch_data.get('https://purl.imsglobal.org/spec/lti/claim/deployment_id')
        user_sub = launch_data.get('sub')
        context_id = launch_data.get('https://purl.imsglobal.org/spec/lti/claim/context', {}).get('id')
        
        # SECURITY: Multi-tenant isolation check
        if not iss or not client_id or not deployment_id:
            logger.error("Missing tenant isolation parameters",
                        iss=iss, client_id=client_id, deployment_id=deployment_id)
            return "Invalid launch: missing tenant parameters", 400
        
        # SECURITY: Validate platform is registered
        platform = db_manager.get_platform(iss, client_id, deployment_id)
        if not platform:
            logger.error("Unregistered platform in launch",
                        iss=iss, client_id=client_id, deployment_id=deployment_id)
            return "Platform not registered", 403
        
        # SECURITY: Check nonce for replay protection
        nonce = launch_data.get('nonce')
        jti = launch_data.get('jti')  # Additional JWT ID protection
        
        # Extract user information
        user_data = {
            'sub': user_sub,
            'name': launch_data.get('name', ''),
            'email': launch_data.get('email', ''),
            'roles': launch_data.get('https://purl.imsglobal.org/spec/lti/claim/roles', [])
        }
        
        # Extract context information
        context_data = launch_data.get('https://purl.imsglobal.org/spec/lti/claim/context', {})
        
        # Create launch session in database
        try:
            launch_session_data = {
                'platform_id': platform.id,
                'user_sub': user_sub,
                'context_id': context_id,
                'resource_link_id': launch_data.get('https://purl.imsglobal.org/spec/lti/claim/resource_link', {}).get('id'),
                'launch_claims': launch_data,
                'nonce': nonce,
                'jti': jti,
                'ip_address': request.remote_addr,
                'user_agent': request.headers.get('User-Agent', '')
            }
            
            launch_id = db_manager.create_launch_session(launch_session_data)
            
        except ValueError as e:
            if "Nonce replay" in str(e):
                logger.error("Nonce replay attack blocked", 
                           nonce=nonce, user_sub=user_sub, platform_id=platform.id)
                return "Security violation: replay attack detected", 403
            raise
        
        # Check if this is a deep linking request
        if message_launch.is_deep_link_launch():
            return handle_deep_linking(message_launch, platform, launch_data, start_time)
        
        # Handle user linking (LTI user ↔ LEARN-X user)
        user_link = db_manager.get_user_link(platform.id, user_sub)
        learn_x_user_id = None
        
        if user_link:
            # Existing user link
            learn_x_user_id = user_link.learn_x_user_id
            db_manager.update_user_link_usage(platform.id, user_sub)
            
            logger.info("Existing user link found",
                       platform_id=platform.id, 
                       user_sub=user_sub,
                       learn_x_user_id=learn_x_user_id)
        else:
            # First-time user - needs linking
            logger.info("First-time LTI user - needs linking",
                       platform_id=platform.id,
                       user_sub=user_sub,
                       email=user_data.get('email'))
            
            # For now, auto-provision - in production, show merge screen
            learn_x_user_id = handle_user_provisioning(platform.id, user_sub, user_data)
        
        # Authenticate with LEARN-X Core API
        auth_result = learn_x_integration.authenticate_lti_user(
            launch_id=launch_id,
            platform_id=platform.id,
            user_sub=user_sub,
            user_data=user_data
        )
        
        if not auth_result.success:
            logger.error("LEARN-X authentication failed",
                        launch_id=launch_id,
                        error=auth_result.error)
            return f"Authentication failed: {auth_result.error}", 500
        
        # Sync course context if available
        if context_id and context_data:
            course_id = learn_x_integration.sync_course_to_learn_x(
                platform_id=platform.id,
                context_id=context_id,
                context_data=context_data
            )
            if course_id:
                logger.info("Course synchronized with LEARN-X",
                           context_id=context_id,
                           learn_x_course_id=course_id)
        
        # Log successful launch
        latency_ms = (time.time() - start_time) * 1000
        logger.info("LTI Launch Success",
                   launch_id=launch_id,
                   platform_id=platform.id,
                   user_sub=user_sub,
                   context_id=context_id,
                   learn_x_user_id=auth_result.user_id,
                   latency_ms=latency_ms)
        
        # Audit log the successful launch
        db_manager.log_audit_event({
            'event_type': 'launch_success',
            'platform_id': platform.id,
            'user_sub': user_sub,
            'ip_address': request.remote_addr,
            'user_agent': request.headers.get('User-Agent'),
            'event_data': {
                'launch_id': launch_id,
                'context_id': context_id,
                'learn_x_user_id': auth_result.user_id,
                'latency_ms': latency_ms
            }
        })
        
        # Redirect to LEARN-X with authentication
        if auth_result.redirect_url:
            return redirect(auth_result.redirect_url)
        else:
            # Fallback redirect
            return redirect(f"{LEARN_X_API_BASE}/lti/authenticate?token={auth_result.token}&launch_id={launch_id}")
        
    except Exception as e:
        latency_ms = (time.time() - start_time) * 1000
        logger.error("LTI Launch Failed",
                    error=str(e),
                    latency_ms=latency_ms,
                    exc_info=True)
        return f"Launch failed: {str(e)}", 500

def handle_user_provisioning(platform_id: str, user_sub: str, user_data: Dict[str, Any]) -> str:
    """
    Handle first-time user provisioning
    
    TODO: In production, implement 30-second merge screen
    For now, auto-provision for testing
    """
    import uuid
    
    # Generate temporary LEARN-X user ID
    # TODO: Integrate with actual LEARN-X user creation API
    learn_x_user_id = str(uuid.uuid4())
    
    # Create user link
    link_data = {
        'platform_id': platform_id,
        'user_sub': user_sub,
        'lti_user_data': user_data,
        'learn_x_user_id': learn_x_user_id,
        'link_method': 'auto_provision',
        'verified': False  # User should confirm in production
    }
    
    link_id = db_manager.create_user_link(link_data)
    
    logger.info("User auto-provisioned",
               platform_id=platform_id,
               user_sub=user_sub,
               learn_x_user_id=learn_x_user_id,
               link_id=link_id)
    
    return learn_x_user_id

def generate_learn_x_auth_token(launch_id: str, platform_id: str, user_sub: str, 
                               learn_x_user_id: str, context_id: str) -> str:
    """
    Generate secure authentication token for LEARN-X Core API
    
    TODO: Implement proper JWT signing with shared secret
    """
    import base64
    
    token_data = {
        'launch_id': launch_id,
        'platform_id': platform_id,
        'user_sub': user_sub,
        'learn_x_user_id': learn_x_user_id,
        'context_id': context_id,
        'timestamp': time.time(),
        'expires': time.time() + (8 * 3600)  # 8 hours
    }
    
    # TODO: Replace with proper JWT signing using HS256 or RS256
    token_json = json.dumps(token_data)
    token = base64.b64encode(token_json.encode()).decode()
    
    return token

def handle_deep_linking(message_launch: MessageLaunch, platform: LTIPlatform, 
                       launch_data: Dict[str, Any], start_time: float) -> str:
    """
    Handle LTI Deep Linking requests
    Allows instructors to select LEARN-X content
    """
    try:
        # Create deep link response
        deep_link = message_launch.get_deep_link()
        
        # Get context information
        context_id = launch_data.get('https://purl.imsglobal.org/spec/lti/claim/context', {}).get('id')
        
        # Get available content from LEARN-X
        available_content = deep_linking_service.get_available_content(
            platform_id=platform.id,
            context_id=context_id
        )
        
        # Convert to LTI format
        content_items = []
        for content in available_content:
            content_item = {
                'type': content.content_type,
                'title': content.title,
                'url': content.target_url
            }
            
            if content.description:
                content_item['text'] = content.description
            
            if content.custom_params:
                content_item['custom'] = content.custom_params
            
            if content.icon_url:
                content_item['icon'] = {
                    'url': content.icon_url,
                    'width': 32,
                    'height': 32
                }
            
            content_items.append(content_item)
        
        # Build deep link response
        resource = deep_link.output_response_form(content_items)
        
        latency_ms = (time.time() - start_time) * 1000
        logger.info("Deep Link Success", 
                   platform_id=platform.id,
                   content_count=len(content_items),
                   latency_ms=latency_ms)
        
        return resource
        
    except Exception as e:
        logger.error("Deep Link Failed", 
                    platform_id=platform.id,
                    error=str(e), 
                    exc_info=True)
        return f"Deep linking failed: {str(e)}", 500

def generate_learn_x_token(user_data: Dict[str, Any], context_data: Dict[str, Any], 
                          iss: str, deployment_id: str) -> str:
    """
    Generate authentication token for LEARN-X Core API
    
    TODO: Implement proper JWT signing with shared secret
    """
    import base64
    
    token_data = {
        'user': user_data,
        'context': context_data,
        'iss': iss,
        'deployment_id': deployment_id,
        'timestamp': time.time()
    }
    
    # For now, use base64 encoding
    # TODO: Replace with proper JWT signing
    token_json = json.dumps(token_data)
    token = base64.b64encode(token_json.encode()).decode()
    
    return token

@app.route('/jwks', methods=['GET'])
def get_jwks():
    """
    JSON Web Key Set endpoint
    Required for LTI 1.3 public key verification
    """
    try:
        # TODO: Load from secure key storage
        # For now, return static JWKS for testing
        jwks_path = os.path.join(os.path.dirname(LTI_PRIVATE_KEY_PATH), 'public.jwks')
        with open(jwks_path, 'r') as f:
            jwks = json.load(f)
        
        return jsonify(jwks)
        
    except Exception as e:
        logger.error("JWKS retrieval failed", error=str(e))
        return jsonify({'error': 'JWKS unavailable'}), 500

@app.route('/config', methods=['GET'])
def get_config():
    """
    Tool configuration endpoint for dynamic registration
    """
    try:
        base_url = request.host_url.rstrip('/')
        
        config = {
            "title": "LEARN-X AI Tutor",
            "description": "Personalized AI tutoring platform",
            "oidc_initiation_url": f"{base_url}/login",
            "target_link_uri": f"{base_url}/launch",
            "scopes": [
                "https://purl.imsglobal.org/spec/lti-ags/scope/lineitem",
                "https://purl.imsglobal.org/spec/lti-ags/scope/score",
                "https://purl.imsglobal.org/spec/lti-nrps/scope/contextmembership.readonly"
            ],
            "extensions": [
                {
                    "domain": request.host,
                    "tool_id": "learn-x-ai-tutor",
                    "platform": "canvas.instructure.com",
                    "settings": {
                        "placements": [
                            {
                                "placement": "course_navigation",
                                "message_type": "LtiResourceLinkRequest",
                                "target_link_uri": f"{base_url}/launch",
                                "text": "LEARN-X Tutor"
                            },
                            {
                                "placement": "assignment_selection",
                                "message_type": "LtiDeepLinkingRequest", 
                                "target_link_uri": f"{base_url}/launch"
                            }
                        ]
                    }
                }
            ],
            "public_jwk_url": f"{base_url}/jwks",
            "custom_fields": {
                "user_username": "$User.username",
                "course_id": "$Course.id",
                "assignment_id": "$Assignment.id"
            }
        }
        
        return jsonify(config)
        
    except Exception as e:
        logger.error("Config retrieval failed", error=str(e))
        return jsonify({'error': 'Configuration unavailable'}), 500

@app.errorhandler(404)
def not_found(error):
    """Handle 404 errors"""
    return jsonify({'error': 'Endpoint not found'}), 404

@app.route('/ags/lineitem', methods=['POST'])
def create_line_item():
    """Create new line item (assignment) via AGS"""
    try:
        # Validate request
        if not request.is_json:
            return jsonify({'error': 'Content-Type must be application/json'}), 400
        
        data = request.get_json()
        platform_id = data.get('platform_id')
        course_link_id = data.get('course_link_id')
        
        if not platform_id or not course_link_id:
            return jsonify({'error': 'Missing platform_id or course_link_id'}), 400
        
        # Create line item
        line_item_id = ags_service.create_line_item(
            platform_id=platform_id,
            course_link_id=course_link_id,
            line_item_data=data.get('line_item', {})
        )
        
        return jsonify({
            'status': 'success',
            'line_item_id': line_item_id,
            'message': 'Line item created successfully'
        }), 201
        
    except Exception as e:
        logger.error("Line item creation failed", error=str(e))
        return jsonify({'error': str(e)}), 500

@app.route('/ags/lineitem/<platform_id>/<course_link_id>', methods=['GET'])
def get_line_items(platform_id: str, course_link_id: str):
    """Get line items for a course"""
    try:
        line_items = ags_service.get_line_items(platform_id, course_link_id)
        
        return jsonify({
            'status': 'success',
            'line_items': [
                {
                    'id': item.id,
                    'line_item_id': item.line_item_id,
                    'label': item.label,
                    'max_score': item.max_score,
                    'resource_id': item.resource_id,
                    'active': item.active
                }
                for item in line_items
            ]
        }), 200
        
    except Exception as e:
        logger.error("Failed to get line items", error=str(e))
        return jsonify({'error': str(e)}), 500

@app.route('/ags/grade', methods=['POST'])
def submit_grade():
    """Submit grade via AGS"""
    try:
        # Validate request
        if not request.is_json:
            return jsonify({'error': 'Content-Type must be application/json'}), 400
        
        data = request.get_json()
        
        # Required fields
        required_fields = ['platform_id', 'line_item_id', 'user_link_id', 'score_given', 'score_maximum']
        for field in required_fields:
            if field not in data:
                return jsonify({'error': f'Missing required field: {field}'}), 400
        
        # Create grade score
        grade_score = GradeScore(
            user_id=data.get('user_id', 'unknown'),
            score_given=float(data['score_given']),
            score_maximum=float(data['score_maximum']),
            activity_progress=data.get('activity_progress', 'Completed'),
            grading_progress=data.get('grading_progress', 'FullyGraded'),
            comment=data.get('comment')
        )
        
        # Submit grade
        success = ags_service.submit_grade(
            platform_id=data['platform_id'],
            line_item_id=data['line_item_id'],
            user_link_id=data['user_link_id'],
            grade_score=grade_score
        )
        
        if success:
            return jsonify({
                'status': 'success',
                'message': 'Grade submitted successfully'
            }), 200
        else:
            return jsonify({'error': 'Failed to submit grade'}), 500
        
    except Exception as e:
        logger.error("Grade submission failed", error=str(e))
        return jsonify({'error': str(e)}), 500

@app.route('/ags/process-grades', methods=['POST'])
def process_pending_grades():
    """Process pending grade syncs (background task endpoint)"""
    try:
        limit = request.args.get('limit', 50, type=int)
        processed_count = ags_service.process_pending_grades(limit)
        
        return jsonify({
            'status': 'success',
            'processed_count': processed_count,
            'message': f'Processed {processed_count} pending grades'
        }), 200
        
    except Exception as e:
        logger.error("Failed to process grades", error=str(e))
        return jsonify({'error': str(e)}), 500

@app.route('/nrps/sync-roster', methods=['POST'])
def sync_roster():
    """Synchronize roster from LMS via NRPS"""
    try:
        # Validate request
        if not request.is_json:
            return jsonify({'error': 'Content-Type must be application/json'}), 400
        
        data = request.get_json()
        
        # Required fields
        required_fields = ['platform_id', 'course_link_id', 'memberships_url']
        for field in required_fields:
            if field not in data:
                return jsonify({'error': f'Missing required field: {field}'}), 400
        
        # Sync roster
        result = nrps_service.sync_roster(
            platform_id=data['platform_id'],
            course_link_id=data['course_link_id'],
            memberships_url=data['memberships_url']
        )
        
        if result['status'] == 'success':
            return jsonify({
                'status': 'success',
                'result': result,
                'message': 'Roster synchronized successfully'
            }), 200
        else:
            return jsonify({
                'status': 'error',
                'error': result.get('error', 'Unknown error'),
                'message': 'Roster synchronization failed'
            }), 500
        
    except Exception as e:
        logger.error("Roster sync failed", error=str(e))
        return jsonify({'error': str(e)}), 500

@app.route('/nrps/roster/<platform_id>/<course_link_id>', methods=['GET'])
def get_roster(platform_id: str, course_link_id: str):
    """Get roster members for a course"""
    try:
        status = request.args.get('status', 'Active')
        members = nrps_service.get_roster_members(platform_id, course_link_id, status)
        
        return jsonify({
            'status': 'success',
            'members': [
                {
                    'id': member.id,
                    'user_id': member.user_id,
                    'name': member.name,
                    'email': member.email,
                    'roles': member.roles,
                    'status': member.status,
                    'first_seen': member.first_seen.isoformat() if member.first_seen else None,
                    'last_seen': member.last_seen.isoformat() if member.last_seen else None
                }
                for member in members
            ],
            'total_members': len(members)
        }), 200
        
    except Exception as e:
        logger.error("Failed to get roster", error=str(e))
        return jsonify({'error': str(e)}), 500

@app.route('/nrps/member-roles/<platform_id>/<course_link_id>/<user_id>', methods=['GET'])
def get_member_roles(platform_id: str, course_link_id: str, user_id: str):
    """Get roles for a specific member"""
    try:
        roles = nrps_service.get_member_roles(platform_id, course_link_id, user_id)
        is_instructor = nrps_service.is_instructor(platform_id, course_link_id, user_id)
        is_student = nrps_service.is_student(platform_id, course_link_id, user_id)
        
        return jsonify({
            'status': 'success',
            'user_id': user_id,
            'roles': roles,
            'is_instructor': is_instructor,
            'is_student': is_student
        }), 200
        
    except Exception as e:
        logger.error("Failed to get member roles", error=str(e))
        return jsonify({'error': str(e)}), 500

@app.route('/deep-linking/content/<platform_id>', methods=['GET'])
def get_available_content(platform_id: str):
    """Get available content for deep linking"""
    try:
        context_id = request.args.get('context_id')
        content_items = deep_linking_service.get_available_content(platform_id, context_id)
        
        return jsonify({
            'status': 'success',
            'content_items': [
                {
                    'id': item.id,
                    'content_type': item.content_type,
                    'title': item.title,
                    'description': item.description,
                    'target_url': item.target_url,
                    'custom_params': item.custom_params,
                    'icon_url': item.icon_url,
                    'thumbnail_url': item.thumbnail_url,
                    'active': item.active
                }
                for item in content_items
            ],
            'total_items': len(content_items)
        }), 200
        
    except Exception as e:
        logger.error("Failed to get available content", error=str(e))
        return jsonify({'error': str(e)}), 500

@app.route('/deep-linking/content', methods=['POST'])
def create_content_item():
    """Create new content item for deep linking"""
    try:
        if not request.is_json:
            return jsonify({'error': 'Content-Type must be application/json'}), 400
        
        data = request.get_json()
        platform_id = data.get('platform_id')
        
        if not platform_id:
            return jsonify({'error': 'Missing platform_id'}), 400
        
        # Required fields for content item
        required_fields = ['content_type', 'title', 'target_url']
        for field in required_fields:
            if field not in data:
                return jsonify({'error': f'Missing required field: {field}'}), 400
        
        content_id = deep_linking_service.create_content_item(platform_id, data)
        
        return jsonify({
            'status': 'success',
            'content_id': content_id,
            'message': 'Content item created successfully'
        }), 201
        
    except Exception as e:
        logger.error("Failed to create content item", error=str(e))
        return jsonify({'error': str(e)}), 500

@app.route('/deep-linking/response', methods=['POST'])
def build_deep_linking_response():
    """Build deep linking response for LMS"""
    try:
        if not request.is_json:
            return jsonify({'error': 'Content-Type must be application/json'}), 400
        
        data = request.get_json()
        
        # Required fields
        required_fields = ['platform_id', 'selected_content_ids']
        for field in required_fields:
            if field not in data:
                return jsonify({'error': f'Missing required field: {field}'}), 400
        
        response = deep_linking_service.build_deep_linking_response(
            platform_id=data['platform_id'],
            selected_content_ids=data['selected_content_ids'],
            context_data=data.get('context_data')
        )
        
        if response.error_message:
            return jsonify({
                'status': 'error',
                'error': response.error_message
            }), 500
        
        return jsonify({
            'status': 'success',
            'content_items': response.content_items,
            'data': response.data,
            'log': response.log
        }), 200
        
    except Exception as e:
        logger.error("Failed to build deep linking response", error=str(e))
        return jsonify({'error': str(e)}), 500

@app.route('/learn-x/user-progress/<user_id>/<course_id>', methods=['GET'])
def get_user_progress(user_id: str, course_id: str):
    """Get user progress from LEARN-X"""
    try:
        progress = learn_x_integration.get_user_progress(user_id, course_id)
        
        return jsonify({
            'status': 'success',
            'progress': progress
        }), 200
        
    except Exception as e:
        logger.error("Failed to get user progress", error=str(e))
        return jsonify({'error': str(e)}), 500

@app.route('/learn-x/submit-grade', methods=['POST'])
def submit_grade_to_learn_x():
    """Submit grade to LEARN-X"""
    try:
        if not request.is_json:
            return jsonify({'error': 'Content-Type must be application/json'}), 400
        
        data = request.get_json()
        
        # Required fields
        required_fields = ['launch_id', 'user_id', 'assignment_id', 'score', 'max_score']
        for field in required_fields:
            if field not in data:
                return jsonify({'error': f'Missing required field: {field}'}), 400
        
        success = learn_x_integration.submit_grade_to_learn_x(
            launch_id=data['launch_id'],
            user_id=data['user_id'],
            assignment_id=data['assignment_id'],
            score=float(data['score']),
            max_score=float(data['max_score'])
        )
        
        if success:
            return jsonify({
                'status': 'success',
                'message': 'Grade submitted to LEARN-X successfully'
            }), 200
        else:
            return jsonify({
                'status': 'error',
                'error': 'Failed to submit grade to LEARN-X'
            }), 500
        
    except Exception as e:
        logger.error("Failed to submit grade to LEARN-X", error=str(e))
        return jsonify({'error': str(e)}), 500

@app.route('/learn-x/create-session', methods=['POST'])
def create_learn_x_session():
    """Create LEARN-X session"""
    try:
        if not request.is_json:
            return jsonify({'error': 'Content-Type must be application/json'}), 400
        
        data = request.get_json()
        
        # Required fields
        required_fields = ['launch_id', 'user_id']
        for field in required_fields:
            if field not in data:
                return jsonify({'error': f'Missing required field: {field}'}), 400
        
        session_token = learn_x_integration.create_learn_x_session(
            launch_id=data['launch_id'],
            user_id=data['user_id'],
            context_data=data.get('context_data', {})
        )
        
        if session_token:
            return jsonify({
                'status': 'success',
                'session_token': session_token,
                'message': 'LEARN-X session created successfully'
            }), 200
        else:
            return jsonify({
                'status': 'error',
                'error': 'Failed to create LEARN-X session'
            }), 500
        
    except Exception as e:
        logger.error("Failed to create LEARN-X session", error=str(e))
        return jsonify({'error': str(e)}), 500

@app.errorhandler(500)
def internal_error(error):
    """Handle 500 errors"""
    logger.error("Internal server error", error=str(error))
    return jsonify({'error': 'Internal server error'}), 500

if __name__ == '__main__':
    # Development server
    app.run(
        host='0.0.0.0',
        port=int(os.environ.get('PORT', 8080)),
        debug=os.environ.get('FLASK_DEBUG', 'False').lower() == 'true'
    )