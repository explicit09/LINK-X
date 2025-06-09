"""
Patch for Supabase/GoTrue compatibility issues
"""
import logging

logger = logging.getLogger(__name__)

def patch_httpx_client():
    """Patch httpx Client to accept and ignore proxy parameter"""
    try:
        import httpx
        
        # Store original init
        original_init = httpx.Client.__init__
        
        def patched_init(self, *args, **kwargs):
            # Remove proxy parameter if present
            if 'proxy' in kwargs:
                logger.debug("Removing unsupported 'proxy' parameter from httpx.Client")
                kwargs.pop('proxy')
            
            # Call original init
            original_init(self, *args, **kwargs)
        
        # Apply patch
        httpx.Client.__init__ = patched_init
        logger.info("Applied httpx Client patch for Supabase compatibility")
        
    except Exception as e:
        logger.error(f"Failed to apply httpx patch: {e}")

# Apply patch on import
patch_httpx_client()