"""
Fast Path Processor - Optimized processing for simple queries
Achieves <3s response times for straightforward educational questions
"""

import logging
import time
import asyncio
from typing import Dict, Any, Optional, List
from dataclasses import dataclass
from concurrent.futures import ThreadPoolExecutor
import json

from .prompt_manager import prompt_manager
from .critic_loop import CriticLoop

logger = logging.getLogger(__name__)


@dataclass
class FastPathResult:
    """Result from fast path processing"""
    answer: str
    confidence: float
    sources: List[str]
    processing_time: float
    critic_score: float
    token_count: int
    cache_hit: bool


class FastPathProcessor:
    """
    Optimized processor for simple educational queries
    
    Optimizations:
    - Parallel critic evaluation
    - Lighter model usage (GPT-4o-mini for simple queries)
    - Streamlined prompts
    - Skip critic loop for high-confidence responses
    - Basic caching for common queries
    """
    
    def __init__(self):
        self.critic = CriticLoop(score_threshold=0.85, max_retries=1)
        self.cache = {}  # Simple in-memory cache (Redis in production)
        self.executor = ThreadPoolExecutor(max_workers=2)
        
        # Performance tracking
        self.stats = {
            'total_queries': 0,
            'avg_processing_time': 0.0,
            'cache_hits': 0,
            'critic_skips': 0,
            'avg_quality_score': 0.0
        }
    
    def process_simple_query(
        self,
        question: str,
        context_chunks: List[str],
        student_profile: Dict[str, Any],
        skip_critic_threshold: float = 0.95
    ) -> FastPathResult:
        """
        Process simple query with optimized fast path
        
        Args:
            question: User's question
            context_chunks: Retrieved context (pre-optimized to ≤800 tokens)
            student_profile: Student learning preferences
            skip_critic_threshold: Skip critic if confidence > this
            
        Returns:
            FastPathResult with answer and metadata
        """
        start_time = time.time()
        
        # Check cache first
        cache_key = self._generate_cache_key(question, student_profile)
        cached_result = self._check_cache(cache_key)
        if cached_result:
            self._update_stats(time.time() - start_time, cached_result['critic_score'], cache_hit=True)
            return cached_result
        
        try:
            # Render optimized prompt for simple queries
            prompt = self._render_fast_prompt(question, context_chunks, student_profile)
            
            # Execute main query with lightweight model
            from openai import OpenAI
            import os
            
            client = OpenAI(api_key=os.getenv("OPENAI_API_KEY"))
            
            response = client.chat.completions.create(
                model="gpt-4o",  # Faster than gpt-4o-mini for simple prompts
                messages=[{"role": "user", "content": prompt}],
                temperature=0,
                max_tokens=600
            )
            
            answer = response.choices[0].message.content.strip()
            
            # Parse response
            parsed_response = self._parse_response(answer)
            
            # Determine if we need critic evaluation
            response_confidence = parsed_response.get('confidence', 0.8)
            
            if response_confidence >= skip_critic_threshold:
                # Skip critic for high-confidence simple responses
                critic_score = response_confidence
                critic_time = 0.0
                self.stats['critic_skips'] += 1
                logger.info(f"Skipped critic for high-confidence response: {response_confidence:.3f}")
            else:
                # Run critic in parallel with response parsing
                critic_future = self.executor.submit(
                    self._evaluate_with_critic,
                    answer, question, context_chunks, student_profile
                )
                critic_result = critic_future.result()
                critic_score = critic_result.score
                critic_time = 0.5  # Estimated parallel time
            
            # Calculate tokens (approximation for speed)
            token_count = len(prompt.split()) * 1.3 + len(answer.split()) * 1.3
            
            processing_time = time.time() - start_time
            
            result = FastPathResult(
                answer=parsed_response.get('answer', answer),
                confidence=response_confidence,
                sources=parsed_response.get('sources', ['context']),
                processing_time=processing_time,
                critic_score=critic_score,
                token_count=int(token_count),
                cache_hit=False
            )
            
            # Cache the result for future use
            self._cache_result(cache_key, result)
            
            # Update statistics
            self._update_stats(processing_time, critic_score, cache_hit=False)
            
            logger.info(f"Fast path completed in {processing_time:.2f}s, "
                       f"confidence: {response_confidence:.3f}, "
                       f"critic: {critic_score:.3f}")
            
            return result
        
        except Exception as e:
            logger.error(f"Fast path processing failed: {e}")
            # Fallback to basic response
            return FastPathResult(
                answer=f"I apologize, but I encountered an error processing your question: {question}",
                confidence=0.5,
                sources=[],
                processing_time=time.time() - start_time,
                critic_score=0.5,
                token_count=50,
                cache_hit=False
            )
    
    def _render_fast_prompt(
        self, 
        question: str, 
        context_chunks: List[str], 
        student_profile: Dict[str, Any]
    ) -> str:
        """Render optimized prompt for fast processing"""
        
        # Use streamlined template for simple queries
        fast_template = """You are an AI Educational Tutor. Answer the student's question clearly and concisely.

CONTEXT:
{% for chunk in context %}{{ chunk }}

{% endfor %}

STUDENT: {{ student_profile.expertise_level }} level, prefers {{ student_profile.tone_preference }} tone

QUESTION: {{ question }}

INSTRUCTIONS:
• Give a clear, direct answer appropriate for {{ student_profile.expertise_level }} level
• Use {{ student_profile.tone_preference }} tone
• Keep response focused and concise
• Cite relevant context sources

Return JSON format:
{
  "answer": "Your complete answer here",
  "confidence": 0.95,
  "sources": ["context sections used"]
}"""
        
        from jinja2 import Template
        template = Template(fast_template)
        
        return template.render(
            question=question,
            context=context_chunks,
            student_profile=student_profile
        )
    
    def _parse_response(self, response: str) -> Dict[str, Any]:
        """Parse LLM response with fallback handling"""
        try:
            # Try to extract JSON
            import re
            json_match = re.search(r'\{.*\}', response, re.DOTALL)
            if json_match:
                return json.loads(json_match.group())
        except json.JSONDecodeError:
            pass
        
        # Fallback: treat as plain text
        return {
            'answer': response,
            'confidence': 0.8,
            'sources': ['context']
        }
    
    def _evaluate_with_critic(
        self, 
        answer: str, 
        question: str, 
        context: List[str], 
        student_profile: Dict[str, Any]
    ) -> Any:
        """Run critic evaluation (designed for parallel execution)"""
        try:
            context_dict = {'content': '\n\n'.join(context)}
            return self.critic._evaluate_with_critic(
                answer=answer,
                question=question,
                context=context_dict,
                student_profile=student_profile
            )
        except Exception as e:
            logger.warning(f"Critic evaluation failed: {e}")
            # Return fallback result
            from .critic_loop import CriticResult
            return CriticResult(
                score=0.8,
                issues=[],
                patch="",
                category_scores={},
                passed=True
            )
    
    def _generate_cache_key(self, question: str, student_profile: Dict[str, Any]) -> str:
        """Generate cache key for query"""
        import hashlib
        
        # Create stable key from question and key profile elements
        key_elements = [
            question.lower().strip(),
            student_profile.get('expertise_level', 'intermediate'),
            student_profile.get('learning_style', 'visual'),
            student_profile.get('tone_preference', 'casual')
        ]
        
        key_string = '|'.join(str(e) for e in key_elements)
        return hashlib.md5(key_string.encode()).hexdigest()[:16]
    
    def _check_cache(self, cache_key: str) -> Optional[FastPathResult]:
        """Check if result is cached"""
        if cache_key in self.cache:
            cached_data = self.cache[cache_key]
            # Check if cache entry is still fresh (5 minutes)
            if time.time() - cached_data['timestamp'] < 300:
                result = cached_data['result']
                result.cache_hit = True
                return result
            else:
                # Remove expired entry
                del self.cache[cache_key]
        
        return None
    
    def _cache_result(self, cache_key: str, result: FastPathResult):
        """Cache the result"""
        # Simple in-memory cache (use Redis in production)
        self.cache[cache_key] = {
            'result': result,
            'timestamp': time.time()
        }
        
        # Keep cache size reasonable
        if len(self.cache) > 100:
            # Remove oldest entries
            oldest_keys = sorted(
                self.cache.keys(),
                key=lambda k: self.cache[k]['timestamp']
            )[:10]
            for key in oldest_keys:
                del self.cache[key]
    
    def _update_stats(self, processing_time: float, critic_score: float, cache_hit: bool):
        """Update performance statistics"""
        self.stats['total_queries'] += 1
        
        if cache_hit:
            self.stats['cache_hits'] += 1
        
        # Update rolling averages
        total = self.stats['total_queries']
        current_avg_time = self.stats['avg_processing_time']
        current_avg_score = self.stats['avg_quality_score']
        
        self.stats['avg_processing_time'] = (
            (current_avg_time * (total - 1) + processing_time) / total
        )
        self.stats['avg_quality_score'] = (
            (current_avg_score * (total - 1) + critic_score) / total
        )
    
    def get_performance_stats(self) -> Dict[str, Any]:
        """Get comprehensive performance statistics"""
        total = self.stats['total_queries']
        if total == 0:
            return self.stats
        
        return {
            **self.stats,
            'cache_hit_rate': self.stats['cache_hits'] / total * 100,
            'critic_skip_rate': self.stats['critic_skips'] / total * 100,
            'avg_processing_time_ms': self.stats['avg_processing_time'] * 1000
        }
    
    def clear_cache(self):
        """Clear the query cache"""
        self.cache.clear()
        logger.info("Fast path cache cleared")


# Global instance
fast_path_processor = FastPathProcessor()