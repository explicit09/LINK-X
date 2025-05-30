"""
Content personalization utilities
"""

import json
from typing import Dict, Optional
from core.cache import cache


class PersonalizationService:
    """Service for personalizing content based on user profiles"""
    
    def __init__(self, client):
        self.client = client
    
    def personalize_content(self, content: str, profile: Optional[Dict] = None, 
                          style: str = 'adaptive') -> Dict:
        """Personalize content based on user profile"""
        try:
            # Check cache
            profile_key = str(hash(str(profile))) if profile else "default"
            cache_key = f"personalize:{style}:{hash(content)}:{profile_key}"
            cached = cache.get(cache_key)
            if cached:
                return cached
            
            # Build personalization prompt
            prompt = self._build_personalization_prompt(content, profile, style)
            
            response = self.client.create_chat_completion(
                model=self.client.default_model,
                messages=[
                    {"role": "system", "content": "You are a personalized learning assistant."},
                    {"role": "user", "content": prompt}
                ],
                temperature=0.6,
                response_format={"type": "json_object"}
            )
            
            result = json.loads(response.choices[0].message.content)
            
            # Cache for 30 minutes
            cache.set(cache_key, result, timeout=1800)
            
            return result
            
        except Exception:
            # Return original content on error
            return {
                "content": content,
                "additions": [],
                "style": "original"
            }
    
    def _build_personalization_prompt(self, content: str, profile: Optional[Dict], style: str) -> str:
        """Build personalization prompt based on profile and style"""
        base_prompt = f"""
        Personalize the following educational content for the learner.
        
        Original Content:
        {content[:2000]}
        
        Personalization Style: {style}
        """
        
        if profile:
            learning_style = profile.get('learning_style', 'visual')
            interests = profile.get('interests', [])
            level = profile.get('level', 'intermediate')
            background = profile.get('background', 'general')
            
            base_prompt += f"""
            
            Learner Profile:
            - Learning Style: {learning_style}
            - Interests: {', '.join(interests)}
            - Level: {level}
            - Background: {background}
            
            Adapt the content to:
            1. Match their learning style ({learning_style})
            2. Include examples from their interests
            3. Use appropriate complexity for their level
            4. Consider their background knowledge
            """
        
        if style == 'adaptive':
            base_prompt += """
            
            Make the content more engaging by:
            - Adding relevant examples and analogies
            - Providing different explanations for different learning styles
            - Including practical applications
            - Suggesting interactive elements
            """
        elif style == 'simplified':
            base_prompt += """
            
            Simplify the content by:
            - Using clearer language
            - Breaking down complex concepts
            - Adding step-by-step explanations
            - Providing more context
            """
        elif style == 'detailed':
            base_prompt += """
            
            Enhance the content by:
            - Adding deeper explanations
            - Including advanced concepts
            - Providing additional context
            - Suggesting further reading
            """
        
        base_prompt += """
        
        Return the result as JSON:
        {
            "content": "Personalized version of the content",
            "additions": [
                {
                    "type": "example|analogy|exercise|tip",
                    "content": "Additional content",
                    "reason": "Why this was added"
                }
            ],
            "style": "Personalization style applied",
            "difficulty_level": "beginner|intermediate|advanced",
            "learning_objectives": ["objective1", "objective2"]
        }
        """
        
        return base_prompt
    
    def generate_learning_path(self, profile: Dict, topic: str) -> Dict:
        """Generate personalized learning path"""
        try:
            cache_key = f"learning_path:{hash(str(profile))}:{hash(topic)}"
            cached = cache.get(cache_key)
            if cached:
                return cached
            
            prompt = f"""
            Create a personalized learning path for the topic: {topic}
            
            Learner Profile:
            - Level: {profile.get('level', 'intermediate')}
            - Learning Style: {profile.get('learning_style', 'visual')}
            - Interests: {', '.join(profile.get('interests', []))}
            - Goals: {', '.join(profile.get('goals', []))}
            
            Return as JSON:
            {{
                "path": [
                    {{
                        "step": 1,
                        "title": "Step title",
                        "description": "What to learn",
                        "activities": ["activity1", "activity2"],
                        "estimated_time": "30 minutes",
                        "difficulty": "beginner|intermediate|advanced"
                    }}
                ],
                "total_estimated_time": "2 hours",
                "prerequisites": ["prerequisite1"],
                "next_topics": ["advanced_topic1"]
            }}
            """
            
            response = self.client.create_chat_completion(
                model=self.client.default_model,
                messages=[
                    {"role": "system", "content": "You are an expert learning path designer."},
                    {"role": "user", "content": prompt}
                ],
                temperature=0.5,
                response_format={"type": "json_object"}
            )
            
            result = json.loads(response.choices[0].message.content)
            
            # Cache for 2 hours
            cache.set(cache_key, result, timeout=7200)
            
            return result
            
        except Exception:
            # Return basic learning path
            return {
                "path": [
                    {
                        "step": 1,
                        "title": f"Introduction to {topic}",
                        "description": f"Learn the basics of {topic}",
                        "activities": ["Read overview", "Watch introductory video"],
                        "estimated_time": "30 minutes",
                        "difficulty": "beginner"
                    }
                ],
                "total_estimated_time": "30 minutes",
                "prerequisites": [],
                "next_topics": []
            }