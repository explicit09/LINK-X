"""
Quality Validator Service
Validates the quality of personalized educational content
"""

import logging
from typing import Dict, Any, List, Optional, Tuple
from dataclasses import dataclass
from datetime import datetime
import json
import re

from core.critic_loop import critic_loop, CriticResult
from services.personalization.personalization_utils import PersonalizationUtils

logger = logging.getLogger(__name__)


@dataclass
class ValidationResult:
    """Result of content validation"""
    section_type: str
    overall_score: float
    category_scores: Dict[str, float]
    issues: List[str]
    suggestions: List[str]
    passed: bool
    metadata: Dict[str, Any]


@dataclass
class CrossSectionValidation:
    """Result of cross-section validation"""
    coherence_score: float
    flow_issues: List[str]
    consistency_issues: List[str]
    coverage_gaps: List[str]
    overall_quality: float


class QualityValidatorService:
    """
    Comprehensive quality validation for educational content
    """
    
    def __init__(self):
        self.critic = critic_loop
        self.utils = PersonalizationUtils()
        self.section_criteria = self._initialize_criteria()
        
    def _initialize_criteria(self) -> Dict[str, Dict]:
        """
        Initialize quality criteria for each section type
        """
        return {
            'intro': {
                'engagement_hook': {
                    'weight': 0.3,
                    'min_score': 0.9,
                    'validators': ['has_hook', 'is_engaging', 'personal_relevance']
                },
                'clarity': {
                    'weight': 0.3,
                    'min_score': 0.85,
                    'validators': ['clear_objectives', 'simple_language', 'logical_flow']
                },
                'personalization': {
                    'weight': 0.4,
                    'min_score': 0.9,
                    'validators': ['uses_interests', 'appropriate_level', 'tone_match']
                }
            },
            'concepts': {
                'accuracy': {
                    'weight': 0.4,
                    'min_score': 0.95,
                    'validators': ['factual_correctness', 'proper_definitions', 'no_hallucinations']
                },
                'depth': {
                    'weight': 0.3,
                    'min_score': 0.85,
                    'validators': ['comprehensive_coverage', 'appropriate_detail', 'concept_connections']
                },
                'clarity': {
                    'weight': 0.3,
                    'min_score': 0.9,
                    'validators': ['clear_explanations', 'good_structure', 'visual_aids']
                }
            },
            'examples': {
                'relevance': {
                    'weight': 0.4,
                    'min_score': 0.95,
                    'validators': ['directly_illustrates', 'appropriate_context', 'user_relevant']
                },
                'diversity': {
                    'weight': 0.3,
                    'min_score': 0.8,
                    'validators': ['varied_scenarios', 'progressive_difficulty', 'multiple_perspectives']
                },
                'personalization': {
                    'weight': 0.3,
                    'min_score': 0.9,
                    'validators': ['uses_user_context', 'interest_aligned', 'profession_relevant']
                }
            },
            'practice': {
                'coverage': {
                    'weight': 0.35,
                    'min_score': 0.85,
                    'validators': ['tests_all_concepts', 'appropriate_difficulty', 'clear_instructions']
                },
                'variety': {
                    'weight': 0.35,
                    'min_score': 0.8,
                    'validators': ['multiple_formats', 'different_skills', 'engaging_questions']
                },
                'feedback': {
                    'weight': 0.3,
                    'min_score': 0.85,
                    'validators': ['has_answers', 'helpful_hints', 'self_assessment']
                }
            },
            'summary': {
                'completeness': {
                    'weight': 0.4,
                    'min_score': 0.9,
                    'validators': ['covers_key_points', 'accurate_recap', 'no_missing_concepts']
                },
                'memorability': {
                    'weight': 0.3,
                    'min_score': 0.85,
                    'validators': ['concise_format', 'memorable_structure', 'key_takeaways']
                },
                'actionability': {
                    'weight': 0.3,
                    'min_score': 0.85,
                    'validators': ['next_steps', 'practice_suggestions', 'application_ideas']
                }
            }
        }
    
    async def validate_section(self, 
                             content: str,
                             section_type: str,
                             topic: Dict[str, Any],
                             user_profile: Dict[str, Any],
                             context: Optional[Dict] = None) -> ValidationResult:
        """
        Validate a single section of content
        """
        logger.info(f"Validating {section_type} section for topic: {topic.get('title', 'Unknown')}")
        
        # Get section-specific criteria
        criteria = self.section_criteria.get(section_type, {})
        
        # Prepare validation context
        validation_context = {
            'section_type': section_type,
            'topic': topic,
            'user_profile': user_profile,
            'criteria': criteria,
            'additional_context': context or {}
        }
        
        # Use critic loop for initial validation
        critic_result = await self._run_critic_validation(content, validation_context)
        
        # Run section-specific validators
        specific_scores = self._run_specific_validators(content, section_type, validation_context)
        
        # Combine scores
        category_scores = self._combine_scores(critic_result.category_scores, specific_scores)
        
        # Calculate overall score
        overall_score = self._calculate_weighted_score(category_scores, criteria)
        
        # Determine if passed
        passed = self._check_if_passed(category_scores, criteria)
        
        # Generate suggestions
        suggestions = self._generate_improvement_suggestions(
            category_scores, criteria, critic_result.issues
        )
        
        return ValidationResult(
            section_type=section_type,
            overall_score=overall_score,
            category_scores=category_scores,
            issues=critic_result.issues,
            suggestions=suggestions,
            passed=passed,
            metadata={
                'critic_score': critic_result.score,
                'validation_time': datetime.now().isoformat(),
                'topic_id': topic.get('id')
            }
        )
    
    async def _run_critic_validation(self, content: str, context: Dict) -> CriticResult:
        """
        Run critic loop validation
        """
        # Prepare question for critic
        section_type = context['section_type']
        topic_title = context['topic'].get('title', 'the topic')
        
        question = f"Validate this {section_type} section for '{topic_title}'"
        
        # Execute critic validation
        result = self.critic.execute_with_critic(
            executor_prompt=content,  # Content to validate
            context=context,
            question=question,
            student_profile=context['user_profile']
        )
        
        return result.critic_result
    
    def _run_specific_validators(self, content: str, section_type: str,
                               context: Dict) -> Dict[str, float]:
        """
        Run section-specific validators
        """
        scores = {}
        criteria = self.section_criteria.get(section_type, {})
        
        for category, category_info in criteria.items():
            validators = category_info.get('validators', [])
            category_scores = []
            
            for validator in validators:
                score = self._run_validator(validator, content, context)
                category_scores.append(score)
            
            # Average scores for the category
            if category_scores:
                scores[category] = sum(category_scores) / len(category_scores)
            else:
                scores[category] = 0.5  # Default neutral score
        
        return scores
    
    def _run_validator(self, validator_name: str, content: str, 
                      context: Dict) -> float:
        """
        Run a specific validator
        """
        content_lower = content.lower()
        user_profile = context['user_profile']
        topic = context['topic']
        
        # Validator implementations
        validators = {
            # Intro validators
            'has_hook': lambda: 1.0 if any(hook in content_lower for hook in ['imagine', 'picture', 'think of', 'have you ever']) else 0.3,
            'is_engaging': lambda: 1.0 if any(marker in content for marker in ['!', '?', '🎯', '💡']) else 0.5,
            'personal_relevance': lambda: 1.0 if any(interest.lower() in content_lower for interest in user_profile.get('interests', [])) else 0.6,
            
            # Clarity validators
            'clear_objectives': lambda: 1.0 if any(phrase in content_lower for phrase in ['will learn', 'objectives', 'by the end']) else 0.4,
            'simple_language': lambda: self._assess_readability(content),
            'logical_flow': lambda: 1.0 if any(marker in content_lower for marker in ['first', 'then', 'finally', 'next']) else 0.6,
            
            # Personalization validators
            'uses_interests': lambda: self._check_interest_usage(content, user_profile),
            'appropriate_level': lambda: self._check_expertise_match(content, user_profile),
            'tone_match': lambda: self._check_tone_match(content, user_profile),
            
            # Accuracy validators
            'factual_correctness': lambda: 0.9,  # Would need fact-checking service
            'proper_definitions': lambda: 1.0 if any(phrase in content_lower for phrase in ['is defined as', 'refers to', 'means']) else 0.5,
            'no_hallucinations': lambda: 0.9,  # Would need hallucination detection
            
            # Example validators
            'directly_illustrates': lambda: 1.0 if 'example' in content_lower or 'for instance' in content_lower else 0.3,
            'appropriate_context': lambda: self._check_context_appropriateness(content, user_profile),
            'user_relevant': lambda: self._check_user_relevance(content, user_profile),
            
            # Practice validators
            'tests_all_concepts': lambda: self._check_concept_coverage(content, topic),
            'clear_instructions': lambda: 1.0 if any(phrase in content_lower for phrase in ['instructions', 'complete', 'answer', 'solve']) else 0.5,
            'has_answers': lambda: 1.0 if any(phrase in content_lower for phrase in ['answer:', 'solution:', 'correct:', 'hint:']) else 0.3,
            
            # Summary validators
            'covers_key_points': lambda: self._check_key_point_coverage(content, topic),
            'concise_format': lambda: 1.0 if len(content.split()) < 400 else 0.7,
            'next_steps': lambda: 1.0 if any(phrase in content_lower for phrase in ['next', 'continue', 'practice', 'explore']) else 0.4
        }
        
        # Get validator function
        validator_func = validators.get(validator_name, lambda: 0.5)
        
        try:
            return validator_func()
        except Exception as e:
            logger.warning(f"Validator {validator_name} failed: {e}")
            return 0.5  # Default neutral score
    
    def _assess_readability(self, content: str) -> float:
        """
        Assess readability of content
        """
        # Simple readability assessment
        sentences = content.split('.')
        words = content.split()
        
        if not sentences or not words:
            return 0.5
        
        avg_sentence_length = len(words) / len(sentences)
        
        # Ideal sentence length is 15-20 words
        if 15 <= avg_sentence_length <= 20:
            return 1.0
        elif 10 <= avg_sentence_length <= 25:
            return 0.8
        elif avg_sentence_length < 10:
            return 0.6  # Too simple
        else:
            return 0.4  # Too complex
    
    def _check_interest_usage(self, content: str, user_profile: Dict) -> float:
        """
        Check if user interests are incorporated
        """
        interests = user_profile.get('interests', [])
        if not interests:
            return 0.7  # Neutral if no interests
        
        content_lower = content.lower()
        matches = sum(1 for interest in interests if interest.lower() in content_lower)
        
        return min(1.0, 0.5 + (matches * 0.25))
    
    def _check_expertise_match(self, content: str, user_profile: Dict) -> float:
        """
        Check if content matches user expertise level
        """
        expertise = user_profile.get('expertise_level', 'intermediate')
        complexity = self.utils.assess_content_complexity(content)
        
        # Check alignment
        if expertise == 'beginner' and complexity == 'simple':
            return 1.0
        elif expertise == 'intermediate' and complexity == 'moderate':
            return 1.0
        elif expertise == 'advanced' and complexity == 'complex':
            return 1.0
        elif abs(self._expertise_to_num(expertise) - self._complexity_to_num(complexity)) == 1:
            return 0.7  # Close match
        else:
            return 0.4  # Poor match
    
    def _expertise_to_num(self, expertise: str) -> int:
        """Convert expertise to numeric level"""
        levels = {'beginner': 1, 'intermediate': 2, 'advanced': 3}
        return levels.get(expertise, 2)
    
    def _complexity_to_num(self, complexity: str) -> int:
        """Convert complexity to numeric level"""
        levels = {'simple': 1, 'moderate': 2, 'complex': 3}
        return levels.get(complexity, 2)
    
    def _check_tone_match(self, content: str, user_profile: Dict) -> float:
        """
        Check if tone matches preference
        """
        tone_pref = user_profile.get('tone_preference', 'professional')
        
        tone_indicators = {
            'casual': ['hey', 'cool', 'awesome', 'stuff', '!'],
            'formal': ['therefore', 'moreover', 'consequently', 'thus'],
            'motivational': ['you can', 'you will', 'achieve', 'succeed', '!'],
            'professional': ['professional', 'industry', 'practice', 'standard']
        }
        
        indicators = tone_indicators.get(tone_pref, [])
        if not indicators:
            return 0.7
        
        content_lower = content.lower()
        matches = sum(1 for indicator in indicators if indicator in content_lower)
        
        return min(1.0, 0.5 + (matches * 0.1))
    
    def _check_context_appropriateness(self, content: str, user_profile: Dict) -> float:
        """
        Check if examples use appropriate context
        """
        profession = user_profile.get('profession', '')
        interests = user_profile.get('interests', [])
        
        relevant_terms = [profession.lower()] + [i.lower() for i in interests]
        relevant_terms = [term for term in relevant_terms if term]
        
        if not relevant_terms:
            return 0.7
        
        content_lower = content.lower()
        matches = sum(1 for term in relevant_terms if term in content_lower)
        
        return min(1.0, 0.6 + (matches * 0.2))
    
    def _check_user_relevance(self, content: str, user_profile: Dict) -> float:
        """
        Check overall user relevance
        """
        # Combine multiple relevance factors
        interest_score = self._check_interest_usage(content, user_profile)
        context_score = self._check_context_appropriateness(content, user_profile)
        
        return (interest_score + context_score) / 2
    
    def _check_concept_coverage(self, content: str, topic: Dict) -> float:
        """
        Check if practice covers all key concepts
        """
        key_concepts = topic.get('key_concepts', [])
        if not key_concepts:
            return 0.8
        
        content_lower = content.lower()
        covered = sum(1 for concept in key_concepts if concept.lower() in content_lower)
        
        return covered / len(key_concepts)
    
    def _check_key_point_coverage(self, content: str, topic: Dict) -> float:
        """
        Check if summary covers key points
        """
        # Similar to concept coverage but for summaries
        return self._check_concept_coverage(content, topic)
    
    def _combine_scores(self, critic_scores: Dict[str, float],
                       specific_scores: Dict[str, float]) -> Dict[str, float]:
        """
        Combine critic and specific validator scores
        """
        combined = {}
        
        # Map critic categories to our categories
        critic_mapping = {
            'factual_accuracy': 'accuracy',
            'personalization_fit': 'personalization',
            'structure_correctness': 'clarity',
            'educational_value': 'depth'
        }
        
        # Start with specific scores
        combined.update(specific_scores)
        
        # Blend in critic scores where applicable
        for critic_cat, our_cat in critic_mapping.items():
            if critic_cat in critic_scores and our_cat in combined:
                # Average the scores
                combined[our_cat] = (combined[our_cat] + critic_scores[critic_cat]) / 2
        
        return combined
    
    def _calculate_weighted_score(self, scores: Dict[str, float],
                                criteria: Dict[str, Dict]) -> float:
        """
        Calculate weighted overall score
        """
        weighted_sum = 0
        total_weight = 0
        
        for category, info in criteria.items():
            if category in scores:
                weight = info.get('weight', 0.33)
                weighted_sum += scores[category] * weight
                total_weight += weight
        
        if total_weight > 0:
            return weighted_sum / total_weight
        return 0.5  # Default
    
    def _check_if_passed(self, scores: Dict[str, float],
                        criteria: Dict[str, Dict]) -> bool:
        """
        Check if all minimum criteria are met
        """
        for category, info in criteria.items():
            min_score = info.get('min_score', 0.7)
            if category in scores and scores[category] < min_score:
                return False
        return True
    
    def _generate_improvement_suggestions(self, scores: Dict[str, float],
                                        criteria: Dict[str, Dict],
                                        issues: List[str]) -> List[str]:
        """
        Generate specific improvement suggestions
        """
        suggestions = []
        
        # Check low-scoring categories
        for category, info in criteria.items():
            if category in scores:
                score = scores[category]
                min_score = info.get('min_score', 0.7)
                
                if score < min_score:
                    # Generate category-specific suggestions
                    if category == 'engagement_hook' and score < 0.7:
                        suggestions.append("Add a more compelling hook at the beginning")
                    elif category == 'personalization' and score < 0.8:
                        suggestions.append("Incorporate more user-specific examples and interests")
                    elif category == 'clarity' and score < 0.8:
                        suggestions.append("Simplify language and improve structure")
                    elif category == 'accuracy' and score < 0.9:
                        suggestions.append("Verify all facts and definitions for accuracy")
                    elif category == 'coverage' and score < 0.8:
                        suggestions.append("Ensure all key concepts are addressed")
        
        # Add issue-specific suggestions
        for issue in issues[:3]:  # Top 3 issues
            if 'personal' in issue.lower():
                suggestions.append("Add more personalized examples based on user profile")
            elif 'structure' in issue.lower():
                suggestions.append("Improve content organization with clear sections")
            elif 'example' in issue.lower():
                suggestions.append("Include more relevant, concrete examples")
        
        return list(dict.fromkeys(suggestions))  # Remove duplicates
    
    async def validate_cross_sections(self, 
                                    sections: Dict[str, str],
                                    topic: Dict[str, Any],
                                    user_profile: Dict[str, Any]) -> CrossSectionValidation:
        """
        Validate coherence across all sections
        """
        logger.info(f"Validating cross-section coherence for topic: {topic.get('title', 'Unknown')}")
        
        # Check various aspects of cross-section quality
        coherence_score = self._check_section_flow(sections)
        flow_issues = self._identify_flow_issues(sections)
        consistency_issues = self._check_terminology_consistency(sections)
        coverage_gaps = self._identify_coverage_gaps(sections, topic)
        
        # Calculate overall quality
        issue_penalty = len(flow_issues) * 0.05 + len(consistency_issues) * 0.03 + len(coverage_gaps) * 0.04
        overall_quality = max(0, coherence_score - issue_penalty)
        
        return CrossSectionValidation(
            coherence_score=coherence_score,
            flow_issues=flow_issues,
            consistency_issues=consistency_issues,
            coverage_gaps=coverage_gaps,
            overall_quality=overall_quality
        )
    
    def _check_section_flow(self, sections: Dict[str, str]) -> float:
        """
        Check if sections flow logically
        """
        # Expected section order
        expected_order = ['intro', 'concepts', 'examples', 'practice', 'summary']
        
        score = 1.0
        
        # Check if intro sets up concepts mentioned later
        if 'intro' in sections and 'concepts' in sections:
            intro_lower = sections['intro'].lower()
            concepts_lower = sections['concepts'].lower()
            
            # Extract key terms from concepts
            key_terms = self.utils.extract_key_concepts(concepts_lower, max_concepts=5)
            
            # Check if intro mentions these terms
            mentioned = sum(1 for term in key_terms if term in intro_lower)
            if mentioned < len(key_terms) * 0.5:
                score -= 0.1
        
        # Check if examples reference concepts
        if 'concepts' in sections and 'examples' in sections:
            concepts_terms = self.utils.extract_key_concepts(sections['concepts'], max_concepts=5)
            examples_lower = sections['examples'].lower()
            
            referenced = sum(1 for term in concepts_terms if term in examples_lower)
            if referenced < len(concepts_terms) * 0.6:
                score -= 0.1
        
        # Check if summary captures main points
        if 'summary' in sections:
            summary_lower = sections['summary'].lower()
            all_terms = []
            
            for section_type in ['concepts', 'examples']:
                if section_type in sections:
                    all_terms.extend(self.utils.extract_key_concepts(sections[section_type], max_concepts=3))
            
            captured = sum(1 for term in all_terms if term in summary_lower)
            if captured < len(all_terms) * 0.7:
                score -= 0.1
        
        return max(0, score)
    
    def _identify_flow_issues(self, sections: Dict[str, str]) -> List[str]:
        """
        Identify specific flow issues between sections
        """
        issues = []
        
        # Check for abrupt transitions
        if 'intro' in sections and 'concepts' in sections:
            if not any(transition in sections['concepts'].lower() for transition in ['as mentioned', 'introduced', 'discussed']):
                issues.append("Concepts section doesn't reference introduction")
        
        # Check for missing connections
        section_pairs = [('concepts', 'examples'), ('examples', 'practice'), ('practice', 'summary')]
        
        for prev_section, next_section in section_pairs:
            if prev_section in sections and next_section in sections:
                # Check if next section references previous
                prev_terms = self.utils.extract_key_concepts(sections[prev_section], max_concepts=3)
                next_lower = sections[next_section].lower()
                
                if not any(term in next_lower for term in prev_terms):
                    issues.append(f"{next_section.title()} doesn't connect to {prev_section}")
        
        return issues
    
    def _check_terminology_consistency(self, sections: Dict[str, str]) -> List[str]:
        """
        Check for inconsistent terminology across sections
        """
        issues = []
        
        # Extract key terms from each section
        section_terms = {}
        for section_type, content in sections.items():
            # Find capitalized terms (likely important concepts)
            terms = re.findall(r'\b[A-Z][a-z]+(?:\s+[A-Z][a-z]+)*\b', content)
            section_terms[section_type] = set(terms)
        
        # Check for variations
        all_terms = set()
        for terms in section_terms.values():
            all_terms.update(terms)
        
        # Look for similar terms that might be inconsistent
        term_list = list(all_terms)
        for i, term1 in enumerate(term_list):
            for term2 in term_list[i+1:]:
                similarity = self._calculate_term_similarity(term1, term2)
                if 0.7 < similarity < 1.0:  # Similar but not identical
                    issues.append(f"Inconsistent terminology: '{term1}' vs '{term2}'")
        
        return issues[:5]  # Limit to top 5 issues
    
    def _calculate_term_similarity(self, term1: str, term2: str) -> float:
        """
        Calculate similarity between two terms
        """
        # Simple character-based similarity
        term1_lower = term1.lower()
        term2_lower = term2.lower()
        
        # Check if one contains the other
        if term1_lower in term2_lower or term2_lower in term1_lower:
            return 0.8
        
        # Check word overlap
        words1 = set(term1_lower.split())
        words2 = set(term2_lower.split())
        
        if words1 and words2:
            overlap = len(words1 & words2)
            total = len(words1 | words2)
            return overlap / total if total > 0 else 0
        
        return 0
    
    def _identify_coverage_gaps(self, sections: Dict[str, str], 
                              topic: Dict[str, Any]) -> List[str]:
        """
        Identify gaps in concept coverage
        """
        gaps = []
        key_concepts = topic.get('key_concepts', [])
        
        if not key_concepts:
            return gaps
        
        # Check coverage across all sections
        all_content = ' '.join(sections.values()).lower()
        
        for concept in key_concepts:
            concept_lower = concept.lower()
            
            # Count occurrences
            occurrences = all_content.count(concept_lower)
            
            if occurrences == 0:
                gaps.append(f"Key concept '{concept}' not covered")
            elif occurrences == 1:
                # Check which section mentions it
                mentioned_in = []
                for section_type, content in sections.items():
                    if concept_lower in content.lower():
                        mentioned_in.append(section_type)
                
                if 'concepts' not in mentioned_in:
                    gaps.append(f"Key concept '{concept}' not explained in concepts section")
        
        return gaps