#!/usr/bin/env python3
"""
Migration script to move existing files from database to S3
Run this after setting up S3 credentials and bucket
"""
import os
import sys
from io import BytesIO
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from db.schema import File, Module, Course
from s3_storage import s3_storage
import logging

logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(message)s')
logger = logging.getLogger(__name__)

def migrate_files_to_s3(dry_run=True):
    """Migrate all files from database storage to S3"""
    
    # Database connection
    POSTGRES_URL = os.getenv("POSTGRES_URL")
    if not POSTGRES_URL:
        logger.error("POSTGRES_URL not set")
        return
    
    engine = create_engine(POSTGRES_URL)
    Session = sessionmaker(bind=engine)
    db = Session()
    
    try:
        # Count total files
        total_files = db.query(File).filter(
            File.storage_type == 'database',
            File.file_data.isnot(None)
        ).count()
        
        logger.info(f"Found {total_files} files to migrate")
        
        if dry_run:
            logger.info("DRY RUN MODE - No files will be migrated")
        
        # Process files in batches
        batch_size = 10
        migrated_count = 0
        failed_count = 0
        
        for offset in range(0, total_files, batch_size):
            files = db.query(File).join(Module).join(Course).filter(
                File.storage_type == 'database',
                File.file_data.isnot(None)
            ).offset(offset).limit(batch_size).all()
            
            for file in files:
                try:
                    logger.info(f"Processing file {file.id}: {file.filename}")
                    
                    if not dry_run:
                        # Upload to S3
                        s3_result = s3_storage.upload_file(
                            file_obj=BytesIO(file.file_data),
                            course_id=str(file.module.course_id),
                            module_id=str(file.module_id),
                            file_id=str(file.id),
                            filename=file.filename,
                            content_type=file.file_type
                        )
                        
                        # Update file record
                        file.s3_key = s3_result['s3_key']
                        file.s3_bucket = s3_result['s3_bucket']
                        file.storage_type = 's3'
                        
                        # Clear database storage (optional - keep for backup)
                        # file.file_data = None
                        
                        db.commit()
                        logger.info(f"✓ Migrated {file.filename} to S3: {s3_result['s3_key']}")
                    else:
                        logger.info(f"  Would migrate to: courses/{file.module.course_id}/modules/{file.module_id}/{file.id}/{file.filename}")
                    
                    migrated_count += 1
                    
                except Exception as e:
                    logger.error(f"✗ Failed to migrate file {file.id}: {str(e)}")
                    failed_count += 1
                    db.rollback()
            
            logger.info(f"Progress: {migrated_count + failed_count}/{total_files}")
        
        logger.info(f"\nMigration complete!")
        logger.info(f"  Migrated: {migrated_count}")
        logger.info(f"  Failed: {failed_count}")
        
        if dry_run:
            logger.info("\nTo perform actual migration, run with --execute flag")
            
    except Exception as e:
        logger.error(f"Migration failed: {str(e)}")
        db.rollback()
    finally:
        db.close()

def verify_s3_setup():
    """Verify S3 configuration is correct"""
    try:
        # Check environment variables
        required_vars = ['AWS_ACCESS_KEY_ID', 'AWS_SECRET_ACCESS_KEY', 'S3_BUCKET_NAME']
        missing_vars = [var for var in required_vars if not os.getenv(var)]
        
        if missing_vars:
            logger.error(f"Missing required environment variables: {', '.join(missing_vars)}")
            return False
        
        # Test S3 connection
        logger.info("Testing S3 connection...")
        s3_storage.create_bucket_if_not_exists()
        logger.info("✓ S3 connection successful")
        
        return True
        
    except Exception as e:
        logger.error(f"S3 setup verification failed: {str(e)}")
        return False

if __name__ == "__main__":
    import argparse
    
    parser = argparse.ArgumentParser(description='Migrate files from database to S3')
    parser.add_argument('--execute', action='store_true', help='Actually perform migration (default is dry run)')
    parser.add_argument('--verify-only', action='store_true', help='Only verify S3 setup')
    args = parser.parse_args()
    
    if args.verify_only:
        if verify_s3_setup():
            logger.info("S3 setup verified successfully!")
            sys.exit(0)
        else:
            logger.error("S3 setup verification failed!")
            sys.exit(1)
    
    if not verify_s3_setup():
        logger.error("Please fix S3 configuration before running migration")
        sys.exit(1)
    
    migrate_files_to_s3(dry_run=not args.execute)