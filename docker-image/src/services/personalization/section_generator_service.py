"""
Section Generator Service
Generates structured educational sections (intro, concepts, examples, practice, summary)
"""

import logging
from typing import Dict, Any, Optional, List
from dataclasses import dataclass
from datetime import datetime
import json

from core.prompt_manager import prompt_manager
from services.ai.ai_service import AIService
from services.personalization.personalization_utils import PersonalizationUtils

logger = logging.getLogger(__name__)


@dataclass
class SectionTemplate:
    """Template for generating sections"""
    section_type: str
    template_name: str
    word_limit: int
    tone: str
    required_elements: List[str]
    quality_criteria: Dict[str, float]


class SectionGeneratorService:
    """
    Service for generating structured educational sections
    """
    
    def __init__(self, ai_service: Optional[AIService] = None):
        self.ai_service = ai_service or AIService()
        self.utils = PersonalizationUtils()
        self.templates = self._initialize_templates()
        
    def _initialize_templates(self) -> Dict[str, SectionTemplate]:
        """
        Initialize section templates with requirements
        """
        return {
            'intro': SectionTemplate(
                section_type='intro',
                template_name='structured_learning_intro',
                word_limit=250,
                tone='engaging',
                required_elements=[
                    'hook',
                    'relevance_statement',
                    'learning_objectives',
                    'personal_connection'
                ],
                quality_criteria={
                    'engagement': 0.9,
                    'clarity': 0.85,
                    'personalization': 0.9
                }
            ),
            'concepts': SectionTemplate(
                section_type='concepts',
                template_name='structured_learning_concepts',
                word_limit=800,
                tone='educational',
                required_elements=[
                    'clear_definitions',
                    'logical_progression',
                    'visual_descriptions',
                    'connections_to_prior_knowledge'
                ],
                quality_criteria={
                    'accuracy': 0.95,
                    'depth': 0.85,
                    'clarity': 0.9
                }
            ),
            'examples': SectionTemplate(
                section_type='examples',
                template_name='structured_learning_examples',
                word_limit=600,
                tone='practical',
                required_elements=[
                    'real_world_applications',
                    'progressive_difficulty',
                    'personalized_scenarios',
                    'visual_aids'
                ],
                quality_criteria={
                    'relevance': 0.95,
                    'diversity': 0.8,
                    'personalization': 0.9
                }
            ),
            'practice': SectionTemplate(
                section_type='practice',
                template_name='structured_learning_practice',
                word_limit=500,
                tone='encouraging',
                required_elements=[
                    'clear_instructions',
                    'varied_question_types',
                    'self_check_answers',
                    'difficulty_progression'
                ],
                quality_criteria={
                    'coverage': 0.85,
                    'clarity': 0.9,
                    'challenge': 0.8
                }
            ),
            'summary': SectionTemplate(
                section_type='summary',
                template_name='structured_learning_summary',
                word_limit=300,
                tone='reinforcing',
                required_elements=[
                    'key_takeaways',
                    'concept_connections',
                    'next_steps',
                    'personal_reflection'
                ],
                quality_criteria={
                    'completeness': 0.9,
                    'memorability': 0.85,
                    'actionability': 0.85
                }
            )
        }
    
    async def generate_section(self, 
                             section_type: str,
                             topic: Dict[str, Any],
                             user_profile: Dict[str, Any],
                             context: Dict[str, Any]) -> Dict[str, Any]:
        """
        Generate a structured section for a topic
        """
        if section_type not in self.templates:
            raise ValueError(f"Unknown section type: {section_type}")
        
        template = self.templates[section_type]
        
        # Prepare generation context
        generation_context = self._prepare_context(
            template=template,
            topic=topic,
            user_profile=user_profile,
            additional_context=context
        )
        
        # Generate section content
        content = await self._generate_content(template, generation_context)
        
        # Post-process and validate
        processed_content = self._post_process(content, template, generation_context)
        
        # Calculate quality metrics
        quality_metrics = self._calculate_quality_metrics(processed_content, template)
        
        return {
            'content': processed_content,
            'metadata': {
                'section_type': section_type,
                'topic_id': topic.get('id'),
                'generated_at': datetime.now().isoformat(),
                'word_count': len(processed_content.split()),
                'template_used': template.template_name
            },
            'quality_metrics': quality_metrics,
            'generation_params': {
                'model': 'gpt-4',
                'temperature': self._get_temperature(section_type),
                'max_tokens': template.word_limit * 2  # Allow some flexibility
            }
        }
    
    def _prepare_context(self, template: SectionTemplate, topic: Dict,
                        user_profile: Dict, additional_context: Dict) -> Dict:
        """
        Prepare comprehensive context for section generation
        """
        # Normalize user profile
        normalized_profile = self.utils.normalize_user_profile(user_profile)
        
        # Select primary interest for personalization
        primary_interest = self.utils.select_primary_interest(
            topic.get('description', ''), 
            normalized_profile.get('interests', [])
        )
        
        # Generate immediate hook for intro sections
        hook = ""
        if template.section_type == 'intro':
            hook = self.utils.generate_immediate_hook(
                primary_interest,
                topic.get('title', '')
            )
        
        context = {
            'topic': {
                'title': topic.get('title', ''),
                'description': topic.get('description', ''),
                'key_concepts': topic.get('key_concepts', []),
                'difficulty_level': topic.get('difficulty_level', 'intermediate'),
                'importance': topic.get('importance_score', 0.8)
            },
            'user': {
                'learning_style': normalized_profile.get('learning_style', 'visual'),
                'expertise_level': normalized_profile.get('expertise_level', 'intermediate'),
                'interests': normalized_profile.get('interests', []),
                'profession': normalized_profile.get('profession', ''),
                'tone_preference': normalized_profile.get('tone_preference', 'professional'),
                'primary_interest': primary_interest
            },
            'section': {
                'type': template.section_type,
                'tone': template.tone,
                'word_limit': template.word_limit,
                'required_elements': template.required_elements,
                'hook': hook
            },
            'document': additional_context
        }
        
        return context
    
    async def _generate_content(self, template: SectionTemplate, 
                              context: Dict) -> str:
        """
        Generate section content using AI
        """
        # Try to load from prompt templates first
        try:
            prompt = prompt_manager.get_prompt(
                template.template_name,
                **context
            )
        except:
            # Fallback to dynamic prompt generation
            prompt = self._create_dynamic_prompt(template, context)
        
        # Generate content
        response = await self.ai_service.generate_response(
            prompt=prompt,
            max_tokens=template.word_limit * 2,
            temperature=self._get_temperature(template.section_type)
        )
        
        return response.get('content', '')
    
    def _create_dynamic_prompt(self, template: SectionTemplate, 
                             context: Dict) -> str:
        """
        Create a dynamic prompt for section generation
        """
        topic = context['topic']
        user = context['user']
        section = context['section']
        
        # Base prompt structure
        base_prompts = {
            'intro': f"""
Create an engaging introduction for "{topic['title']}" that:

1. Starts with: "{section.get('hook', 'Let us explore this topic')}"
2. Explains why this topic matters to someone interested in {user['primary_interest']}
3. Sets clear learning objectives
4. Uses a {section['tone']} tone
5. Is approximately {section['word_limit']} words

Consider the learner's:
- Learning style: {user['learning_style']}
- Expertise level: {user['expertise_level']} 
- Professional background: {user.get('profession', 'general')}

Topic details:
{topic['description']}

Key concepts to introduce: {', '.join(topic['key_concepts'][:3])}
""",
            
            'concepts': f"""
Explain the core concepts of "{topic['title']}" in a clear, structured way:

1. Define each key concept clearly
2. Use {user['learning_style']} learning approaches
3. Build progressively from simple to complex
4. Include visual descriptions or analogies
5. Connect to {user['primary_interest']} when possible

Target expertise level: {user['expertise_level']}
Key concepts to cover: {', '.join(topic['key_concepts'])}

Make it approximately {section['word_limit']} words with clear sections.
""",
            
            'examples': f"""
Provide practical examples for "{topic['title']}" that:

1. Directly illustrate the key concepts
2. Use scenarios related to {user['primary_interest']} and {user.get('profession', 'work')}
3. Progress from simple to complex
4. Include visual or concrete descriptions
5. Make abstract concepts tangible

Focus on these concepts: {', '.join(topic['key_concepts'][:3])}

Target {section['word_limit']} words with 2-3 detailed examples.
""",
            
            'practice': f"""
Create practice exercises for "{topic['title']}" that:

1. Test understanding of key concepts
2. Include varied question types (multiple choice, short answer, application)
3. Provide clear instructions
4. Include self-check answers or hints
5. Match {user['expertise_level']} level

Concepts to test: {', '.join(topic['key_concepts'])}

Create 3-5 practice items in approximately {section['word_limit']} words.
""",
            
            'summary': f"""
Summarize the key learning points for "{topic['title']}":

1. List 3-5 main takeaways
2. Show how concepts connect
3. Suggest next steps for continued learning
4. Include a personal reflection prompt
5. Make it memorable and actionable

Key concepts covered: {', '.join(topic['key_concepts'])}
Learning style: {user['learning_style']}

Keep it concise at approximately {section['word_limit']} words.
"""
        }
        
        return base_prompts.get(template.section_type, "Generate educational content.")
    
    def _post_process(self, content: str, template: SectionTemplate,
                     context: Dict) -> str:
        """
        Post-process generated content
        """
        # Clean up any formatting issues
        content = content.strip()
        
        # Ensure required elements are present
        missing_elements = self._check_required_elements(content, template)
        if missing_elements:
            logger.warning(f"Missing required elements in {template.section_type}: {missing_elements}")
        
        # Optimize for token budget if needed
        max_tokens = template.word_limit * 1.5  # Rough estimate
        content = self.utils.optimize_for_token_budget(
            content, 
            max_tokens,
            preserve_structure=True
        )
        
        # Add section-specific formatting
        content = self._apply_section_formatting(content, template)
        
        return content
    
    def _apply_section_formatting(self, content: str, 
                                template: SectionTemplate) -> str:
        """
        Apply section-specific formatting
        """
        if template.section_type == 'intro':
            # Ensure it starts engagingly
            if not content.startswith(('!', '?', '"', "'")):
                content = "🎯 " + content
        
        elif template.section_type == 'concepts':
            # Add structure markers if missing
            if '##' not in content and '\n\n' in content:
                # Add headers to major paragraphs
                paragraphs = content.split('\n\n')
                if len(paragraphs) > 2:
                    formatted = []
                    for i, para in enumerate(paragraphs):
                        if i > 0 and len(para) > 100:
                            # Extract first sentence as header
                            first_sentence = para.split('.')[0]
                            if len(first_sentence) < 50:
                                formatted.append(f"### {first_sentence}\n\n{para}")
                            else:
                                formatted.append(para)
                        else:
                            formatted.append(para)
                    content = '\n\n'.join(formatted)
        
        elif template.section_type == 'practice':
            # Ensure practice items are numbered
            lines = content.split('\n')
            formatted_lines = []
            question_num = 1
            
            for line in lines:
                if line.strip() and any(indicator in line.lower() for indicator in ['question', 'exercise', 'problem', 'task']):
                    formatted_lines.append(f"\n**{question_num}.** {line}")
                    question_num += 1
                else:
                    formatted_lines.append(line)
            
            content = '\n'.join(formatted_lines)
        
        return content
    
    def _check_required_elements(self, content: str, 
                               template: SectionTemplate) -> List[str]:
        """
        Check if required elements are present in content
        """
        missing = []
        content_lower = content.lower()
        
        element_indicators = {
            'hook': ['imagine', 'picture', 'think of', 'let\'s', 'have you ever'],
            'relevance_statement': ['important', 'matters', 'relevant', 'useful', 'help you'],
            'learning_objectives': ['learn', 'understand', 'able to', 'by the end', 'objectives'],
            'personal_connection': ['you', 'your', 'relate', 'experience'],
            'clear_definitions': ['is', 'means', 'defined as', 'refers to'],
            'logical_progression': ['first', 'next', 'then', 'finally', 'build'],
            'visual_descriptions': ['see', 'looks like', 'imagine', 'picture', 'visualize'],
            'real_world_applications': ['example', 'real', 'practice', 'used in', 'applied'],
            'clear_instructions': ['step', 'instruction', 'follow', 'complete', 'answer'],
            'key_takeaways': ['remember', 'important', 'key point', 'takeaway', 'summary'],
            'next_steps': ['next', 'continue', 'further', 'explore', 'practice more']
        }
        
        for element in template.required_elements:
            indicators = element_indicators.get(element, [element])
            if not any(indicator in content_lower for indicator in indicators):
                missing.append(element)
        
        return missing
    
    def _calculate_quality_metrics(self, content: str, 
                                 template: SectionTemplate) -> Dict[str, float]:
        """
        Calculate quality metrics for generated content
        """
        metrics = {}
        
        # Word count appropriateness
        word_count = len(content.split())
        target = template.word_limit
        word_score = 1.0 - abs(word_count - target) / target
        metrics['word_count_score'] = max(0, min(1, word_score))
        
        # Required elements presence
        missing_elements = self._check_required_elements(content, template)
        element_score = 1.0 - (len(missing_elements) / len(template.required_elements))
        metrics['element_completeness'] = element_score
        
        # Readability (simple Flesch Reading Ease approximation)
        sentences = content.count('.') + content.count('!') + content.count('?')
        words = len(content.split())
        if sentences > 0 and words > 0:
            avg_sentence_length = words / sentences
            readability_score = 1.0 - min(1.0, avg_sentence_length / 30)
            metrics['readability'] = readability_score
        else:
            metrics['readability'] = 0.5
        
        # Structure quality (presence of formatting)
        structure_score = 0.0
        if '\n\n' in content:
            structure_score += 0.3
        if any(marker in content for marker in ['##', '###', '**', '*', '1.', '-']):
            structure_score += 0.4
        if any(marker in content for marker in ['?', '!', '🎯', '💡', '📝']):
            structure_score += 0.3
        metrics['structure_quality'] = min(1.0, structure_score)
        
        # Overall quality
        metrics['overall'] = sum(metrics.values()) / len(metrics)
        
        return metrics
    
    def _get_temperature(self, section_type: str) -> float:
        """
        Get appropriate temperature for section type
        """
        temperatures = {
            'intro': 0.7,      # More creative for engagement
            'concepts': 0.3,   # More accurate for definitions
            'examples': 0.6,   # Balanced for relevant examples
            'practice': 0.4,   # Structured for clear exercises
            'summary': 0.5     # Clear but engaging
        }
        return temperatures.get(section_type, 0.5)
    
    async def generate_all_sections(self, topic: Dict[str, Any],
                                  user_profile: Dict[str, Any],
                                  context: Dict[str, Any]) -> Dict[str, Dict]:
        """
        Generate all sections for a topic
        """
        sections = {}
        
        for section_type in ['intro', 'concepts', 'examples', 'practice', 'summary']:
            try:
                section = await self.generate_section(
                    section_type=section_type,
                    topic=topic,
                    user_profile=user_profile,
                    context=context
                )
                sections[section_type] = section
                
            except Exception as e:
                logger.error(f"Failed to generate {section_type} section: {e}")
                # Provide fallback content
                sections[section_type] = {
                    'content': f"[{section_type.title()} section generation failed]",
                    'metadata': {'error': str(e)},
                    'quality_metrics': {'overall': 0.0}
                }
        
        return sections