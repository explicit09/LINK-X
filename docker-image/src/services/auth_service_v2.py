"""
Compatibility wrapper for unified authentication service
"""
from services.auth_service_unified import *
import warnings
warnings.warn(
    "services.auth_service_v2 is deprecated. Please use services.auth_service_unified directly.",
    DeprecationWarning,
    stacklevel=2
)
