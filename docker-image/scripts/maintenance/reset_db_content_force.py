#!/usr/bin/env python3
"""
Force database content reset (no confirmation prompts).
Use this for automated environments or when you're absolutely sure.
"""
import os
import sys
sys.path.append(os.path.dirname(__file__))

from reset_db_content import reset_database_content, logger

def main():
    """Main function - force reset without confirmation."""
    logger.info("🗃️  Force Database Content Reset")
    logger.info("================================")
    logger.info("⚠️  Running without confirmation prompts!")
    
    return reset_database_content()

if __name__ == "__main__":
    exit(main()) 