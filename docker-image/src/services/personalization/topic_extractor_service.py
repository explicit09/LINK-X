"""
Enhanced Topic Extractor Service
Sophisticated topic extraction with hierarchical relationships and dependencies
"""

import logging
import json
from typing import List, Dict, Any, Optional, Tuple
from dataclasses import dataclass, asdict
from datetime import datetime

from services.document_outline_generator import DocumentOutlineGenerator
from services.ai.ai_service import AIService
from services.personalization.personalization_utils import PersonalizationUtils
from core.database_supabase import db_manager

logger = logging.getLogger(__name__)


@dataclass
class Topic:
    """Represents an extracted topic"""
    id: str
    title: str
    description: str
    key_concepts: List[str]
    importance_score: float  # 0-1
    difficulty_level: str  # beginner, intermediate, advanced
    estimated_time: int  # minutes
    prerequisites: List[str]  # IDs of prerequisite topics
    subtopics: List['Topic']
    content_range: Dict[str, int]  # start/end positions in content
    
    def to_dict(self) -> Dict:
        """Convert to dictionary"""
        data = asdict(self)
        data['subtopics'] = [subtopic.to_dict() for subtopic in self.subtopics]
        return data


@dataclass 
class TopicHierarchy:
    """Represents the complete topic structure"""
    document_title: str
    total_topics: int
    topics: List[Topic]
    learning_paths: List[List[str]]  # Multiple possible learning paths
    estimated_total_time: int
    complexity_distribution: Dict[str, int]
    
    def to_dict(self) -> Dict:
        """Convert to dictionary"""
        return {
            'document_title': self.document_title,
            'total_topics': self.total_topics,
            'topics': [topic.to_dict() for topic in self.topics],
            'learning_paths': self.learning_paths,
            'estimated_total_time': self.estimated_total_time,
            'complexity_distribution': self.complexity_distribution
        }


class EnhancedTopicExtractor:
    """
    Advanced topic extraction with multiple strategies
    """
    
    def __init__(self, ai_service: Optional[AIService] = None):
        self.ai_service = ai_service or AIService()
        self.utils = PersonalizationUtils()
        
    async def extract_topics(self, file_id: str, content: str, 
                           metadata: Optional[Dict] = None) -> TopicHierarchy:
        """
        Extract topics using multiple strategies and reconcile results
        """
        logger.info(f"Starting topic extraction for file {file_id}")
        
        # Strategy 1: Use existing document outline generator
        structure_topics = await self._extract_from_structure(file_id)
        
        # Strategy 2: AI-based deep analysis
        ai_topics = await self._extract_with_ai(content, metadata)
        
        # Strategy 3: Keyword clustering
        keyword_topics = self._extract_by_clustering(content)
        
        # Strategy 4: Section header analysis
        header_topics = self._extract_from_headers(content)
        
        # Reconcile all strategies
        reconciled_topics = self._reconcile_topics([
            structure_topics,
            ai_topics,
            keyword_topics,
            header_topics
        ])
        
        # Build hierarchy and dependencies
        hierarchy = self._build_topic_hierarchy(reconciled_topics, content, metadata)
        
        # Validate completeness
        hierarchy = self._validate_and_enhance(hierarchy, content)
        
        logger.info(f"Extracted {hierarchy.total_topics} topics with {len(hierarchy.learning_paths)} learning paths")
        
        return hierarchy
    
    async def _extract_from_structure(self, file_id: str) -> List[Topic]:
        """
        Use document outline generator for initial extraction
        """
        try:
            with db_manager.get_session() as session:
                generator = DocumentOutlineGenerator(session)
                outline = await generator.generate_outline(file_id)
                
                topics = []
                for idx, section in enumerate(outline):
                    topic = Topic(
                        id=f"topic-{idx+1}",
                        title=section.get('title', f'Section {idx+1}'),
                        description=section.get('content_preview', '')[:200],
                        key_concepts=section.get('keywords', []),
                        importance_score=0.8,  # Default high importance
                        difficulty_level=self._assess_difficulty(section),
                        estimated_time=self._estimate_time(section),
                        prerequisites=[],
                        subtopics=[],
                        content_range={
                            'start': section.get('chunk_start', 0),
                            'end': section.get('chunk_end', 0)
                        }
                    )
                    topics.append(topic)
                
                return topics
                
        except Exception as e:
            logger.warning(f"Structure extraction failed: {e}")
            return []
    
    async def _extract_with_ai(self, content: str, metadata: Optional[Dict]) -> List[Topic]:
        """
        Use AI for sophisticated topic extraction
        """
        prompt = f"""
        Analyze this educational content and extract major topics with deep insights.
        
        Document Info: {json.dumps(metadata or {})}
        Content Sample: {content[:4000]}...
        
        For each major topic, provide:
        1. Clear, descriptive title (3-7 words)
        2. Comprehensive description (2-3 sentences)
        3. 3-5 key concepts that learners must understand
        4. Importance score (0-1) based on:
           - How central it is to the document
           - How much other content depends on it
           - How frequently it's referenced
        5. Difficulty level (beginner/intermediate/advanced)
        6. Estimated learning time in minutes
        7. Prerequisites (other topic titles that should be learned first)
        8. 2-3 subtopics if applicable
        
        Also identify:
        - Logical learning sequences
        - Topic interdependencies
        - Natural groupings or themes
        
        Return as JSON with this structure:
        {{
            "topics": [
                {{
                    "title": "Topic Title",
                    "description": "Comprehensive description...",
                    "key_concepts": ["concept1", "concept2", "concept3"],
                    "importance_score": 0.9,
                    "difficulty_level": "intermediate",
                    "estimated_time": 20,
                    "prerequisites": ["Previous Topic Title"],
                    "subtopics": [
                        {{
                            "title": "Subtopic Title",
                            "key_concepts": ["subconcept1", "subconcept2"]
                        }}
                    ]
                }}
            ],
            "suggested_paths": [
                ["Topic 1", "Topic 2", "Topic 3"]
            ],
            "topic_groups": {{
                "Fundamentals": ["Topic 1", "Topic 2"],
                "Advanced": ["Topic 3", "Topic 4"]
            }}
        }}
        """
        
        try:
            response = await self.ai_service.generate_response(
                prompt=prompt,
                max_tokens=2000,
                temperature=0.3
            )
            
            result = json.loads(response.get('content', '{}'))
            topics = []
            
            for idx, topic_data in enumerate(result.get('topics', [])):
                # Process subtopics
                subtopics = []
                for sub_idx, subtopic_data in enumerate(topic_data.get('subtopics', [])):
                    subtopic = Topic(
                        id=f"topic-{idx+1}-{sub_idx+1}",
                        title=subtopic_data.get('title', ''),
                        description='',
                        key_concepts=subtopic_data.get('key_concepts', []),
                        importance_score=0.7,  # Subtopics slightly less important
                        difficulty_level=topic_data.get('difficulty_level', 'intermediate'),
                        estimated_time=5,  # Shorter time for subtopics
                        prerequisites=[],
                        subtopics=[],
                        content_range={}
                    )
                    subtopics.append(subtopic)
                
                topic = Topic(
                    id=f"ai-topic-{idx+1}",
                    title=topic_data.get('title', ''),
                    description=topic_data.get('description', ''),
                    key_concepts=topic_data.get('key_concepts', []),
                    importance_score=topic_data.get('importance_score', 0.8),
                    difficulty_level=topic_data.get('difficulty_level', 'intermediate'),
                    estimated_time=topic_data.get('estimated_time', 15),
                    prerequisites=topic_data.get('prerequisites', []),
                    subtopics=subtopics,
                    content_range={}
                )
                topics.append(topic)
            
            # Store suggested paths for later use
            self._suggested_paths = result.get('suggested_paths', [])
            self._topic_groups = result.get('topic_groups', {})
            
            return topics
            
        except Exception as e:
            logger.error(f"AI extraction failed: {e}")
            return []
    
    def _extract_by_clustering(self, content: str) -> List[Topic]:
        """
        Extract topics through keyword clustering
        """
        # Extract key concepts
        concepts = self.utils.extract_key_concepts(content, max_concepts=50)
        
        # Simple clustering based on co-occurrence
        # In production, could use more sophisticated NLP techniques
        clusters = self._cluster_concepts(concepts, content)
        
        topics = []
        for idx, cluster in enumerate(clusters[:8]):  # Limit to 8 topics
            topic = Topic(
                id=f"cluster-topic-{idx+1}",
                title=f"{cluster['main_concept'].title()} and Related Concepts",
                description=f"Topics related to {cluster['main_concept']}",
                key_concepts=cluster['concepts'][:5],
                importance_score=cluster['score'],
                difficulty_level='intermediate',
                estimated_time=15,
                prerequisites=[],
                subtopics=[],
                content_range={}
            )
            topics.append(topic)
        
        return topics
    
    def _extract_from_headers(self, content: str) -> List[Topic]:
        """
        Extract topics from markdown headers or document structure
        """
        topics = []
        
        # Find markdown headers
        import re
        header_pattern = r'^(#{1,3})\s+(.+)$'
        headers = re.findall(header_pattern, content, re.MULTILINE)
        
        for idx, (level, title) in enumerate(headers):
            # Extract content after this header
            header_pos = content.find(f"{level} {title}")
            next_header_pos = len(content)
            
            for next_idx in range(idx + 1, len(headers)):
                next_pos = content.find(f"{headers[next_idx][0]} {headers[next_idx][1]}")
                if next_pos > header_pos:
                    next_header_pos = next_pos
                    break
            
            section_content = content[header_pos:next_header_pos]
            
            topic = Topic(
                id=f"header-topic-{idx+1}",
                title=title.strip(),
                description=section_content[:200].strip(),
                key_concepts=self.utils.extract_key_concepts(section_content, max_concepts=3),
                importance_score=0.9 if len(level) == 1 else 0.8 if len(level) == 2 else 0.7,
                difficulty_level=self.utils.assess_content_complexity(section_content),
                estimated_time=max(5, len(section_content.split()) // 200),  # ~200 words per minute
                prerequisites=[],
                subtopics=[],
                content_range={'start': header_pos, 'end': next_header_pos}
            )
            topics.append(topic)
        
        return topics
    
    def _reconcile_topics(self, topic_lists: List[List[Topic]]) -> List[Topic]:
        """
        Reconcile topics from multiple extraction methods
        """
        # Combine all topics
        all_topics = []
        for topics in topic_lists:
            all_topics.extend(topics)
        
        # Group similar topics by title similarity
        grouped_topics = {}
        
        for topic in all_topics:
            # Find similar existing topics
            matched = False
            for key in grouped_topics:
                if self._calculate_similarity(topic.title, key) > 0.7:
                    grouped_topics[key].append(topic)
                    matched = True
                    break
            
            if not matched:
                grouped_topics[topic.title] = [topic]
        
        # Merge similar topics
        reconciled = []
        for title, similar_topics in grouped_topics.items():
            if len(similar_topics) == 1:
                reconciled.append(similar_topics[0])
            else:
                # Merge topics
                merged = self._merge_topics(similar_topics)
                reconciled.append(merged)
        
        # Sort by importance
        reconciled.sort(key=lambda t: t.importance_score, reverse=True)
        
        # Reassign IDs
        for idx, topic in enumerate(reconciled):
            topic.id = f"topic-{idx+1}"
        
        return reconciled
    
    def _merge_topics(self, topics: List[Topic]) -> Topic:
        """
        Merge similar topics into one comprehensive topic
        """
        # Use the most detailed title
        title = max(topics, key=lambda t: len(t.title)).title
        
        # Combine descriptions
        descriptions = [t.description for t in topics if t.description]
        description = ' '.join(descriptions)[:300]
        
        # Combine and deduplicate concepts
        all_concepts = []
        for topic in topics:
            all_concepts.extend(topic.key_concepts)
        key_concepts = list(dict.fromkeys(all_concepts))[:5]
        
        # Average importance scores
        importance_score = sum(t.importance_score for t in topics) / len(topics)
        
        # Take most common difficulty level
        difficulties = [t.difficulty_level for t in topics]
        difficulty_level = max(set(difficulties), key=difficulties.count)
        
        # Sum estimated times
        estimated_time = sum(t.estimated_time for t in topics) // len(topics)
        
        # Combine prerequisites
        all_prereqs = []
        for topic in topics:
            all_prereqs.extend(topic.prerequisites)
        prerequisites = list(dict.fromkeys(all_prereqs))
        
        # Combine subtopics
        all_subtopics = []
        for topic in topics:
            all_subtopics.extend(topic.subtopics)
        
        # Merge content ranges
        start_positions = [t.content_range.get('start', 0) for t in topics if t.content_range]
        end_positions = [t.content_range.get('end', 0) for t in topics if t.content_range]
        
        content_range = {
            'start': min(start_positions) if start_positions else 0,
            'end': max(end_positions) if end_positions else 0
        }
        
        return Topic(
            id=topics[0].id,  # Will be reassigned
            title=title,
            description=description,
            key_concepts=key_concepts,
            importance_score=importance_score,
            difficulty_level=difficulty_level,
            estimated_time=estimated_time,
            prerequisites=prerequisites,
            subtopics=all_subtopics,
            content_range=content_range
        )
    
    def _build_topic_hierarchy(self, topics: List[Topic], content: str, 
                             metadata: Optional[Dict]) -> TopicHierarchy:
        """
        Build complete topic hierarchy with learning paths
        """
        # Calculate complexity distribution
        complexity_dist = {
            'beginner': 0,
            'intermediate': 0,
            'advanced': 0
        }
        
        for topic in topics:
            complexity_dist[topic.difficulty_level] = complexity_dist.get(topic.difficulty_level, 0) + 1
        
        # Generate learning paths
        learning_paths = self._generate_learning_paths(topics)
        
        # Calculate total time
        total_time = sum(topic.estimated_time for topic in topics)
        
        return TopicHierarchy(
            document_title=metadata.get('title', 'Document') if metadata else 'Document',
            total_topics=len(topics),
            topics=topics,
            learning_paths=learning_paths,
            estimated_total_time=total_time,
            complexity_distribution=complexity_dist
        )
    
    def _generate_learning_paths(self, topics: List[Topic]) -> List[List[str]]:
        """
        Generate multiple learning paths based on dependencies and difficulty
        """
        paths = []
        
        # Path 1: Linear by difficulty (beginner → advanced)
        difficulty_path = sorted(topics, key=lambda t: (
            0 if t.difficulty_level == 'beginner' else 
            1 if t.difficulty_level == 'intermediate' else 2
        ))
        paths.append([t.id for t in difficulty_path])
        
        # Path 2: By importance (most important first)
        importance_path = sorted(topics, key=lambda t: t.importance_score, reverse=True)
        paths.append([t.id for t in importance_path])
        
        # Path 3: Dependency-based (prerequisites first)
        dependency_path = self._topological_sort(topics)
        if dependency_path:
            paths.append(dependency_path)
        
        # Path 4: Use AI-suggested paths if available
        if hasattr(self, '_suggested_paths'):
            for suggested_path in self._suggested_paths:
                # Map topic titles to IDs
                path_ids = []
                for title in suggested_path:
                    for topic in topics:
                        if topic.title == title:
                            path_ids.append(topic.id)
                            break
                if path_ids:
                    paths.append(path_ids)
        
        # Remove duplicates
        unique_paths = []
        for path in paths:
            if path not in unique_paths:
                unique_paths.append(path)
        
        return unique_paths[:3]  # Return top 3 unique paths
    
    def _topological_sort(self, topics: List[Topic]) -> Optional[List[str]]:
        """
        Sort topics based on prerequisites (topological sort)
        """
        # Build adjacency list
        graph = {topic.id: [] for topic in topics}
        in_degree = {topic.id: 0 for topic in topics}
        
        # Map titles to IDs for prerequisite matching
        title_to_id = {topic.title: topic.id for topic in topics}
        
        for topic in topics:
            for prereq in topic.prerequisites:
                if prereq in title_to_id:
                    graph[title_to_id[prereq]].append(topic.id)
                    in_degree[topic.id] += 1
        
        # Kahn's algorithm
        queue = [topic_id for topic_id, degree in in_degree.items() if degree == 0]
        result = []
        
        while queue:
            current = queue.pop(0)
            result.append(current)
            
            for neighbor in graph[current]:
                in_degree[neighbor] -= 1
                if in_degree[neighbor] == 0:
                    queue.append(neighbor)
        
        # Check if all topics are included (no cycles)
        if len(result) == len(topics):
            return result
        else:
            # Has cycles, return None
            return None
    
    def _validate_and_enhance(self, hierarchy: TopicHierarchy, content: str) -> TopicHierarchy:
        """
        Validate topic coverage and enhance if needed
        """
        # Calculate content coverage
        covered_length = 0
        for topic in hierarchy.topics:
            if topic.content_range:
                covered_length += topic.content_range.get('end', 0) - topic.content_range.get('start', 0)
        
        coverage_ratio = covered_length / len(content) if content else 0
        
        # If coverage is low, add catch-all topic
        if coverage_ratio < 0.8:
            additional_topic = Topic(
                id=f"topic-{len(hierarchy.topics)+1}",
                title="Additional Topics and Details",
                description="Other important concepts and information covered in this document",
                key_concepts=self.utils.extract_key_concepts(content, max_concepts=3),
                importance_score=0.6,
                difficulty_level='intermediate',
                estimated_time=10,
                prerequisites=[],
                subtopics=[],
                content_range={'start': 0, 'end': len(content)}
            )
            hierarchy.topics.append(additional_topic)
            hierarchy.total_topics += 1
        
        return hierarchy
    
    def _calculate_similarity(self, text1: str, text2: str) -> float:
        """
        Calculate similarity between two texts (0-1)
        """
        # Simple word overlap similarity
        words1 = set(text1.lower().split())
        words2 = set(text2.lower().split())
        
        if not words1 or not words2:
            return 0.0
        
        intersection = words1 & words2
        union = words1 | words2
        
        return len(intersection) / len(union)
    
    def _cluster_concepts(self, concepts: List[str], content: str) -> List[Dict]:
        """
        Cluster concepts based on co-occurrence
        """
        # Simple co-occurrence clustering
        clusters = []
        
        for concept in concepts[:10]:  # Limit to top 10 concepts
            # Find concepts that often appear near this concept
            related = []
            concept_positions = [m.start() for m in re.finditer(concept, content.lower())]
            
            for other_concept in concepts:
                if other_concept != concept:
                    # Check if concepts appear within 200 characters of each other
                    other_positions = [m.start() for m in re.finditer(other_concept, content.lower())]
                    
                    co_occurrences = 0
                    for pos1 in concept_positions:
                        for pos2 in other_positions:
                            if abs(pos1 - pos2) < 200:
                                co_occurrences += 1
                    
                    if co_occurrences > 2:
                        related.append(other_concept)
            
            if related:
                clusters.append({
                    'main_concept': concept,
                    'concepts': [concept] + related[:4],
                    'score': 0.8 - (0.1 * len(clusters))  # Decrease score for later clusters
                })
        
        return clusters
    
    def _assess_difficulty(self, section: Dict) -> str:
        """
        Assess difficulty level of a section
        """
        content = section.get('content_preview', '')
        return self.utils.assess_content_complexity(content)
    
    def _estimate_time(self, section: Dict) -> int:
        """
        Estimate learning time for a section
        """
        content = section.get('content_preview', '')
        word_count = len(content.split())
        
        # Estimate based on ~200 words per minute reading speed
        # Plus additional time for complexity
        base_time = word_count // 200
        
        complexity = self._assess_difficulty(section)
        if complexity == 'complex':
            return max(10, base_time * 2)
        elif complexity == 'moderate':
            return max(7, int(base_time * 1.5))
        else:
            return max(5, base_time)