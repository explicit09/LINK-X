"""
Content generation service for outlines, examples, and summaries
"""

import json
from typing import Dict, List, Optional
from core.cache import cache
from core.exceptions import ExternalServiceError
from ..base import BaseContentGenerator


class ContentGenerator(BaseContentGenerator):
    """Service for generating educational content"""
    
    def __init__(self, client):
        super().__init__(client)
    
    def generate(self, content: str, **kwargs) -> Dict:
        """Generate content based on input - required abstract method implementation"""
        # Default implementation - generate outline
        return self.generate_outline(content)
    
    def generate_outline(self, content: str) -> Dict:
        """Generate document outline from content"""
        try:
            # Check cache
            cache_key = f"outline:{hash(content)}"
            cached = cache.get(cache_key)
            if cached:
                return cached
            
            prompt = f"""
            Analyze the following educational content and create a structured outline.
            Focus on the main topics, subtopics, and key concepts.
            
            Content:
            {content[:3000]}  # Limit content for API efficiency
            
            Return the outline as a JSON object with this structure:
            {{
                "title": "Main topic",
                "sections": [
                    {{
                        "title": "Section title",
                        "subsections": [
                            {{
                                "title": "Subsection title",
                                "key_points": ["point1", "point2"]
                            }}
                        ]
                    }}
                ]
            }}
            """
            
            response = self.client.create_chat_completion(
                model=self.client.default_model,
                messages=[
                    {"role": "system", "content": "You are an expert educational content analyzer. Create clear, logical outlines."},
                    {"role": "user", "content": prompt}
                ],
                temperature=0.3,
                response_format={"type": "json_object"}
            )
            
            result = json.loads(response.choices[0].message.content)
            
            # Cache for 1 hour
            cache.set(cache_key, result, timeout=3600)
            
            return result
            
        except Exception as e:
            raise ExternalServiceError(f"Failed to generate outline: {str(e)}")
    
    def generate_examples(self, content: str, student_profile: Optional[Dict] = None) -> List[Dict]:
        """Generate relevant examples for content"""
        try:
            # Check cache
            profile_key = str(hash(str(student_profile))) if student_profile else "default"
            cache_key = f"examples:{hash(content)}:{profile_key}"
            cached = cache.get(cache_key)
            if cached:
                return cached
            
            # Build personalized prompt
            base_prompt = f"""
            Generate 3-5 relevant examples that help explain the following content.
            Make examples practical, relatable, and diverse.
            
            Content:
            {content[:2000]}
            """
            
            if student_profile:
                interests = student_profile.get('interests', [])
                level = student_profile.get('level', 'intermediate')
                base_prompt += f"\n\nPersonalize examples for: Level: {level}, Interests: {', '.join(interests)}"
            
            base_prompt += """
            
            Return examples as JSON:
            {
                "examples": [
                    {
                        "title": "Example title",
                        "description": "Clear explanation",
                        "scenario": "Real-world application",
                        "difficulty": "beginner|intermediate|advanced"
                    }
                ]
            }
            """
            
            response = self.client.create_chat_completion(
                model=self.client.default_model,
                messages=[
                    {"role": "system", "content": "You are an educational content expert who creates engaging examples."},
                    {"role": "user", "content": base_prompt}
                ],
                temperature=0.6,
                response_format={"type": "json_object"}
            )
            
            result = json.loads(response.choices[0].message.content)
            examples = result.get("examples", [])
            
            # Cache for 30 minutes
            cache.set(cache_key, examples, timeout=1800)
            
            return examples
            
        except Exception as e:
            # Return fallback examples on error
            return [{
                "title": "Concept Application",
                "description": "This concept can be applied in various real-world scenarios.",
                "scenario": "Consider how this applies to everyday situations.",
                "difficulty": "intermediate"
            }]
    
    def generate_brief_summary(self, content: str) -> List[Dict]:
        """Generate brief bullet-point summary"""
        return self._generate_summary(content, summary_type="brief")
    
    def generate_detailed_summary(self, content: str) -> List[Dict]:
        """Generate detailed summary with explanations"""
        return self._generate_summary(content, summary_type="detailed")
    
    def generate_key_points(self, content: str) -> List[Dict]:
        """Generate key learning points"""
        return self._generate_summary(content, summary_type="key_points")
    
    def _generate_summary(self, content: str, summary_type: str) -> List[Dict]:
        """Internal method to generate different types of summaries"""
        try:
            # Check cache
            cache_key = f"summary:{summary_type}:{hash(content)}"
            cached = cache.get(cache_key)
            if cached:
                return cached
            
            prompts = {
                "brief": "Create a brief, bullet-point summary of the key concepts.",
                "detailed": "Create a detailed summary with explanations and context.",
                "key_points": "Extract the most important learning points and takeaways."
            }
            
            prompt = f"""
            {prompts.get(summary_type, prompts['brief'])}
            
            Content:
            {content[:2500]}
            
            Return as JSON:
            {{
                "summary": [
                    {{
                        "point": "Main point",
                        "explanation": "Detailed explanation",
                        "importance": "high|medium|low"
                    }}
                ]
            }}
            """
            
            response = self.client.create_chat_completion(
                model=self.client.default_model,
                messages=[
                    {"role": "system", "content": f"You are an expert at creating {summary_type} summaries for educational content."},
                    {"role": "user", "content": prompt}
                ],
                temperature=0.4,
                response_format={"type": "json_object"}
            )
            
            result = json.loads(response.choices[0].message.content)
            summary_points = result.get("summary", [])
            
            # Cache for 45 minutes
            cache.set(cache_key, summary_points, timeout=2700)
            
            return summary_points
            
        except Exception as e:
            # Return fallback summary
            return [{
                "point": "Content Summary",
                "explanation": "This content covers important concepts for your learning.",
                "importance": "medium"
            }]
    
    def split_into_sections(self, content: str) -> List[str]:
        """Split long content into logical sections"""
        try:
            # Simple implementation - can be enhanced with AI
            paragraphs = content.split('\n\n')
            sections = []
            current_section = ""
            
            for paragraph in paragraphs:
                if len(current_section) + len(paragraph) > 1000:
                    if current_section:
                        sections.append(current_section.strip())
                    current_section = paragraph
                else:
                    current_section += "\n\n" + paragraph if current_section else paragraph
            
            if current_section:
                sections.append(current_section.strip())
            
            return sections
            
        except Exception:
            # Fallback: simple character-based splitting
            return [content[i:i+1000] for i in range(0, len(content), 1000)]