"""
Multi-pass Content Generation Orchestrator
Generates long-form educational content with proper depth and structure
"""

import json
import logging
from typing import List, Dict, Any, Optional
import asyncio
from concurrent.futures import ThreadPoolExecutor
import openai
from openai import OpenAI
import os
from dotenv import load_dotenv

load_dotenv()

logger = logging.getLogger(__name__)
openai_client = OpenAI(api_key=os.getenv("OPENAI_API_KEY"))


class ContentOrchestrator:
    """Orchestrates multi-pass content generation for maximum depth and quality"""
    
    def __init__(self, model: str = "gpt-4o", max_tokens: int = 32000):
        self.model = model
        self.max_tokens = max_tokens
        self.executor = ThreadPoolExecutor(max_workers=5)
    
    async def generate_comprehensive_content(
        self, 
        course_content: str,
        persona: str,
        course_name: str,
        user_profile: Dict[str, Any]
    ) -> Dict[str, Any]:
        """
        Generate comprehensive content using multi-pass approach
        
        Pass 1: Generate detailed outline
        Pass 2: Generate each chapter independently (parallel)
        Pass 3: Add transitions and coherence
        Pass 4: Final personalization polish
        """
        
        logger.info("Starting multi-pass content generation")
        
        # Pass 1: Generate comprehensive outline
        outline = await self._generate_outline(course_content, persona, user_profile)
        
        # Pass 2: Generate chapters in parallel
        chapters = await self._generate_chapters_parallel(
            outline, course_content, persona, user_profile
        )
        
        # Pass 3: Add transitions and ensure coherence
        enhanced_chapters = await self._enhance_coherence(chapters, persona)
        
        # Pass 4: Final personalization pass
        final_content = await self._final_personalization(
            enhanced_chapters, persona, course_name, user_profile
        )
        
        return final_content
    
    async def _generate_outline(
        self, 
        course_content: str, 
        persona: str,
        user_profile: Dict[str, Any]
    ) -> Dict[str, Any]:
        """Generate a detailed outline with chapter and subsection structure"""
        
        prompt = f"""You are an expert educational content architect. Create a COMPREHENSIVE outline for a personalized study guide.

COURSE CONTENT:
{course_content[:3000]}...

USER PROFILE:
- Persona: {persona}
- Learning Style: {user_profile.get('learning_style', 'visual')}
- Expertise: {user_profile.get('expertise_level', 'intermediate')}
- Interests: {user_profile.get('interests', 'technology')}

CREATE AN OUTLINE WITH:
- 5-7 comprehensive chapters (not just 3-4)
- Each chapter must have 3-5 detailed subsections
- Each subsection should have 2-3 key points to cover

Output JSON format:
{{
    "outline": [
        {{
            "chapterTitle": "Engaging chapter title tailored to user",
            "chapterGoal": "What the user will achieve",
            "subsections": [
                {{
                    "title": "Subsection title",
                    "keyPoints": ["Point 1", "Point 2", "Point 3"],
                    "estimatedWords": 600
                }}
            ]
        }}
    ]
}}

BE SPECIFIC. Make titles engaging and personalized to {persona}."""

        response = openai_client.chat.completions.create(
            model=self.model,
            messages=[
                {"role": "system", "content": "You are an expert at creating detailed educational outlines."},
                {"role": "user", "content": prompt}
            ],
            temperature=0.7,
            max_tokens=8000,
            response_format={"type": "json_object"}
        )
        
        return json.loads(response.choices[0].message.content)
    
    async def _generate_chapters_parallel(
        self,
        outline: Dict[str, Any],
        course_content: str,
        persona: str,
        user_profile: Dict[str, Any]
    ) -> List[Dict[str, Any]]:
        """Generate each chapter in parallel for maximum content"""
        
        tasks = []
        for chapter_outline in outline["outline"]:
            task = self._generate_single_chapter(
                chapter_outline, course_content, persona, user_profile
            )
            tasks.append(task)
        
        chapters = await asyncio.gather(*tasks)
        return chapters
    
    async def _generate_single_chapter(
        self,
        chapter_outline: Dict[str, Any],
        course_content: str,
        persona: str,
        user_profile: Dict[str, Any]
    ) -> Dict[str, Any]:
        """Generate a single chapter with full content"""
        
        prompt = f"""You are writing ONE CHAPTER of a personalized study guide. 

CHAPTER OUTLINE:
{json.dumps(chapter_outline, indent=2)}

USER PROFILE:
- Persona: {persona}
- Learning Style: {user_profile.get('learning_style', 'visual')}
- Interests: {user_profile.get('interests', 'technology')}

COURSE CONTEXT:
{course_content[:2000]}...

REQUIREMENTS:
1. Write ONLY this chapter: "{chapter_outline['chapterTitle']}"
2. Each subsection MUST be 500-700 words (NO LESS)
3. Use specific examples related to {user_profile.get('interests', 'their field')}
4. Include personal touches like "As someone who {persona}..."
5. DO NOT summarize - provide FULL, DETAILED explanations
6. Include code examples, diagrams descriptions, or step-by-step processes where relevant
7. USE MARKDOWN FORMATTING throughout:
   - **Bold** for key concepts and important terms
   - `Code blocks` for commands and technical examples
   - > Blockquotes for important tips and best practices
   - Bullet points and numbered lists for clarity
   - ### Subheadings within sections to organize content
   - Tables when comparing multiple concepts

Output JSON format:
{{
    "chapterTitle": "{chapter_outline['chapterTitle']}",
    "introduction": "200-word chapter introduction in Markdown format",
    "subsections": [
        {{
            "title": "Subsection title",
            "fullText": "500-700 words of rich, detailed content in MARKDOWN FORMAT. Use **bold**, `code blocks`, > blockquotes, bullet points, ### subheadings. Include examples, explanations, and insights. DO NOT STOP EARLY."
        }}
    ],
    "summary": "150-word chapter summary with key takeaways"
}}

REMEMBER: Each subsection needs 500-700 words of ACTUAL CONTENT, not summaries."""

        # Run in executor to avoid blocking
        loop = asyncio.get_event_loop()
        response = await loop.run_in_executor(
            self.executor,
            self._call_openai,
            prompt
        )
        
        return json.loads(response)
    
    def _call_openai(self, prompt: str) -> str:
        """Synchronous OpenAI call for executor"""
        response = openai_client.chat.completions.create(
            model=self.model,
            messages=[
                {"role": "system", "content": "You are an expert educational content writer who formats content in Markdown. Use **bold**, `code blocks`, > blockquotes, lists, and ### subheadings to create engaging, scannable content. Write comprehensive, detailed explanations."},
                {"role": "user", "content": prompt}
            ],
            temperature=0.8,
            max_tokens=self.max_tokens,
            response_format={"type": "json_object"}
        )
        return response.choices[0].message.content
    
    async def _enhance_coherence(
        self,
        chapters: List[Dict[str, Any]],
        persona: str
    ) -> List[Dict[str, Any]]:
        """Add transitions between chapters and ensure coherent flow"""
        
        for i in range(len(chapters) - 1):
            current_chapter = chapters[i]
            next_chapter = chapters[i + 1]
            
            # Add transition to end of current chapter
            transition_prompt = f"""Create a 100-word transition paragraph that:
1. Summarizes what we just learned in "{current_chapter['chapterTitle']}"
2. Creates excitement for "{next_chapter['chapterTitle']}"
3. Shows how the topics connect
4. Addresses the user directly as someone who {persona}

Just return the transition paragraph text, no JSON."""

            response = openai_client.chat.completions.create(
                model=self.model,
                messages=[
                    {"role": "system", "content": "You create smooth transitions between educational content."},
                    {"role": "user", "content": transition_prompt}
                ],
                temperature=0.7,
                max_tokens=200
            )
            
            current_chapter["transition"] = response.choices[0].message.content
        
        return chapters
    
    async def _final_personalization(
        self,
        chapters: List[Dict[str, Any]],
        persona: str,
        course_name: str,
        user_profile: Dict[str, Any]
    ) -> Dict[str, Any]:
        """Final assembly and personalization polish"""
        
        # Create engaging title
        title_prompt = f"""Create a personalized course title for someone who {persona}.
Course topic: {course_name}
Make it engaging and specific to their profile.
Return just the title, no quotes."""

        title_response = openai_client.chat.completions.create(
            model=self.model,
            messages=[
                {"role": "system", "content": "You create engaging, personalized titles."},
                {"role": "user", "content": title_prompt}
            ],
            temperature=0.9,
            max_tokens=50
        )
        
        personalized_title = title_response.choices[0].message.content.strip()
        
        # Assemble final structure
        final_content = {
            "title": personalized_title,
            "courseName": course_name,
            "userProfile": {
                "persona": persona,
                "learningStyle": user_profile.get('learning_style', 'visual'),
                "expertise": user_profile.get('expertise_level', 'intermediate')
            },
            "chapters": []
        }
        
        # Format chapters for final output
        for chapter in chapters:
            formatted_chapter = {
                "chapterTitle": chapter["chapterTitle"],
                "introduction": chapter.get("introduction", ""),
                "subsections": chapter["subsections"],
                "summary": chapter.get("summary", ""),
                "transition": chapter.get("transition", "")
            }
            final_content["chapters"].append(formatted_chapter)
        
        # Calculate total content stats
        total_words = sum(
            len(subsection["fullText"].split()) 
            for chapter in final_content["chapters"] 
            for subsection in chapter["subsections"]
        )
        
        final_content["contentStats"] = {
            "totalChapters": len(final_content["chapters"]),
            "totalSubsections": sum(len(ch["subsections"]) for ch in final_content["chapters"]),
            "estimatedWords": total_words,
            "estimatedReadingTime": f"{total_words // 200} minutes"
        }
        
        logger.info(f"Generated {total_words} words across {len(chapters)} chapters")
        
        return final_content


# Streaming support for real-time content delivery
async def stream_content_generation(
    orchestrator: ContentOrchestrator,
    course_content: str,
    persona: str,
    course_name: str,
    user_profile: Dict[str, Any],
    callback: callable
):
    """
    Stream content generation with progress updates
    
    Args:
        callback: Function called with (progress_percent, partial_content)
    """
    
    # Generate outline
    callback(10, {"status": "Generating comprehensive outline..."})
    outline = await orchestrator._generate_outline(course_content, persona, user_profile)
    
    callback(20, {"status": "Outline complete", "chapters": len(outline["outline"])})
    
    # Generate chapters with progress
    chapters = []
    chapter_count = len(outline["outline"])
    
    for i, chapter_outline in enumerate(outline["outline"]):
        progress = 20 + (60 * (i / chapter_count))
        callback(progress, {"status": f"Generating chapter {i+1}/{chapter_count}: {chapter_outline['chapterTitle']}"})
        
        chapter = await orchestrator._generate_single_chapter(
            chapter_outline, course_content, persona, user_profile
        )
        chapters.append(chapter)
        
        # Send partial content
        callback(progress + (60 / chapter_count), {
            "status": f"Chapter {i+1} complete",
            "partialContent": chapter
        })
    
    # Enhance coherence
    callback(85, {"status": "Adding transitions and enhancing flow..."})
    enhanced_chapters = await orchestrator._enhance_coherence(chapters, persona)
    
    # Final personalization
    callback(95, {"status": "Final personalization..."})
    final_content = await orchestrator._final_personalization(
        enhanced_chapters, persona, course_name, user_profile
    )
    
    callback(100, {"status": "Complete", "content": final_content})
    
    return final_content