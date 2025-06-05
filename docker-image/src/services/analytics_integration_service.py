"""
Analytics Integration Service
Integrates learning analytics with the existing personalization system
"""
import logging
from typing import Dict, List, Optional, Any
from datetime import datetime, timedelta
from dataclasses import dataclass

from sqlalchemy.orm import Session
from core.database import db_manager
from repositories.analytics_repository import AnalyticsRepository
from repositories.user_repository import UserRepository
from services.ai.ai_service import AIService

logger = logging.getLogger(__name__)

@dataclass
class PersonalizationInsight:
    """Insight for personalizing content delivery"""
    insight_type: str
    confidence: float
    recommendation: str
    data: Dict[str, Any]

@dataclass
class LearningProfile:
    """User's learning profile based on analytics"""
    user_id: str
    peak_learning_hours: List[int]
    preferred_content_types: List[str]
    optimal_session_length: int
    engagement_patterns: Dict[str, Any]
    difficulty_preference: str
    last_updated: datetime

class AnalyticsIntegrationService:
    """
    Service that bridges analytics data with personalization features
    """
    
    def __init__(self):
        self.analytics_repo = AnalyticsRepository(db_manager.session_factory)
        self.user_repo = UserRepository(db_manager.session_factory)
        self.ai_service = AIService()
    
    def get_personalization_insights(
        self, 
        user_id: str, 
        context: Optional[Dict[str, Any]] = None
    ) -> List[PersonalizationInsight]:
        """
        Generate personalization insights based on user analytics
        """
        try:
            insights = []
            
            with db_manager.get_session() as session:
                # Get user's learning patterns
                patterns = self.analytics_repo.detect_learning_patterns(user_id, session)
                
                # Get recent engagement data
                engagement_summary = self.analytics_repo.get_engagement_summary(
                    user_id, days=14, session=session
                )
                
                # Generate time-based insights
                if 'peak_hours' in patterns:
                    peak_hours_insight = self._analyze_peak_hours(patterns['peak_hours'])
                    if peak_hours_insight:
                        insights.append(peak_hours_insight)
                
                # Generate content preference insights
                if 'learning_style' in patterns:
                    content_insight = self._analyze_content_preferences(patterns['learning_style'])
                    if content_insight:
                        insights.append(content_insight)
                
                # Generate engagement improvement insights
                if engagement_summary['summary']:
                    engagement_insight = self._analyze_engagement_patterns(engagement_summary)
                    if engagement_insight:
                        insights.append(engagement_insight)
                
                # Generate session optimization insights
                session_analytics = self.analytics_repo.get_study_session_analytics(
                    user_id, days=30, session=session
                )
                if session_analytics:
                    session_insight = self._analyze_session_patterns(session_analytics)
                    if session_insight:
                        insights.append(session_insight)
            
            return sorted(insights, key=lambda x: x.confidence, reverse=True)
            
        except Exception as e:
            logger.error(f"Error generating personalization insights for user {user_id}: {str(e)}")
            return []
    
    def get_learning_profile(self, user_id: str) -> Optional[LearningProfile]:
        """
        Generate a comprehensive learning profile for a user
        """
        try:
            with db_manager.get_session() as session:
                # Get learning patterns
                patterns = self.analytics_repo.detect_learning_patterns(user_id, session)
                
                # Extract peak hours
                peak_hours = []
                if 'peak_hours' in patterns and patterns['peak_hours']['data']:
                    peak_data = patterns['peak_hours']['data']
                    sorted_hours = sorted(
                        peak_data.items(),
                        key=lambda x: x[1].get('count', 0),
                        reverse=True
                    )
                    peak_hours = [int(hour) for hour, _ in sorted_hours[:3]]
                
                # Extract content preferences
                preferred_types = []
                if 'learning_style' in patterns and patterns['learning_style']['data']:
                    style_data = patterns['learning_style']['data']
                    preferences = [
                        ('visual', style_data.get('visual_preference', 0)),
                        ('text', style_data.get('text_preference', 0)),
                        ('audio', style_data.get('audio_preference', 0)),
                        ('interactive', style_data.get('interactive_preference', 0))
                    ]
                    sorted_prefs = sorted(preferences, key=lambda x: x[1], reverse=True)
                    preferred_types = [pref[0] for pref in sorted_prefs if pref[1] > 0]
                
                # Get session analytics for optimal session length
                session_analytics = self.analytics_repo.get_study_session_analytics(
                    user_id, days=30, session=session
                )
                optimal_length = int(session_analytics.get('avg_session_length', 45))
                
                # Get engagement patterns
                engagement_data = self.analytics_repo.get_engagement_summary(
                    user_id, days=30, session=session
                )
                
                return LearningProfile(
                    user_id=user_id,
                    peak_learning_hours=peak_hours,
                    preferred_content_types=preferred_types,
                    optimal_session_length=optimal_length,
                    engagement_patterns=engagement_data,
                    difficulty_preference=self._infer_difficulty_preference(session_analytics),
                    last_updated=datetime.utcnow()
                )
                
        except Exception as e:
            logger.error(f"Error generating learning profile for user {user_id}: {str(e)}")
            return None
    
    def enhance_content_recommendations(
        self, 
        user_id: str, 
        base_recommendations: List[Dict[str, Any]]
    ) -> List[Dict[str, Any]]:
        """
        Enhance content recommendations with analytics insights
        """
        try:
            profile = self.get_learning_profile(user_id)
            if not profile:
                return base_recommendations
            
            enhanced_recommendations = []
            
            for rec in base_recommendations:
                enhanced_rec = rec.copy()
                
                # Add personalization score based on analytics
                personalization_score = self._calculate_personalization_score(
                    rec, profile
                )
                enhanced_rec['personalization_score'] = personalization_score
                
                # Add timing recommendation
                enhanced_rec['optimal_timing'] = self._get_optimal_timing(profile)
                
                # Add session length recommendation
                enhanced_rec['recommended_session_length'] = profile.optimal_session_length
                
                # Add content type preference match
                if 'content_type' in rec:
                    type_match = rec['content_type'] in profile.preferred_content_types
                    enhanced_rec['content_type_match'] = type_match
                    if type_match:
                        enhanced_rec['match_reason'] = f"Matches your {rec['content_type']} preference"
                
                enhanced_recommendations.append(enhanced_rec)
            
            # Sort by personalization score
            return sorted(
                enhanced_recommendations, 
                key=lambda x: x.get('personalization_score', 0), 
                reverse=True
            )
            
        except Exception as e:
            logger.error(f"Error enhancing recommendations for user {user_id}: {str(e)}")
            return base_recommendations
    
    def get_adaptive_content_parameters(self, user_id: str, content_id: str) -> Dict[str, Any]:
        """
        Get adaptive parameters for content delivery based on analytics
        """
        try:
            profile = self.get_learning_profile(user_id)
            if not profile:
                return {}
            
            with db_manager.get_session() as session:
                # Get content performance for this user
                content_performance = self.analytics_repo.get_content_performance_analytics(
                    user_id, days=90, session=session
                )
                
                # Find performance for this specific content
                content_perf = next(
                    (perf for perf in content_performance if perf['file_id'] == content_id),
                    None
                )
                
                parameters = {
                    'optimal_session_length': profile.optimal_session_length,
                    'preferred_content_types': profile.preferred_content_types,
                    'peak_hours': profile.peak_learning_hours,
                    'difficulty_adjustment': self._get_difficulty_adjustment(profile, content_perf),
                    'pacing_recommendation': self._get_pacing_recommendation(profile, content_perf),
                    'interaction_style': self._get_interaction_style(profile)
                }
                
                return parameters
                
        except Exception as e:
            logger.error(f"Error getting adaptive parameters for user {user_id}, content {content_id}: {str(e)}")
            return {}
    
    def _analyze_peak_hours(self, peak_hours_data: Dict[str, Any]) -> Optional[PersonalizationInsight]:
        """Analyze peak hours pattern"""
        if not peak_hours_data.get('data'):
            return None
            
        hours_data = peak_hours_data['data']
        sorted_hours = sorted(
            hours_data.items(),
            key=lambda x: x[1].get('count', 0),
            reverse=True
        )
        
        if len(sorted_hours) < 2:
            return None
            
        top_hour = sorted_hours[0]
        confidence = min(0.9, peak_hours_data.get('confidence', 0.5) + 0.2)
        
        return PersonalizationInsight(
            insight_type='optimal_timing',
            confidence=confidence,
            recommendation=f"Schedule important learning content around {top_hour[0]}:00 for best results",
            data={
                'peak_hour': int(top_hour[0]),
                'activity_count': top_hour[1].get('count', 0),
                'avg_duration': top_hour[1].get('avg_duration', 0)
            }
        )
    
    def _analyze_content_preferences(self, learning_style_data: Dict[str, Any]) -> Optional[PersonalizationInsight]:
        """Analyze content preferences"""
        if not learning_style_data.get('data'):
            return None
            
        style_data = learning_style_data['data']
        preferences = [
            ('visual', style_data.get('visual_preference', 0)),
            ('text', style_data.get('text_preference', 0)),
            ('audio', style_data.get('audio_preference', 0)),
            ('interactive', style_data.get('interactive_preference', 0))
        ]
        
        sorted_prefs = sorted(preferences, key=lambda x: x[1], reverse=True)
        top_pref = sorted_prefs[0]
        
        if top_pref[1] <= 0:
            return None
            
        confidence = min(0.8, learning_style_data.get('confidence', 0.5) + 0.1)
        
        return PersonalizationInsight(
            insight_type='content_preference',
            confidence=confidence,
            recommendation=f"Focus on {top_pref[0]} content types for better engagement",
            data={
                'preferred_type': top_pref[0],
                'preference_score': top_pref[1],
                'all_preferences': dict(preferences)
            }
        )
    
    def _analyze_engagement_patterns(self, engagement_data: Dict[str, Any]) -> Optional[PersonalizationInsight]:
        """Analyze engagement patterns"""
        summary = engagement_data.get('summary', {})
        if not summary:
            return None
            
        avg_engagement = summary.get('avg_engagement', 0)
        total_sessions = summary.get('total_sessions', 0)
        
        if total_sessions < 3:  # Not enough data
            return None
            
        if avg_engagement < 0.5:
            return PersonalizationInsight(
                insight_type='engagement_improvement',
                confidence=0.7,
                recommendation="Try shorter study sessions with more interactive elements to boost engagement",
                data={
                    'current_engagement': avg_engagement,
                    'improvement_potential': 0.5 - avg_engagement
                }
            )
        elif avg_engagement > 0.8:
            return PersonalizationInsight(
                insight_type='engagement_optimization',
                confidence=0.6,
                recommendation="Your engagement is excellent! Consider tackling more challenging content",
                data={
                    'current_engagement': avg_engagement,
                    'readiness_for_challenge': True
                }
            )
        
        return None
    
    def _analyze_session_patterns(self, session_data: Dict[str, Any]) -> Optional[PersonalizationInsight]:
        """Analyze study session patterns"""
        if not session_data:
            return None
            
        avg_length = session_data.get('avg_session_length', 0)
        avg_effectiveness = session_data.get('avg_effectiveness', 0)
        completion_rate = session_data.get('completed_sessions', 0) / max(1, 
            session_data.get('completed_sessions', 0) + session_data.get('missed_sessions', 0))
        
        if avg_length > 0 and avg_effectiveness > 0:
            if avg_length > 60 and avg_effectiveness < 3:
                return PersonalizationInsight(
                    insight_type='session_optimization',
                    confidence=0.75,
                    recommendation="Try shorter study sessions (30-45 minutes) to improve focus and effectiveness",
                    data={
                        'current_avg_length': avg_length,
                        'current_effectiveness': avg_effectiveness,
                        'recommended_length': 45
                    }
                )
            elif completion_rate < 0.7:
                return PersonalizationInsight(
                    insight_type='session_commitment',
                    confidence=0.8,
                    recommendation="Consider adjusting your schedule or session goals to improve completion rates",
                    data={
                        'completion_rate': completion_rate,
                        'missed_sessions': session_data.get('missed_sessions', 0)
                    }
                )
        
        return None
    
    def _calculate_personalization_score(self, recommendation: Dict[str, Any], profile: LearningProfile) -> float:
        """Calculate how well a recommendation matches the user's profile"""
        score = 0.5  # Base score
        
        # Content type match
        if 'content_type' in recommendation:
            if recommendation['content_type'] in profile.preferred_content_types:
                index = profile.preferred_content_types.index(recommendation['content_type'])
                score += 0.3 * (1 - index * 0.1)  # Higher score for top preferences
        
        # Timing match (if current time is available)
        current_hour = datetime.now().hour
        if current_hour in profile.peak_learning_hours:
            score += 0.2
        
        # Difficulty match
        difficulty = recommendation.get('difficulty', 'medium')
        if difficulty == profile.difficulty_preference:
            score += 0.15
        
        # Engagement pattern match
        engagement_data = profile.engagement_patterns.get('summary', {})
        if engagement_data:
            avg_engagement = engagement_data.get('avg_engagement', 0)
            if avg_engagement > 0.7 and recommendation.get('complexity', 'medium') == 'high':
                score += 0.1
            elif avg_engagement < 0.5 and recommendation.get('complexity', 'medium') == 'low':
                score += 0.1
        
        return min(1.0, score)
    
    def _get_optimal_timing(self, profile: LearningProfile) -> List[str]:
        """Get optimal timing recommendations"""
        if not profile.peak_learning_hours:
            return ["Any time works well for you"]
            
        hours = [f"{hour}:00-{hour+1}:00" for hour in profile.peak_learning_hours[:2]]
        return hours
    
    def _infer_difficulty_preference(self, session_data: Dict[str, Any]) -> str:
        """Infer difficulty preference from session data"""
        if not session_data:
            return 'adaptive'
            
        avg_effectiveness = session_data.get('avg_effectiveness', 0)
        completion_rate = session_data.get('completed_sessions', 0) / max(1,
            session_data.get('completed_sessions', 0) + session_data.get('missed_sessions', 0))
        
        if avg_effectiveness > 4 and completion_rate > 0.8:
            return 'challenging'
        elif avg_effectiveness < 3 or completion_rate < 0.6:
            return 'supportive'
        else:
            return 'adaptive'
    
    def _get_difficulty_adjustment(self, profile: LearningProfile, content_perf: Optional[Dict]) -> str:
        """Get difficulty adjustment recommendation"""
        if not content_perf:
            return profile.difficulty_preference
            
        completion = content_perf.get('avg_completion', 0)
        if completion > 90:
            return 'increase'
        elif completion < 50:
            return 'decrease'
        else:
            return 'maintain'
    
    def _get_pacing_recommendation(self, profile: LearningProfile, content_perf: Optional[Dict]) -> str:
        """Get pacing recommendation"""
        if not content_perf:
            return 'normal'
            
        avg_duration = content_perf.get('avg_duration', 0)
        if avg_duration > profile.optimal_session_length * 1.5:
            return 'increase_pace'
        elif avg_duration < profile.optimal_session_length * 0.5:
            return 'decrease_pace'
        else:
            return 'normal'
    
    def _get_interaction_style(self, profile: LearningProfile) -> str:
        """Get recommended interaction style"""
        if 'interactive' in profile.preferred_content_types[:2]:
            return 'high_interaction'
        elif 'visual' in profile.preferred_content_types[:2]:
            return 'visual_focused'
        elif 'audio' in profile.preferred_content_types[:2]:
            return 'audio_focused'
        else:
            return 'text_focused'