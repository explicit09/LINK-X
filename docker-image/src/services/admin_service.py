from typing import List, Dict, Optional
from datetime import datetime, timedelta
from sqlalchemy import func

from repositories.user_repository import UserRepository
from repositories.course_repository import CourseRepository
from repositories.enrollment_repository import EnrollmentRepository
from repositories.file_repository import FileRepository
from core.exceptions import NotFoundError, ValidationError
from core.cache import invalidate_cache

class AdminService:
    """Service for admin-related business logic"""
    
    def __init__(self):
        self.user_repo = UserRepository()
        self.course_repo = CourseRepository()
        self.enrollment_repo = EnrollmentRepository()
        self.file_repo = FileRepository()
    
    def get_users(self, page: int = 1, limit: int = 20, role_filter: str = None, 
                  search: str = None) -> List[Dict]:
        """Get users with filtering and pagination"""
        offset = (page - 1) * limit
        
        if search:
            # Search users by name or email
            users = self.user_repo.search_users(search, role=role_filter, limit=limit)
        elif role_filter:
            # Get users by role
            users = self.user_repo.get_users_by_role(role_filter, offset=offset, limit=limit)
        else:
            # Get all users
            users = self.user_repo.get_all_paginated(offset=offset, limit=limit)
        
        return users
    
    def get_user_details(self, user_id: str) -> Dict:
        """Get detailed user information"""
        user = self.user_repo.get_with_profile(user_id)
        if not user:
            raise NotFoundError("User not found")
        
        # Get additional statistics
        stats = self.user_repo.get_user_statistics(user_id)
        
        return {
            'user': user,
            'statistics': stats
        }
    
    def update_user(self, user_id: str, **kwargs) -> Dict:
        """Update user information"""
        user = self.user_repo.get_by_id(user_id)
        if not user:
            raise NotFoundError("User not found")
        
        # Update user fields
        allowed_fields = ['email', 'role']
        user_updates = {k: v for k, v in kwargs.items() if k in allowed_fields}
        
        if user_updates:
            self.user_repo.update(user_id, **user_updates)
        
        # Update profile fields
        profile_fields = {k: v for k, v in kwargs.items() if k not in allowed_fields}
        if profile_fields:
            self.user_repo.update_profile(user_id, user.role.role_type, **profile_fields)
        
        # Invalidate user cache
        invalidate_cache(f"user:{user_id}:*")
        
        return self.user_repo.get_with_profile(user_id)
    
    def suspend_user(self, user_id: str) -> None:
        """Suspend a user account"""
        user = self.user_repo.get_by_id(user_id)
        if not user:
            raise NotFoundError("User not found")
        
        self.user_repo.suspend_user(user_id)
        invalidate_cache(f"user:{user_id}:*")
    
    def activate_user(self, user_id: str) -> None:
        """Activate a suspended user account"""
        user = self.user_repo.get_by_id(user_id)
        if not user:
            raise NotFoundError("User not found")
        
        self.user_repo.activate_user(user_id)
        invalidate_cache(f"user:{user_id}:*")
    
    def get_all_courses(self, page: int = 1, limit: int = 20, 
                       status: str = None, instructor_id: str = None) -> List[Dict]:
        """Get all courses with filtering"""
        offset = (page - 1) * limit
        
        # This would need to be implemented with proper filtering
        # For now, return all courses
        courses = self.course_repo.get_all_paginated(offset=offset, limit=limit)
        
        # Add statistics to each course
        for course in courses:
            course.stats = self.course_repo.get_course_statistics(course.id)
        
        return courses
    
    def approve_course(self, course_id: str) -> Dict:
        """Approve a course for publishing"""
        course = self.course_repo.get_by_id(course_id)
        if not course:
            raise NotFoundError("Course not found")
        
        # Update course status
        updated = self.course_repo.update(
            course_id,
            published=True,
            published_at=datetime.utcnow(),
            reviewed_at=datetime.utcnow()
        )
        
        invalidate_cache(f"course:{course_id}:*")
        
        return updated
    
    def reject_course(self, course_id: str, reason: str) -> None:
        """Reject a course with reason"""
        course = self.course_repo.get_by_id(course_id)
        if not course:
            raise NotFoundError("Course not found")
        
        # Store rejection reason (would need a field for this)
        self.course_repo.update(
            course_id,
            published=False,
            review_notes=reason,
            reviewed_at=datetime.utcnow()
        )
        
        invalidate_cache(f"course:{course_id}:*")
    
    def get_platform_statistics(self) -> Dict:
        """Get platform-wide statistics"""
        stats = {
            'users': {
                'total': self.user_repo.count(),
                'students': self.user_repo.count(role='student'),
                'instructors': self.user_repo.count(role='instructor'),
                'admins': self.user_repo.count(role='admin'),
                'active_30d': len(self.user_repo.get_active_users(days=30))
            },
            'courses': {
                'total': self.course_repo.count(),
                'published': self.course_repo.count(published=True),
                'draft': self.course_repo.count(published=False)
            },
            'enrollments': {
                'total': self.enrollment_repo.count()
            },
            'files': {
                'total': self.file_repo.count(),
                'processed': self.file_repo.count(processed=True),
                'pending': self.file_repo.count(processed=False)
            }
        }
        
        return stats
    
    def generate_report(self, report_type: str, start_date: str = None, 
                       end_date: str = None) -> Dict:
        """Generate various reports"""
        if report_type == 'usage':
            return self._generate_usage_report(start_date, end_date)
        elif report_type == 'enrollment':
            return self._generate_enrollment_report(start_date, end_date)
        elif report_type == 'content':
            return self._generate_content_report()
        else:
            raise ValidationError(f"Unknown report type: {report_type}")
    
    def get_system_settings(self) -> Dict:
        """Get system settings"""
        # This would fetch from a settings table or configuration
        return {
            'maintenance_mode': False,
            'registration_enabled': True,
            'file_upload_limit': 100 * 1024 * 1024,  # 100MB
            'allowed_file_types': ['pdf', 'txt', 'doc', 'docx', 'mp3', 'wav', 'm4a'],
            'ai_model': 'gpt-4o',
            'embedding_model': 'text-embedding-ada-002'
        }
    
    def update_system_settings(self, settings: Dict) -> Dict:
        """Update system settings"""
        # Validate settings
        allowed_keys = [
            'maintenance_mode', 'registration_enabled', 
            'file_upload_limit', 'allowed_file_types'
        ]
        
        filtered_settings = {
            k: v for k, v in settings.items() 
            if k in allowed_keys
        }
        
        # This would update the settings in database/config
        # For now, just return the filtered settings
        
        # Clear all caches when settings change
        invalidate_cache("*")
        
        return filtered_settings
    
    def run_cleanup_tasks(self) -> Dict:
        """Run system cleanup tasks"""
        results = {
            'unprocessed_files': self._cleanup_unprocessed_files(),
            'orphaned_personalized_files': self._cleanup_orphaned_files(),
            'expired_cache': self._cleanup_expired_cache()
        }
        
        return results
    
    def trigger_reindexing(self) -> None:
        """Trigger content reindexing"""
        # Queue reindexing task
        from ..tasks import reindex_all_content
        reindex_all_content.delay()
    
    def _generate_usage_report(self, start_date: str, end_date: str) -> Dict:
        """Generate usage report"""
        # Parse dates
        start = datetime.fromisoformat(start_date) if start_date else datetime.utcnow() - timedelta(days=30)
        end = datetime.fromisoformat(end_date) if end_date else datetime.utcnow()
        
        return {
            'period': {
                'start': start.isoformat(),
                'end': end.isoformat()
            },
            'active_users': len(self.user_repo.get_active_users(days=(end - start).days)),
            'new_users': self.user_repo.count(created_at__gte=start, created_at__lte=end),
            'new_courses': self.course_repo.count(created_at__gte=start, created_at__lte=end),
            'new_enrollments': self.enrollment_repo.count(enrolled_at__gte=start, enrolled_at__lte=end)
        }
    
    def _generate_enrollment_report(self, start_date: str, end_date: str) -> Dict:
        """Generate enrollment report"""
        # This would aggregate enrollment data
        return {
            'total_enrollments': self.enrollment_repo.count(),
            'popular_courses': [],  # Would fetch top enrolled courses
            'enrollment_trends': []  # Would calculate daily/weekly trends
        }
    
    def _generate_content_report(self) -> Dict:
        """Generate content report"""
        return {
            'total_courses': self.course_repo.count(),
            'total_modules': 0,  # Would count all modules
            'total_files': self.file_repo.count(),
            'file_types': {},  # Would aggregate by file type
            'storage_used': 0  # Would calculate total storage
        }
    
    def _cleanup_unprocessed_files(self) -> int:
        """Clean up old unprocessed files"""
        # Would delete files that failed processing after certain time
        return 0
    
    def _cleanup_orphaned_files(self) -> int:
        """Clean up orphaned personalized files"""
        # Would delete personalized files without original
        return 0
    
    def _cleanup_expired_cache(self) -> int:
        """Clean up expired cache entries"""
        # Redis handles expiration automatically
        return 0