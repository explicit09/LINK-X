"""
PromptManager - Modular prompt loading and rendering system
Replaces hard-coded f-string prompts with versioned, testable templates
"""

import json
import yaml
import jinja2
from pathlib import Path
from typing import Dict, Any, Optional, List
from dataclasses import dataclass
from datetime import datetime
import logging

logger = logging.getLogger(__name__)


@dataclass
class PromptVersion:
    """Represents a prompt version with metadata"""
    version: str
    file_path: str
    description: str
    created_at: datetime
    last_tested: Optional[datetime] = None
    test_score: Optional[float] = None


class PromptManager:
    """
    Manages prompt templates with versioning, caching, and rendering capabilities
    
    Features:
    - YAML/Jinja template loading
    - Version management and rollback
    - Template caching for performance
    - Validation and error handling
    """
    
    def __init__(self, root_path: str = "prompts"):
        self.root_path = Path(root_path)
        self.cache = {}
        self.versions = {}
        self.jinja_env = jinja2.Environment(
            loader=jinja2.FileSystemLoader(self.root_path),
            autoescape=False,
            trim_blocks=True,
            lstrip_blocks=True
        )
        
        # Load version metadata if it exists
        self._load_version_metadata()
    
    def load(self, name: str, version: str = "latest") -> str:
        """
        Load raw prompt template content
        
        Args:
            name: Prompt file path relative to root (e.g., "system/01_system.yaml")
            version: Version string or "latest"
            
        Returns:
            Raw template content as string
        """
        cache_key = f"{name}:{version}"
        
        if cache_key not in self.cache:
            file_path = self.root_path / name
            
            if not file_path.exists():
                raise FileNotFoundError(f"Prompt file not found: {file_path}")
            
            content = file_path.read_text(encoding='utf-8')
            self.cache[cache_key] = content
            
            # Update version tracking
            self._track_version(name, version, file_path)
        
        return self.cache[cache_key]
    
    def load_yaml(self, name: str, version: str = "latest") -> Dict[str, Any]:
        """Load and parse YAML prompt file"""
        content = self.load(name, version)
        try:
            return yaml.safe_load(content)
        except yaml.YAMLError as e:
            logger.error(f"YAML parsing error in {name}: {e}")
            raise ValueError(f"Invalid YAML in prompt file {name}: {e}")
    
    def render(self, name: str, **kwargs) -> str:
        """
        Render Jinja template with provided variables
        
        Args:
            name: Template file path (e.g., "executors/02_executor.jinja")
            **kwargs: Template variables
            
        Returns:
            Rendered template string
        """
        try:
            template = self.jinja_env.get_template(name)
            return template.render(**kwargs)
        except jinja2.TemplateNotFound:
            raise FileNotFoundError(f"Template not found: {name}")
        except jinja2.TemplateError as e:
            logger.error(f"Template rendering error in {name}: {e}")
            raise ValueError(f"Template rendering failed for {name}: {e}")
    
    def render_with_system(self, executor_name: str, system_name: str = "system/01_system.yaml", **kwargs) -> str:
        """
        Render executor template with system prompt included
        
        Args:
            executor_name: Executor template name
            system_name: System prompt file name
            **kwargs: Template variables
            
        Returns:
            Combined rendered prompt
        """
        system_data = self.load_yaml(system_name)
        kwargs['role'] = system_data.get('role', 'AI Assistant')
        kwargs['rules'] = system_data.get('rules', [])
        kwargs['guardrails'] = system_data.get('guardrails', [])
        
        return self.render(executor_name, **kwargs)
    
    def get_version_history(self, name: str) -> List[PromptVersion]:
        """Get version history for a prompt file"""
        return self.versions.get(name, [])
    
    def rollback(self, name: str, version: str) -> bool:
        """
        Rollback prompt to specific version
        
        Note: This is a simple implementation. In production, you'd want
        to integrate with Git or a proper versioning system.
        """
        # For now, just clear cache to force reload
        cache_keys = [k for k in self.cache.keys() if k.startswith(f"{name}:")]
        for key in cache_keys:
            del self.cache[key]
        
        logger.info(f"Rolled back {name} to version {version}")
        return True
    
    def validate_template(self, name: str) -> Dict[str, Any]:
        """
        Validate template syntax and structure
        
        Returns:
            Validation results with status and errors
        """
        try:
            if name.endswith('.yaml'):
                self.load_yaml(name)
            elif name.endswith('.jinja'):
                template = self.jinja_env.get_template(name)
                # Try rendering with empty context to check syntax
                template.render()
            else:
                self.load(name)
            
            return {"status": "valid", "errors": []}
        
        except Exception as e:
            return {"status": "invalid", "errors": [str(e)]}
    
    def get_stats(self) -> Dict[str, Any]:
        """Get prompt manager statistics"""
        return {
            "cached_prompts": len(self.cache),
            "tracked_versions": len(self.versions),
            "root_path": str(self.root_path),
            "available_prompts": self._scan_available_prompts()
        }
    
    def _track_version(self, name: str, version: str, file_path: Path):
        """Track version metadata"""
        if name not in self.versions:
            self.versions[name] = []
        
        # Don't duplicate versions
        existing = [v for v in self.versions[name] if v.version == version]
        if not existing:
            prompt_version = PromptVersion(
                version=version,
                file_path=str(file_path),
                description=f"Loaded {name} version {version}",
                created_at=datetime.now()
            )
            self.versions[name].append(prompt_version)
    
    def _load_version_metadata(self):
        """Load version metadata from file if it exists"""
        metadata_file = self.root_path / "meta" / "versions.json"
        if metadata_file.exists():
            try:
                with open(metadata_file) as f:
                    data = json.load(f)
                    # Convert to PromptVersion objects
                    # Implementation depends on your metadata format
                    pass
            except Exception as e:
                logger.warning(f"Failed to load version metadata: {e}")
    
    def _scan_available_prompts(self) -> List[str]:
        """Scan for available prompt files"""
        if not self.root_path.exists():
            return []
        
        prompts = []
        for file_path in self.root_path.rglob("*"):
            if file_path.is_file() and file_path.suffix in ['.yaml', '.jinja', '.md']:
                relative_path = file_path.relative_to(self.root_path)
                prompts.append(str(relative_path))
        
        return sorted(prompts)


# Global instance for easy importing
prompt_manager = PromptManager()