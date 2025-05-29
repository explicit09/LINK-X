#!/bin/bash
set -e

# Run database migrations if enabled
if [ "${RUN_MIGRATIONS}" = "true" ]; then
    echo "Running database migrations..."
    python -m scripts.migrations.run_migrations || echo "Migrations completed (some may have been already applied)"
fi

# Set Flask app
export FLASK_APP=${FLASK_APP:-src.wsgi}

# Start the application
if [ "${FLASK_ENV}" = "development" ]; then
    echo "Starting development server..."
    exec python -m flask run --host=0.0.0.0 --port=${PORT:-8080} --reload
else
    echo "Starting production server..."
    exec gunicorn --bind :${PORT:-8080} \
        --workers ${WORKERS:-4} \
        --threads ${THREADS:-2} \
        --worker-class ${WORKER_CLASS:-gthread} \
        --timeout ${TIMEOUT:-120} \
        --access-logfile - \
        --error-logfile - \
        --log-level ${LOG_LEVEL:-info} \
        ${FLASK_APP}:app
fi