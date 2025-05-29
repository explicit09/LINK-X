"""
Configuration module compatibility wrapper
Provides backward compatibility while using new configuration system
"""

# Re-export everything from core.config for backward compatibility
from src.core.config import *

# Add deprecation warning
import warnings
warnings.warn(
    "Importing from 'config' is deprecated. Please use 'core.config' directly.",
    DeprecationWarning,
    stacklevel=2
)