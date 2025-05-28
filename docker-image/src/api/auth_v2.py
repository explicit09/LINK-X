"""
Compatibility wrapper for unified authentication
This module provides backward compatibility for code using the old auth_v2 module
"""

# Re-export everything from unified module
from api.auth_unified import *

# Add deprecation warning
import warnings
warnings.warn(
    "api.auth_v2 is deprecated. Please use api.auth_unified directly.",
    DeprecationWarning,
    stacklevel=2
)
