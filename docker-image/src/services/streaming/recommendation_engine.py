"""
Recommendation engine for personalized content generation
"""
import re
import logging
from typing import Dict, List, Optional, Tuple, Any
from dataclasses import dataclass

logger = logging.getLogger(__name__)

# Common words to filter out when extracting keywords
COMMON_WORDS = {
    'the', 'and', 'of', 'to', 'a', 'in', 'is', 'it', 'that', 'for', 
    'with', 'as', 'on', 'at', 'by', 'an', 'be', 'this', 'which', 
    'or', 'from', 'are', 'was', 'were', 'been', 'have', 'has', 'had', 
    'do', 'does', 'did', 'will', 'would', 'could', 'should', 'may', 
    'might', 'must', 'can', 'shall'
}


@dataclass
class StudentProfile:
    """Student profile for personalization"""
    name: Optional[str] = None
    learning_style: Optional[str] = None
    interests: Optional[str] = None
    expertise_level: Optional[str] = None
    
    def to_persona(self) -> str:
        """Convert profile to persona string"""
        if not any([self.name, self.learning_style, self.interests, self.expertise_level]):
            return "General learner seeking comprehensive understanding"
        
        persona_parts = []
        if self.name:
            persona_parts.append(f"Name: {self.name}")
        if self.learning_style:
            persona_parts.append(f"Learning style: {self.learning_style}")
        if self.interests:
            persona_parts.append(f"Interests: {self.interests}")
        if self.expertise_level:
            persona_parts.append(f"Expertise level: {self.expertise_level}")
            
        return " | ".join(persona_parts)


@dataclass
class SectionInfo:
    """Information about a content section"""
    topic: str
    focus: str


class RecommendationEngine:
    """Engine for generating personalized content recommendations"""
    
    def __init__(self):
        self.logger = logging.getLogger(__name__)
    
    def extract_keywords(self, text: str, max_keywords: int = 5) -> List[str]:
        """Extract key technical terms from text"""
        if not text:
            return []
        
        # Take first 500 chars and convert to lowercase
        text_preview = text[:500].lower()
        
        # Extract words
        words = re.findall(r'\b[a-z]+\b', text_preview)
        
        # Filter out common words and short words
        keywords = [
            w for w in words 
            if len(w) > 4 and w not in COMMON_WORDS
        ]
        
        # Get unique keywords
        seen = set()
        unique_keywords = []
        for word in keywords:
            if word not in seen:
                seen.add(word)
                unique_keywords.append(word)
                if len(unique_keywords) >= max_keywords:
                    break
        
        return unique_keywords
    
    def get_section_topics(
        self, 
        subsection_id: str, 
        file_name: str, 
        keywords: List[str]
    ) -> Dict[str, SectionInfo]:
        """Get topic mapping for sections based on content"""
        
        if subsection_id.startswith("1."):
            # Introduction chapter - focus on overview and context
            return {
                "1.1": SectionInfo(
                    topic=f"Introduction to {file_name}",
                    focus=f"Understanding the purpose and relevance of {', '.join(keywords[:2]) if keywords else 'this topic'}"
                ),
                "1.2": SectionInfo(
                    topic=f"Core concepts in {file_name}",
                    focus=f"Essential terminology and foundations specific to {', '.join(keywords[2:4]) if len(keywords) > 2 else 'this subject'}"
                ),
                "1.3": SectionInfo(
                    topic=f"Learning goals for {file_name}",
                    focus="Your personal objectives and expected outcomes"
                ),
                "1.4": SectionInfo(
                    topic=f"Study approach for {file_name}",
                    focus="Effective strategies tailored to your learning style"
                )
            }
        
        elif subsection_id.startswith("2."):
            # Main content chapter - focus on depth
            return {
                "2.1": SectionInfo(
                    topic=f"Fundamental principles of {keywords[0] if keywords else 'the subject'}",
                    focus="Core theoretical framework and underlying concepts"
                ),
                "2.2": SectionInfo(
                    topic=f"Deep dive into {keywords[1] if len(keywords) > 1 else 'key mechanisms'}",
                    focus="Detailed analysis and interconnections"
                ),
                "2.3": SectionInfo(
                    topic=f"Applying {keywords[2] if len(keywords) > 2 else 'concepts'} in practice",
                    focus="Real-world use cases and implementations"
                ),
                "2.4": SectionInfo(
                    topic=f"Advanced patterns in {file_name}",
                    focus="Best practices and common challenges"
                )
            }
        
        else:
            # Practice chapter - focus on application
            return {
                "3.1": SectionInfo(
                    topic=f"Hands-on with {keywords[0] if keywords else 'practical exercises'}",
                    focus="Guided practice with immediate feedback"
                ),
                "3.2": SectionInfo(
                    topic=f"Real scenarios involving {keywords[1] if len(keywords) > 1 else 'case studies'}",
                    focus="Industry examples and problem-solving"
                ),
                "3.3": SectionInfo(
                    topic=f"Mastering {keywords[2] if len(keywords) > 2 else 'advanced techniques'}",
                    focus="Expert tips and optimization strategies"
                ),
                "3.4": SectionInfo(
                    topic=f"Beyond {file_name}: Next steps",
                    focus="Future learning paths and career applications"
                )
            }
    
    def get_section_instructions(self, subsection_id: str) -> str:
        """Get specific instructions for a section"""
        instructions = {
            "1.1": "- Welcome the student warmly and introduce the document's main topic\n- Explain why this material matters to them personally\n- Set expectations for what they'll learn",
            "1.2": "- Define key terms and concepts from the document\n- Use simple analogies to explain complex ideas\n- Focus on building foundational understanding",
            "1.3": "- Outline specific learning objectives\n- Connect objectives to real-world applications\n- Personalize goals based on their profile",
            "1.4": "- Provide a roadmap for studying this material\n- Suggest personalized learning strategies\n- Give tips specific to their learning style",
            "2.1": "- Explain the core principles in depth\n- Use examples directly from the document\n- Connect to what they learned in chapter 1",
            "2.2": "- Dive deeper into mechanisms and relationships\n- Analyze how components interact\n- Use technical details from the document",
            "2.3": "- Show practical applications\n- Provide real-world scenarios\n- Connect theory to practice",
            "2.4": "- Discuss advanced patterns and best practices\n- Highlight common pitfalls to avoid\n- Share expert insights",
            "3.1": "- Create a hands-on exercise\n- Provide step-by-step guidance\n- Include self-check questions",
            "3.2": "- Present a realistic case study\n- Walk through problem-solving process\n- Encourage critical thinking",
            "3.3": "- Share advanced tips and tricks\n- Discuss optimization strategies\n- Provide expert-level insights",
            "3.4": "- Suggest next learning steps\n- Connect to broader topics\n- Inspire continued growth"
        }
        
        return instructions.get(subsection_id, "- Provide relevant and engaging content for this section")
    
    def build_prompt(
        self,
        subsection_id: str,
        topic: str,
        focus: str,
        persona: str,
        file_name: str,
        context: str,
        previous_sections: List[Dict[str, Any]],
        regenerate: bool = False
    ) -> Tuple[str, str]:
        """Build prompt and system message for content generation"""
        
        # Build main prompt
        prompt = f"""
        You are creating section {subsection_id} of a personalized learning experience.
        
        SECTION DETAILS:
        Topic: {topic}
        Focus: {focus}
        Section Number: {subsection_id}
        
        STUDENT PROFILE:
        {persona}
        
        DOCUMENT CONTEXT:
        File: {file_name}
        Relevant Content:
        {context[:1500]}
        """
        
        # Add previous sections context
        if previous_sections:
            prompt += "\n\nPREVIOUSLY COVERED (DO NOT REPEAT):\n"
            for prev_section in previous_sections[-3:]:  # Only last 3 sections
                section_id = prev_section.get('section', '')
                section_content = prev_section.get('content', '')
                if section_content:
                    preview = section_content[:250].replace('\n', ' ').strip()
                    prompt += f"\nSection {section_id} covered:\n{preview}...\n"
        
        prompt += f"""
        
        STRICT INSTRUCTIONS:
        1. Create content SPECIFICALLY for "{topic}" focusing on "{focus}"
        2. Use information from the document context above
        3. Write 350-450 tokens (about 3-4 paragraphs)
        4. Each paragraph should be 3-4 sentences
        5. Be conversational but informative
        6. Include specific examples from the document when possible
        7. CRITICAL: Do NOT repeat any concepts, examples, or explanations from previous sections
        8. Build upon previous knowledge without restating it
        9. Make this section unique and valuable on its own
        
        For section {subsection_id}, you should specifically:
        {self.get_section_instructions(subsection_id)}
        """
        
        if regenerate:
            prompt += "\n\nIMPORTANT: The student has requested NEW content for this section. Provide a COMPLETELY DIFFERENT perspective, examples, and explanations than what might have been generated before. Use different analogies, different examples, and a different approach while still covering the same topic."
        
        prompt += "\n\nBegin your response directly with the content, no titles or section headers:"
        
        # Build system message
        system_message = f"You are an expert educator personalizing content for a student. You adapt your teaching style to match their preferences. For this section on {topic}, focus on {focus}. Use natural, conversational language with varied paragraph structures."
        
        if previous_sections:
            system_message += " IMPORTANT: You have been provided with previously generated sections. You must NOT repeat any content, examples, or explanations from those sections. Build upon them instead of duplicating information."
        
        return prompt, system_message
    
    def get_generation_temperature(self, regenerate: bool) -> float:
        """Get temperature for content generation"""
        return 1.0 if regenerate else 0.8