# Background File Indexing Implementation Guide

## Overview

LEARN-X now includes a robust background file indexing system using Celery and Redis. This ensures:
- Non-blocking file uploads
- Automatic retry on failures
- Scalable processing across multiple workers
- Real-time monitoring and health checks

## Architecture

### Components

1. **Celery Workers**: Process file indexing tasks
2. **Redis**: Message broker and result backend
3. **Celery Beat**: Schedules periodic maintenance tasks
4. **Flower**: Web-based monitoring dashboard
5. **Task Monitor**: Custom monitoring and management tools

### Task Queues

- `critical`: Health checks and urgent tasks (priority: 10)
- `high`: File indexing tasks (priority: 7)
- `default`: Course reindexing (priority: 5)
- `embeddings`: Embedding generation (priority: 4)
- `low`: Cleanup and maintenance (priority: 3)

## Setup

### 1. Install Redis

```bash
# macOS
brew install redis
brew services start redis

# Ubuntu/Debian
sudo apt-get install redis-server
sudo systemctl start redis

# Docker
docker run -d -p 6379:6379 redis:alpine
```

### 2. Environment Variables

```bash
export REDIS_URL="redis://localhost:6379/0"
export POSTGRES_URL="postgresql://user:pass@localhost/learnx"
export OPENAI_API_KEY="your-api-key"
```

### 3. Start Services

```bash
# Terminal 1: Start Celery worker
chmod +x celery_worker.sh
./celery_worker.sh

# Terminal 2: Start Celery beat (for scheduled tasks)
chmod +x celery_beat.sh
./celery_beat.sh

# Terminal 3: Start Flower monitoring (optional)
chmod +x flower_monitor.sh
./flower_monitor.sh

# Terminal 4: Start your Flask app
python app.py
```

## Integration

### 1. Update app.py

Add these imports and initialization:

```python
from src.background_api_endpoints import register_background_endpoints
from src.file_upload_handler import FileUploadHandler

# Register background API endpoints
register_background_endpoints(app)
```

### 2. Update File Upload Endpoints

Replace synchronous indexing with background tasks:

```python
@app.route('/student/courses/<course_id>/files', methods=['POST'])
def student_course_files_upload(course_id):
    # ... existing validation code ...
    
    # Use the upload handler
    handler = FileUploadHandler(db)
    result = handler.process_upload(
        file_obj=file,
        module_id=str(target_module.id),
        title=title,
        process_immediately=False  # Use background processing
    )
    
    return jsonify(result), 201
```

### 3. Check Indexing Status

Add endpoint to check file processing status:

```python
@app.route('/files/<file_id>/status', methods=['GET'])
def check_file_status(file_id):
    handler = FileUploadHandler(db)
    status = handler.check_indexing_status(file_id)
    return jsonify(status), 200
```

## API Endpoints

### Task Management

- `GET /api/background/tasks/<task_id>/status` - Get task status
- `GET /api/background/tasks/active` - List active tasks
- `GET /api/background/tasks/scheduled` - List scheduled tasks
- `POST /api/background/tasks/<task_id>/cancel` - Cancel a task
- `POST /api/background/tasks/retry-failed` - Retry failed tasks

### Monitoring

- `GET /api/background/queues/stats` - Queue statistics
- `GET /api/background/workers/stats` - Worker statistics
- `GET /api/background/indexing/stats?hours=24` - Indexing statistics
- `GET /api/background/health` - System health report

### File Operations

- `POST /api/background/files/<file_id>/reindex` - Manually reindex a file
- `POST /api/background/courses/<course_id>/reindex` - Reindex entire course
- `GET /api/background/files/<file_id>/indexing-status` - Check indexing status

## Monitoring

### 1. Flower Dashboard

Access at http://localhost:5555 (default credentials: admin/password)

Features:
- Real-time task monitoring
- Worker status and statistics
- Task history and results
- Queue lengths

### 2. Command Line Monitoring

```bash
# Check system health
python task_monitor.py health

# Check specific task status
python task_monitor.py status <task_id>

# Monitor with celery
celery -A src.celery_app inspect active
celery -A src.celery_app inspect stats
```

### 3. Health Checks

The system runs automatic health checks every 5 minutes:
- Database connectivity
- Redis connectivity
- Stuck file detection
- Queue length monitoring

## Scaling

### Horizontal Scaling

Start multiple workers on different machines:

```bash
# Worker 1 - High priority tasks
CELERY_WORKER_NAME=worker-high-1 CELERY_QUEUES=critical,high ./celery_worker.sh

# Worker 2 - Embeddings specialist
CELERY_WORKER_NAME=worker-embed-1 CELERY_QUEUES=embeddings CELERY_CONCURRENCY=2 ./celery_worker.sh

# Worker 3 - General tasks
CELERY_WORKER_NAME=worker-general-1 CELERY_QUEUES=default,low ./celery_worker.sh
```

### Vertical Scaling

Adjust concurrency based on CPU cores:

```bash
# For CPU-bound tasks (text extraction)
CELERY_CONCURRENCY=4 ./celery_worker.sh

# For I/O-bound tasks (API calls)
CELERY_CONCURRENCY=10 ./celery_worker.sh
```

## Production Deployment

### Docker Compose

```yaml
version: '3.8'

services:
  redis:
    image: redis:alpine
    ports:
      - "6379:6379"
    volumes:
      - redis_data:/data

  worker:
    build: .
    command: ./celery_worker.sh
    environment:
      - REDIS_URL=redis://redis:6379/0
      - POSTGRES_URL=${POSTGRES_URL}
      - OPENAI_API_KEY=${OPENAI_API_KEY}
    depends_on:
      - redis
    deploy:
      replicas: 3

  beat:
    build: .
    command: ./celery_beat.sh
    environment:
      - REDIS_URL=redis://redis:6379/0
      - POSTGRES_URL=${POSTGRES_URL}
    depends_on:
      - redis

  flower:
    build: .
    command: ./flower_monitor.sh
    ports:
      - "5555:5555"
    environment:
      - REDIS_URL=redis://redis:6379/0
      - FLOWER_BASIC_AUTH=admin:${FLOWER_PASSWORD}
    depends_on:
      - redis

volumes:
  redis_data:
```

### Kubernetes

Use Kubernetes for production scale:

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: celery-worker
spec:
  replicas: 5
  selector:
    matchLabels:
      app: celery-worker
  template:
    metadata:
      labels:
        app: celery-worker
    spec:
      containers:
      - name: worker
        image: learnx/worker:latest
        command: ["./celery_worker.sh"]
        env:
        - name: CELERY_QUEUES
          value: "critical,high,default,embeddings"
        - name: CELERY_CONCURRENCY
          value: "4"
        resources:
          requests:
            memory: "1Gi"
            cpu: "500m"
          limits:
            memory: "2Gi"
            cpu: "1000m"
```

## Troubleshooting

### Common Issues

1. **Tasks not processing**
   - Check Redis connection: `redis-cli ping`
   - Verify workers are running: `celery -A src.celery_app inspect active`
   - Check queue lengths: `python task_monitor.py health`

2. **High memory usage**
   - Reduce batch size in indexing tasks
   - Set `--max-tasks-per-child=50` for workers
   - Monitor with: `celery -A src.celery_app inspect stats`

3. **Slow processing**
   - Increase worker concurrency
   - Add more workers
   - Check OpenAI API rate limits

### Debug Mode

Enable detailed logging:

```bash
CELERY_LOGLEVEL=debug ./celery_worker.sh
```

### Manual Task Execution

Test tasks manually:

```python
from src.tasks import index_file

# Synchronous execution (for debugging)
result = index_file("file-uuid-here")
print(result)

# Asynchronous execution
task = index_file.delay("file-uuid-here")
print(f"Task ID: {task.id}")
print(f"Status: {task.status}")
print(f"Result: {task.get(timeout=60)}")
```

## Best Practices

1. **File Size Limits**
   - Implement file size checks before upload
   - Large files (>100MB) should use S3 storage
   - Consider chunked uploads for very large files

2. **Rate Limiting**
   - OpenAI API: Max 100 embedding requests/minute
   - Adjust in `celery_app.py` task_annotations

3. **Error Handling**
   - Tasks automatically retry 3 times with exponential backoff
   - Failed tasks after retries go to dead letter queue
   - Monitor failed tasks and investigate patterns

4. **Security**
   - Use authentication for Flower dashboard
   - Restrict admin endpoints to authorized users
   - Don't expose Redis to public internet

5. **Monitoring**
   - Set up alerts for:
     - Queue length > 1000
     - No workers available
     - High failure rate
     - Stuck files > 2 hours

## Performance Metrics

Expected performance with proper setup:
- File upload response: < 500ms (returns immediately)
- Indexing completion: 10-60 seconds per file
- Throughput: 100+ files/minute with 5 workers
- Query latency: < 30ms with pgvector indexes