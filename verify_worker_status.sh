#!/bin/bash
# Verify PGMQ Worker Status

echo "🔍 Verifying PGMQ Embedding Worker Status..."
echo ""

# Check if containers are running
if ! docker-compose ps | grep -q "pgmq-worker.*Up"; then
    echo "❌ PGMQ worker container is not running!"
    echo "Run: ./start_platform_with_workers.sh"
    exit 1
fi

echo "✅ Worker containers are running"
echo ""

# Get worker logs
echo "📝 Recent worker activity:"
docker-compose logs pgmq-worker --tail 30 | grep -E "(Processing|Completed|Error|Budget|API key)"

echo ""
echo "📊 Checking database status..."

# Check worker health in database
docker-compose exec backend python -c "
import psycopg2
import os
from datetime import datetime, timedelta

try:
    conn = psycopg2.connect(os.environ['DATABASE_URL'])
    cursor = conn.cursor()
    
    # Check worker health
    print('\\n🏥 Worker Health Status:')
    cursor.execute('''
        SELECT worker_id, status, last_heartbeat, 
               EXTRACT(EPOCH FROM (NOW() - last_heartbeat)) as seconds_ago,
               messages_processed, errors_count
        FROM worker_health 
        WHERE worker_id LIKE 'pgmq-worker%'
        ORDER BY last_heartbeat DESC
    ''')
    for row in cursor.fetchall():
        worker_id, status, heartbeat, seconds, processed, errors = row
        print(f'  - {worker_id}: {status}')
        print(f'    Last heartbeat: {int(seconds)}s ago')
        print(f'    Messages: {processed}, Errors: {errors}')
    
    # Check pending jobs
    print('\\n📬 Pending Embedding Jobs:')
    cursor.execute('''
        SELECT COUNT(*) as pending, 
               MIN(created_at) as oldest
        FROM embedding_jobs 
        WHERE status = 'pending'
    ''')
    pending, oldest = cursor.fetchone()
    print(f'  - Pending jobs: {pending}')
    if oldest:
        age = (datetime.now(oldest.tzinfo) - oldest).total_seconds() / 60
        print(f'  - Oldest job: {int(age)} minutes ago')
    
    # Check recent completions
    print('\\n✅ Recent Completions (last hour):')
    cursor.execute('''
        SELECT status, COUNT(*) 
        FROM embedding_jobs 
        WHERE updated_at > NOW() - INTERVAL '1 hour'
        GROUP BY status
    ''')
    for status, count in cursor.fetchall():
        print(f'  - {status}: {count}')
    
    # Check budget usage
    print('\\n💰 Budget Usage Today:')
    cursor.execute('''
        SELECT cost_category, 
               SUM(cost_cents) / 100.0 as cost_dollars,
               COUNT(*) as operations
        FROM budget_tracking 
        WHERE tracked_at::date = CURRENT_DATE
        AND cost_category LIKE '%embedding%'
        GROUP BY cost_category
    ''')
    for category, cost, ops in cursor.fetchall():
        print(f'  - {category}: ${cost:.2f} ({ops} operations)')
    
    # Check rate limiting
    print('\\n🚦 Rate Limit Status:')
    cursor.execute('''
        SELECT endpoint, 
               requests_made,
               window_start,
               EXTRACT(EPOCH FROM (NOW() - window_start)) as window_age_seconds
        FROM rate_limit_usage 
        WHERE endpoint = 'openai_embeddings'
        AND window_start > NOW() - INTERVAL '1 minute'
        ORDER BY window_start DESC
        LIMIT 1
    ''')
    result = cursor.fetchone()
    if result:
        endpoint, requests, window, age = result
        print(f'  - Current window: {requests} requests')
        print(f'  - Window age: {int(age)}s')
    else:
        print('  - No recent activity')
    
    conn.close()
    
except Exception as e:
    print(f'❌ Database check failed: {e}')
"

echo ""
echo "📋 Quick Actions:"
echo "  - View live logs: docker-compose logs -f pgmq-worker"
echo "  - Restart workers: docker-compose restart pgmq-worker"
echo "  - Stop workers: docker-compose stop pgmq-worker"
echo "  - Scale workers: docker-compose up -d --scale pgmq-worker=5"