"""
Quiz generation service
"""

import json
from typing import Dict, List
from core.cache import cache
from core.exceptions import ExternalServiceError
from ..base import BaseContentGenerator


class QuizGenerator(BaseContentGenerator):
    """Service for generating educational quizzes"""
    
    def __init__(self, client):
        super().__init__(client)
    
    def generate_quiz(self, content: str, difficulty: str = 'medium', count: int = 5) -> List[Dict]:
        """Generate quiz questions from content"""
        try:
            # Check cache
            cache_key = f"quiz:{difficulty}:{count}:{hash(content)}"
            cached = cache.get(cache_key)
            if cached:
                return cached
            
            difficulty_prompts = {
                'easy': 'Create simple questions focusing on basic concepts and definitions.',
                'medium': 'Create questions that test understanding and application of concepts.',
                'hard': 'Create challenging questions requiring analysis and synthesis.'
            }
            
            prompt = f"""
            Generate {count} multiple-choice quiz questions from the following content.
            {difficulty_prompts.get(difficulty, difficulty_prompts['medium'])}
            
            Content:
            {content[:2500]}
            
            Return as JSON:
            {{
                "questions": [
                    {{
                        "question": "Question text",
                        "options": ["A) Option 1", "B) Option 2", "C) Option 3", "D) Option 4"],
                        "correct_answer": "A",
                        "explanation": "Why this answer is correct",
                        "difficulty": "{difficulty}",
                        "topic": "Main topic this question covers"
                    }}
                ]
            }}
            
            Ensure questions are:
            - Clear and unambiguous
            - Have one clearly correct answer
            - Include plausible distractors
            - Cover different aspects of the content
            """
            
            response = self.client.create_chat_completion(
                model=self.client.default_model,
                messages=[
                    {"role": "system", "content": "You are an expert educational assessment creator. Generate high-quality quiz questions."},
                    {"role": "user", "content": prompt}
                ],
                temperature=0.5,
                response_format={"type": "json_object"}
            )
            
            result = json.loads(response.choices[0].message.content)
            questions = result.get("questions", [])
            
            # Validate and clean questions
            validated_questions = []
            for q in questions:
                if self._validate_question(q):
                    validated_questions.append(q)
            
            # Cache for 1 hour
            cache.set(cache_key, validated_questions, timeout=3600)
            
            return validated_questions
            
        except Exception as e:
            raise ExternalServiceError(f"Failed to generate quiz: {str(e)}")
    
    def _validate_question(self, question: Dict) -> bool:
        """Validate question structure"""
        required_fields = ['question', 'options', 'correct_answer', 'explanation']
        
        # Check required fields
        for field in required_fields:
            if field not in question:
                return False
        
        # Validate options
        options = question.get('options', [])
        if len(options) < 2:
            return False
        
        # Validate correct answer
        correct = question.get('correct_answer', '')
        if not correct or len(correct) != 1:
            return False
        
        # Check if correct answer exists in options
        correct_letter = correct.upper()
        valid_letters = [chr(65 + i) for i in range(len(options))]  # A, B, C, D...
        
        if correct_letter not in valid_letters:
            return False
        
        return True
    
    def generate_adaptive_quiz(self, content: str, student_performance: Dict, count: int = 5) -> List[Dict]:
        """Generate quiz adapted to student's performance level"""
        try:
            # Determine difficulty based on performance
            accuracy = student_performance.get('accuracy', 0.5)
            recent_scores = student_performance.get('recent_scores', [])
            
            if accuracy >= 0.8 or (recent_scores and sum(recent_scores[-3:]) / len(recent_scores[-3:]) >= 0.8):
                difficulty = 'hard'
            elif accuracy >= 0.6:
                difficulty = 'medium'
            else:
                difficulty = 'easy'
            
            # Generate questions with determined difficulty
            questions = self.generate_quiz(content, difficulty, count)
            
            # Add performance tracking metadata
            for question in questions:
                question['adaptive_level'] = difficulty
                question['student_accuracy'] = accuracy
            
            return questions
            
        except Exception as e:
            # Fallback to medium difficulty
            return self.generate_quiz(content, 'medium', count)