#!/usr/bin/env python3
"""
Start all services in a single container for Railway deployment.
This is an alternative to running multiple Railway services.
"""
import os
import sys
import subprocess
import signal
import time
from multiprocessing import Process

# Store process references for cleanup
processes = []

def signal_handler(signum, frame):
    """Handle shutdown signals gracefully."""
    print("Shutting down services...")
    for p in processes:
        if p.is_alive():
            p.terminate()
    sys.exit(0)

def start_gunicorn():
    """Start the main web server."""
    port = os.environ.get('PORT', '8000')
    cmd = [
        'gunicorn',
        '--bind', f'0.0.0.0:{port}',
        '--workers', '4',
        '--timeout', '300',
        '--chdir', '/app/src',
        'app:create_app()'
    ]
    subprocess.run(cmd)

def start_embedding_worker():
    """Start the PGMQ embedding worker."""
    # Wait for backend to be ready
    time.sleep(10)
    subprocess.run(['python', '/app/src/startup/embedding_worker_init.py'])

def start_celery_worker():
    """Start the Celery worker."""
    time.sleep(5)
    subprocess.run(['/app/docker/celery-entrypoint.sh', 'worker'])

def start_celery_beat():
    """Start the Celery beat scheduler."""
    time.sleep(5)
    subprocess.run(['/app/docker/celery-entrypoint.sh', 'beat'])

def start_supabase_bridge():
    """Start the Supabase bridge worker."""
    time.sleep(10)
    subprocess.run(['python', '-m', 'services.supabase_bridge'])

def main():
    """Start all services based on environment configuration."""
    # Set up signal handlers
    signal.signal(signal.SIGTERM, signal_handler)
    signal.signal(signal.SIGINT, signal_handler)
    
    # Check if we should run all services in one container
    run_mode = os.environ.get('RAILWAY_RUN_MODE', 'single-service')
    
    if run_mode == 'all-in-one':
        print("Starting all services in single container...")
        
        # Start services as separate processes
        services = [
            ('Gunicorn', start_gunicorn),
            ('Embedding Worker', start_embedding_worker),
            ('Celery Worker', start_celery_worker),
            ('Celery Beat', start_celery_beat),
            ('Supabase Bridge', start_supabase_bridge),
        ]
        
        for name, func in services:
            print(f"Starting {name}...")
            p = Process(target=func, name=name)
            p.start()
            processes.append(p)
        
        # Keep main process alive
        try:
            for p in processes:
                p.join()
        except KeyboardInterrupt:
            signal_handler(None, None)
    else:
        # Default: just run gunicorn
        print("Starting web server only...")
        start_gunicorn()

if __name__ == '__main__':
    main()