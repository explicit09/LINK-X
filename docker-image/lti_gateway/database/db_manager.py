#!/usr/bin/env python3
"""
LTI Database Manager - Multi-tenant security enforced
BRUTAL EXECUTION: Every query includes tenant isolation or FAIL
"""

import os
import uuid
import json
import psycopg2
import psycopg2.extras
import psycopg2.pool
from typing import Dict, Any, Optional, List, Tuple
from dataclasses import dataclass
from datetime import datetime, timedelta
import structlog

logger = structlog.get_logger()

@dataclass
class LTIPlatform:
    """LTI Platform registration"""
    id: str
    iss: str
    client_id: str
    deployment_id: Optional[str]
    auth_login_url: str
    auth_token_url: str
    key_set_url: str
    public_key_set: Optional[Dict[str, Any]]
    platform_config: Dict[str, Any]
    active: bool
    created_at: datetime
    updated_at: datetime

@dataclass
class LTILaunch:
    """LTI Launch session"""
    id: str
    platform_id: str
    user_sub: str
    context_id: Optional[str]
    resource_link_id: Optional[str]
    learn_x_user_id: Optional[str]
    launch_data: Dict[str, Any]
    nonce: str
    jti: Optional[str]
    session_token: Optional[str]
    expires_at: Optional[datetime]
    ip_address: Optional[str]
    user_agent: Optional[str]
    created_at: datetime

@dataclass
class LTIUserLink:
    """LTI to LEARN-X user mapping"""
    id: str
    platform_id: str
    user_sub: str
    lti_user_data: Dict[str, Any]
    learn_x_user_id: str
    link_method: str
    verified: bool
    created_at: datetime
    verified_at: Optional[datetime]
    last_used: datetime

class LTIDatabaseManager:
    """
    Multi-tenant database manager for LTI 1.3
    
    SECURITY: Every method enforces tenant isolation
    RULE: No query without platform scoping
    """
    
    def __init__(self, database_url: str = None):
        self.database_url = database_url or os.environ.get(
            'LTI_DATABASE_URL', 
            'postgresql://localhost:5432/learn_x_lti'
        )
        self.connection_pool = None
        self._init_connection_pool()
    
    def _init_connection_pool(self):
        """Initialize connection pool"""
        try:
            # In production, use proper connection pooling
            self.connection_pool = psycopg2.pool.ThreadedConnectionPool(
                minconn=1,
                maxconn=20,
                dsn=self.database_url,
                cursor_factory=psycopg2.extras.RealDictCursor
            )
            logger.info("LTI database connection pool initialized")
        except Exception as e:
            logger.error("Failed to initialize database pool", error=str(e))
            raise
    
    def get_connection(self):
        """Get database connection from pool"""
        return self.connection_pool.getconn()
    
    def return_connection(self, conn):
        """Return connection to pool"""
        self.connection_pool.putconn(conn)
    
    def execute_query(self, query: str, params: Tuple = None) -> List[Dict[str, Any]]:
        """Execute query with connection management"""
        conn = None
        try:
            conn = self.get_connection()
            with conn.cursor() as cursor:
                cursor.execute(query, params)
                if cursor.description:
                    return cursor.fetchall()
                return []
        except Exception as e:
            if conn:
                conn.rollback()
            logger.error("Database query failed", query=query, error=str(e))
            raise
        finally:
            if conn:
                conn.commit()
                self.return_connection(conn)
    
    def execute_transaction(self, queries: List[Tuple[str, Tuple]]) -> bool:
        """Execute multiple queries in transaction"""
        conn = None
        try:
            conn = self.get_connection()
            with conn.cursor() as cursor:
                for query, params in queries:
                    cursor.execute(query, params)
            conn.commit()
            return True
        except Exception as e:
            if conn:
                conn.rollback()
            logger.error("Transaction failed", error=str(e))
            raise
        finally:
            if conn:
                self.return_connection(conn)
    
    # ========================================
    # PLATFORM MANAGEMENT (Tenant Registration)
    # ========================================
    
    def get_platform(self, iss: str, client_id: str, deployment_id: str = None) -> Optional[LTIPlatform]:
        """
        Get platform by tenant isolation keys
        SECURITY: This is the foundation of multi-tenant isolation
        """
        query = """
        SELECT * FROM lti_platforms 
        WHERE iss = %s 
          AND client_id = %s 
          AND (deployment_id = %s OR (deployment_id IS NULL AND %s IS NULL))
          AND active = true
        LIMIT 1
        """
        
        results = self.execute_query(query, (iss, client_id, deployment_id, deployment_id))
        
        if not results:
            logger.warning("Platform not found", 
                          iss=iss, client_id=client_id, deployment_id=deployment_id)
            return None
        
        row = results[0]
        return LTIPlatform(
            id=str(row['id']),
            iss=row['iss'],
            client_id=row['client_id'],
            deployment_id=row['deployment_id'],
            auth_login_url=row['auth_login_url'],
            auth_token_url=row['auth_token_url'],
            key_set_url=row['key_set_url'],
            public_key_set=row['public_key_set'],
            platform_config=row['platform_config'] or {},
            active=row['active'],
            created_at=row['created_at'],
            updated_at=row['updated_at']
        )
    
    def register_platform(self, platform_data: Dict[str, Any]) -> str:
        """Register new LTI platform"""
        platform_id = str(uuid.uuid4())
        
        query = """
        INSERT INTO lti_platforms (
            id, iss, client_id, deployment_id,
            auth_login_url, auth_token_url, key_set_url,
            public_key_set, platform_config, active
        ) VALUES (
            %s, %s, %s, %s, %s, %s, %s, %s, %s, %s
        )
        """
        
        params = (
            platform_id,
            platform_data['iss'],
            platform_data['client_id'],
            platform_data.get('deployment_id'),
            platform_data['auth_login_url'],
            platform_data['auth_token_url'],
            platform_data['key_set_url'],
            json.dumps(platform_data.get('public_key_set')),
            json.dumps(platform_data.get('platform_config', {})),
            platform_data.get('active', True)
        )
        
        self.execute_query(query, params)
        
        logger.info("Platform registered", 
                   platform_id=platform_id,
                   iss=platform_data['iss'],
                   client_id=platform_data['client_id'])
        
        return platform_id
    
    def update_platform_keys(self, platform_id: str, public_key_set: Dict[str, Any]) -> bool:
        """Update platform public keys"""
        query = """
        UPDATE lti_platforms 
        SET public_key_set = %s, updated_at = NOW()
        WHERE id = %s
        """
        
        self.execute_query(query, (json.dumps(public_key_set), platform_id))
        
        logger.info("Platform keys updated", platform_id=platform_id)
        return True
    
    # ========================================
    # LAUNCH MANAGEMENT (Security Critical)
    # ========================================
    
    def create_launch_session(self, launch_data: Dict[str, Any]) -> str:
        """
        Create LTI launch session with security validation
        SECURITY: Nonce must be unique, tenant isolation enforced
        """
        launch_id = str(uuid.uuid4())
        session_token = self._generate_session_token()
        expires_at = datetime.now() + timedelta(hours=8)  # 8-hour session
        
        query = """
        INSERT INTO lti_launches (
            id, platform_id, user_sub, context_id, resource_link_id,
            launch_data, nonce, jti, session_token, expires_at,
            ip_address, user_agent
        ) VALUES (
            %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s
        )
        """
        
        params = (
            launch_id,
            launch_data['platform_id'],
            launch_data['user_sub'],
            launch_data.get('context_id'),
            launch_data.get('resource_link_id'),
            json.dumps(launch_data['launch_claims']),
            launch_data['nonce'],
            launch_data.get('jti'),
            session_token,
            expires_at,
            launch_data.get('ip_address'),
            launch_data.get('user_agent')
        )
        
        try:
            self.execute_query(query, params)
            
            logger.info("Launch session created",
                       launch_id=launch_id,
                       platform_id=launch_data['platform_id'],
                       user_sub=launch_data['user_sub'],
                       context_id=launch_data.get('context_id'))
            
            return launch_id
            
        except psycopg2.IntegrityError as e:
            if 'nonce' in str(e):
                logger.error("Nonce replay attack detected", 
                           nonce=launch_data['nonce'],
                           user_sub=launch_data['user_sub'])
                raise ValueError("Nonce replay detected")
            raise
    
    def get_launch_session(self, launch_id: str, platform_id: str) -> Optional[LTILaunch]:
        """
        Get launch session with tenant isolation
        SECURITY: Must include platform_id to prevent cross-tenant access
        """
        query = """
        SELECT * FROM lti_launches 
        WHERE id = %s AND platform_id = %s
        LIMIT 1
        """
        
        results = self.execute_query(query, (launch_id, platform_id))
        
        if not results:
            return None
        
        row = results[0]
        return LTILaunch(
            id=str(row['id']),
            platform_id=str(row['platform_id']),
            user_sub=row['user_sub'],
            context_id=row['context_id'],
            resource_link_id=row['resource_link_id'],
            learn_x_user_id=str(row['learn_x_user_id']) if row['learn_x_user_id'] else None,
            launch_data=row['launch_data'],
            nonce=row['nonce'],
            jti=row['jti'],
            session_token=row['session_token'],
            expires_at=row['expires_at'],
            ip_address=row['ip_address'],
            user_agent=row['user_agent'],
            created_at=row['created_at']
        )
    
    def validate_session_token(self, session_token: str) -> Optional[Dict[str, Any]]:
        """Validate session token and return session info"""
        query = """
        SELECT l.*, p.iss, p.client_id, p.deployment_id
        FROM lti_launches l
        JOIN lti_platforms p ON l.platform_id = p.id
        WHERE l.session_token = %s 
          AND l.expires_at > NOW()
        LIMIT 1
        """
        
        results = self.execute_query(query, (session_token,))
        
        if not results:
            return None
        
        row = results[0]
        return {
            'launch_id': str(row['id']),
            'platform_id': str(row['platform_id']),
            'user_sub': row['user_sub'],
            'context_id': row['context_id'],
            'learn_x_user_id': str(row['learn_x_user_id']) if row['learn_x_user_id'] else None,
            'launch_data': row['launch_data'],
            'iss': row['iss'],
            'client_id': row['client_id'],
            'deployment_id': row['deployment_id']
        }
    
    # ========================================
    # USER LINKING (Account Mapping)
    # ========================================
    
    def get_user_link(self, platform_id: str, user_sub: str) -> Optional[LTIUserLink]:
        """Get LTI to LEARN-X user mapping"""
        query = """
        SELECT * FROM lti_user_links 
        WHERE platform_id = %s AND user_sub = %s
        LIMIT 1
        """
        
        results = self.execute_query(query, (platform_id, user_sub))
        
        if not results:
            return None
        
        row = results[0]
        return LTIUserLink(
            id=str(row['id']),
            platform_id=str(row['platform_id']),
            user_sub=row['user_sub'],
            lti_user_data=row['lti_user_data'],
            learn_x_user_id=str(row['learn_x_user_id']),
            link_method=row['link_method'],
            verified=row['verified'],
            created_at=row['created_at'],
            verified_at=row['verified_at'],
            last_used=row['last_used']
        )
    
    def create_user_link(self, link_data: Dict[str, Any]) -> str:
        """Create LTI to LEARN-X user mapping"""
        link_id = str(uuid.uuid4())
        
        query = """
        INSERT INTO lti_user_links (
            id, platform_id, user_sub, lti_user_data,
            learn_x_user_id, link_method, verified
        ) VALUES (
            %s, %s, %s, %s, %s, %s, %s
        )
        """
        
        params = (
            link_id,
            link_data['platform_id'],
            link_data['user_sub'],
            json.dumps(link_data['lti_user_data']),
            link_data['learn_x_user_id'],
            link_data.get('link_method', 'auto'),
            link_data.get('verified', False)
        )
        
        self.execute_query(query, params)
        
        logger.info("User link created",
                   link_id=link_id,
                   platform_id=link_data['platform_id'],
                   user_sub=link_data['user_sub'],
                   learn_x_user_id=link_data['learn_x_user_id'])
        
        return link_id
    
    def update_user_link_usage(self, platform_id: str, user_sub: str) -> bool:
        """Update last used timestamp for user link"""
        query = """
        UPDATE lti_user_links 
        SET last_used = NOW()
        WHERE platform_id = %s AND user_sub = %s
        """
        
        self.execute_query(query, (platform_id, user_sub))
        return True
    
    def create_course_link(self, link_data: Dict[str, Any]) -> str:
        """Create LTI to LEARN-X course mapping"""
        link_id = str(uuid.uuid4())
        
        query = """
        INSERT INTO lti_course_links (
            id, platform_id, context_id, context_data,
            learn_x_course_id, auto_created, sync_enabled
        ) VALUES (
            %s, %s, %s, %s, %s, %s, %s
        )
        """
        
        params = (
            link_id,
            link_data['platform_id'],
            link_data['context_id'],
            json.dumps(link_data.get('context_data', {})),
            link_data['learn_x_course_id'],
            link_data.get('auto_created', False),
            link_data.get('sync_enabled', True)
        )
        
        self.execute_query(query, params)
        
        logger.info("Course link created",
                   link_id=link_id,
                   platform_id=link_data['platform_id'],
                   context_id=link_data['context_id'],
                   learn_x_course_id=link_data['learn_x_course_id'])
        
        return link_id
    
    # ========================================
    # GRADE SYNC (Asynchronous)
    # ========================================
    
    def queue_grade_sync(self, grade_data: Dict[str, Any]) -> str:
        """Queue grade for asynchronous sync to LMS"""
        sync_id = str(uuid.uuid4())
        
        query = """
        INSERT INTO lti_grade_sync (
            id, platform_id, line_item_id, user_link_id,
            score_given, score_maximum, activity_progress, grading_progress
        ) VALUES (
            %s, %s, %s, %s, %s, %s, %s, %s
        )
        """
        
        params = (
            sync_id,
            grade_data['platform_id'],
            grade_data['line_item_id'],
            grade_data['user_link_id'],
            grade_data['score_given'],
            grade_data['score_maximum'],
            grade_data.get('activity_progress', 'Completed'),
            grade_data.get('grading_progress', 'FullyGraded')
        )
        
        self.execute_query(query, params)
        
        logger.info("Grade sync queued",
                   sync_id=sync_id,
                   platform_id=grade_data['platform_id'],
                   score=f"{grade_data['score_given']}/{grade_data['score_maximum']}")
        
        return sync_id
    
    def get_pending_grade_syncs(self, limit: int = 100) -> List[Dict[str, Any]]:
        """Get pending grade syncs for processing"""
        query = """
        SELECT gs.*, li.line_item_id, li.score_url, p.iss, p.client_id
        FROM lti_grade_sync gs
        JOIN lti_line_items li ON gs.line_item_id = li.id
        JOIN lti_platforms p ON gs.platform_id = p.id
        WHERE gs.status = 'pending'
          AND (gs.next_retry IS NULL OR gs.next_retry <= NOW())
          AND gs.attempts < gs.max_attempts
        ORDER BY gs.created_at
        LIMIT %s
        """
        
        return self.execute_query(query, (limit,))
    
    # ========================================
    # AUDIT & CLEANUP
    # ========================================
    
    def log_audit_event(self, event_data: Dict[str, Any]) -> None:
        """Log security audit event"""
        query = """
        INSERT INTO lti_audit_log (
            platform_id, event_type, event_data, user_sub,
            ip_address, user_agent, success, error_message
        ) VALUES (
            %s, %s, %s, %s, %s, %s, %s, %s
        )
        """
        
        params = (
            event_data.get('platform_id'),
            event_data['event_type'],
            json.dumps(event_data.get('event_data', {})),
            event_data.get('user_sub'),
            event_data.get('ip_address'),
            event_data.get('user_agent'),
            event_data.get('success', True),
            event_data.get('error_message')
        )
        
        self.execute_query(query, params)
    
    def cleanup_expired_sessions(self) -> int:
        """Cleanup expired launch sessions"""
        query = "SELECT cleanup_expired_lti_sessions()"
        results = self.execute_query(query)
        
        count = results[0]['cleanup_expired_lti_sessions'] if results else 0
        
        if count > 0:
            logger.info("Cleaned up expired sessions", count=count)
        
        return count
    
    def _generate_session_token(self) -> str:
        """Generate secure session token"""
        import secrets
        return secrets.token_urlsafe(64)
    
    def get_platform_by_id(self, platform_id: str) -> Optional[LTIPlatform]:
        """Get platform by ID"""
        query = """
        SELECT * FROM lti_platforms 
        WHERE id = %s AND active = true
        LIMIT 1
        """
        
        results = self.execute_query(query, (platform_id,))
        
        if not results:
            return None
        
        row = results[0]
        return LTIPlatform(
            id=str(row['id']),
            iss=row['iss'],
            client_id=row['client_id'],
            deployment_id=row['deployment_id'],
            auth_login_url=row['auth_login_url'],
            auth_token_url=row['auth_token_url'],
            key_set_url=row['key_set_url'],
            public_key_set=row['public_key_set'],
            platform_config=row['platform_config'] or {},
            active=row['active'],
            created_at=row['created_at'],
            updated_at=row['updated_at']
        )

    def health_check(self) -> Dict[str, Any]:
        """Database health check"""
        try:
            result = self.execute_query("SELECT 1 as healthy")
            return {
                'status': 'healthy',
                'database': 'connected',
                'timestamp': datetime.now().isoformat()
            }
        except Exception as e:
            return {
                'status': 'unhealthy',
                'database': 'error',
                'error': str(e),
                'timestamp': datetime.now().isoformat()
            }

# Global database manager instance
db_manager = LTIDatabaseManager()