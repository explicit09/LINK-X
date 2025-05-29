"""
Authentication v2 Compatibility Layer
This module provides backward compatibility for code using the old auth_v2 module
"""

import warnings
from .auth_unified import bp

# Add deprecation warning
warnings.warn(
    "api.auth_v2 is deprecated. Please use api.auth_unified directly.",
    DeprecationWarning,
    stacklevel=2
)

# Re-export for compatibility
from .auth_unified import (
    login,
    register,
    logout,
    get_current_user,
    refresh_token,
    verify_token,
    register_student,
    register_instructor
) 