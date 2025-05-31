#!/usr/bin/env python3
"""
Performance monitoring script for LINK-X platform
Displays real-time analytics and system health
"""
import os
import sys
import time
from datetime import datetime, timedelta
from rich.console import Console
from rich.table import Table
from rich.layout import Layout
from rich.panel import Panel
from rich.live import Live
from rich.text import Text

# Add parent directory to path
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from src.db.connection import get_db_session
from src.db.schema import Course, User, Activity, File, FileChunk
from src.repositories.course_repository import CourseRepository
from src.services.course_service import CourseService
from src.core.cache import cache

console = Console()

class PerformanceMonitor:
    def __init__(self):
        self.db = get_db_session()
        self.course_service = CourseService()
        
    def get_system_stats(self):
        """Get overall system statistics"""
        stats = {
            'total_users': self.db.query(User).count(),
            'total_courses': self.db.query(Course).count(),
            'total_files': self.db.query(File).count(),
            'total_chunks': self.db.query(FileChunk).count(),
            'active_users_24h': self.db.query(Activity.user_id).filter(
                Activity.created_at >= datetime.utcnow() - timedelta(hours=24)
            ).distinct().count(),
            'activities_24h': self.db.query(Activity).filter(
                Activity.created_at >= datetime.utcnow() - timedelta(hours=24)
            ).count(),
        }
        
        # Cache stats
        redis_info = cache._redis.info()
        stats['cache_hits'] = redis_info.get('keyspace_hits', 0)
        stats['cache_misses'] = redis_info.get('keyspace_misses', 0)
        stats['cache_hit_ratio'] = (
            stats['cache_hits'] / (stats['cache_hits'] + stats['cache_misses']) * 100
            if stats['cache_hits'] + stats['cache_misses'] > 0 else 0
        )
        
        return stats
    
    def get_course_analytics(self):
        """Get analytics for all courses"""
        courses = self.db.query(Course).filter(Course.published == True).all()
        analytics = []
        
        for course in courses:
            try:
                completion_rate = self.course_service._calculate_completion_rate(str(course.id))
                avg_progress = self.course_service._calculate_average_progress(str(course.id))
                
                analytics.append({
                    'id': str(course.id),
                    'title': course.title,
                    'code': course.code,
                    'enrolled': len(course.enrollments) if hasattr(course, 'enrollments') else 0,
                    'completion_rate': completion_rate,
                    'avg_progress': avg_progress,
                })
            except Exception as e:
                console.print(f"[red]Error calculating analytics for course {course.id}: {e}[/red]")
                
        return sorted(analytics, key=lambda x: x['enrolled'], reverse=True)[:10]
    
    def get_recent_activities(self):
        """Get recent user activities"""
        activities = self.db.query(Activity).order_by(
            Activity.created_at.desc()
        ).limit(10).all()
        
        return [{
            'user_id': str(activity.user_id),
            'type': activity.activity_type,
            'metadata': activity.metadata,
            'created_at': activity.created_at,
        } for activity in activities]
    
    def create_dashboard(self):
        """Create the monitoring dashboard"""
        layout = Layout()
        layout.split_column(
            Layout(name="header", size=3),
            Layout(name="body"),
            Layout(name="footer", size=3)
        )
        
        layout["body"].split_row(
            Layout(name="left"),
            Layout(name="right")
        )
        
        # Header
        layout["header"].update(Panel(
            Text("LINK-X Performance Monitor", justify="center", style="bold blue"),
            border_style="blue"
        ))
        
        # System Stats
        stats = self.get_system_stats()
        stats_table = Table(title="System Statistics", expand=True)
        stats_table.add_column("Metric", style="cyan")
        stats_table.add_column("Value", style="green")
        
        stats_table.add_row("Total Users", str(stats['total_users']))
        stats_table.add_row("Total Courses", str(stats['total_courses']))
        stats_table.add_row("Total Files", str(stats['total_files']))
        stats_table.add_row("Total Chunks", str(stats['total_chunks']))
        stats_table.add_row("Active Users (24h)", str(stats['active_users_24h']))
        stats_table.add_row("Activities (24h)", str(stats['activities_24h']))
        stats_table.add_row("Cache Hit Ratio", f"{stats['cache_hit_ratio']:.1f}%")
        
        layout["left"].update(Panel(stats_table, title="System Stats", border_style="green"))
        
        # Course Analytics
        analytics = self.get_course_analytics()
        analytics_table = Table(title="Top Courses", expand=True)
        analytics_table.add_column("Course", style="cyan", width=30)
        analytics_table.add_column("Enrolled", style="yellow")
        analytics_table.add_column("Completion", style="green")
        analytics_table.add_column("Progress", style="blue")
        
        for course in analytics[:5]:
            analytics_table.add_row(
                course['title'][:30],
                str(course['enrolled']),
                f"{course['completion_rate']:.1f}%",
                f"{course['avg_progress']:.1f}%"
            )
        
        # Recent Activities
        activities = self.get_recent_activities()
        activities_table = Table(title="Recent Activities", expand=True)
        activities_table.add_column("Time", style="cyan")
        activities_table.add_column("Type", style="yellow")
        activities_table.add_column("User", style="green")
        
        for activity in activities[:5]:
            time_diff = datetime.utcnow() - activity['created_at']
            time_str = f"{int(time_diff.total_seconds() // 60)}m ago"
            activities_table.add_row(
                time_str,
                activity['type'],
                activity['user_id'][:8]
            )
        
        layout["right"].split_column(
            Layout(Panel(analytics_table, border_style="yellow")),
            Layout(Panel(activities_table, border_style="cyan"))
        )
        
        # Footer
        layout["footer"].update(Panel(
            f"Last updated: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')} | Press Ctrl+C to exit",
            border_style="dim"
        ))
        
        return layout
    
    def run(self):
        """Run the monitoring dashboard"""
        console.print("[bold green]Starting LINK-X Performance Monitor...[/bold green]")
        
        with Live(self.create_dashboard(), refresh_per_second=0.5) as live:
            try:
                while True:
                    time.sleep(5)  # Update every 5 seconds
                    live.update(self.create_dashboard())
            except KeyboardInterrupt:
                console.print("\n[yellow]Monitoring stopped.[/yellow]")
                self.db.close()

def main():
    monitor = PerformanceMonitor()
    monitor.run()

if __name__ == "__main__":
    main()