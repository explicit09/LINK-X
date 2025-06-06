"""
Performance monitoring and metrics collection

This module provides backward compatibility by re-exporting all 
monitoring functionality from the modular monitoring package.
"""

import logging

# Configure logging
logger = logging.getLogger(__name__)

def setup_monitoring(app):
    """Setup monitoring - placeholder for when monitoring is needed"""
    logger.info("Monitoring setup called but not implemented (OK for basic usage)")
    return True

# Export basic monitoring functions
__all__ = ['setup_monitoring']