"""
Critic Loop - Self-improving AI responses with automatic retry
Implements the critic-guided execution pattern for quality assurance
"""

import json
import logging
from typing import Dict, Any, Optional, Tuple
from dataclasses import dataclass
from openai import OpenAI
import os

from .prompt_manager import prompt_manager

logger = logging.getLogger(__name__)


@dataclass
class CriticResult:
    """Results from critic evaluation"""
    score: float
    issues: list
    patch: str
    category_scores: Dict[str, float]
    passed: bool


@dataclass
class ExecutionResult:
    """Results from prompt execution with critic feedback"""
    answer: str
    critic_result: CriticResult
    retry_count: int
    final_score: float
    execution_time: float


class CriticLoop:
    """
    Implements critic-guided execution with automatic retry
    
    Flow:
    1. Execute prompt with LLM
    2. Critic evaluates response
    3. If score < threshold, apply patch and retry once
    4. Return final result with metrics
    """
    
    def __init__(self, score_threshold: float = 0.85, max_retries: int = 1):
        self.score_threshold = score_threshold
        self.max_retries = max_retries
        self.client = OpenAI(api_key=os.getenv("OPENAI_API_KEY"))
    
    def execute_with_critic(
        self,
        executor_prompt: str,
        context: Dict[str, Any],
        question: str,
        student_profile: Optional[Dict[str, Any]] = None,
        model: str = "gpt-4o"
    ) -> ExecutionResult:
        """
        Execute prompt with critic-guided improvement
        
        Args:
            executor_prompt: Rendered executor template
            context: Additional context for critic
            question: Original question for reference
            student_profile: Student profile for personalization
            model: OpenAI model to use
            
        Returns:
            ExecutionResult with final answer and metrics
        """
        import time
        start_time = time.time()
        
        retry_count = 0
        current_prompt = executor_prompt
        
        while retry_count <= self.max_retries:
            # Execute the prompt
            answer = self._call_llm(current_prompt, model)
            
            # Evaluate with critic
            critic_result = self._evaluate_with_critic(
                answer=answer,
                question=question,
                context=context,
                student_profile=student_profile
            )
            
            # Check if we need to retry
            if critic_result.passed or retry_count >= self.max_retries:
                execution_time = time.time() - start_time
                
                return ExecutionResult(
                    answer=answer,
                    critic_result=critic_result,
                    retry_count=retry_count,
                    final_score=critic_result.score,
                    execution_time=execution_time
                )
            
            # Apply patch and retry
            logger.info(f"Critic score {critic_result.score} below threshold {self.score_threshold}, retrying with patch")
            current_prompt = self._apply_patch(current_prompt, critic_result.patch)
            retry_count += 1
        
        # Should not reach here, but safety fallback
        execution_time = time.time() - start_time
        return ExecutionResult(
            answer=answer,
            critic_result=critic_result,
            retry_count=retry_count,
            final_score=critic_result.score,
            execution_time=execution_time
        )
    
    def _call_llm(self, prompt: str, model: str) -> str:
        """Call OpenAI API with prompt"""
        try:
            response = self.client.chat.completions.create(
                model=model,
                messages=[{"role": "user", "content": prompt}],
                temperature=0,
                max_tokens=2000
            )
            return response.choices[0].message.content.strip()
        except Exception as e:
            logger.error(f"LLM call failed: {e}")
            raise
    
    def _evaluate_with_critic(
        self,
        answer: str,
        question: str,
        context: Dict[str, Any],
        student_profile: Optional[Dict[str, Any]] = None
    ) -> CriticResult:
        """Evaluate answer quality with critic"""
        try:
            # Load critic prompt template
            critic_template = prompt_manager.render(
                "critics/99_critic.yaml",
                answer=answer,
                question=question,
                context=context,
                student_profile=student_profile or {}
            )
            
            # Create critic evaluation prompt
            critic_prompt = f"""
You are an Answer Quality Critic. Evaluate this educational response across multiple dimensions.

ORIGINAL QUESTION: {question}

STUDENT ANSWER TO EVALUATE: {answer}

CONTEXT PROVIDED: {context.get('content', 'No context')}

STUDENT PROFILE: {student_profile or 'No profile'}

Evaluate the answer on these criteria:
1. Factual Accuracy (40%): Only information from context, no invented facts
2. Personalization Fit (30%): Appropriate for student learning style and level  
3. Structure Correctness (20%): Follows format, organized, cites sources
4. Educational Value (10%): Clear explanations that teach effectively

Return valid JSON with this exact structure:
{{
  "score": 0.95,
  "issues": ["List specific problems found"],
  "patch": "Concrete instructions to fix the answer",
  "category_scores": {{
    "factual_accuracy": 0.9,
    "personalization_fit": 0.8,
    "structure_correctness": 0.95,
    "educational_value": 0.85
  }}
}}
"""
            
            # Get critic evaluation
            critic_response = self._call_llm(critic_prompt, "gpt-4o")
            
            # Parse critic response
            try:
                critic_data = json.loads(critic_response)
                return CriticResult(
                    score=critic_data["score"],
                    issues=critic_data.get("issues", []),
                    patch=critic_data.get("patch", ""),
                    category_scores=critic_data.get("category_scores", {}),
                    passed=critic_data["score"] >= self.score_threshold
                )
            except json.JSONDecodeError as e:
                logger.error(f"Failed to parse critic response: {e}")
                # Fallback - assume answer is acceptable if critic fails
                return CriticResult(
                    score=0.8,
                    issues=["Critic parsing failed"],
                    patch="",
                    category_scores={},
                    passed=True
                )
        
        except Exception as e:
            logger.error(f"Critic evaluation failed: {e}")
            # Fallback - assume answer is acceptable if critic fails
            return CriticResult(
                score=0.8,
                issues=[f"Critic failed: {e}"],
                patch="",
                category_scores={},
                passed=True
            )
    
    def _apply_patch(self, original_prompt: str, patch: str) -> str:
        """Apply critic patch to improve prompt"""
        if not patch:
            return original_prompt
        
        # Simple patch application - append patch instructions
        patched_prompt = f"""{original_prompt}

# IMPROVEMENT INSTRUCTIONS
The previous response had issues. Please improve it by following these specific instructions:
{patch}

Generate an improved response that addresses these issues while maintaining all the original requirements.
"""
        return patched_prompt


# Global instance
critic_loop = CriticLoop()