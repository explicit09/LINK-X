#!/usr/bin/env python3
"""
LTI Names & Roles Provisioning Service (NRPS) - BRUTAL EXECUTION
Handles automatic roster synchronization from LMS platforms
"""

import os
import json
import time
import requests
from typing import Dict, Any, Optional, List
from dataclasses import dataclass
from datetime import datetime, timedelta
import structlog
from database.db_manager import db_manager

logger = structlog.get_logger()

@dataclass
class RosterMember:
    """LTI Roster Member"""
    id: str
    platform_id: str
    course_link_id: str
    user_id: str
    name: Optional[str]
    email: Optional[str]
    roles: List[str]
    status: str
    first_seen: datetime
    last_seen: datetime

@dataclass
class NRPSContext:
    """NRPS Context for roster sync"""
    platform_id: str
    course_link_id: str
    context_memberships_url: str
    access_token: Optional[str] = None

class NRPSService:
    """
    Names & Roles Provisioning Service Implementation
    
    Features:
    - Roster synchronization from LMS
    - Member status tracking (Active, Inactive, Deleted)
    - Role-based access control
    - Incremental sync with conflict resolution
    """
    
    def __init__(self):
        self.timeout = 30  # seconds
        self.max_retries = 3
        self.retry_delays = [1, 5, 15]  # seconds
    
    def sync_roster(self, platform_id: str, course_link_id: str, 
                   memberships_url: str) -> Dict[str, Any]:
        """Synchronize roster from LMS via NRPS"""
        try:
            logger.info("Starting roster sync",
                       platform_id=platform_id,
                       course_link_id=course_link_id)
            
            # Get platform details
            platform = db_manager.get_platform_by_id(platform_id)
            if not platform:
                raise ValueError(f"Platform not found: {platform_id}")
            
            # Fetch roster from LMS
            roster_data = self._fetch_roster_from_lms(
                memberships_url=memberships_url,
                platform=platform
            )
            
            if not roster_data:
                logger.warning("No roster data received", platform_id=platform_id)
                return {'status': 'no_data', 'members_synced': 0}
            
            # Process roster members
            members_synced = 0
            new_members = 0
            updated_members = 0
            inactive_members = 0
            
            for member_data in roster_data.get('members', []):
                result = self._process_roster_member(
                    platform_id=platform_id,
                    course_link_id=course_link_id,
                    member_data=member_data
                )
                
                if result['action'] == 'created':
                    new_members += 1
                elif result['action'] == 'updated':
                    updated_members += 1
                elif result['action'] == 'deactivated':
                    inactive_members += 1
                
                members_synced += 1
            
            # Mark absent members as inactive
            absent_count = self._mark_absent_members_inactive(
                platform_id=platform_id,
                course_link_id=course_link_id,
                active_user_ids=[m.get('user_id') for m in roster_data.get('members', [])]
            )
            
            logger.info("Roster sync completed",
                       platform_id=platform_id,
                       members_synced=members_synced,
                       new_members=new_members,
                       updated_members=updated_members,
                       inactive_members=inactive_members,
                       absent_marked_inactive=absent_count)
            
            return {
                'status': 'success',
                'members_synced': members_synced,
                'new_members': new_members,
                'updated_members': updated_members,
                'inactive_members': inactive_members,
                'absent_marked_inactive': absent_count
            }
            
        except Exception as e:
            logger.error("Roster sync failed",
                        platform_id=platform_id,
                        course_link_id=course_link_id,
                        error=str(e))
            return {'status': 'error', 'error': str(e)}
    
    def get_roster_members(self, platform_id: str, course_link_id: str, 
                          status: str = 'Active') -> List[RosterMember]:
        """Get roster members for a course"""
        query = """
        SELECT * FROM lti_roster_members 
        WHERE platform_id = %s AND course_link_id = %s AND status = %s
        ORDER BY name ASC
        """
        
        results = db_manager.execute_query(query, (platform_id, course_link_id, status))
        
        members = []
        for row in results:
            members.append(RosterMember(
                id=str(row['id']),
                platform_id=str(row['platform_id']),
                course_link_id=str(row['course_link_id']),
                user_id=row['user_id'],
                name=row['name'],
                email=row['email'],
                roles=row['roles'] or [],
                status=row['status'],
                first_seen=row['first_seen'],
                last_seen=row['last_seen']
            ))
        
        return members
    
    def get_member_roles(self, platform_id: str, course_link_id: str, 
                        user_id: str) -> List[str]:
        """Get roles for a specific member"""
        query = """
        SELECT roles FROM lti_roster_members 
        WHERE platform_id = %s AND course_link_id = %s AND user_id = %s AND status = 'Active'
        LIMIT 1
        """
        
        results = db_manager.execute_query(query, (platform_id, course_link_id, user_id))
        
        if results:
            return results[0]['roles'] or []
        
        return []
    
    def is_instructor(self, platform_id: str, course_link_id: str, user_id: str) -> bool:
        """Check if user has instructor role"""
        roles = self.get_member_roles(platform_id, course_link_id, user_id)
        
        instructor_roles = [
            'http://purl.imsglobal.org/vocab/lis/v2/membership#Instructor',
            'http://purl.imsglobal.org/vocab/lis/v2/membership/Instructor#TeachingAssistant',
            'Instructor',
            'Teacher',
            'Faculty'
        ]
        
        return any(role in instructor_roles for role in roles)
    
    def is_student(self, platform_id: str, course_link_id: str, user_id: str) -> bool:
        """Check if user has student role"""
        roles = self.get_member_roles(platform_id, course_link_id, user_id)
        
        student_roles = [
            'http://purl.imsglobal.org/vocab/lis/v2/membership#Learner',
            'Learner',
            'Student'
        ]
        
        return any(role in student_roles for role in roles)
    
    def _fetch_roster_from_lms(self, memberships_url: str, platform: Any) -> Optional[Dict[str, Any]]:
        """Fetch roster data from LMS via NRPS API"""
        for attempt in range(self.max_retries):
            try:
                # Get OAuth2 access token
                access_token = self._get_platform_access_token(platform)
                if not access_token:
                    logger.error("Failed to get access token for NRPS", platform_id=platform.id)
                    return None
                
                # Make NRPS API call
                headers = {
                    'Authorization': f'Bearer {access_token}',
                    'Accept': 'application/vnd.ims.lti-nrps.v2.membershipcontainer+json',
                    'Content-Type': 'application/json'
                }
                
                response = requests.get(
                    memberships_url,
                    headers=headers,
                    timeout=self.timeout
                )
                
                if response.status_code == 200:
                    roster_data = response.json()
                    logger.info("NRPS roster fetched successfully",
                               url=memberships_url,
                               member_count=len(roster_data.get('members', [])))
                    return roster_data
                elif response.status_code in [401, 403]:
                    logger.error("NRPS authentication failed",
                                url=memberships_url,
                                status_code=response.status_code)
                    return None
                else:
                    logger.warning("NRPS request failed, retrying",
                                  url=memberships_url,
                                  status_code=response.status_code,
                                  attempt=attempt + 1)
                    
                    if attempt < self.max_retries - 1:
                        time.sleep(self.retry_delays[attempt])
                    
            except requests.exceptions.RequestException as e:
                logger.warning("NRPS request exception, retrying",
                              url=memberships_url,
                              error=str(e),
                              attempt=attempt + 1)
                
                if attempt < self.max_retries - 1:
                    time.sleep(self.retry_delays[attempt])
        
        logger.error("NRPS request failed after all retries", url=memberships_url)
        return None
    
    def _process_roster_member(self, platform_id: str, course_link_id: str,
                              member_data: Dict[str, Any]) -> Dict[str, str]:
        """Process individual roster member"""
        try:
            user_id = member_data.get('user_id')
            if not user_id:
                logger.warning("Member missing user_id", member_data=member_data)
                return {'action': 'skipped', 'reason': 'missing_user_id'}
            
            # Check if member exists
            existing_member = self._get_existing_member(platform_id, course_link_id, user_id)
            
            if existing_member:
                # Update existing member
                updated = self._update_roster_member(existing_member['id'], member_data)
                return {'action': 'updated' if updated else 'no_change'}
            else:
                # Create new member
                member_id = self._create_roster_member(platform_id, course_link_id, member_data)
                return {'action': 'created', 'member_id': member_id}
                
        except Exception as e:
            logger.error("Failed to process roster member",
                        user_id=member_data.get('user_id'),
                        error=str(e))
            return {'action': 'error', 'error': str(e)}
    
    def _get_existing_member(self, platform_id: str, course_link_id: str, 
                           user_id: str) -> Optional[Dict[str, Any]]:
        """Get existing roster member"""
        query = """
        SELECT * FROM lti_roster_members 
        WHERE platform_id = %s AND course_link_id = %s AND user_id = %s
        LIMIT 1
        """
        
        results = db_manager.execute_query(query, (platform_id, course_link_id, user_id))
        return results[0] if results else None
    
    def _create_roster_member(self, platform_id: str, course_link_id: str,
                            member_data: Dict[str, Any]) -> str:
        """Create new roster member"""
        member_id = f"roster_{platform_id}_{course_link_id}_{member_data['user_id']}"
        
        query = """
        INSERT INTO lti_roster_members (
            id, platform_id, course_link_id, user_id, name, email, roles, status
        ) VALUES (
            gen_random_uuid(), %s, %s, %s, %s, %s, %s, %s
        ) RETURNING id
        """
        
        params = (
            platform_id,
            course_link_id,
            member_data['user_id'],
            member_data.get('name'),
            member_data.get('email'),
            json.dumps(member_data.get('roles', [])),
            'Active'
        )
        
        result = db_manager.execute_query(query, params)
        created_id = str(result[0]['id'])
        
        logger.info("Roster member created",
                   member_id=created_id,
                   user_id=member_data['user_id'],
                   name=member_data.get('name'))
        
        return created_id
    
    def _update_roster_member(self, member_id: str, member_data: Dict[str, Any]) -> bool:
        """Update existing roster member"""
        query = """
        UPDATE lti_roster_members 
        SET name = %s, email = %s, roles = %s, status = %s, 
            last_seen = NOW(), updated_at = NOW()
        WHERE id = %s
        """
        
        params = (
            member_data.get('name'),
            member_data.get('email'), 
            json.dumps(member_data.get('roles', [])),
            'Active',  # Mark as active since they're in current roster
            member_id
        )
        
        db_manager.execute_query(query, params)
        return True
    
    def _mark_absent_members_inactive(self, platform_id: str, course_link_id: str,
                                    active_user_ids: List[str]) -> int:
        """Mark members not in current roster as inactive"""
        if not active_user_ids:
            return 0
        
        # Create placeholders for IN clause
        placeholders = ','.join(['%s'] * len(active_user_ids))
        
        query = f"""
        UPDATE lti_roster_members 
        SET status = 'Inactive', updated_at = NOW()
        WHERE platform_id = %s AND course_link_id = %s 
          AND user_id NOT IN ({placeholders})
          AND status = 'Active'
        """
        
        params = [platform_id, course_link_id] + active_user_ids
        
        result = db_manager.execute_query(query, params)
        
        # Get count of affected rows (this is a simplified approach)
        count_query = f"""
        SELECT COUNT(*) as count FROM lti_roster_members 
        WHERE platform_id = %s AND course_link_id = %s 
          AND user_id NOT IN ({placeholders})
          AND status = 'Inactive'
        """
        
        count_result = db_manager.execute_query(count_query, params)
        return count_result[0]['count'] if count_result else 0
    
    def _get_platform_access_token(self, platform: Any) -> Optional[str]:
        """Get OAuth2 access token for platform API access"""
        try:
            # For now, return None - this needs proper OAuth2 client credentials flow
            # TODO: Implement OAuth2 client credentials grant for NRPS
            logger.warning("OAuth2 token not implemented for NRPS", platform_id=platform.id)
            return None
            
        except Exception as e:
            logger.error("Failed to get NRPS access token",
                        platform_id=platform.id,
                        error=str(e))
            return None

# Global NRPS service instance
nrps_service = NRPSService()