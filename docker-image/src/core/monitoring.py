"""
Performance monitoring and metrics collection

This module provides backward compatibility by re-exporting all 
monitoring functionality from the modular monitoring package.
"""

# Re-export everything from the monitoring package for backward compatibility
from .monitoring import *

# Ensure backward compatibility with existing imports
import logging

# Configure logging
logger = logging.getLogger(__name__)