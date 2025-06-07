#!/usr/bin/env python3
"""
Startup initialization for embedding workers
Ensures the system is ready before workers start processing
"""
import os
import sys
import time
import logging
import psycopg2
import subprocess
from typing import Dict, Tuple

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)


class EmbeddingWorkerInitializer:
    """Initializes and validates embedding worker prerequisites"""
    
    def __init__(self):
        self.database_url = os.getenv('DATABASE_URL')
        self.openai_api_key = os.getenv('OPENAI_API_KEY')
        self.checks_passed = True
        
    def run_all_checks(self) -> bool:
        """Run all prerequisite checks"""
        logger.info("Running embedding worker initialization checks...")
        
        checks = [
            ("Database connectivity", self.check_database_connection),
            ("Required tables exist", self.check_required_tables),
            ("System configuration", self.check_system_config),
            ("OpenAI API keys", self.check_api_keys),
            ("Worker health table", self.initialize_worker_health),
            ("Budget limits", self.check_budget_limits),
        ]
        
        for check_name, check_function in checks:
            logger.info(f"Checking: {check_name}...")
            try:
                success, message = check_function()
                if success:
                    logger.info(f"✓ {check_name}: {message}")
                else:
                    logger.error(f"✗ {check_name}: {message}")
                    self.checks_passed = False
            except Exception as e:
                logger.error(f"✗ {check_name} failed with error: {e}")
                self.checks_passed = False
        
        return self.checks_passed
    
    def check_database_connection(self) -> Tuple[bool, str]:
        """Check database connectivity"""
        try:
            conn = psycopg2.connect(self.database_url)
            cursor = conn.cursor()
            cursor.execute("SELECT 1")
            conn.close()
            return True, "Database connection successful"
        except Exception as e:
            return False, f"Database connection failed: {e}"
    
    def check_required_tables(self) -> Tuple[bool, str]:
        """Check if all required tables exist"""
        required_tables = [
            'embedding_jobs',
            'file_chunks',
            'system_config',
            'worker_health',
            'rate_limit_usage',
            'embedding_dead_letter_queue',
            'budget_tracking',
            'budget_limits'
        ]
        
        try:
            conn = psycopg2.connect(self.database_url)
            cursor = conn.cursor()
            
            missing_tables = []
            for table in required_tables:
                cursor.execute("""
                    SELECT EXISTS (
                        SELECT FROM information_schema.tables 
                        WHERE table_name = %s
                    )
                """, (table,))
                exists = cursor.fetchone()[0]
                if not exists:
                    missing_tables.append(table)
            
            conn.close()
            
            if missing_tables:
                return False, f"Missing tables: {', '.join(missing_tables)}"
            return True, f"All {len(required_tables)} required tables exist"
            
        except Exception as e:
            return False, f"Table check failed: {e}"
    
    def check_system_config(self) -> Tuple[bool, str]:
        """Check system configuration"""
        try:
            conn = psycopg2.connect(self.database_url)
            cursor = conn.cursor()
            
            # Check if embeddings are enabled
            cursor.execute("""
                SELECT value FROM system_config 
                WHERE key = 'EMBEDDINGS_ENABLED'
            """)
            result = cursor.fetchone()
            
            if not result:
                # Insert default configuration
                cursor.execute("""
                    INSERT INTO system_config (key, value, description) 
                    VALUES ('EMBEDDINGS_ENABLED', 'true', 'Enable embedding processing')
                    ON CONFLICT (key) DO NOTHING
                """)
                conn.commit()
                embeddings_enabled = True
            else:
                embeddings_enabled = result[0] == 'true'
            
            conn.close()
            
            if embeddings_enabled:
                return True, "Embeddings are enabled"
            else:
                return True, "Embeddings are disabled (workers will idle)"
                
        except Exception as e:
            return False, f"System config check failed: {e}"
    
    def check_api_keys(self) -> Tuple[bool, str]:
        """Check API keys configuration"""
        try:
            conn = psycopg2.connect(self.database_url)
            cursor = conn.cursor()
            
            # Check for API keys in secrets vault
            cursor.execute("""
                SELECT COUNT(*) FROM secrets_vault 
                WHERE secret_type = 'api_key' 
                AND secret_name LIKE 'openai%'
                AND is_active = true
            """)
            
            key_count = cursor.fetchone()[0]
            
            # Also check system config for API keys
            cursor.execute("""
                SELECT value FROM system_config 
                WHERE key = 'OPENAI_API_KEYS'
            """)
            config_result = cursor.fetchone()
            
            conn.close()
            
            if key_count > 0:
                return True, f"Found {key_count} active OpenAI API keys in vault"
            elif config_result and config_result[0] != '[]':
                return True, "OpenAI API keys configured in system config"
            elif self.openai_api_key:
                return True, "OpenAI API key found in environment"
            else:
                return False, "No OpenAI API keys configured"
                
        except Exception as e:
            # Table might not exist if secrets migration wasn't run
            if "secrets_vault" in str(e):
                if self.openai_api_key:
                    return True, "OpenAI API key found in environment (secrets vault not set up)"
                return False, "No OpenAI API keys found (secrets vault not set up)"
            return False, f"API key check failed: {e}"
    
    def initialize_worker_health(self) -> Tuple[bool, str]:
        """Initialize worker health entry"""
        try:
            conn = psycopg2.connect(self.database_url)
            cursor = conn.cursor()
            
            worker_id = os.getenv('WORKER_ID', 'pgmq-worker-default')
            
            # Insert or update worker health
            cursor.execute("""
                INSERT INTO worker_health (worker_id, status, last_heartbeat, metadata)
                VALUES (%s, 'starting', NOW(), '{"initialized": true}')
                ON CONFLICT (worker_id) DO UPDATE SET
                    status = 'starting',
                    last_heartbeat = NOW(),
                    started_at = NOW()
            """, (worker_id,))
            
            conn.commit()
            conn.close()
            
            return True, f"Worker health initialized for {worker_id}"
            
        except Exception as e:
            return False, f"Worker health initialization failed: {e}"
    
    def check_budget_limits(self) -> Tuple[bool, str]:
        """Check if budget limits are configured"""
        try:
            conn = psycopg2.connect(self.database_url)
            cursor = conn.cursor()
            
            # Check for budget limits
            cursor.execute("""
                SELECT COUNT(*) FROM budget_limits 
                WHERE scope_type = 'global' 
                AND cost_category = 'openai_embeddings'
            """)
            
            limit_count = cursor.fetchone()[0]
            
            if limit_count == 0:
                # Insert default budget limits
                cursor.execute("""
                    INSERT INTO budget_limits (
                        scope_type, scope_id, limit_type, 
                        cost_category, limit_cents, alert_threshold_percent, 
                        hard_stop_enabled, description
                    ) VALUES 
                    ('global', NULL, 'daily', 'openai_embeddings', 3000, 80, true, 
                     'Daily embedding budget limit - $30')
                    ON CONFLICT DO NOTHING
                """)
                conn.commit()
            
            conn.close()
            
            return True, "Budget limits configured"
            
        except Exception as e:
            # Budget tables might not exist if migration wasn't run
            if "budget_limits" in str(e):
                return True, "Budget limits not set up (optional feature)"
            return False, f"Budget check failed: {e}"
    
    def wait_for_backend(self, max_retries: int = 30) -> bool:
        """Wait for backend to be ready"""
        logger.info("Waiting for backend to be ready...")
        
        for i in range(max_retries):
            try:
                conn = psycopg2.connect(self.database_url)
                cursor = conn.cursor()
                cursor.execute("SELECT 1")
                conn.close()
                logger.info("Backend is ready")
                return True
            except:
                logger.info(f"Backend not ready, retrying in 2 seconds... ({i+1}/{max_retries})")
                time.sleep(2)
        
        logger.error("Backend failed to become ready")
        return False


def main():
    """Main initialization function"""
    logging.basicConfig(
        level=logging.INFO,
        format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
    )
    
    initializer = EmbeddingWorkerInitializer()
    
    # Wait for backend to be ready first
    if not initializer.wait_for_backend():
        logger.error("Backend is not ready, cannot start worker")
        sys.exit(1)
    
    # Run all checks
    if initializer.run_all_checks():
        logger.info("✅ All checks passed! Starting embedding worker...")
        # Start the actual worker process
        worker_command = ["python", "-m", "workers.pgmq_embedding_worker"]
        logger.info(f"Executing: {' '.join(worker_command)}")
        
        try:
            # Replace current process with worker
            os.execvp(worker_command[0], worker_command)
        except Exception as e:
            logger.error(f"Failed to start worker: {e}")
            sys.exit(1)
    else:
        logger.error("❌ Some checks failed. Worker cannot start.")
        sys.exit(1)


if __name__ == "__main__":
    main()