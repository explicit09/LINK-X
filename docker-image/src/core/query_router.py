"""
Query Router - Intelligent routing of simple vs complex queries
Routes queries to appropriate processing pipelines for optimal performance
"""

import logging
import time
from typing import Dict, Any, List, Optional, Tuple
from dataclasses import dataclass
from openai import OpenAI
import json
import os

from .prompt_manager import prompt_manager

logger = logging.getLogger(__name__)


@dataclass
class RoutingDecision:
    """Result from query routing analysis"""
    category: str  # 'simple' or 'complex'
    confidence: float
    reasoning: str
    suggested_tools: List[str]
    estimated_complexity: int  # 1-10 scale
    processing_time_estimate: float


class QueryRouter:
    """
    Intelligent query routing system
    
    Routes educational queries to optimal processing paths:
    - Simple: Direct RAG + LLM (fast path)
    - Complex: Multi-step agent with tools (comprehensive path)
    
    Uses lightweight classification to make routing decisions in <1s
    """
    
    def __init__(self, classification_model: str = "gpt-4o-mini"):
        self.classification_model = classification_model
        self.client = OpenAI(api_key=os.getenv("OPENAI_API_KEY"))
        
        # Performance tracking
        self.routing_stats = {
            'total_queries': 0,
            'simple_queries': 0,
            'complex_queries': 0,
            'avg_classification_time': 0.0,
            'classification_accuracy': 0.0  # Updated based on feedback
        }
        
        # Load classification criteria
        self._load_classification_criteria()
    
    def route_query(
        self, 
        query: str, 
        context: Optional[Dict[str, Any]] = None,
        student_profile: Optional[Dict[str, Any]] = None
    ) -> RoutingDecision:
        """
        Route query to appropriate processing pipeline
        
        Args:
            query: User's educational query
            context: Additional context (course, file, etc.)
            student_profile: Student learning profile
            
        Returns:
            RoutingDecision with category and metadata
        """
        start_time = time.time()
        
        try:
            # Quick heuristic pre-filter (avoid API call for obvious cases)
            heuristic_result = self._apply_heuristics(query)
            if heuristic_result['confidence'] > 0.9:
                classification_time = time.time() - start_time
                self._update_stats(heuristic_result['category'], classification_time)
                
                return RoutingDecision(
                    category=heuristic_result['category'],
                    confidence=heuristic_result['confidence'],
                    reasoning=heuristic_result['reasoning'],
                    suggested_tools=heuristic_result['tools'],
                    estimated_complexity=heuristic_result['complexity'],
                    processing_time_estimate=heuristic_result['time_estimate']
                )
            
            # Use LLM for nuanced classification
            llm_result = self._classify_with_llm(query, context, student_profile)
            
            classification_time = time.time() - start_time
            self._update_stats(llm_result['category'], classification_time)
            
            logger.info(f"Query routed as '{llm_result['category']}' in {classification_time:.2f}s")
            
            return RoutingDecision(
                category=llm_result['category'],
                confidence=llm_result['confidence'],
                reasoning=llm_result['reasoning'],
                suggested_tools=llm_result['tools'],
                estimated_complexity=llm_result['complexity'],
                processing_time_estimate=llm_result['time_estimate']
            )
        
        except Exception as e:
            logger.error(f"Query routing failed: {e}")
            # Safe fallback to simple processing
            return RoutingDecision(
                category='simple',
                confidence=0.5,
                reasoning=f"Routing failed, defaulting to simple: {e}",
                suggested_tools=[],
                estimated_complexity=3,
                processing_time_estimate=5.0
            )
    
    def _apply_heuristics(self, query: str) -> Dict[str, Any]:
        """Apply fast heuristic rules for obvious cases"""
        query_lower = query.lower()
        
        # Obvious complex query indicators
        complex_indicators = [
            ('debug', ['code_executor', 'linter'], 8, 15.0),
            ('write code', ['code_executor', 'docs_search'], 9, 20.0),
            ('implement', ['code_executor', 'docs_search'], 8, 18.0),
            ('research and compare', ['web_search', 'citation_checker'], 7, 12.0),
            ('analyze this code', ['code_executor', 'linter'], 8, 15.0),
            ('create a program', ['code_executor', 'docs_search'], 9, 25.0),
            ('help me with my programming', ['code_executor', 'docs_search'], 8, 18.0),
            ('build an application', ['code_executor', 'project_manager'], 10, 30.0),
            ('find the latest information', ['web_search', 'fact_checker'], 6, 10.0),
            ('compile and run', ['code_executor', 'compiler'], 9, 20.0)
        ]
        
        for indicator, tools, complexity, time_est in complex_indicators:
            if indicator in query_lower:
                return {
                    'category': 'complex',
                    'confidence': 0.95,
                    'reasoning': f"Contains '{indicator}' - requires tools and multi-step processing",
                    'tools': tools,
                    'complexity': complexity,
                    'time_estimate': time_est
                }
        
        # Obvious simple query indicators
        simple_indicators = [
            ('what is', 2, 3.0),
            ('explain', 3, 4.0), 
            ('define', 2, 3.0),
            ('how does', 3, 4.0),
            ('why is', 3, 4.0),
            ('tell me about', 3, 4.0),
            ('give me an example', 4, 5.0),
            ('what are the main', 3, 4.0),
            ('can you explain', 3, 4.0),
            ('help me understand', 4, 5.0)
        ]
        
        for indicator, complexity, time_est in simple_indicators:
            if query_lower.startswith(indicator):
                return {
                    'category': 'simple',
                    'confidence': 0.92,
                    'reasoning': f"Starts with '{indicator}' - straightforward explanation request",
                    'tools': [],
                    'complexity': complexity,
                    'time_estimate': time_est
                }
        
        # Check query length and complexity heuristics
        word_count = len(query.split())
        question_marks = query.count('?')
        
        if word_count <= 8 and question_marks <= 1:
            return {
                'category': 'simple',
                'confidence': 0.85,
                'reasoning': f"Short query ({word_count} words) - likely simple explanation",
                'tools': [],
                'complexity': 3,
                'time_estimate': 4.0
            }
        
        # Neutral case - needs LLM classification
        return {
            'category': 'uncertain',
            'confidence': 0.5,
            'reasoning': 'Requires LLM analysis',
            'tools': [],
            'complexity': 5,
            'time_estimate': 8.0
        }
    
    def _classify_with_llm(
        self, 
        query: str, 
        context: Optional[Dict[str, Any]] = None,
        student_profile: Optional[Dict[str, Any]] = None
    ) -> Dict[str, Any]:
        """Use LLM for nuanced query classification"""
        
        # Load and render classification prompt
        classification_prompt = prompt_manager.render(
            'routers/query_classifier.yaml',
            query=query,
            context=context or {},
            student_profile=student_profile or {}
        )
        
        # Create comprehensive classification prompt
        full_prompt = f"""
{classification_prompt}

QUERY TO CLASSIFY: "{query}"

CONTEXT: {context or 'None provided'}
STUDENT LEVEL: {student_profile.get('expertise_level', 'unknown') if student_profile else 'unknown'}

Analyze this educational query and classify it:

SIMPLE queries are:
- Direct explanations ("What is X?", "How does Y work?")
- Definitions and basic concepts
- Summarization requests
- Examples and analogies
- Basic Q&A about course material

COMPLEX queries need:
- Code writing, debugging, or execution
- Multi-step research across sources
- Creating study plans or projects
- Real-time data or current information
- Tool usage (compilers, calculators, web search)

Return ONLY valid JSON:
{{
  "category": "simple|complex",
  "confidence": 0.95,
  "reasoning": "Brief explanation of classification decision",
  "suggested_tools": ["list", "of", "tools", "if", "complex"],
  "estimated_complexity": 7,
  "processing_time_estimate": 5.0
}}
"""
        
        try:
            response = self.client.chat.completions.create(
                model=self.classification_model,
                messages=[{"role": "user", "content": full_prompt}],
                temperature=0,
                max_tokens=200
            )
            
            result_text = response.choices[0].message.content.strip()
            
            # Clean up response (remove markdown if present)
            if '```' in result_text:
                result_text = result_text.split('```')[1]
                if result_text.startswith('json'):
                    result_text = result_text[4:]
            
            result = json.loads(result_text)
            
            # Validate and clean result
            return {
                'category': result.get('category', 'simple'),
                'confidence': float(result.get('confidence', 0.8)),
                'reasoning': result.get('reasoning', 'LLM classification'),
                'tools': result.get('suggested_tools', []),
                'complexity': int(result.get('estimated_complexity', 5)),
                'time_estimate': float(result.get('processing_time_estimate', 5.0))
            }
        
        except (json.JSONDecodeError, KeyError, ValueError) as e:
            logger.warning(f"LLM classification parsing failed: {e}")
            # Return conservative fallback
            return {
                'category': 'simple',
                'confidence': 0.7,
                'reasoning': 'LLM parsing failed, defaulting to simple',
                'tools': [],
                'complexity': 4,
                'time_estimate': 5.0
            }
    
    def _load_classification_criteria(self):
        """Load classification criteria from YAML"""
        try:
            criteria = prompt_manager.load_yaml('routers/query_classifier.yaml')
            self.classification_criteria = criteria
            logger.info("Classification criteria loaded successfully")
        except Exception as e:
            logger.warning(f"Failed to load classification criteria: {e}")
            self.classification_criteria = {}
    
    def _update_stats(self, category: str, classification_time: float):
        """Update routing statistics"""
        self.routing_stats['total_queries'] += 1
        
        if category == 'simple':
            self.routing_stats['simple_queries'] += 1
        elif category == 'complex':
            self.routing_stats['complex_queries'] += 1
        
        # Update rolling average
        total = self.routing_stats['total_queries']
        current_avg = self.routing_stats['avg_classification_time']
        self.routing_stats['avg_classification_time'] = (
            (current_avg * (total - 1) + classification_time) / total
        )
    
    def get_routing_stats(self) -> Dict[str, Any]:
        """Get comprehensive routing statistics"""
        total = self.routing_stats['total_queries']
        if total == 0:
            return self.routing_stats
        
        return {
            **self.routing_stats,
            'simple_percentage': self.routing_stats['simple_queries'] / total * 100,
            'complex_percentage': self.routing_stats['complex_queries'] / total * 100,
            'avg_classification_time_ms': self.routing_stats['avg_classification_time'] * 1000
        }
    
    def update_classification_feedback(self, query_id: str, actual_category: str, predicted_category: str):
        """Update classification accuracy based on feedback"""
        # In production, this would update a feedback database
        # For now, just log the feedback
        is_correct = actual_category == predicted_category
        logger.info(f"Classification feedback - Query: {query_id}, "
                   f"Predicted: {predicted_category}, Actual: {actual_category}, "
                   f"Correct: {is_correct}")


# Global instance for easy importing
query_router = QueryRouter()