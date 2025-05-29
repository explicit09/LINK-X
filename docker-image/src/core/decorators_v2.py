"""
Compatibility wrapper for unified decorators
"""
from src.core.decorators_unified import *
import warnings
warnings.warn(
    "core.decorators_v2 is deprecated. Please use core.decorators_unified directly.",
    DeprecationWarning,
    stacklevel=2
)
