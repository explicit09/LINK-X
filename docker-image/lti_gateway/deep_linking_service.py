#!/usr/bin/env python3
"""
LTI Deep Linking Service - BRUTAL EXECUTION
Handles content selection and linking from LEARN-X to LMS
"""

import os
import json
import time
from typing import Dict, Any, Optional, List
from dataclasses import dataclass
from datetime import datetime
import structlog
from database.db_manager import db_manager

logger = structlog.get_logger()

@dataclass
class ContentItem:
    """Deep Linking Content Item"""
    id: str
    platform_id: str
    content_type: str
    title: str
    description: Optional[str]
    target_url: str
    custom_params: Dict[str, Any]
    icon_url: Optional[str]
    thumbnail_url: Optional[str]
    active: bool

@dataclass
class DeepLinkingResponse:
    """Deep Linking Response for LMS"""
    content_items: List[Dict[str, Any]]
    data: Optional[str] = None
    log: Optional[str] = None
    error_message: Optional[str] = None

class DeepLinkingService:
    """
    Deep Linking Service Implementation
    
    Features:
    - Content item management
    - Dynamic content selection
    - Custom parameter handling
    - Multi-format content support
    """
    
    def __init__(self):
        self.supported_types = [
            'ltiResourceLink',
            'link', 
            'file',
            'html',
            'image'
        ]
    
    def get_available_content(self, platform_id: str, context_id: str = None) -> List[ContentItem]:
        """Get available content items for deep linking"""
        try:
            query = """
            SELECT * FROM lti_content_items 
            WHERE platform_id = %s AND active = true
            ORDER BY title ASC
            """
            
            results = db_manager.execute_query(query, (platform_id,))
            
            content_items = []
            for row in results:
                content_items.append(ContentItem(
                    id=str(row['id']),
                    platform_id=str(row['platform_id']),
                    content_type=row['content_type'],
                    title=row['title'],
                    description=row['description'],
                    target_url=row['target_url'],
                    custom_params=row['custom_params'] or {},
                    icon_url=row['icon_url'],
                    thumbnail_url=row['thumbnail_url'],
                    active=row['active']
                ))
            
            # Add dynamic LEARN-X content
            dynamic_content = self._get_dynamic_learn_x_content(platform_id, context_id)
            content_items.extend(dynamic_content)
            
            logger.info("Retrieved content items for deep linking",
                       platform_id=platform_id,
                       content_count=len(content_items))
            
            return content_items
            
        except Exception as e:
            logger.error("Failed to get available content",
                        platform_id=platform_id,
                        error=str(e))
            return []
    
    def create_content_item(self, platform_id: str, content_data: Dict[str, Any]) -> str:
        """Create new content item"""
        try:
            query = """
            INSERT INTO lti_content_items (
                id, platform_id, content_type, title, description,
                target_url, custom_params, icon_url, thumbnail_url, active
            ) VALUES (
                gen_random_uuid(), %s, %s, %s, %s, %s, %s, %s, %s, %s
            ) RETURNING id
            """
            
            params = (
                platform_id,
                content_data['content_type'],
                content_data['title'],
                content_data.get('description'),
                content_data['target_url'],
                json.dumps(content_data.get('custom_params', {})),
                content_data.get('icon_url'),
                content_data.get('thumbnail_url'),
                content_data.get('active', True)
            )
            
            result = db_manager.execute_query(query, params)
            content_id = str(result[0]['id'])
            
            logger.info("Content item created",
                       content_id=content_id,
                       title=content_data['title'],
                       content_type=content_data['content_type'])
            
            return content_id
            
        except Exception as e:
            logger.error("Failed to create content item",
                        platform_id=platform_id,
                        error=str(e))
            raise
    
    def build_deep_linking_response(self, platform_id: str, selected_content_ids: List[str],
                                  context_data: Dict[str, Any] = None) -> DeepLinkingResponse:
        """Build deep linking response for LMS"""
        try:
            content_items = []
            
            for content_id in selected_content_ids:
                content_item = self._get_content_item_by_id(content_id)
                if content_item and content_item.active:
                    
                    # Build LTI-compliant content item
                    lti_content_item = {
                        "type": content_item.content_type,
                        "title": content_item.title,
                        "url": content_item.target_url
                    }
                    
                    # Add optional fields
                    if content_item.description:
                        lti_content_item["text"] = content_item.description
                    
                    if content_item.icon_url:
                        lti_content_item["icon"] = {
                            "url": content_item.icon_url,
                            "width": 32,
                            "height": 32
                        }
                    
                    if content_item.thumbnail_url:
                        lti_content_item["thumbnail"] = {
                            "url": content_item.thumbnail_url,
                            "width": 200,
                            "height": 150
                        }
                    
                    # Add custom parameters
                    if content_item.custom_params:
                        lti_content_item["custom"] = content_item.custom_params
                    
                    # Add platform-specific context
                    if context_data:
                        lti_content_item["custom"] = lti_content_item.get("custom", {})
                        lti_content_item["custom"].update({
                            "context_id": context_data.get("context_id"),
                            "platform_id": platform_id,
                            "timestamp": datetime.utcnow().isoformat()
                        })
                    
                    content_items.append(lti_content_item)
            
            response = DeepLinkingResponse(
                content_items=content_items,
                data=json.dumps(context_data) if context_data else None,
                log=f"Selected {len(content_items)} content items for integration"
            )
            
            logger.info("Deep linking response built",
                       platform_id=platform_id,
                       selected_items=len(selected_content_ids),
                       valid_items=len(content_items))
            
            return response
            
        except Exception as e:
            logger.error("Failed to build deep linking response",
                        platform_id=platform_id,
                        error=str(e))
            
            return DeepLinkingResponse(
                content_items=[],
                error_message=f"Failed to process content selection: {str(e)}"
            )
    
    def _get_dynamic_learn_x_content(self, platform_id: str, context_id: str = None) -> List[ContentItem]:
        """Generate dynamic LEARN-X content items"""
        base_url = os.environ.get('LEARN_X_API_BASE', 'http://localhost:5000')
        
        dynamic_content = [
            ContentItem(
                id="learn-x-ai-tutor",
                platform_id=platform_id,
                content_type="ltiResourceLink",
                title="LEARN-X AI Tutor",
                description="Personalized AI tutoring powered by advanced language models",
                target_url=f"{base_url}/lti/launch",
                custom_params={
                    "content_type": "ai_tutor",
                    "features": ["chat", "personalization", "progress_tracking"],
                    "ai_models": ["claude", "gpt4", "gemini"]
                },
                icon_url=f"{base_url}/static/icons/ai-tutor.png",
                thumbnail_url=f"{base_url}/static/thumbnails/ai-tutor.jpg",
                active=True
            ),
            ContentItem(
                id="learn-x-content-generator",
                platform_id=platform_id,
                content_type="ltiResourceLink", 
                title="LEARN-X Content Generator",
                description="AI-powered content and quiz generation for educators",
                target_url=f"{base_url}/lti/launch",
                custom_params={
                    "content_type": "content_generator",
                    "features": ["quiz_generation", "content_creation", "assessment"],
                    "roles": ["instructor", "admin"]
                },
                icon_url=f"{base_url}/static/icons/content-gen.png",
                thumbnail_url=f"{base_url}/static/thumbnails/content-gen.jpg",
                active=True
            ),
            ContentItem(
                id="learn-x-analytics",
                platform_id=platform_id,
                content_type="ltiResourceLink",
                title="LEARN-X Analytics Dashboard", 
                description="Comprehensive learning analytics and progress insights",
                target_url=f"{base_url}/lti/launch",
                custom_params={
                    "content_type": "analytics",
                    "features": ["progress_tracking", "performance_analytics", "recommendations"],
                    "roles": ["instructor", "admin", "student"]
                },
                icon_url=f"{base_url}/static/icons/analytics.png",
                thumbnail_url=f"{base_url}/static/thumbnails/analytics.jpg",
                active=True
            )
        ]
        
        return dynamic_content
    
    def _get_content_item_by_id(self, content_id: str) -> Optional[ContentItem]:
        """Get content item by ID"""
        try:
            # Check if it's a dynamic content ID
            if content_id.startswith("learn-x-"):
                # Handle dynamic content
                dynamic_items = self._get_dynamic_learn_x_content("", "")
                for item in dynamic_items:
                    if item.id == content_id:
                        return item
                return None
            
            # Query database for stored content
            query = """
            SELECT * FROM lti_content_items 
            WHERE id = %s AND active = true
            LIMIT 1
            """
            
            results = db_manager.execute_query(query, (content_id,))
            
            if not results:
                return None
            
            row = results[0]
            return ContentItem(
                id=str(row['id']),
                platform_id=str(row['platform_id']),
                content_type=row['content_type'],
                title=row['title'],
                description=row['description'],
                target_url=row['target_url'],
                custom_params=row['custom_params'] or {},
                icon_url=row['icon_url'],
                thumbnail_url=row['thumbnail_url'],
                active=row['active']
            )
            
        except Exception as e:
            logger.error("Failed to get content item",
                        content_id=content_id,
                        error=str(e))
            return None

# Global deep linking service instance
deep_linking_service = DeepLinkingService()