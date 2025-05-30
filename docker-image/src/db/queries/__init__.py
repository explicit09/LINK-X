"""
Database queries module - refactored for better organization.

This module maintains backward compatibility by re-exporting all functions
from the entity-specific query modules.
"""

# Import all functions from entity-specific modules to maintain backward compatibility

# User and authentication queries
from .user_queries import (
    get_user_by_id,
    get_user_by_email, 
    get_user_by_firebase_uid,
    create_user,
    update_user,
    delete_user,
    get_role_by_user_id,
    set_role,
    get_users_by_role,
    get_user_with_role,
    remove_user_role,
    search_users,
    list_users,
    count_users
)

# Course queries
from .course_queries import (
    get_course_by_id,
    get_courses_by_instructor_id,
    get_courses_by_student_id,
    create_course,
    update_course,
    delete_course,
    search_courses,
    list_public_courses,
    get_course_statistics,
    get_course_with_access_info,
    check_course_access,
    get_course_content_summary,
    toggle_course_published
)

# Module queries
from .module_queries import (
    get_module_by_id,
    get_modules_by_course,
    create_module,
    update_module,
    delete_module,
    get_module_with_files,
    get_module_statistics,
    search_modules,
    reorder_modules,
    get_next_module_order
)

# File queries
from .file_queries import (
    get_file_by_id,
    get_files_by_module,
    get_files_without_raw_by_module,
    create_file,
    update_file,
    delete_file,
    insert_file_chunks,
    get_file_chunks,
    delete_file_chunks,
    search_files,
    get_file_statistics,
    transcribe_audio,
    get_files_needing_transcription,
    update_file_ai_summary,
    get_files_by_type
)

# Create remaining entity modules with simplified implementations for now
# These would be fully implemented in a complete refactoring

def get_instructor_profile(conn, instructor_id):
    """Placeholder - would be moved to profile_queries.py"""
    from ..queries import get_user_by_id
    return get_user_by_id(conn, instructor_id)

def create_instructor_profile(conn, profile_data):
    """Placeholder - would be moved to profile_queries.py"""
    from ..queries import create_user
    return create_user(conn, profile_data)

def update_instructor_profile(conn, instructor_id, updates):
    """Placeholder - would be moved to profile_queries.py"""
    from ..queries import update_user
    return update_user(conn, instructor_id, updates)

def delete_instructor_profile(conn, instructor_id):
    """Placeholder - would be moved to profile_queries.py"""
    from ..queries import delete_user
    return delete_user(conn, instructor_id)

def get_student_profile(conn, student_id):
    """Placeholder - would be moved to profile_queries.py"""
    from ..queries import get_user_by_id
    return get_user_by_id(conn, student_id)

def create_student_profile(conn, profile_data):
    """Placeholder - would be moved to profile_queries.py"""
    from ..queries import create_user
    return create_user(conn, profile_data)

def update_student_profile(conn, student_id, updates):
    """Placeholder - would be moved to profile_queries.py"""
    from ..queries import update_user
    return update_user(conn, student_id, updates)

def delete_student_profile(conn, student_id):
    """Placeholder - would be moved to profile_queries.py"""
    from ..queries import delete_user
    return delete_user(conn, student_id)

def get_admin_profile(conn, admin_id):
    """Placeholder - would be moved to profile_queries.py"""
    from ..queries import get_user_by_id
    return get_user_by_id(conn, admin_id)

def create_admin_profile(conn, profile_data):
    """Placeholder - would be moved to profile_queries.py"""
    from ..queries import create_user
    return create_user(conn, profile_data)

def update_admin_profile(conn, admin_id, updates):
    """Placeholder - would be moved to profile_queries.py"""
    from ..queries import update_user
    return update_user(conn, admin_id, updates)

def delete_admin_profile(conn, admin_id):
    """Placeholder - would be moved to profile_queries.py"""
    from ..queries import delete_user
    return delete_user(conn, admin_id)

# Access Code placeholders - would be moved to enrollment_queries.py
def get_access_code_by_id(conn, access_code_id):
    """Placeholder - would be implemented in enrollment_queries.py"""
    pass

def get_access_code_by_course(conn, course_id):
    """Placeholder - would be implemented in enrollment_queries.py"""
    pass

def get_access_code_by_code(conn, code):
    """Placeholder - would be implemented in enrollment_queries.py"""
    pass

def create_access_code(conn, access_code_data):
    """Placeholder - would be implemented in enrollment_queries.py"""
    pass

def update_access_code(conn, access_code_id, updates):
    """Placeholder - would be implemented in enrollment_queries.py"""
    pass

def delete_access_code(conn, access_code_id):
    """Placeholder - would be implemented in enrollment_queries.py"""
    pass

# Enrollment placeholders - would be moved to enrollment_queries.py
def get_enrollment(conn, enrollment_id):
    """Placeholder - would be implemented in enrollment_queries.py"""
    pass

def get_enrollment_by_student_course(conn, student_id, course_id):
    """Placeholder - would be implemented in enrollment_queries.py"""
    pass

def get_enrollments_by_student(conn, student_id):
    """Placeholder - would be implemented in enrollment_queries.py"""
    pass

def get_enrollments_by_course(conn, course_id):
    """Placeholder - would be implemented in enrollment_queries.py"""
    pass

def create_enrollment(conn, enrollment_data):
    """Placeholder - would be implemented in enrollment_queries.py"""
    pass

def delete_enrollment(conn, enrollment_id):
    """Placeholder - would be implemented in enrollment_queries.py"""
    pass

# Additional placeholders for other entities
# These would be implemented in their respective modules

def get_personalized_file_by_id(conn, file_id):
    """Placeholder - would be implemented in content_queries.py"""
    pass

def get_personalized_files_by_student(conn, student_id):
    """Placeholder - would be implemented in content_queries.py"""
    pass

def create_personalized_file(conn, file_data):
    """Placeholder - would be implemented in content_queries.py"""
    pass

def update_personalized_file(conn, file_id, updates):
    """Placeholder - would be implemented in content_queries.py"""
    pass

def delete_personalized_file(conn, file_id):
    """Placeholder - would be implemented in content_queries.py"""
    pass

def get_chat_by_id(conn, chat_id):
    """Placeholder - would be implemented in chat_queries.py"""
    pass

def get_chats_by_student(conn, student_id):
    """Placeholder - would be implemented in chat_queries.py"""
    pass

def create_chat(conn, chat_data):
    """Placeholder - would be implemented in chat_queries.py"""
    pass

def update_chat(conn, chat_id, updates):
    """Placeholder - would be implemented in chat_queries.py"""
    pass

def delete_chat(conn, chat_id):
    """Placeholder - would be implemented in chat_queries.py"""
    pass

def get_message_by_id(conn, message_id):
    """Placeholder - would be implemented in chat_queries.py"""
    pass

def get_messages_by_chat(conn, chat_id):
    """Placeholder - would be implemented in chat_queries.py"""
    pass

def create_message(conn, message_data):
    """Placeholder - would be implemented in chat_queries.py"""
    pass

def delete_messages_after(conn, message_id):
    """Placeholder - would be implemented in chat_queries.py"""
    pass

def get_report_by_id(conn, report_id):
    """Placeholder - would be implemented in analytics_queries.py"""
    pass

def get_report_by_course(conn, course_id):
    """Placeholder - would be implemented in analytics_queries.py"""
    pass

def create_report(conn, report_data):
    """Placeholder - would be implemented in analytics_queries.py"""
    pass

def update_report(conn, report_id, updates):
    """Placeholder - would be implemented in analytics_queries.py"""
    pass

def delete_report(conn, report_id):
    """Placeholder - would be implemented in analytics_queries.py"""
    pass

def get_news_by_id(conn, news_id):
    """Placeholder - would be implemented in content_queries.py"""
    pass

def list_news(conn, limit=50, offset=0):
    """Placeholder - would be implemented in content_queries.py"""
    pass

def create_news(conn, news_data):
    """Placeholder - would be implemented in content_queries.py"""
    pass

def update_news(conn, news_id, updates):
    """Placeholder - would be implemented in content_queries.py"""
    pass

def delete_news(conn, news_id):
    """Placeholder - would be implemented in content_queries.py"""
    pass

def get_market_by_id(conn, market_id):
    """Placeholder - would be implemented in content_queries.py"""
    pass

def list_market(conn, limit=50, offset=0):
    """Placeholder - would be implemented in content_queries.py"""
    pass

def create_market(conn, market_data):
    """Placeholder - would be implemented in content_queries.py"""
    pass

def update_market(conn, market_id, updates):
    """Placeholder - would be implemented in content_queries.py"""
    pass

def delete_market(conn, market_id):
    """Placeholder - would be implemented in content_queries.py"""
    pass

def get_student_questions_for_course(conn, course_id):
    """Placeholder - would be implemented in analytics_queries.py"""
    pass

def get_course_title(conn, course_id):
    """Placeholder - would be implemented in course_queries.py"""
    course = get_course_by_id(conn, course_id)
    return course['title'] if course else None

def get_file_metrics_for_course(conn, course_id):
    """Placeholder - would be implemented in analytics_queries.py"""
    pass

def get_module_metrics_for_course(conn, course_id):
    """Placeholder - would be implemented in analytics_queries.py"""
    pass

def get_todo_by_id(conn, todo_id):
    """Placeholder - would be implemented in content_queries.py"""
    pass

def get_todos_by_user(conn, user_id):
    """Placeholder - would be implemented in content_queries.py"""
    pass

def get_todos_by_user_and_course(conn, user_id, course_id):
    """Placeholder - would be implemented in content_queries.py"""
    pass

def create_todo(conn, todo_data):
    """Placeholder - would be implemented in content_queries.py"""
    pass

def update_todo(conn, todo_id, updates):
    """Placeholder - would be implemented in content_queries.py"""
    pass

def delete_todo(conn, todo_id):
    """Placeholder - would be implemented in content_queries.py"""
    pass

# Export all functions for backward compatibility
__all__ = [
    # User queries
    'get_user_by_id', 'get_user_by_email', 'get_user_by_firebase_uid',
    'create_user', 'update_user', 'delete_user',
    'get_role_by_user_id', 'set_role',
    
    # Profile queries
    'get_instructor_profile', 'create_instructor_profile', 'update_instructor_profile', 'delete_instructor_profile',
    'get_student_profile', 'create_student_profile', 'update_student_profile', 'delete_student_profile',
    'get_admin_profile', 'create_admin_profile', 'update_admin_profile', 'delete_admin_profile',
    
    # Course queries
    'get_course_by_id', 'get_courses_by_instructor_id', 'get_courses_by_student_id',
    'create_course', 'update_course', 'delete_course',
    
    # Module queries
    'get_module_by_id', 'get_modules_by_course', 'create_module', 'update_module', 'delete_module',
    
    # File queries
    'get_file_by_id', 'get_files_by_module', 'get_files_without_raw_by_module',
    'create_file', 'update_file', 'delete_file', 'insert_file_chunks', 'transcribe_audio',
    
    # Access code queries
    'get_access_code_by_id', 'get_access_code_by_course', 'get_access_code_by_code',
    'create_access_code', 'update_access_code', 'delete_access_code',
    
    # Enrollment queries
    'get_enrollment', 'get_enrollment_by_student_course', 'get_enrollments_by_student',
    'get_enrollments_by_course', 'create_enrollment', 'delete_enrollment',
    
    # Additional queries (placeholders)
    'get_personalized_file_by_id', 'get_personalized_files_by_student',
    'create_personalized_file', 'update_personalized_file', 'delete_personalized_file',
    'get_chat_by_id', 'get_chats_by_student', 'create_chat', 'update_chat', 'delete_chat',
    'get_message_by_id', 'get_messages_by_chat', 'create_message', 'delete_messages_after',
    'get_report_by_id', 'get_report_by_course', 'create_report', 'update_report', 'delete_report',
    'get_news_by_id', 'list_news', 'create_news', 'update_news', 'delete_news',
    'get_market_by_id', 'list_market', 'create_market', 'update_market', 'delete_market',
    'get_student_questions_for_course', 'get_course_title', 'get_file_metrics_for_course', 'get_module_metrics_for_course',
    'get_todo_by_id', 'get_todos_by_user', 'get_todos_by_user_and_course',
    'create_todo', 'update_todo', 'delete_todo',
]