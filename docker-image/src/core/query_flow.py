"""
Unified Query Flow - Main entry point for the new AI system
Integrates PromptManager, CriticLoop, and OptimizedRAG
"""

import logging
import json
from typing import Dict, Any, Optional, List
from dataclasses import dataclass
from sqlalchemy.orm import Session

from .prompt_manager import prompt_manager
from .critic_loop import critic_loop, ExecutionResult
from .query_router import query_router
from .fast_path_processor import fast_path_processor
from services.ai.utils.optimized_rag import optimized_rag
from db.database import SessionLocal

logger = logging.getLogger(__name__)


@dataclass
class QueryResponse:
    """Complete response from query processing"""
    answer: str
    sources: List[str]
    confidence: float
    learning_notes: str
    metadata: Dict[str, Any]
    execution_time: float
    critic_score: float
    retry_count: int
    token_count: int


class QueryFlow:
    """
    Main query processing pipeline
    
    Flow:
    1. Route query (simple vs complex) - TODO: Add routing logic
    2. Retrieve relevant context with optimized RAG  
    3. Execute with personalized prompt
    4. Apply critic loop for quality assurance
    5. Return structured response
    """
    
    def __init__(self):
        self.router_enabled = False  # Will enable in Phase 2
    
    def process_query(
        self,
        question: str,
        student_profile: Optional[Dict[str, Any]] = None,
        course_id: Optional[str] = None,
        file_id: Optional[str] = None,
        db_session: Optional[Session] = None
    ) -> QueryResponse:
        """
        Process user query through the complete pipeline
        
        Args:
            question: User's question or request
            student_profile: Student's learning profile and preferences
            course_id: Optional course context filter
            file_id: Optional file context filter
            db_session: Database session (creates one if not provided)
            
        Returns:
            QueryResponse with answer and metadata
        """
        import time
        start_time = time.time()
        
        # Use provided session or create new one
        if db_session is None:
            db_session = SessionLocal()
            should_close = True
        else:
            should_close = False
        
        try:
            # Step 1: Route query intelligently
            routing_decision = query_router.route_query(
                query=question,
                context={'course_id': course_id, 'file_id': file_id},
                student_profile=student_profile
            )
            
            logger.info(f"Query routed as '{routing_decision.category}' "
                       f"(confidence: {routing_decision.confidence:.3f})")
            
            if routing_decision.category == "complex":
                # TODO: Implement complex query handling with micro-agents
                logger.info(f"Complex query detected: {routing_decision.reasoning}")
                # Fall back to simple workflow for now but log for analysis
            
            # Step 2: Retrieve context with optimized RAG
            retrieval_result = optimized_rag.retrieve_optimized(
                query=question,
                db_session=db_session,
                course_id=course_id,
                file_id=file_id,
                user_profile=student_profile
            )
            
            # Step 3: Prepare context for prompt
            context_chunks = optimized_rag.format_context_for_prompt(retrieval_result.chunks)
            
            # Step 4: Build student profile with defaults
            profile = self._build_student_profile(student_profile)
            
            # Step 5: Choose processing path based on routing decision
            if routing_decision.category == "simple" and routing_decision.confidence > 0.8:
                # Use fast path for simple, high-confidence queries
                logger.info("Using fast path processing")
                
                fast_result = fast_path_processor.process_simple_query(
                    question=question,
                    context_chunks=context_chunks.split('\n\n') if context_chunks else [],
                    student_profile=profile
                )
                
                # Convert fast path result to standard format
                response_data = {
                    "answer": fast_result.answer,
                    "sources": fast_result.sources,
                    "confidence": fast_result.confidence,
                    "learning_notes": f"Optimized for {profile.get('learning_style', 'general')} learning style"
                }
                
                execution_result = type('FastExecutionResult', (), {
                    'answer': fast_result.answer,
                    'final_score': fast_result.critic_score,
                    'retry_count': 0,
                    'execution_time': fast_result.processing_time
                })()
                
            else:
                # Use full processing path with critic loop
                logger.info("Using full processing path with critic loop")
                
                # Render personalized prompt
                prompt = prompt_manager.render_with_system(
                    executor_name="executors/02_executor.jinja",
                    question=question,
                    context=context_chunks.split('\n\n') if context_chunks else [],
                    student_profile=profile
                )
                
                # Execute with critic loop
                execution_result = critic_loop.execute_with_critic(
                    executor_prompt=prompt,
                    context={"content": context_chunks, "chunks": retrieval_result.chunks},
                    question=question,
                    student_profile=profile
                )
                
                # Parse response data
                response_data = self._parse_llm_response(execution_result.answer)
            
            # Step 6: Parse response if not already done in fast path
            if 'response_data' not in locals():
                response_data = self._parse_llm_response(execution_result.answer)
            
            # Step 8: Build final response
            total_time = time.time() - start_time
            
            return QueryResponse(
                answer=response_data.get("answer", execution_result.answer),
                sources=response_data.get("sources", []),
                confidence=response_data.get("confidence", execution_result.final_score),
                learning_notes=response_data.get("learning_notes", ""),
                metadata={
                    "query_type": routing_decision.category,
                    "routing_confidence": routing_decision.confidence,
                    "routing_reasoning": routing_decision.reasoning,
                    "processing_path": "fast_path" if routing_decision.category == "simple" and routing_decision.confidence > 0.8 else "full_path",
                    "chunks_retrieved": len(retrieval_result.chunks),
                    "retrieval_time": retrieval_result.retrieval_time,
                    "similarity_scores": retrieval_result.similarity_scores,
                    "estimated_complexity": routing_decision.estimated_complexity,
                    "critic_issues": getattr(execution_result, 'critic_result', type('obj', (object,), {'issues': []})).issues
                },
                execution_time=total_time,
                critic_score=execution_result.final_score,
                retry_count=execution_result.retry_count,
                token_count=retrieval_result.total_tokens
            )
        
        finally:
            if should_close:
                db_session.close()
    
    
    def _build_student_profile(self, student_profile: Optional[Dict[str, Any]]) -> Dict[str, Any]:
        """Build complete student profile with defaults"""
        if not student_profile:
            student_profile = {}
        
        return {
            "learning_style": student_profile.get("learning_style", "visual"),
            "expertise_level": student_profile.get("expertise_level", "intermediate"),
            "tone_preference": student_profile.get("tone_preference", "casual"),
            "interests": student_profile.get("interests", []),
            "profession": student_profile.get("profession", ""),
            "goals": student_profile.get("goals", [])
        }
    
    def _parse_llm_response(self, response: str) -> Dict[str, Any]:
        """Parse LLM response, handling both JSON and plain text"""
        try:
            # Try to parse as JSON first
            if response.strip().startswith('{'):
                return json.loads(response)
            
            # If not JSON, look for JSON within the response
            import re
            json_match = re.search(r'\{.*\}', response, re.DOTALL)
            if json_match:
                return json.loads(json_match.group())
            
            # Fallback: treat as plain text answer
            return {
                "answer": response,
                "sources": [],
                "confidence": 0.8,
                "learning_notes": "Plain text response"
            }
        
        except json.JSONDecodeError:
            logger.warning(f"Failed to parse LLM response as JSON: {response[:100]}...")
            return {
                "answer": response,
                "sources": [],
                "confidence": 0.7,
                "learning_notes": "JSON parsing failed"
            }
    
    def get_system_stats(self) -> Dict[str, Any]:
        """Get comprehensive system statistics"""
        return {
            "prompt_manager": prompt_manager.get_stats(),
            "optimized_rag": optimized_rag.get_retrieval_stats(),
            "critic_loop": {
                "score_threshold": critic_loop.score_threshold,
                "max_retries": critic_loop.max_retries
            },
            "query_router": query_router.get_routing_stats(),
            "fast_path_processor": fast_path_processor.get_performance_stats(),
            "routing_enabled": True,
            "fast_path_enabled": True
        }


# Global instance for easy importing
query_flow = QueryFlow()


# Backward compatibility function to replace existing prompts
def safe_answer(question: str, student_profile: Optional[Dict[str, Any]] = None, 
               course_id: Optional[str] = None) -> str:
    """
    Backward compatibility wrapper for existing code
    
    This function can be used to gradually replace existing prompt functions
    """
    try:
        response = query_flow.process_query(
            question=question,
            student_profile=student_profile,
            course_id=course_id
        )
        return response.answer
    except Exception as e:
        logger.error(f"Query flow failed: {e}")
        return f"I apologize, but I encountered an error processing your question: {str(e)}"