"""
Personalization Utilities
Centralized utility functions for personalization services
"""

import re
import logging
from typing import List, Dict, Any, Optional, Tuple
from datetime import datetime, timedelta

logger = logging.getLogger(__name__)


class PersonalizationUtils:
    """
    Common utilities for personalization services
    """
    
    @staticmethod
    def normalize_interests(interests: Any) -> List[str]:
        """
        Normalize interests field to a list of strings
        """
        if isinstance(interests, str):
            # Split comma-separated interests
            return [interest.strip() for interest in interests.split(',') if interest.strip()]
        elif isinstance(interests, list):
            return [str(interest).strip() for interest in interests if str(interest).strip()]
        else:
            return []
    
    @staticmethod
    def normalize_topics(topics: Any) -> List[str]:
        """
        Normalize topics field to a list of strings
        """
        if isinstance(topics, str):
            # Split comma-separated topics
            return [topic.strip() for topic in topics.split(',') if topic.strip()]
        elif isinstance(topics, list):
            return [str(topic).strip() for topic in topics if str(topic).strip()]
        else:
            return []
    
    @staticmethod
    def normalize_user_profile(raw_profile: Dict[str, Any]) -> Dict[str, Any]:
        """
        Normalize user profile data from various sources
        """
        # Handle different profile formats
        if 'onboard_answers' in raw_profile:
            # From database student_profile
            answers = raw_profile.get('onboard_answers', {})
            normalized = {
                'learning_style': answers.get('learningStyle', answers.get('learning_style', 'visual')),
                'expertise_level': answers.get('depth', answers.get('expertise_level', 'intermediate')),
                'interests': PersonalizationUtils.normalize_interests(answers.get('interests', [])),
                'tone_preference': answers.get('traits', answers.get('tone', 'professional')),
                'topics': PersonalizationUtils.normalize_topics(answers.get('topics', [])),
                'schedule': answers.get('schedule', 'flexible'),
                'job': answers.get('job', ''),
                'profession': answers.get('job', '')  # Also map job to profession
            }
        else:
            # Direct profile format
            normalized = {
                'learning_style': raw_profile.get('learning_style', 'visual'),
                'expertise_level': raw_profile.get('expertise_level', 'intermediate'),
                'interests': PersonalizationUtils.normalize_interests(raw_profile.get('interests', [])),
                'tone_preference': raw_profile.get('tone_preference', 'professional'),
                'topics': PersonalizationUtils.normalize_topics(raw_profile.get('topics', [])),
                'schedule': raw_profile.get('schedule', 'flexible'),
                'job': raw_profile.get('job', ''),
                'profession': raw_profile.get('profession', raw_profile.get('job', ''))
            }
        
        # Ensure all required fields exist
        normalized.setdefault('learning_style', 'visual')
        normalized.setdefault('expertise_level', 'intermediate')
        normalized.setdefault('interests', [])
        normalized.setdefault('tone_preference', 'professional')
        
        return normalized
    
    @staticmethod
    def chunk_content(content: str, chunk_size: int = 500, 
                     overlap: int = 50, by_words: bool = True) -> List[str]:
        """
        Split content into chunks with optional overlap
        """
        if by_words:
            words = content.split()
            chunks = []
            
            i = 0
            while i < len(words):
                chunk_words = words[i:i + chunk_size]
                chunks.append(' '.join(chunk_words))
                i += chunk_size - overlap if overlap > 0 else chunk_size
            
            return chunks
        else:
            # Character-based chunking
            chunks = []
            i = 0
            while i < len(content):
                chunk = content[i:i + chunk_size]
                chunks.append(chunk)
                i += chunk_size - overlap if overlap > 0 else chunk_size
            
            return chunks
    
    @staticmethod
    def identify_content_domain(content: str, title: str = "") -> str:
        """
        Identify the domain/subject of the content
        """
        combined = (title + " " + content).lower()
        
        domain_keywords = {
            'economics': ['gdp', 'economy', 'market', 'price', 'income', 'spending', 'economic', 'fiscal', 'trade', 'inflation'],
            'finance': ['investment', 'money', 'financial', 'capital', 'revenue', 'profit', 'budget', 'stock', 'bond', 'portfolio'],
            'technology': ['system', 'software', 'algorithm', 'digital', 'tech', 'computer', 'code', 'programming', 'data', 'ai'],
            'science': ['research', 'analysis', 'data', 'study', 'method', 'theory', 'hypothesis', 'experiment', 'scientific'],
            'business': ['company', 'corporate', 'business', 'management', 'strategy', 'organization', 'marketing', 'operations'],
            'mathematics': ['calculate', 'formula', 'equation', 'number', 'mathematical', 'quantitative', 'theorem', 'proof'],
            'psychology': ['behavior', 'cognitive', 'mental', 'psychology', 'emotion', 'personality', 'perception', 'memory'],
            'education': ['learning', 'teaching', 'pedagogy', 'curriculum', 'student', 'education', 'classroom', 'assessment']
        }
        
        domain_scores = {}
        for domain, keywords in domain_keywords.items():
            score = sum(1 for keyword in keywords if keyword in combined)
            if score > 0:
                domain_scores[domain] = score
        
        if domain_scores:
            return max(domain_scores.items(), key=lambda x: x[1])[0]
        return 'general'
    
    @staticmethod
    def select_primary_interest(content: str, interests: List[str]) -> str:
        """
        Select the most relevant interest for content
        """
        if not interests:
            return 'general'
        
        content_lower = content.lower()
        
        # Interest matching keywords
        interest_keywords = {
            'gaming': ['game', 'play', 'strategy', 'level', 'score', 'competition', 'player', 'quest', 'rpg', 'fps'],
            'music': ['rhythm', 'pattern', 'composition', 'harmony', 'flow', 'tempo', 'beat', 'sound', 'frequency', 'melody'],
            'basketball': ['team', 'strategy', 'performance', 'stats', 'competition', 'analytics', 'coordination', 'court'],
            'sports': ['team', 'performance', 'competition', 'analytics', 'strategy', 'training', 'improvement', 'athlete'],
            'technology': ['system', 'process', 'innovation', 'development', 'analysis', 'optimization', 'software', 'hardware'],
            'programming': ['logic', 'structure', 'algorithm', 'process', 'optimization', 'development', 'code', 'function'],
            'art': ['creative', 'design', 'visual', 'aesthetic', 'composition', 'color', 'form', 'expression'],
            'cooking': ['recipe', 'ingredient', 'technique', 'flavor', 'preparation', 'cuisine', 'dish', 'taste']
        }
        
        # Score each interest based on content relevance
        scores = {}
        for interest in interests:
            interest_lower = interest.lower()
            score = 0
            
            # Direct match
            if interest_lower in content_lower:
                score += 5
            
            # Keyword matching
            for key, keywords in interest_keywords.items():
                if key in interest_lower or interest_lower in key:
                    score += sum(1 for keyword in keywords if keyword in content_lower)
            
            if score > 0:
                scores[interest] = score
        
        # Return highest scoring interest, or first if tied
        if scores:
            return max(scores.items(), key=lambda x: x[1])[0]
        return interests[0] if interests else 'general'
    
    @staticmethod
    def generate_immediate_hook(primary_interest: str, topic_title: str) -> str:
        """
        Generate an engaging hook based on user's primary interest
        """
        interest_lower = primary_interest.lower()
        
        hooks = {
            'gaming': [
                f"Picture this like loading into a new game level - {topic_title.lower()}",
                f"Think of {topic_title.lower()} as unlocking a new skill tree",
                f"Imagine you're strategizing for a boss battle called {topic_title.lower()}",
                f"It's like discovering a hidden game mechanic in {topic_title.lower()}",
                f"Consider {topic_title.lower()} your next power-up"
            ],
            'music': [
                f"Think of {topic_title.lower()} like composing a new track",
                f"Imagine mixing the perfect beat for {topic_title.lower()}",
                f"It's like finding the rhythm in {topic_title.lower()}",
                f"Picture tuning your instrument for {topic_title.lower()}",
                f"Consider {topic_title.lower()} like mastering a new chord progression"
            ],
            'basketball': [
                f"Think of {topic_title.lower()} like drawing up a winning play",
                f"Imagine coaching your team through {topic_title.lower()}",
                f"It's like perfecting your shot for {topic_title.lower()}",
                f"Picture analyzing game stats for {topic_title.lower()}",
                f"Consider {topic_title.lower()} your pre-game strategy"
            ],
            'technology': [
                f"Think of {topic_title.lower()} as a new system architecture",
                f"Imagine debugging {topic_title.lower()} like optimizing code",
                f"It's like implementing a new feature called {topic_title.lower()}",
                f"Picture {topic_title.lower()} as your next innovation project",
                f"Consider {topic_title.lower()} a new framework to master"
            ],
            'general': [
                f"Let's dive into {topic_title.lower()} together",
                f"Here's what makes {topic_title.lower()} fascinating",
                f"Discover the essentials of {topic_title.lower()}",
                f"Let's explore {topic_title.lower()} step by step",
                f"Understanding {topic_title.lower()} starts here"
            ]
        }
        
        # Find matching hooks
        for key, hook_list in hooks.items():
            if key in interest_lower or interest_lower in key:
                import random
                return random.choice(hook_list)
        
        # Default hook if no match
        import random
        return random.choice(hooks['general'])
    
    @staticmethod
    def calculate_token_count(text: str, model: str = "gpt-4") -> int:
        """
        Estimate token count for text
        """
        # Simple estimation: ~4 characters per token for English
        # More accurate would use tiktoken
        return len(text) // 4
    
    @staticmethod
    def optimize_for_token_budget(content: str, max_tokens: int, 
                                preserve_structure: bool = True) -> str:
        """
        Optimize content to fit within token budget
        """
        estimated_tokens = PersonalizationUtils.calculate_token_count(content)
        
        if estimated_tokens <= max_tokens:
            return content
        
        if preserve_structure:
            # Try to preserve section markers and structure
            lines = content.split('\n')
            optimized_lines = []
            current_tokens = 0
            
            for line in lines:
                line_tokens = PersonalizationUtils.calculate_token_count(line)
                if current_tokens + line_tokens <= max_tokens:
                    optimized_lines.append(line)
                    current_tokens += line_tokens
                elif line.startswith('#') or line.startswith('##'):
                    # Always include headers
                    optimized_lines.append(line)
                    current_tokens += line_tokens
            
            return '\n'.join(optimized_lines)
        else:
            # Simple truncation
            chars_to_keep = max_tokens * 4  # Rough estimate
            return content[:chars_to_keep] + "..."
    
    @staticmethod
    def extract_key_concepts(content: str, max_concepts: int = 5) -> List[str]:
        """
        Extract key concepts from content
        """
        # Simple keyword extraction - could be enhanced with NLP
        # Remove common words
        stop_words = {'the', 'is', 'at', 'which', 'on', 'and', 'a', 'an', 'as', 
                     'are', 'was', 'were', 'been', 'be', 'have', 'has', 'had',
                     'do', 'does', 'did', 'will', 'would', 'could', 'should',
                     'may', 'might', 'must', 'shall', 'to', 'of', 'in', 'for',
                     'with', 'by', 'from', 'up', 'about', 'into', 'through',
                     'during', 'before', 'after', 'above', 'below', 'between'}
        
        # Extract words
        words = re.findall(r'\b[a-zA-Z]+\b', content.lower())
        
        # Count word frequency
        word_freq = {}
        for word in words:
            if word not in stop_words and len(word) > 3:
                word_freq[word] = word_freq.get(word, 0) + 1
        
        # Get top concepts
        sorted_words = sorted(word_freq.items(), key=lambda x: x[1], reverse=True)
        return [word for word, _ in sorted_words[:max_concepts]]
    
    @staticmethod
    def assess_content_complexity(content: str) -> str:
        """
        Assess the complexity level of content
        """
        # Simple heuristics
        avg_sentence_length = len(content.split()) / max(len(content.split('.')), 1)
        technical_terms = len(re.findall(r'\b[A-Z][a-z]+(?:[A-Z][a-z]+)+\b', content))
        formula_count = content.count('=') + content.count('formula') + content.count('equation')
        
        if avg_sentence_length > 25 or technical_terms > 10 or formula_count > 3:
            return 'complex'
        elif avg_sentence_length > 15 or technical_terms > 5:
            return 'moderate'
        else:
            return 'simple'
    
    @staticmethod
    def generate_learning_path(topics: List[Dict], user_expertise: str) -> List[str]:
        """
        Generate optimal learning path based on topics and user expertise
        """
        # Sort topics by complexity and dependencies
        sorted_topics = []
        
        # First, add foundational topics
        for topic in topics:
            if topic.get('difficulty', 'intermediate') == 'beginner':
                sorted_topics.append(topic['id'])
        
        # Then, add intermediate topics
        for topic in topics:
            if topic.get('difficulty', 'intermediate') == 'intermediate' and topic['id'] not in sorted_topics:
                sorted_topics.append(topic['id'])
        
        # Finally, add advanced topics
        for topic in topics:
            if topic['id'] not in sorted_topics:
                sorted_topics.append(topic['id'])
        
        # Adjust based on user expertise
        if user_expertise in ['advanced', 'expert']:
            # Advanced users might prefer diving into complex topics first
            sorted_topics.reverse()
        
        return sorted_topics