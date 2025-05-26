#!/usr/bin/env python3
"""
PgVector Performance Monitoring and Benchmarking Script

This script monitors and benchmarks pgvector query performance,
helping to tune parameters and track system health.
"""
import os
import time
import statistics
import psycopg2
from psycopg2.extras import RealDictCursor
import numpy as np
from datetime import datetime
import json

def get_connection():
    """Get database connection."""
    postgres_url = os.getenv("POSTGRES_URL")
    if not postgres_url:
        raise RuntimeError("POSTGRES_URL not set")
    return psycopg2.connect(postgres_url, cursor_factory=RealDictCursor)

def generate_random_embedding(dimension=1536):
    """Generate a random embedding for testing."""
    embedding = np.random.randn(dimension).astype(np.float32)
    # Normalize the vector
    embedding = embedding / np.linalg.norm(embedding)
    return embedding.tolist()

def benchmark_query_performance(conn, num_queries=100, course_id=None):
    """
    Benchmark pgvector query performance.
    
    Args:
        conn: Database connection
        num_queries: Number of queries to run
        course_id: Optional course ID to filter by
    
    Returns:
        Dictionary with performance metrics
    """
    print(f"\n📊 Running {num_queries} benchmark queries...")
    
    query_times = []
    result_counts = []
    
    # Warm up the connection
    with conn.cursor() as cur:
        cur.execute("SELECT 1")
    
    for i in range(num_queries):
        embedding = generate_random_embedding()
        
        start_time = time.time()
        
        with conn.cursor() as cur:
            query = """
            WITH q AS (SELECT %s::vector AS v)
            SELECT 
                fc.content,
                fc.chunk_index,
                1 - (fc.embedding <=> q.v) AS similarity
            FROM q
            JOIN "FileChunk" fc ON TRUE
            WHERE 1=1
            """
            
            params = [embedding]
            
            if course_id:
                query += " AND fc.course_id = %s"
                params.append(course_id)
                
            query += """
            AND 1 - (fc.embedding <=> q.v) > 0.3
            ORDER BY fc.embedding <=> q.v
            LIMIT 15
            """
            
            cur.execute(query, params)
            results = cur.fetchall()
            
        end_time = time.time()
        query_time = (end_time - start_time) * 1000  # Convert to ms
        
        query_times.append(query_time)
        result_counts.append(len(results))
        
        if (i + 1) % 10 == 0:
            print(f"  Progress: {i + 1}/{num_queries} queries completed")
    
    # Calculate statistics
    metrics = {
        "total_queries": num_queries,
        "avg_query_time_ms": statistics.mean(query_times),
        "median_query_time_ms": statistics.median(query_times),
        "p95_query_time_ms": np.percentile(query_times, 95),
        "p99_query_time_ms": np.percentile(query_times, 99),
        "min_query_time_ms": min(query_times),
        "max_query_time_ms": max(query_times),
        "avg_results_returned": statistics.mean(result_counts),
        "timestamp": datetime.now().isoformat()
    }
    
    return metrics

def check_index_health(conn):
    """Check the health of pgvector indexes."""
    print("\n🔍 Checking index health...")
    
    with conn.cursor() as cur:
        # Check for vector indexes
        cur.execute("""
            SELECT 
                schemaname,
                tablename,
                indexname,
                indexdef
            FROM pg_indexes 
            WHERE tablename = 'FileChunk'
            AND (indexdef LIKE '%ivfflat%' OR indexdef LIKE '%hnsw%')
        """)
        
        vector_indexes = cur.fetchall()
        
        # Get index stats
        cur.execute("""
            SELECT 
                schemaname,
                relname as tablename,
                indexrelname as indexname,
                idx_scan,
                idx_tup_read,
                idx_tup_fetch
            FROM pg_stat_user_indexes
            WHERE relname = 'FileChunk'
        """)
        
        index_stats = cur.fetchall()
        
        # Get table stats
        cur.execute("""
            SELECT 
                COUNT(*) as total_chunks,
                COUNT(DISTINCT course_id) as unique_courses,
                COUNT(DISTINCT file_id) as unique_files,
                pg_size_pretty(pg_relation_size('"FileChunk"'::regclass)) as table_size
            FROM "FileChunk"
        """)
        
        table_stats = cur.fetchone()
        
    return {
        "vector_indexes": vector_indexes,
        "index_stats": index_stats,
        "table_stats": table_stats
    }

def check_query_plan(conn, sample_embedding=None):
    """Analyze query execution plan."""
    print("\n📋 Analyzing query execution plan...")
    
    if sample_embedding is None:
        sample_embedding = generate_random_embedding()
    
    with conn.cursor() as cur:
        cur.execute("""
            EXPLAIN (ANALYZE, BUFFERS, FORMAT JSON)
            WITH q AS (SELECT %s::vector AS v)
            SELECT 
                fc.content,
                fc.chunk_index,
                1 - (fc.embedding <=> q.v) AS similarity
            FROM q
            JOIN "FileChunk" fc ON TRUE
            WHERE 1 - (fc.embedding <=> q.v) > 0.3
            ORDER BY fc.embedding <=> q.v
            LIMIT 15
        """, [sample_embedding])
        
        plan = cur.fetchone()
        
    return plan

def optimize_settings(conn):
    """Check and suggest optimization settings."""
    print("\n⚙️  Checking optimization settings...")
    
    suggestions = []
    
    with conn.cursor() as cur:
        # Check work_mem
        cur.execute("SHOW work_mem")
        work_mem = cur.fetchone()['work_mem']
        if work_mem == '4MB':
            suggestions.append("Consider increasing work_mem to at least 256MB for better vector operations")
        
        # Check maintenance_work_mem
        cur.execute("SHOW maintenance_work_mem")
        maint_mem = cur.fetchone()['maintenance_work_mem']
        if maint_mem == '64MB':
            suggestions.append("Consider increasing maintenance_work_mem to at least 1GB for faster index builds")
        
        # Check for parallel workers
        cur.execute("SHOW max_parallel_workers_per_gather")
        parallel_workers = int(cur.fetchone()['max_parallel_workers_per_gather'])
        if parallel_workers < 2:
            suggestions.append("Enable parallel workers for better query performance")
        
        # Check ivfflat/hnsw settings if applicable
        try:
            cur.execute("SHOW ivfflat.probes")
            probes = cur.fetchone()
            suggestions.append(f"Current ivfflat.probes: {probes['ivfflat.probes']} (default is 1, consider 10-50 for better recall)")
        except:
            pass
            
        try:
            cur.execute("SHOW hnsw.ef_search")
            ef_search = cur.fetchone()
            suggestions.append(f"Current hnsw.ef_search: {ef_search['hnsw.ef_search']} (default is 64, consider 100-500 for better recall)")
        except:
            pass
    
    return suggestions

def main():
    """Run the monitoring suite."""
    print("=== PgVector Performance Monitor ===")
    print(f"Started at: {datetime.now()}")
    
    conn = get_connection()
    
    try:
        # Check index health
        health = check_index_health(conn)
        print("\n📊 Table Statistics:")
        print(f"  Total chunks: {health['table_stats']['total_chunks']:,}")
        print(f"  Unique courses: {health['table_stats']['unique_courses']}")
        print(f"  Unique files: {health['table_stats']['unique_files']}")
        print(f"  Table size: {health['table_stats']['table_size']}")
        
        print("\n🗂️  Vector Indexes:")
        for idx in health['vector_indexes']:
            print(f"  - {idx['indexname']}: {idx['indexdef'][:80]}...")
        
        if not health['vector_indexes']:
            print("  ⚠️  No vector indexes found! Performance will be poor.")
            print("  Run the migration script to create indexes.")
        
        # Run benchmarks
        metrics = benchmark_query_performance(conn, num_queries=100)
        
        print("\n⏱️  Performance Metrics:")
        print(f"  Average query time: {metrics['avg_query_time_ms']:.2f} ms")
        print(f"  Median query time: {metrics['median_query_time_ms']:.2f} ms")
        print(f"  95th percentile: {metrics['p95_query_time_ms']:.2f} ms")
        print(f"  99th percentile: {metrics['p99_query_time_ms']:.2f} ms")
        print(f"  Min/Max: {metrics['min_query_time_ms']:.2f} / {metrics['max_query_time_ms']:.2f} ms")
        
        # Performance assessment
        if metrics['p95_query_time_ms'] < 30:
            print("  ✅ Excellent performance!")
        elif metrics['p95_query_time_ms'] < 60:
            print("  ✅ Good performance")
        elif metrics['p95_query_time_ms'] < 100:
            print("  ⚠️  Acceptable performance, but could be improved")
        else:
            print("  ❌ Poor performance - optimization needed")
        
        # Check query plan
        plan = check_query_plan(conn)
        exec_time = plan['QUERY PLAN'][0]['Execution Time']
        print(f"\n📈 Sample query execution time: {exec_time:.2f} ms")
        
        # Get optimization suggestions
        suggestions = optimize_settings(conn)
        if suggestions:
            print("\n💡 Optimization Suggestions:")
            for suggestion in suggestions:
                print(f"  - {suggestion}")
        
        # Save results
        results = {
            "metrics": metrics,
            "health": {
                "table_stats": health['table_stats'],
                "vector_indexes": len(health['vector_indexes']),
                "has_indexes": len(health['vector_indexes']) > 0
            },
            "suggestions": suggestions
        }
        
        filename = f"pgvector_benchmark_{datetime.now().strftime('%Y%m%d_%H%M%S')}.json"
        with open(filename, 'w') as f:
            json.dump(results, f, indent=2, default=str)
        
        print(f"\n📄 Results saved to: {filename}")
        
    except Exception as e:
        print(f"\n❌ Error: {e}")
        raise
    finally:
        conn.close()
    
    print(f"\nCompleted at: {datetime.now()}")

if __name__ == "__main__":
    main()