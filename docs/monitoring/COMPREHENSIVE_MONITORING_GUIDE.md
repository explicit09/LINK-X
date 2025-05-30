# LEARN-X Comprehensive Monitoring Guide

## Overview

This guide documents the comprehensive production-ready monitoring system implemented for LEARN-X. The monitoring infrastructure provides deep visibility into application performance, business metrics, security, and system health.

## Architecture

### Core Components

1. **Prometheus** - Metrics collection and storage
2. **Grafana** - Visualization and dashboards
3. **Alertmanager** - Alert routing and management
4. **Jaeger** - Distributed tracing
5. **Loki + Promtail** - Log aggregation
6. **Custom Metrics APIs** - Application-specific metrics

### Monitoring Stack

```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   Application   │────│   Prometheus    │────│    Grafana      │
│    Metrics      │    │   (Storage)     │    │  (Dashboards)   │
└─────────────────┘    └─────────────────┘    └─────────────────┘
         │                       │                       │
         │              ┌─────────────────┐              │
         │              │  Alertmanager   │              │
         │              │   (Alerting)    │              │
         │              └─────────────────┘              │
         │                                               │
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│     Jaeger      │    │      Loki       │    │   Blackbox      │
│   (Tracing)     │    │  (Log Agg.)     │    │  (External)     │
└─────────────────┘    └─────────────────┘    └─────────────────┘
```

## Application Metrics

### Enhanced Core Monitoring (`/docker-image/src/core/monitoring.py`)

#### Key Metrics Categories:

1. **HTTP Request Metrics**
   - Request rate by endpoint and user type
   - Response time percentiles (P50, P95, P99)
   - Error rates and status code distribution
   - Active request tracking

2. **User Activity Metrics**
   - Active user sessions
   - User actions by type and resource
   - Login attempts and success rates
   - Learning time tracking

3. **Business Metrics**
   - Course enrollments by user type
   - Course completion rates
   - Module progress tracking
   - Revenue and subscription metrics

4. **File Processing Metrics**
   - Upload rates by file type
   - Processing queue lengths
   - Chunk creation rates
   - Error tracking by type

5. **AI & Search Metrics**
   - AI API latency and error rates
   - Search query performance
   - Retrieval accuracy scores
   - Embedding generation times

6. **Security Metrics**
   - Failed authentication attempts
   - Suspicious activity detection
   - Rate limiting hits
   - Security event tracking

### Custom Metrics Endpoints

#### `/api/metrics/prometheus`
Standard Prometheus metrics endpoint with enhanced application metrics.

#### `/api/metrics/custom`
- User session metrics
- Database connection pool status
- Course engagement metrics
- File processing queues
- AI API usage statistics

#### `/api/metrics/business`
- Course enrollment trends
- User engagement patterns
- Revenue/subscription metrics
- Learning completion rates

#### `/api/metrics/security`
- Authentication metrics
- Suspicious activity tracking
- Rate limiting statistics
- IP-based security analysis

#### `/api/metrics/streaming`
- Active streaming connections
- Streaming performance metrics
- Content delivery statistics
- Connection duration tracking

#### `/api/metrics/files`
- File processing queues
- Processing rates and errors
- Chunk generation metrics
- Storage utilization

#### `/api/metrics/health`
- System resource usage
- Application health status
- Trace performance metrics
- Task monitoring health

## Distributed Tracing & APM

### Distributed Tracing (`/docker-image/src/monitoring/distributed_tracing.py`)

#### Features:
- **TraceSpan**: Individual operation tracking with tags and logs
- **TraceContext**: Thread-local context management
- **DistributedTracer**: Main tracing orchestration
- **PerformanceProfiler**: Advanced performance profiling with memory/CPU tracking

#### Usage Examples:

```python
from monitoring.distributed_tracing import tracer, trace_function, PerformanceProfiler

# Decorator usage
@trace_function("user.login")
def login_user(username, password):
    # Function implementation
    pass

# Context manager usage
with tracer.trace("file.process", file_type="pdf") as span:
    span.add_tag("file_size", file_size)
    # Processing logic
    span.add_log("Processing completed")

# Performance profiling
with PerformanceProfiler("complex_operation") as profiler:
    # Step 1
    profiler.checkpoint("data_loaded")
    # Step 2
    profiler.checkpoint("processing_complete")
```

#### Database Query Tracing:

```python
@trace_database_query("select", "users")
def get_user_by_id(user_id):
    return db.query(User).filter(User.id == user_id).first()
```

## Infrastructure Monitoring

### Enhanced Prometheus Configuration

#### Scrape Targets:
- **Application**: Backend metrics every 10s
- **Database**: PostgreSQL metrics every 30s
- **Cache**: Redis metrics every 30s
- **System**: Node exporter metrics every 30s
- **Containers**: cAdvisor metrics every 30s
- **External**: Blackbox probes every 60s

#### Custom Endpoints:
- Business metrics every 5 minutes
- Security metrics every minute
- File processing every minute
- Streaming metrics every 30s

### Alert Rules

#### Critical Alerts (`/monitoring/alerts/application.yml`):
- Application down (>1 min)
- High error rate (>5%)
- Critical response time (>5s)
- Memory usage (>3GB)
- Brute force attacks (immediate)

#### Warning Alerts:
- High response time (>2s)
- High memory usage (>2GB)
- File processing backlog (>100 files)
- Low course completion (<30%)

#### Infrastructure Alerts (`/monitoring/alerts/infrastructure.yml`):
- Database connection issues
- Redis memory pressure
- System resource exhaustion
- Container health problems

### Grafana Dashboards

#### Comprehensive Dashboard (`/monitoring/grafana/comprehensive-dashboard.json`):

1. **System Overview**
   - Request rate, response time, error rate
   - Active users and system health

2. **Application Performance**
   - Request distribution by endpoint
   - Response time percentiles
   - Error analysis

3. **Business Metrics**
   - Course enrollments and completion
   - User engagement patterns
   - Learning activity trends

4. **File Processing**
   - Upload rates and queue status
   - Processing performance
   - Storage utilization

5. **AI & Search**
   - AI API performance
   - Search latency and accuracy
   - Model usage patterns

6. **Infrastructure Health**
   - Database performance
   - Memory and CPU usage
   - Network and disk I/O

7. **Security Monitoring**
   - Security events timeline
   - Authentication patterns
   - Suspicious activity alerts

## Security Monitoring

### SecurityMonitor Class

#### Pattern Detection:
- **Brute Force**: >5 failed attempts from same IP
- **Account Targeting**: >3 failed attempts for same user
- **Unusual Hours**: Access during 12 AM - 6 AM
- **Rapid API Calls**: >10 calls per second from same source

#### Security Metrics:
- Failed authentication attempts by method
- Suspicious activity by type and severity
- Rate limiting violations
- IP-based anomaly detection

## Deployment Configuration

### Docker Compose Setup

#### Core Monitoring Stack:
```yaml
# Prometheus with enhanced configuration
prometheus:
  image: prom/prometheus:latest
  volumes:
    - ./monitoring/prometheus.yml:/etc/prometheus/prometheus.yml
    - ./monitoring/alerts:/etc/prometheus/alerts

# Grafana with plugins and provisioning
grafana:
  image: grafana/grafana:latest
  environment:
    - GF_INSTALL_PLUGINS=grafana-piechart-panel,grafana-worldmap-panel
    - GF_UNIFIED_ALERTING_ENABLED=true

# Jaeger for distributed tracing
jaeger:
  image: jaegertracing/all-in-one:latest
  ports:
    - "16686:16686"  # UI
    - "14268:14268"  # Collector

# Loki + Promtail for log aggregation
loki:
  image: grafana/loki:latest
  volumes:
    - ./monitoring/loki.yml:/etc/loki/local-config.yaml

promtail:
  image: grafana/promtail:latest
  volumes:
    - ./monitoring/promtail.yml:/etc/promtail/config.yml
    - /var/log:/var/log:ro
```

### Additional Exporters:
- **Blackbox Exporter**: External service monitoring
- **S3 Exporter**: AWS S3 metrics (optional)
- **Nginx Exporter**: Load balancer metrics

## Task Monitoring

### TaskMonitor Class (`/docker-image/src/monitoring/task_monitor.py`)

#### Capabilities:
- **Queue Monitoring**: Celery queue lengths and worker status
- **Task Tracking**: Individual task status and performance
- **Health Reporting**: Comprehensive system health assessment
- **Indexing Statistics**: File processing and embedding metrics
- **Failed Task Recovery**: Automatic retry mechanisms

#### Health Check Endpoints:
```bash
# Check specific task status
python task_monitor.py status <task_id>

# Get overall health report
python task_monitor.py health

# API endpoint
GET /api/metrics/health
```

## Performance Optimization

### Monitoring Best Practices:

1. **Metric Cardinality**: Limit high-cardinality labels (user IDs, etc.)
2. **Sampling**: Use sampling for high-volume traces
3. **Aggregation**: Pre-aggregate business metrics where possible
4. **Retention**: Configure appropriate retention periods
5. **Alerting**: Set up meaningful alert thresholds

### Performance Profiling:

```python
# Use PerformanceProfiler for detailed analysis
with PerformanceProfiler("database_migration") as profiler:
    load_data()
    profiler.checkpoint("data_loaded", records=1000)
    
    transform_data()
    profiler.checkpoint("data_transformed")
    
    save_data()
    profiler.checkpoint("data_saved")
```

## Troubleshooting

### Common Issues:

1. **High Memory Usage**
   - Check for memory leaks in trace storage
   - Adjust trace retention settings
   - Monitor buffer sizes

2. **Missing Metrics**
   - Verify scrape target configuration
   - Check network connectivity
   - Validate metric endpoint responses

3. **Alert Fatigue**
   - Review alert thresholds
   - Implement alert grouping
   - Use inhibition rules

4. **Slow Queries**
   - Monitor database trace performance
   - Check connection pool metrics
   - Analyze query patterns

### Debug Commands:

```bash
# Test monitoring setup
python monitoring/monitor_setup.py --test

# Get monitoring status
python monitoring/monitor_setup.py --status

# Collect startup metrics
python monitoring/monitor_setup.py --startup

# Check task health
python monitoring/task_monitor.py health
```

## Monitoring URLs

- **Prometheus**: http://localhost:9090
- **Grafana**: http://localhost:3001 (admin/admin)
- **Alertmanager**: http://localhost:9093
- **Jaeger UI**: http://localhost:16686
- **Metrics API**: http://localhost:8000/api/metrics/*

## Integration Guide

### Application Integration:

1. **Initialize Monitoring**:
```python
from monitoring.monitor_setup import initialize_monitoring
initialize_monitoring(app)
```

2. **Add Custom Metrics**:
```python
from core.monitoring import track_user_action, track_course_enrollment
track_user_action(user_id, "course_view", "course")
track_course_enrollment(course_id, "student")
```

3. **Add Tracing**:
```python
from monitoring.distributed_tracing import tracer
with tracer.trace("api.course_search") as span:
    results = search_courses(query)
    span.add_tag("result_count", len(results))
```

### API Integration:

```python
from api.metrics import register_metrics_routes
register_metrics_routes(app)
```

## Maintenance

### Regular Tasks:

1. **Weekly**: Review alert effectiveness and adjust thresholds
2. **Monthly**: Analyze performance trends and optimize
3. **Quarterly**: Update monitoring infrastructure and dependencies
4. **As Needed**: Add new metrics for new features

### Scaling Considerations:

- Use remote write for long-term storage
- Implement metric federation for multiple instances
- Consider dedicated monitoring infrastructure
- Plan for high availability setup

## Security Considerations

### Data Protection:
- Anonymize sensitive data in metrics
- Secure monitoring endpoints
- Implement proper authentication
- Regular security audits

### Privacy Compliance:
- Limit PII in traces and logs
- Implement data retention policies
- Document data collection practices
- Provide opt-out mechanisms where applicable

This comprehensive monitoring system provides production-ready observability for LEARN-X, enabling proactive issue detection, performance optimization, and business insights.