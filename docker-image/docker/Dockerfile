# Use the official slim Python image
FROM python:3.10-slim

# Allow statements and log messages to immediately appear in the Knative logs
ENV PYTHONUNBUFFERED=True

ENV PYTHONPATH="/app:/app/src"

# Set the application home directory
ENV APP_HOME=/app
WORKDIR $APP_HOME

# Copy requirements files and install dependencies
COPY config/base.txt config/dev.txt ./

RUN pip install --upgrade pip && \
    pip install --no-cache-dir -r dev.txt

# Copy environment files, Firebase credentials, and code
COPY src/.env ./
COPY src/firebaseKey.json ./
COPY src/prompts.py ./
COPY src/textUtils.py ./
COPY src/indexer.py ./
COPY src/transcriber.py ./

# Copy the application source code
COPY src $APP_HOME/src

# Copy entrypoint script
COPY docker/entrypoint.sh /entrypoint.sh
RUN chmod +x /entrypoint.sh

# Environment variables for Flask
ENV MODULE=src.wsgi:app
ENV QT_X11_NO_MITSHM=1
ENV PORT=8080
EXPOSE 8080

# Note: All dependencies are already installed from requirements.txt

# Set entrypoint
ENTRYPOINT ["/entrypoint.sh"]

# Set the command to run the app with gunicorn
CMD ["gunicorn", "--bind", ":8080", "--workers", "1", "--threads", "8", "--timeout", "0", "src.wsgi:app"]