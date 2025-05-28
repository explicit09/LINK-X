#!/usr/bin/env python3
"""
Migration script to transition from separate auth files to unified authentication
"""

import os
import sys
import shutil
from datetime import datetime
import logging

# Add src to path
sys.path.insert(0, os.path.join(os.path.dirname(__file__), '../../src'))

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)


def backup_existing_files():
    """Backup existing authentication files"""
    backup_dir = f"backups/auth_backup_{datetime.now().strftime('%Y%m%d_%H%M%S')}"
    os.makedirs(backup_dir, exist_ok=True)
    
    files_to_backup = [
        'src/api/auth.py',
        'src/api/auth_v2.py',
        'src/services/auth_service.py',
        'src/services/auth_service_v2.py',
        'src/core/decorators.py',
        'src/core/decorators_v2.py'
    ]
    
    for file_path in files_to_backup:
        if os.path.exists(file_path):
            dest_path = os.path.join(backup_dir, os.path.basename(file_path))
            shutil.copy2(file_path, dest_path)
            logger.info(f"Backed up {file_path} to {dest_path}")
            

def update_imports():
    """Update imports in other files to use unified modules"""
    import_mappings = {
        'from api.auth import': 'from api.auth_unified import',
        'from api.auth_v2 import': 'from api.auth_unified import',
        'from services.auth_service import': 'from services.auth_service_unified import',
        'from services.auth_service_v2 import': 'from services.auth_service_unified import',
        'from core.decorators import': 'from core.decorators_unified import',
        'from core.decorators_v2 import': 'from core.decorators_unified import',
        'import api.auth': 'import api.auth_unified as auth',
        'import api.auth_v2': 'import api.auth_unified as auth',
    }
    
    # Files to check for imports
    files_to_update = []
    for root, dirs, files in os.walk('src'):
        for file in files:
            if file.endswith('.py'):
                files_to_update.append(os.path.join(root, file))
                
    for file_path in files_to_update:
        try:
            with open(file_path, 'r') as f:
                content = f.read()
                
            original_content = content
            for old_import, new_import in import_mappings.items():
                content = content.replace(old_import, new_import)
                
            if content != original_content:
                with open(file_path, 'w') as f:
                    f.write(content)
                logger.info(f"Updated imports in {file_path}")
                
        except Exception as e:
            logger.error(f"Error updating {file_path}: {e}")
            

def create_compatibility_wrappers():
    """Create thin wrappers for backward compatibility"""
    
    # Create auth.py wrapper
    auth_wrapper = '''"""
Compatibility wrapper for unified authentication
This module provides backward compatibility for code using the old auth module
"""

# Re-export everything from unified module
from api.auth_unified import *

# Add deprecation warning
import warnings
warnings.warn(
    "api.auth is deprecated. Please use api.auth_unified directly.",
    DeprecationWarning,
    stacklevel=2
)
'''
    
    # Create auth_v2.py wrapper
    auth_v2_wrapper = '''"""
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
'''
    
    # Write wrappers
    with open('src/api/auth.py', 'w') as f:
        f.write(auth_wrapper)
    logger.info("Created auth.py compatibility wrapper")
    
    with open('src/api/auth_v2.py', 'w') as f:
        f.write(auth_v2_wrapper)
    logger.info("Created auth_v2.py compatibility wrapper")
    
    # Similar wrappers for services and decorators
    service_wrapper = '''"""
Compatibility wrapper for unified authentication service
"""
from services.auth_service_unified import *
import warnings
warnings.warn(
    "services.auth_service is deprecated. Please use services.auth_service_unified directly.",
    DeprecationWarning,
    stacklevel=2
)
'''
    
    with open('src/services/auth_service.py', 'w') as f:
        f.write(service_wrapper)
    with open('src/services/auth_service_v2.py', 'w') as f:
        f.write(service_wrapper.replace('auth_service', 'auth_service_v2'))
        
    decorator_wrapper = '''"""
Compatibility wrapper for unified decorators
"""
from core.decorators_unified import *
import warnings
warnings.warn(
    "core.decorators is deprecated. Please use core.decorators_unified directly.",
    DeprecationWarning,
    stacklevel=2
)
'''
    
    with open('src/core/decorators.py', 'w') as f:
        f.write(decorator_wrapper)
    with open('src/core/decorators_v2.py', 'w') as f:
        f.write(decorator_wrapper.replace('decorators', 'decorators_v2'))
        

def update_app_configuration():
    """Update app.py or app_refactored.py to use unified auth"""
    app_files = ['src/app.py', 'src/app_refactored.py']
    
    for app_file in app_files:
        if os.path.exists(app_file):
            try:
                with open(app_file, 'r') as f:
                    content = f.read()
                    
                # Update blueprint registration
                content = content.replace(
                    "from api import auth, auth_v2",
                    "from api import auth_unified"
                )
                content = content.replace(
                    "app.register_blueprint(auth.bp",
                    "app.register_blueprint(auth_unified.bp"
                )
                content = content.replace(
                    "app.register_blueprint(auth_v2.bp",
                    "# auth_v2 merged into auth_unified"
                )
                
                with open(app_file, 'w') as f:
                    f.write(content)
                logger.info(f"Updated {app_file}")
                
            except Exception as e:
                logger.error(f"Error updating {app_file}: {e}")
                

def main():
    """Run the migration"""
    logger.info("Starting authentication unification migration...")
    
    # Step 1: Backup existing files
    logger.info("Step 1: Backing up existing files...")
    backup_existing_files()
    
    # Step 2: Update imports in other files
    logger.info("Step 2: Updating imports...")
    update_imports()
    
    # Step 3: Create compatibility wrappers
    logger.info("Step 3: Creating compatibility wrappers...")
    create_compatibility_wrappers()
    
    # Step 4: Update app configuration
    logger.info("Step 4: Updating app configuration...")
    update_app_configuration()
    
    logger.info("Migration completed successfully!")
    logger.info("Please test your application thoroughly.")
    logger.info("Old modules are now thin wrappers that show deprecation warnings.")
    logger.info("Update your code to use the unified modules directly:")
    logger.info("  - api.auth_unified")
    logger.info("  - services.auth_service_unified")
    logger.info("  - core.decorators_unified")
    

if __name__ == "__main__":
    main()