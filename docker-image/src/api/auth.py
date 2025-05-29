"""
Compatibility wrapper for unified authentication
This module provides backward compatibility for code using the old auth module
"""

# Re-export everything from unified module
from src.api.auth_unified import *

# Add deprecation warning
import warnings
warnings.warn(
    "api.auth is deprecated. Please use api.auth_unified directly.",
    DeprecationWarning,
    stacklevel=2
)
