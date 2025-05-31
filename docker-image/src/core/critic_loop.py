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
            
            # Create critic evaluation prompt with strict JSON formatting
            critic_prompt = f"""You are an Answer Quality Critic. Evaluate this educational response and return ONLY valid JSON.

QUESTION: {question}
ANSWER: {answer}
CONTEXT: {context.get('content', 'No context')}
STUDENT: {student_profile or 'No profile'}

Evaluate on these criteria (weights in parentheses):
1. Factual Accuracy (40%): Only uses provided context, no invented facts
2. Personalization Fit (30%): Matches student learning style and level
3. Structure Quality (20%): Well-organized, cites sources, follows format
4. Educational Value (10%): Clear explanations that effectively teach

CRITICAL: Return ONLY the JSON object below. NO markdown, NO code blocks, NO additional text.

{{
  "score": 0.95,
  "issues": ["List any specific problems found"],
  "patch": "Concrete instructions to improve the answer if score < 0.85",
  "category_scores": {{
    "factual_accuracy": 0.95,
    "personalization_fit": 0.90,
    "structure_correctness": 0.95,
    "educational_value": 0.90
  }}
}}"""
            
            # Get critic evaluation
            critic_response = self._call_llm(critic_prompt, "gpt-4o")
            
            # Parse critic response with robust error handling
            try:
                # Clean the response first
                cleaned_response = self._clean_critic_response(critic_response)
                critic_data = json.loads(cleaned_response)
                
                return CriticResult(
                    score=float(critic_data["score"]),
                    issues=critic_data.get("issues", []),
                    patch=critic_data.get("patch", ""),
                    category_scores=critic_data.get("category_scores", {}),
                    passed=float(critic_data["score"]) >= self.score_threshold
                )
            except (json.JSONDecodeError, KeyError, ValueError) as e:
                logger.error(f"Failed to parse critic response: {e}")
                logger.debug(f"Raw critic response: {critic_response}")
                
                # Try to extract score manually as fallback
                fallback_score = self._extract_score_fallback(critic_response)
                
                return CriticResult(
                    score=fallback_score,
                    issues=["Critic parsing failed - using fallback score"],
                    patch="Consider simplifying the answer structure",
                    category_scores={},
                    passed=fallback_score >= self.score_threshold
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
    
    def _clean_critic_response(self, response: str) -> str:
        """Clean critic response to extract valid JSON"""
        # Remove markdown code blocks
        if '```' in response:
            parts = response.split('```')
            for part in parts:
                if part.strip().startswith('json'):
                    return part[4:].strip()
                elif part.strip().startswith('{'):
                    return part.strip()
        
        # Find JSON object in response
        import re
        json_match = re.search(r'\{.*\}', response, re.DOTALL)
        if json_match:
            return json_match.group().strip()
        
        return response.strip()
    
    def _extract_score_fallback(self, response: str) -> float:
        """Extract score using regex as fallback"""
        import re
        
        # Look for score patterns
        score_patterns = [
            r'"score":\s*([0-9]*\.?[0-9]+)',
            r'score.*?([0-9]*\.?[0-9]+)',
            r'([0-9]*\.?[0-9]+).*score'
        ]
        
        for pattern in score_patterns:
            match = re.search(pattern, response, re.IGNORECASE)
            if match:
                try:
                    score = float(match.group(1))
                    if 0.0 <= score <= 1.0:
                        return score
                except ValueError:
                    continue
        
        # If no score found, return default based on response sentiment
        if any(word in response.lower() for word in ['excellent', 'great', 'good', 'clear']):
            return 0.85
        elif any(word in response.lower() for word in ['poor', 'bad', 'unclear', 'incorrect']):
            return 0.6
        else:
            return 0.8  # Neutral fallback


# Global instance
critic_loop = CriticLoop()