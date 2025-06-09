"""
Modular Personalization Service
Orchestrates the structured personalization pipeline using existing components
"""

import logging
import asyncio
from typing import Dict, List, Optional, Any, AsyncIterator
from dataclasses import dataclass
from datetime import datetime

from core.enhanced_personalization import enhanced_personalization
from core.critic_loop import critic_loop
from services.document_outline_generator import DocumentOutlineGenerator
from services.personalization_memory import PersonalizationMemoryService
from services.personalization_cache import PersonalizationCacheService
from core.database_supabase import db_manager
from core.exceptions import ValidationError

logger = logging.getLogger(__name__)


@dataclass
class PersonalizationRequest:
    """Request object for personalization"""
    file_id: str
    user_id: str
    user_profile: Dict[str, Any]
    regenerate: bool = False
    quality_threshold: float = 0.85


@dataclass
class PersonalizedSection:
    """Represents a personalized section"""
    topic_id: str
    section_type: str  # intro, concepts, examples, practice, summary
    content: str
    quality_score: float
    metadata: Dict[str, Any]
    generation_params: Dict[str, Any]


@dataclass
class PersonalizationResult:
    """Result of the personalization process"""
    topics: List[Dict[str, Any]]
    sections: Dict[str, List[PersonalizedSection]]
    overall_quality: float
    processing_time: float
    cached: bool = False


class ModularPersonalizationService:
    """
    Orchestrates the modular personalization pipeline
    """
    
    def __init__(self, 
                 ai_service,
                 file_service,
                 cache_service: Optional[PersonalizationCacheService] = None,
                 memory_service: Optional[PersonalizationMemoryService] = None):
        self.ai_service = ai_service
        self.file_service = file_service
        self.cache_service = cache_service or PersonalizationCacheService()
        self.memory_service = memory_service or PersonalizationMemoryService(self.cache_service.cache)
        
        # Initialize components
        self.enhanced_engine = enhanced_personalization
        self.critic = critic_loop
        
        # Section types in order
        self.section_types = ['intro', 'concepts', 'examples', 'practice', 'summary']
        
    async def personalize_document(self, request: PersonalizationRequest) -> AsyncIterator[Dict]:
        """
        Main personalization pipeline with streaming support
        """
        start_time = datetime.now()
        
        try:
            # Check cache first
            if not request.regenerate:
                cached_result = await self._check_cache(request)
                if cached_result:
                    yield {"type": "cached_content", "data": cached_result}
                    return
            
            # Step 1: Extract topics
            yield {"type": "status", "message": "Extracting topics..."}
            topics = await self._extract_topics(request.file_id)
            yield {"type": "topics_extracted", "topics": topics, "count": len(topics)}
            
            # Step 2: Generate personalized sections for each topic
            personalized_sections = {}
            total_sections = len(topics) * len(self.section_types)
            completed = 0
            
            for topic in topics:
                yield {"type": "topic_start", "topic": topic['title'], "topic_id": topic['id']}
                
                topic_sections = []
                
                for section_type in self.section_types:
                    # Generate section
                    section = await self._generate_section(
                        topic=topic,
                        section_type=section_type,
                        request=request
                    )
                    
                    # Quality check
                    quality_result = await self._validate_quality(
                        section=section,
                        topic=topic,
                        request=request
                    )
                    
                    # Retry if quality is low
                    if quality_result.score < request.quality_threshold:
                        section = await self._regenerate_with_feedback(
                            section=section,
                            quality_result=quality_result,
                            topic=topic,
                            request=request
                        )
                    
                    topic_sections.append(section)
                    completed += 1
                    
                    yield {
                        "type": "section_complete",
                        "topic_id": topic['id'],
                        "section_type": section_type,
                        "content": section.content,
                        "quality_score": section.quality_score,
                        "progress": (completed / total_sections) * 100
                    }
                
                personalized_sections[topic['id']] = topic_sections
                yield {"type": "topic_complete", "topic_id": topic['id']}
            
            # Step 3: Store results
            processing_time = (datetime.now() - start_time).total_seconds()
            result = PersonalizationResult(
                topics=topics,
                sections=personalized_sections,
                overall_quality=self._calculate_overall_quality(personalized_sections),
                processing_time=processing_time
            )
            
            await self._store_result(request, result)
            
            # Update user memory
            await self._update_user_memory(request, result)
            
            yield {
                "type": "complete",
                "message": "Personalization complete",
                "topics_covered": len(topics),
                "overall_quality": result.overall_quality,
                "processing_time": processing_time
            }
            
        except Exception as e:
            logger.error(f"Personalization error: {e}", exc_info=True)
            yield {"type": "error", "message": str(e)}
    
    async def _extract_topics(self, file_id: str) -> List[Dict[str, Any]]:
        """
        Extract topics using the document outline generator
        """
        with db_manager.get_session() as session:
            generator = DocumentOutlineGenerator(session)
            outline = await generator.generate_outline(file_id)
            
            # Transform outline to topics format
            topics = []
            for section in outline:
                topic = {
                    'id': section.get('anchor', f'topic-{len(topics)}'),
                    'title': section.get('title', ''),
                    'description': section.get('content_preview', '')[:200],
                    'keywords': section.get('keywords', []),
                    'type': section.get('type', 'general'),
                    'chunk_range': {
                        'start': section.get('chunk_start', 0),
                        'end': section.get('chunk_end', 0)
                    }
                }
                topics.append(topic)
            
            return topics
    
    async def _generate_section(self, topic: Dict, section_type: str, 
                              request: PersonalizationRequest) -> PersonalizedSection:
        """
        Generate a personalized section for a topic
        """
        # Get file content for context
        file_data = await self._get_file_content(request.file_id, topic)
        
        # Enhance user profile with memory insights
        enhanced_profile = await self._enhance_profile(request)
        
        # Use enhanced personalization engine
        personalization_result = self.enhanced_engine.personalize_content(
            content=file_data,
            student_profile=enhanced_profile,
            context=self._create_personalization_context(topic, section_type)
        )
        
        # Create section object
        section = PersonalizedSection(
            topic_id=topic['id'],
            section_type=section_type,
            content=personalization_result.adapted_content,
            quality_score=personalization_result.personalization_score,
            metadata={
                'adaptations': personalization_result.adaptations_made,
                'confidence': personalization_result.confidence,
                'efficiency_estimate': personalization_result.learning_efficiency_estimate
            },
            generation_params={
                'model': 'gpt-4',
                'temperature': self._get_section_temperature(section_type),
                'timestamp': datetime.now().isoformat()
            }
        )
        
        return section
    
    async def _validate_quality(self, section: PersonalizedSection, 
                              topic: Dict, request: PersonalizationRequest) -> Any:
        """
        Validate section quality using critic loop
        """
        # Prepare context for critic
        context = {
            'topic': topic,
            'section_type': section.section_type,
            'user_profile': request.user_profile,
            'quality_threshold': request.quality_threshold
        }
        
        # Use critic loop for validation
        executor_prompt = section.content  # Already personalized content
        question = f"Personalized {section.section_type} for {topic['title']}"
        
        result = critic_loop.execute_with_critic(
            executor_prompt=executor_prompt,
            context=context,
            question=question,
            student_profile=request.user_profile
        )
        
        # Update section quality score
        section.quality_score = result.critic_result.score
        section.metadata['quality_metrics'] = {
            'critic_score': result.critic_result.score,
            'issues': result.critic_result.issues,
            'category_scores': result.critic_result.category_scores,
            'retry_count': result.retry_count
        }
        
        return result.critic_result
    
    async def _regenerate_with_feedback(self, section: PersonalizedSection,
                                      quality_result: Any, topic: Dict,
                                      request: PersonalizationRequest) -> PersonalizedSection:
        """
        Regenerate section with quality feedback
        """
        # Apply feedback to improve generation
        feedback_context = {
            'previous_issues': quality_result.issues,
            'improvement_suggestions': quality_result.patch,
            'low_scoring_areas': [
                k for k, v in quality_result.category_scores.items() 
                if v < request.quality_threshold
            ]
        }
        
        # Regenerate with enhanced context
        enhanced_section = await self._generate_section(
            topic=topic,
            section_type=section.section_type,
            request=request
        )
        
        # Merge feedback improvements
        enhanced_section.metadata['regeneration'] = {
            'reason': 'quality_improvement',
            'previous_score': section.quality_score,
            'feedback_applied': feedback_context
        }
        
        return enhanced_section
    
    async def _check_cache(self, request: PersonalizationRequest) -> Optional[Dict]:
        """
        Check if personalized content exists in cache
        """
        cache_key = self.cache_service.generate_cache_key(
            file_id=request.file_id,
            user_profile=request.user_profile
        )
        
        cached_data = self.cache_service.get_cached_content(cache_key)
        if cached_data:
            logger.info(f"Cache hit for personalization request: {cache_key}")
            return cached_data
        
        return None
    
    async def _store_result(self, request: PersonalizationRequest, 
                          result: PersonalizationResult):
        """
        Store personalization result in cache and database
        """
        # Cache the result
        cache_key = self.cache_service.generate_cache_key(
            file_id=request.file_id,
            user_profile=request.user_profile
        )
        
        cache_data = {
            'topics': result.topics,
            'sections': self._serialize_sections(result.sections),
            'quality': result.overall_quality,
            'generated_at': datetime.now().isoformat()
        }
        
        self.cache_service.cache_content(
            cache_key=cache_key,
            content=cache_data,
            ttl=86400  # 24 hours
        )
        
        # TODO: Store in database for persistence
        # This would use the PersonalizedContent model
    
    async def _update_user_memory(self, request: PersonalizationRequest,
                                result: PersonalizationResult):
        """
        Update user's learning memory with personalization insights
        """
        # Track successful personalizations
        for topic in result.topics:
            await self.memory_service.track_learning_event(
                user_id=request.user_id,
                event_type='topic_personalized',
                event_data={
                    'topic': topic['title'],
                    'topic_type': topic.get('type', 'general'),
                    'quality_score': result.overall_quality
                }
            )
        
        # Update domain familiarity
        domain = self._extract_domain(result.topics)
        if domain:
            insights = self.memory_service.get_learning_insights(request.user_id)
            familiarity = insights.get('domain_familiarity', {})
            familiarity[domain] = familiarity.get(domain, 0) + 1
            
            # Store updated insights
            self.memory_service.cache.hset(
                f"user_insights:{request.user_id}",
                'domain_familiarity',
                str(familiarity)
            )
    
    async def _get_file_content(self, file_id: str, topic: Dict) -> str:
        """
        Get relevant file content for a topic
        """
        # This would fetch content based on chunk ranges
        # For now, return topic description as placeholder
        return topic.get('description', '')
    
    async def _enhance_profile(self, request: PersonalizationRequest) -> Dict:
        """
        Enhance user profile with memory insights
        """
        insights = self.memory_service.get_learning_insights(request.user_id)
        
        enhanced_profile = request.user_profile.copy()
        enhanced_profile['memory_insights'] = insights
        enhanced_profile['user_id'] = request.user_id
        
        return enhanced_profile
    
    def _create_personalization_context(self, topic: Dict, section_type: str) -> Any:
        """
        Create context for personalization
        """
        from core.enhanced_personalization import PersonalizationContext
        
        return PersonalizationContext(
            subject_domain=topic.get('type', 'general'),
            difficulty_level='intermediate',  # Could be dynamic
            time_context='deep_study',
            learning_goal='understanding',
            prior_knowledge=[],
            current_struggles=[],
            preferred_examples=[]
        )
    
    def _get_section_temperature(self, section_type: str) -> float:
        """
        Get appropriate temperature for section generation
        """
        temperatures = {
            'intro': 0.7,      # More creative
            'concepts': 0.3,   # More accurate
            'examples': 0.6,   # Balanced
            'practice': 0.4,   # Structured
            'summary': 0.5     # Clear
        }
        return temperatures.get(section_type, 0.5)
    
    def _calculate_overall_quality(self, sections: Dict[str, List[PersonalizedSection]]) -> float:
        """
        Calculate overall quality score
        """
        all_scores = []
        for topic_sections in sections.values():
            for section in topic_sections:
                all_scores.append(section.quality_score)
        
        return sum(all_scores) / len(all_scores) if all_scores else 0.0
    
    def _serialize_sections(self, sections: Dict[str, List[PersonalizedSection]]) -> Dict:
        """
        Serialize sections for storage
        """
        serialized = {}
        for topic_id, topic_sections in sections.items():
            serialized[topic_id] = [
                {
                    'section_type': s.section_type,
                    'content': s.content,
                    'quality_score': s.quality_score,
                    'metadata': s.metadata,
                    'generation_params': s.generation_params
                }
                for s in topic_sections
            ]
        return serialized
    
    def _extract_domain(self, topics: List[Dict]) -> Optional[str]:
        """
        Extract primary domain from topics
        """
        # Simple heuristic - could be more sophisticated
        if not topics:
            return None
        
        # Look at topic types
        types = [t.get('type', 'general') for t in topics]
        # Return most common type
        return max(set(types), key=types.count)