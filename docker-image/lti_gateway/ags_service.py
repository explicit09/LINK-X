#!/usr/bin/env python3
"""
LTI Assignment & Grade Service (AGS) - BRUTAL EXECUTION
Handles automatic grade passback to LMS platforms
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
class LineItem:
    """LTI Line Item (Assignment)"""
    id: str
    platform_id: str
    course_link_id: str
    line_item_id: str
    resource_link_id: Optional[str]
    label: str
    max_score: float
    resource_id: Optional[str]
    score_url: str
    result_url: str
    active: bool

@dataclass
class GradeScore:
    """Grade score for AGS submission"""
    user_id: str
    score_given: float
    score_maximum: float
    activity_progress: str = "Completed"  # Initialized, Started, InProgress, Submitted, Completed
    grading_progress: str = "FullyGraded"  # NotReady, Failed, Pending, PendingManual, FullyGraded
    timestamp: Optional[datetime] = None
    comment: Optional[str] = None

class AGSService:
    """
    Assignment & Grade Service Implementation
    
    Features:
    - Line Item management (assignment creation/update)
    - Grade passback with retry logic
    - Bulk grade operations
    - Score validation and normalization
    """
    
    def __init__(self):
        self.max_retries = 3
        self.retry_delays = [1, 5, 15]  # seconds
        self.timeout = 30  # seconds
    
    def create_line_item(self, platform_id: str, course_link_id: str, 
                        line_item_data: Dict[str, Any]) -> str:
        """Create new line item (assignment) in database"""
        try:
            line_item_id = line_item_data['id']
            
            # Validate required fields
            required_fields = ['label', 'scoreMaximum']
            for field in required_fields:
                if field not in line_item_data:
                    raise ValueError(f"Missing required field: {field}")
            
            # Insert into database
            query = """
            INSERT INTO lti_line_items (
                id, platform_id, course_link_id, line_item_id, 
                resource_link_id, label, max_score, resource_id,
                score_url, result_url, active
            ) VALUES (
                gen_random_uuid(), %s, %s, %s, %s, %s, %s, %s, %s, %s, %s
            ) RETURNING id
            """
            
            params = (
                platform_id,
                course_link_id,
                line_item_id,
                line_item_data.get('resourceLinkId'),
                line_item_data['label'],
                float(line_item_data['scoreMaximum']),
                line_item_data.get('resourceId'),
                line_item_data.get('scoreUrl'),
                line_item_data.get('resultUrl'),
                True
            )
            
            result = db_manager.execute_query(query, params)
            db_line_item_id = result[0]['id']
            
            logger.info("Line item created",
                       platform_id=platform_id,
                       line_item_id=line_item_id,
                       label=line_item_data['label'],
                       max_score=line_item_data['scoreMaximum'])
            
            return str(db_line_item_id)
            
        except Exception as e:
            logger.error("Failed to create line item",
                        platform_id=platform_id,
                        error=str(e))
            raise
    
    def get_line_items(self, platform_id: str, course_link_id: str) -> List[LineItem]:
        """Get all line items for a course"""
        query = """
        SELECT * FROM lti_line_items 
        WHERE platform_id = %s AND course_link_id = %s AND active = true
        ORDER BY created_at DESC
        """
        
        results = db_manager.execute_query(query, (platform_id, course_link_id))
        
        line_items = []
        for row in results:
            line_items.append(LineItem(
                id=str(row['id']),
                platform_id=str(row['platform_id']),
                course_link_id=str(row['course_link_id']),
                line_item_id=row['line_item_id'],
                resource_link_id=row['resource_link_id'],
                label=row['label'],
                max_score=float(row['max_score']),
                resource_id=row['resource_id'],
                score_url=row['score_url'],
                result_url=row['result_url'],
                active=row['active']
            ))
        
        return line_items
    
    def submit_grade(self, platform_id: str, line_item_id: str, 
                    user_link_id: str, grade_score: GradeScore) -> bool:
        """Submit grade to LMS via AGS (asynchronous)"""
        try:
            # Validate score
            if grade_score.score_given < 0 or grade_score.score_given > grade_score.score_maximum:
                raise ValueError(f"Invalid score: {grade_score.score_given}/{grade_score.score_maximum}")
            
            # Queue grade for async processing
            sync_id = db_manager.queue_grade_sync({
                'platform_id': platform_id,
                'line_item_id': line_item_id,
                'user_link_id': user_link_id,
                'score_given': grade_score.score_given,
                'score_maximum': grade_score.score_maximum,
                'activity_progress': grade_score.activity_progress,
                'grading_progress': grade_score.grading_progress
            })
            
            logger.info("Grade queued for sync",
                       sync_id=sync_id,
                       platform_id=platform_id,
                       user_id=grade_score.user_id,
                       score=f"{grade_score.score_given}/{grade_score.score_maximum}")
            
            return True
            
        except Exception as e:
            logger.error("Failed to submit grade",
                        platform_id=platform_id,
                        user_id=grade_score.user_id,
                        error=str(e))
            return False
    
    def process_pending_grades(self, limit: int = 50) -> int:
        """Process pending grade syncs (called by background worker)"""
        try:
            pending_grades = db_manager.get_pending_grade_syncs(limit)
            processed_count = 0
            
            for grade_sync in pending_grades:
                success = self._sync_grade_to_platform(grade_sync)
                if success:
                    processed_count += 1
            
            logger.info("Processed pending grades",
                       processed=processed_count,
                       total_pending=len(pending_grades))
            
            return processed_count
            
        except Exception as e:
            logger.error("Failed to process pending grades", error=str(e))
            return 0
    
    def _sync_grade_to_platform(self, grade_sync: Dict[str, Any]) -> bool:
        """Sync individual grade to LMS platform"""
        try:
            # Get platform and line item details
            platform = db_manager.get_platform_by_id(grade_sync['platform_id'])
            if not platform:
                logger.error("Platform not found", platform_id=grade_sync['platform_id'])
                return False
            
            # Prepare AGS score payload
            score_payload = {
                "timestamp": datetime.utcnow().isoformat() + "Z",
                "scoreGiven": float(grade_sync['score_given']),
                "scoreMaximum": float(grade_sync['score_maximum']),
                "activityProgress": grade_sync['activity_progress'],
                "gradingProgress": grade_sync['grading_progress'],
                "userId": grade_sync['user_id']
            }
            
            # Make AGS API call with retries
            success = self._make_ags_request(
                url=grade_sync['score_url'],
                payload=score_payload,
                platform=platform
            )
            
            if success:
                # Update sync status
                self._update_grade_sync_status(grade_sync['id'], 'completed')
                logger.info("Grade synced successfully",
                           sync_id=grade_sync['id'],
                           score=f"{grade_sync['score_given']}/{grade_sync['score_maximum']}")
            else:
                # Update retry count
                self._update_grade_sync_retry(grade_sync['id'])
                logger.warning("Grade sync failed, will retry",
                              sync_id=grade_sync['id'])
            
            return success
            
        except Exception as e:
            logger.error("Grade sync error",
                        sync_id=grade_sync.get('id'),
                        error=str(e))
            self._update_grade_sync_error(grade_sync['id'], str(e))
            return False
    
    def _make_ags_request(self, url: str, payload: Dict[str, Any], 
                         platform: Any) -> bool:
        """Make authenticated AGS API request with retries"""
        for attempt in range(self.max_retries):
            try:
                # Get OAuth2 access token
                access_token = self._get_platform_access_token(platform)
                if not access_token:
                    logger.error("Failed to get access token", platform_id=platform.id)
                    return False
                
                # Make AGS score submission
                headers = {
                    'Authorization': f'Bearer {access_token}',
                    'Content-Type': 'application/vnd.ims.lis.v1.score+json',
                    'Accept': 'application/json'
                }
                
                response = requests.post(
                    url,
                    json=payload,
                    headers=headers,
                    timeout=self.timeout
                )
                
                if response.status_code in [200, 201]:
                    logger.info("AGS request successful",
                               url=url,
                               status_code=response.status_code)
                    return True
                elif response.status_code in [401, 403]:
                    logger.error("AGS authentication failed",
                                url=url,
                                status_code=response.status_code,
                                response=response.text)
                    return False
                else:
                    logger.warning("AGS request failed, retrying",
                                  url=url,
                                  status_code=response.status_code,
                                  attempt=attempt + 1)
                    
                    if attempt < self.max_retries - 1:
                        time.sleep(self.retry_delays[attempt])
                    
            except requests.exceptions.RequestException as e:
                logger.warning("AGS request exception, retrying",
                              url=url,
                              error=str(e),
                              attempt=attempt + 1)
                
                if attempt < self.max_retries - 1:
                    time.sleep(self.retry_delays[attempt])
        
        logger.error("AGS request failed after all retries", url=url)
        return False
    
    def _get_platform_access_token(self, platform: Any) -> Optional[str]:
        """Get OAuth2 access token for platform API access"""
        try:
            # For now, return None - this needs proper OAuth2 client credentials flow
            # TODO: Implement OAuth2 client credentials grant
            logger.warning("OAuth2 token not implemented", platform_id=platform.id)
            return None
            
        except Exception as e:
            logger.error("Failed to get access token",
                        platform_id=platform.id,
                        error=str(e))
            return None
    
    def _update_grade_sync_status(self, sync_id: str, status: str) -> None:
        """Update grade sync status"""
        query = """
        UPDATE lti_grade_sync 
        SET status = %s, completed_at = NOW()
        WHERE id = %s
        """
        db_manager.execute_query(query, (status, sync_id))
    
    def _update_grade_sync_retry(self, sync_id: str) -> None:
        """Update grade sync retry count and next retry time"""
        query = """
        UPDATE lti_grade_sync 
        SET attempts = attempts + 1,
            last_attempted = NOW(),
            next_retry = NOW() + INTERVAL '5 minutes'
        WHERE id = %s
        """
        db_manager.execute_query(query, (sync_id,))
    
    def _update_grade_sync_error(self, sync_id: str, error_message: str) -> None:
        """Update grade sync with error message"""
        query = """
        UPDATE lti_grade_sync 
        SET status = 'failed',
            error_message = %s,
            last_attempted = NOW()
        WHERE id = %s
        """
        db_manager.execute_query(query, (error_message, sync_id))

# Global AGS service instance
ags_service = AGSService()