#!/usr/bin/env python3
"""
LEARN-X Core API Integration - BRUTAL EXECUTION
Connects LTI Gateway with LEARN-X Core system
"""

import os
import json
import time
import requests
import base64
from typing import Dict, Any, Optional, List
from dataclasses import dataclass
from datetime import datetime, timedelta
import structlog
from database.db_manager import db_manager

logger = structlog.get_logger()

@dataclass
class LearnXUser:
    """LEARN-X User representation"""
    id: str
    email: str
    name: str
    role: str
    preferences: Dict[str, Any]
    lti_linked: bool

@dataclass
class LearnXCourse:
    """LEARN-X Course representation"""
    id: str
    title: str
    description: str
    instructor_id: str
    settings: Dict[str, Any]
    lti_linked: bool

@dataclass
class AuthenticationResult:
    """Authentication result from LEARN-X"""
    success: bool
    user_id: Optional[str] = None
    token: Optional[str] = None
    redirect_url: Optional[str] = None
    error: Optional[str] = None

class LearnXIntegrationService:
    """
    LEARN-X Core API Integration Service
    
    Features:
    - User authentication and provisioning
    - Course synchronization
    - Grade passback to LEARN-X
    - Session management
    - Content access control
    """
    
    def __init__(self):
        self.api_base = os.environ.get('LEARN_X_API_BASE', 'http://localhost:5000')
        self.api_timeout = 30
        self.retry_attempts = 3
        self.gateway_secret = os.environ.get('LTI_GATEWAY_SECRET', 'lti-gateway-secret-key')
    
    def authenticate_lti_user(self, launch_id: str, platform_id: str, 
                            user_sub: str, user_data: Dict[str, Any]) -> AuthenticationResult:
        """Authenticate LTI user with LEARN-X Core API"""
        try:
            # Get user link from database
            user_link = db_manager.get_user_link(platform_id, user_sub)
            
            if user_link:
                # Existing user - authenticate
                return self._authenticate_existing_user(user_link, launch_id)
            else:
                # New user - provision
                return self._provision_new_user(platform_id, user_sub, user_data, launch_id)
                
        except Exception as e:
            logger.error("LTI user authentication failed",
                        launch_id=launch_id,
                        platform_id=platform_id,
                        user_sub=user_sub,
                        error=str(e))
            
            return AuthenticationResult(
                success=False,
                error=f"Authentication failed: {str(e)}"
            )
    
    def sync_course_to_learn_x(self, platform_id: str, context_id: str, 
                              context_data: Dict[str, Any]) -> Optional[str]:
        """Sync LTI context to LEARN-X course"""
        try:
            # Check if course link exists
            course_link = self._get_course_link(platform_id, context_id)
            
            if course_link:
                # Update existing course
                return self._update_learn_x_course(course_link['learn_x_course_id'], context_data)
            else:
                # Create new course
                return self._create_learn_x_course(platform_id, context_id, context_data)
                
        except Exception as e:
            logger.error("Course sync failed",
                        platform_id=platform_id,
                        context_id=context_id,
                        error=str(e))
            return None
    
    def submit_grade_to_learn_x(self, launch_id: str, user_id: str, 
                               assignment_id: str, score: float, 
                               max_score: float) -> bool:
        """Submit grade to LEARN-X for processing"""
        try:
            auth_token = self._generate_api_token(launch_id)
            
            grade_data = {
                'user_id': user_id,
                'assignment_id': assignment_id,
                'score': score,
                'max_score': max_score,
                'timestamp': datetime.utcnow().isoformat(),
                'source': 'lti_gateway',
                'launch_id': launch_id
            }
            
            response = requests.post(
                f"{self.api_base}/api/v2/grades",
                json=grade_data,
                headers={
                    'Authorization': f'Bearer {auth_token}',
                    'Content-Type': 'application/json',
                    'X-LTI-Gateway': 'true'
                },
                timeout=self.api_timeout
            )
            
            if response.status_code in [200, 201]:
                logger.info("Grade submitted to LEARN-X",
                           launch_id=launch_id,
                           user_id=user_id,
                           score=f"{score}/{max_score}")
                return True
            else:
                logger.error("Grade submission failed",
                            launch_id=launch_id,
                            status_code=response.status_code,
                            response=response.text)
                return False
                
        except Exception as e:
            logger.error("Grade submission error",
                        launch_id=launch_id,
                        error=str(e))
            return False
    
    def get_user_progress(self, user_id: str, course_id: str) -> Dict[str, Any]:
        """Get user progress from LEARN-X"""
        try:
            auth_token = self._generate_api_token()
            
            response = requests.get(
                f"{self.api_base}/api/v2/users/{user_id}/progress?course_id={course_id}",
                headers={
                    'Authorization': f'Bearer {auth_token}',
                    'X-LTI-Gateway': 'true'
                },
                timeout=self.api_timeout
            )
            
            if response.status_code == 200:
                return response.json()
            else:
                logger.warning("Failed to get user progress",
                              user_id=user_id,
                              course_id=course_id,
                              status_code=response.status_code)
                return {}
                
        except Exception as e:
            logger.error("User progress retrieval failed",
                        user_id=user_id,
                        course_id=course_id,
                        error=str(e))
            return {}
    
    def create_learn_x_session(self, launch_id: str, user_id: str, 
                              context_data: Dict[str, Any]) -> Optional[str]:
        """Create authenticated session in LEARN-X"""
        try:
            auth_token = self._generate_api_token(launch_id)
            
            session_data = {
                'user_id': user_id,
                'launch_id': launch_id,
                'context': context_data,
                'source': 'lti_gateway',
                'expires_in': 28800  # 8 hours
            }
            
            response = requests.post(
                f"{self.api_base}/api/v2/sessions",
                json=session_data,
                headers={
                    'Authorization': f'Bearer {auth_token}',
                    'Content-Type': 'application/json',
                    'X-LTI-Gateway': 'true'
                },
                timeout=self.api_timeout
            )
            
            if response.status_code in [200, 201]:
                result = response.json()
                session_token = result.get('session_token')
                
                logger.info("LEARN-X session created",
                           launch_id=launch_id,
                           user_id=user_id,
                           session_token=session_token[:20] + "..." if session_token else None)
                
                return session_token
            else:
                logger.error("Session creation failed",
                            launch_id=launch_id,
                            status_code=response.status_code)
                return None
                
        except Exception as e:
            logger.error("Session creation error",
                        launch_id=launch_id,
                        error=str(e))
            return None
    
    def _authenticate_existing_user(self, user_link: Any, launch_id: str) -> AuthenticationResult:
        """Authenticate existing linked user"""
        try:
            learn_x_user_id = user_link.learn_x_user_id
            
            # Verify user exists in LEARN-X
            user_info = self._get_learn_x_user(learn_x_user_id)
            
            if user_info:
                # Generate session token
                auth_token = self._generate_api_token(launch_id)
                
                # Create redirect URL with authentication
                redirect_url = f"{self.api_base}/lti/authenticate?token={auth_token}&launch_id={launch_id}"
                
                return AuthenticationResult(
                    success=True,
                    user_id=learn_x_user_id,
                    token=auth_token,
                    redirect_url=redirect_url
                )
            else:
                logger.warning("Linked user not found in LEARN-X",
                              learn_x_user_id=learn_x_user_id)
                
                return AuthenticationResult(
                    success=False,
                    error="Linked user not found in LEARN-X system"
                )
                
        except Exception as e:
            logger.error("Existing user authentication failed",
                        user_link_id=user_link.id,
                        error=str(e))
            
            return AuthenticationResult(
                success=False,
                error=f"Authentication error: {str(e)}"
            )
    
    def _provision_new_user(self, platform_id: str, user_sub: str, 
                          user_data: Dict[str, Any], launch_id: str) -> AuthenticationResult:
        """Provision new user in LEARN-X"""
        try:
            # Create user in LEARN-X
            learn_x_user_id = self._create_learn_x_user(user_data)
            
            if learn_x_user_id:
                # Create user link
                link_data = {
                    'platform_id': platform_id,
                    'user_sub': user_sub,
                    'lti_user_data': user_data,
                    'learn_x_user_id': learn_x_user_id,
                    'link_method': 'auto_provision',
                    'verified': True
                }
                
                link_id = db_manager.create_user_link(link_data)
                
                # Generate authentication token
                auth_token = self._generate_api_token(launch_id)
                
                # Create redirect URL
                redirect_url = f"{self.api_base}/lti/authenticate?token={auth_token}&launch_id={launch_id}&new_user=true"
                
                logger.info("New user provisioned",
                           platform_id=platform_id,
                           user_sub=user_sub,
                           learn_x_user_id=learn_x_user_id,
                           link_id=link_id)
                
                return AuthenticationResult(
                    success=True,
                    user_id=learn_x_user_id,
                    token=auth_token,
                    redirect_url=redirect_url
                )
            else:
                return AuthenticationResult(
                    success=False,
                    error="Failed to create user in LEARN-X"
                )
                
        except Exception as e:
            logger.error("User provisioning failed",
                        platform_id=platform_id,
                        user_sub=user_sub,
                        error=str(e))
            
            return AuthenticationResult(
                success=False,
                error=f"Provisioning error: {str(e)}"
            )
    
    def _get_learn_x_user(self, user_id: str) -> Optional[Dict[str, Any]]:
        """Get user info from LEARN-X"""
        try:
            auth_token = self._generate_api_token()
            
            response = requests.get(
                f"{self.api_base}/api/v2/users/{user_id}",
                headers={
                    'Authorization': f'Bearer {auth_token}',
                    'X-LTI-Gateway': 'true'
                },
                timeout=self.api_timeout
            )
            
            if response.status_code == 200:
                return response.json()
            else:
                return None
                
        except Exception as e:
            logger.error("Failed to get LEARN-X user",
                        user_id=user_id,
                        error=str(e))
            return None
    
    def _create_learn_x_user(self, user_data: Dict[str, Any]) -> Optional[str]:
        """Create user in LEARN-X"""
        try:
            auth_token = self._generate_api_token()
            
            # Map LTI user data to LEARN-X format
            learn_x_user_data = {
                'email': user_data.get('email', ''),
                'name': user_data.get('name', 'LTI User'),
                'role': self._map_lti_roles_to_learn_x(user_data.get('roles', [])),
                'source': 'lti_gateway',
                'preferences': {
                    'lti_linked': True,
                    'auto_created': True
                }
            }
            
            response = requests.post(
                f"{self.api_base}/api/v2/users",
                json=learn_x_user_data,
                headers={
                    'Authorization': f'Bearer {auth_token}',
                    'Content-Type': 'application/json',
                    'X-LTI-Gateway': 'true'
                },
                timeout=self.api_timeout
            )
            
            if response.status_code in [200, 201]:
                result = response.json()
                user_id = result.get('user_id') or result.get('id')
                
                logger.info("LEARN-X user created",
                           user_id=user_id,
                           email=user_data.get('email'))
                
                return user_id
            else:
                logger.error("LEARN-X user creation failed",
                            status_code=response.status_code,
                            response=response.text)
                return None
                
        except Exception as e:
            logger.error("LEARN-X user creation error",
                        error=str(e))
            return None
    
    def _get_course_link(self, platform_id: str, context_id: str) -> Optional[Dict[str, Any]]:
        """Get course link from database"""
        query = """
        SELECT * FROM lti_course_links 
        WHERE platform_id = %s AND context_id = %s
        LIMIT 1
        """
        
        results = db_manager.execute_query(query, (platform_id, context_id))
        return results[0] if results else None
    
    def _map_lti_roles_to_learn_x(self, lti_roles: List[str]) -> str:
        """Map LTI roles to LEARN-X role system"""
        instructor_roles = [
            'http://purl.imsglobal.org/vocab/lis/v2/membership#Instructor',
            'Instructor',
            'Teacher',
            'Faculty'
        ]
        
        admin_roles = [
            'http://purl.imsglobal.org/vocab/lis/v2/membership#Administrator',
            'Administrator',
            'Admin'
        ]
        
        if any(role in admin_roles for role in lti_roles):
            return 'admin'
        elif any(role in instructor_roles for role in lti_roles):
            return 'professor'
        else:
            return 'student'
    
    def _generate_api_token(self, launch_id: str = None) -> str:
        """Generate API token for LEARN-X authentication"""
        import jwt
        from datetime import datetime, timedelta
        
        payload = {
            'iss': 'lti-gateway',
            'aud': 'learn-x-core',
            'exp': datetime.utcnow() + timedelta(hours=8),
            'iat': datetime.utcnow(),
            'source': 'lti_gateway'
        }
        
        if launch_id:
            payload['launch_id'] = launch_id
        
        # For now, use a simple signing key
        # TODO: Use proper JWT signing with shared secret
        token = jwt.encode(payload, self.gateway_secret, algorithm='HS256')
        
        return token

# Global integration service instance
learn_x_integration = LearnXIntegrationService()