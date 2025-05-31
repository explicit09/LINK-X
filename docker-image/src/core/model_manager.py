"""
Model Manager - Multi-model support for optimal AI task matching
Supports OpenAI, Claude, Gemini, and Perplexity for different use cases
"""

import logging
import os
from typing import Dict, Any, List, Optional, Union
from dataclasses import dataclass
from enum import Enum
import json

logger = logging.getLogger(__name__)


class ModelProvider(Enum):
    """Supported AI model providers"""
    OPENAI = "openai"
    CLAUDE = "claude" 
    GEMINI = "gemini"
    PERPLEXITY = "perplexity"


class TaskType(Enum):
    """AI task types for optimal model selection"""
    SIMPLE_QA = "simple_qa"              # Basic questions and explanations
    COMPLEX_REASONING = "complex_reasoning"  # Multi-step logical reasoning
    CODE_GENERATION = "code_generation"   # Programming and code tasks
    RESEARCH = "research"                # Information gathering and synthesis
    CREATIVE_WRITING = "creative_writing" # Content creation and storytelling
    MULTIMODAL = "multimodal"           # Image, video, audio processing
    MATH_SCIENCE = "math_science"       # Mathematical and scientific problems
    CRITIQUE_ANALYSIS = "critique_analysis" # Quality assessment and review


@dataclass
class ModelConfig:
    """Configuration for a specific model"""
    provider: ModelProvider
    model_name: str
    max_tokens: int
    temperature: float
    cost_per_1k_input: float
    cost_per_1k_output: float
    latency_estimate: float  # seconds
    strengths: List[TaskType]
    api_key_env: str
    rate_limit_rpm: int


@dataclass
class ModelSelection:
    """Result of model selection process"""
    provider: ModelProvider
    model_name: str
    reasoning: str
    estimated_cost: float
    estimated_latency: float
    confidence: float


class ModelManager:
    """
    Intelligent model selection and management system
    
    Features:
    - Task-based model selection
    - Cost and latency optimization
    - Fallback model support
    - Performance tracking
    - Rate limiting awareness
    """
    
    def __init__(self):
        self.models = self._initialize_models()
        self.usage_stats = {}
        self.current_selections = {}
        
        # Performance tracking
        self.performance_history = {
            'total_requests': 0,
            'model_usage': {},
            'avg_latency_by_model': {},
            'cost_savings': 0.0
        }
    
    def _initialize_models(self) -> Dict[str, ModelConfig]:
        """Initialize supported models with their configurations"""
        return {
            # OpenAI Models
            "gpt-4o": ModelConfig(
                provider=ModelProvider.OPENAI,
                model_name="gpt-4o",
                max_tokens=4096,
                temperature=0.0,
                cost_per_1k_input=0.005,
                cost_per_1k_output=0.015,
                latency_estimate=3.0,
                strengths=[TaskType.COMPLEX_REASONING, TaskType.CODE_GENERATION, TaskType.MATH_SCIENCE],
                api_key_env="OPENAI_API_KEY",
                rate_limit_rpm=500
            ),
            "gpt-4o-mini": ModelConfig(
                provider=ModelProvider.OPENAI,
                model_name="gpt-4o-mini",
                max_tokens=4096,
                temperature=0.0,
                cost_per_1k_input=0.00015,
                cost_per_1k_output=0.0006,
                latency_estimate=2.0,
                strengths=[TaskType.SIMPLE_QA, TaskType.CRITIQUE_ANALYSIS],
                api_key_env="OPENAI_API_KEY",
                rate_limit_rpm=1000
            ),
            
            # Claude Models (Anthropic)
            "claude-3-5-sonnet": ModelConfig(
                provider=ModelProvider.CLAUDE,
                model_name="claude-3-5-sonnet-20241022",
                max_tokens=4096,
                temperature=0.0,
                cost_per_1k_input=0.003,
                cost_per_1k_output=0.015,
                latency_estimate=3.5,
                strengths=[TaskType.COMPLEX_REASONING, TaskType.CREATIVE_WRITING, TaskType.RESEARCH],
                api_key_env="ANTHROPIC_API_KEY",
                rate_limit_rpm=400
            ),
            "claude-3-haiku": ModelConfig(
                provider=ModelProvider.CLAUDE,
                model_name="claude-3-haiku-20240307",
                max_tokens=4096,
                temperature=0.0,
                cost_per_1k_input=0.00025,
                cost_per_1k_output=0.00125,
                latency_estimate=1.5,
                strengths=[TaskType.SIMPLE_QA, TaskType.CRITIQUE_ANALYSIS],
                api_key_env="ANTHROPIC_API_KEY",
                rate_limit_rpm=800
            ),
            
            # Gemini Models (Google)
            "gemini-1.5-pro": ModelConfig(
                provider=ModelProvider.GEMINI,
                model_name="gemini-1.5-pro",
                max_tokens=4096,
                temperature=0.0,
                cost_per_1k_input=0.00125,
                cost_per_1k_output=0.005,
                latency_estimate=4.0,
                strengths=[TaskType.MULTIMODAL, TaskType.RESEARCH, TaskType.MATH_SCIENCE],
                api_key_env="GOOGLE_API_KEY",
                rate_limit_rpm=300
            ),
            "gemini-1.5-flash": ModelConfig(
                provider=ModelProvider.GEMINI,
                model_name="gemini-1.5-flash",
                max_tokens=4096,
                temperature=0.0,
                cost_per_1k_input=0.000075,
                cost_per_1k_output=0.0003,
                latency_estimate=1.0,
                strengths=[TaskType.SIMPLE_QA, TaskType.CODE_GENERATION],
                api_key_env="GOOGLE_API_KEY",
                rate_limit_rpm=1000
            ),
            
            # Perplexity Models
            "perplexity-sonar": ModelConfig(
                provider=ModelProvider.PERPLEXITY,
                model_name="llama-3.1-sonar-large-128k-online",
                max_tokens=4096,
                temperature=0.0,
                cost_per_1k_input=0.001,
                cost_per_1k_output=0.001,
                latency_estimate=2.5,
                strengths=[TaskType.RESEARCH, TaskType.SIMPLE_QA],
                api_key_env="PERPLEXITY_API_KEY",
                rate_limit_rpm=500
            )
        }
    
    def select_model(
        self,
        task_type: TaskType,
        query: str,
        context: Optional[Dict[str, Any]] = None,
        constraints: Optional[Dict[str, Any]] = None
    ) -> ModelSelection:
        """
        Select optimal model for the given task
        
        Args:
            task_type: Type of AI task to perform
            query: The actual query/prompt
            context: Additional context for selection
            constraints: Budget, latency, or other constraints
            
        Returns:
            ModelSelection with chosen model and reasoning
        """
        constraints = constraints or {}
        
        # Filter models by availability (API keys)
        available_models = self._get_available_models()
        
        if not available_models:
            raise ValueError("No models available - check API key configuration")
        
        # Filter by task type strengths
        suitable_models = [
            (name, config) for name, config in available_models.items()
            if task_type in config.strengths
        ]
        
        if not suitable_models:
            # Fallback to general purpose models
            suitable_models = [(name, config) for name, config in available_models.items()
                             if TaskType.COMPLEX_REASONING in config.strengths]
        
        # Apply constraints
        filtered_models = self._apply_constraints(suitable_models, constraints)
        
        if not filtered_models:
            # Use cheapest available model as last resort
            cheapest = min(available_models.items(), 
                         key=lambda x: x[1].cost_per_1k_input + x[1].cost_per_1k_output)
            filtered_models = [cheapest]
        
        # Select optimal model based on scoring
        selected_model = self._score_and_select(filtered_models, task_type, query, constraints)
        
        # Estimate costs
        estimated_tokens = len(query.split()) * 1.3  # Rough estimate
        estimated_cost = (
            estimated_tokens / 1000 * selected_model[1].cost_per_1k_input +
            estimated_tokens / 1000 * selected_model[1].cost_per_1k_output
        )
        
        self._track_selection(selected_model[0], task_type)
        
        return ModelSelection(
            provider=selected_model[1].provider,
            model_name=selected_model[1].model_name,
            reasoning=self._generate_selection_reasoning(selected_model, task_type, constraints),
            estimated_cost=estimated_cost,
            estimated_latency=selected_model[1].latency_estimate,
            confidence=0.9  # High confidence in our selection logic
        )
    
    def _get_available_models(self) -> Dict[str, ModelConfig]:
        """Get models with available API keys"""
        available = {}
        
        for name, config in self.models.items():
            api_key = os.getenv(config.api_key_env)
            if api_key and len(api_key.strip()) > 10:  # Basic validation
                available[name] = config
            else:
                logger.debug(f"Model {name} unavailable - missing {config.api_key_env}")
        
        return available
    
    def _apply_constraints(
        self, 
        models: List[tuple], 
        constraints: Dict[str, Any]
    ) -> List[tuple]:
        """Apply budget, latency, and other constraints"""
        filtered = models
        
        # Latency constraint
        max_latency = constraints.get('max_latency_seconds')
        if max_latency:
            filtered = [(name, config) for name, config in filtered 
                       if config.latency_estimate <= max_latency]
        
        # Budget constraint
        max_cost_per_1k = constraints.get('max_cost_per_1k_tokens')
        if max_cost_per_1k:
            filtered = [(name, config) for name, config in filtered 
                       if (config.cost_per_1k_input + config.cost_per_1k_output) <= max_cost_per_1k]
        
        # Provider preference
        preferred_provider = constraints.get('preferred_provider')
        if preferred_provider:
            provider_filtered = [(name, config) for name, config in filtered 
                               if config.provider.value == preferred_provider]
            if provider_filtered:
                filtered = provider_filtered
        
        return filtered
    
    def _score_and_select(
        self, 
        models: List[tuple], 
        task_type: TaskType, 
        query: str,
        constraints: Dict[str, Any]
    ) -> tuple:
        """Score models and select the best one"""
        scored_models = []
        
        for name, config in models:
            score = 0.0
            
            # Task fit score (40%)
            if task_type in config.strengths:
                score += 0.4
            
            # Cost efficiency score (30%)
            total_cost = config.cost_per_1k_input + config.cost_per_1k_output
            min_cost = min(c.cost_per_1k_input + c.cost_per_1k_output for _, c in models)
            cost_score = (1 - (total_cost - min_cost) / total_cost) if total_cost > 0 else 1.0
            score += 0.3 * cost_score
            
            # Latency score (20%)
            min_latency = min(c.latency_estimate for _, c in models)
            latency_score = min_latency / config.latency_estimate
            score += 0.2 * latency_score
            
            # Historical performance score (10%)
            historical_score = self._get_historical_score(name)
            score += 0.1 * historical_score
            
            scored_models.append((name, config, score))
        
        # Select highest scoring model
        return max(scored_models, key=lambda x: x[2])[:2]  # Return (name, config)
    
    def _get_historical_score(self, model_name: str) -> float:
        """Get historical performance score for model"""
        if model_name not in self.performance_history.get('avg_latency_by_model', {}):
            return 0.8  # Default score for new models
        
        # Simple scoring based on latency performance
        avg_latency = self.performance_history['avg_latency_by_model'][model_name]
        expected_latency = self.models[model_name].latency_estimate
        
        if avg_latency <= expected_latency:
            return 1.0
        elif avg_latency <= expected_latency * 1.5:
            return 0.8
        else:
            return 0.6
    
    def _generate_selection_reasoning(
        self, 
        selected_model: tuple, 
        task_type: TaskType, 
        constraints: Dict[str, Any]
    ) -> str:
        """Generate human-readable reasoning for model selection"""
        name, config = selected_model
        
        reasons = []
        
        if task_type in config.strengths:
            reasons.append(f"optimized for {task_type.value}")
        
        if constraints.get('max_latency_seconds'):
            reasons.append(f"meets latency requirement ({config.latency_estimate}s)")
        
        if constraints.get('max_cost_per_1k_tokens'):
            total_cost = config.cost_per_1k_input + config.cost_per_1k_output
            reasons.append(f"cost-efficient (${total_cost:.4f}/1k tokens)")
        
        if not reasons:
            reasons.append("best available option for this task")
        
        return f"Selected {name}: " + ", ".join(reasons)
    
    def _track_selection(self, model_name: str, task_type: TaskType):
        """Track model selection for analytics"""
        self.performance_history['total_requests'] += 1
        
        if model_name not in self.performance_history['model_usage']:
            self.performance_history['model_usage'][model_name] = 0
        self.performance_history['model_usage'][model_name] += 1
        
        # Track current selection for potential fallback
        self.current_selections[task_type] = model_name
    
    def get_client(self, provider: ModelProvider, model_name: str):
        """Get initialized client for the specified provider and model"""
        if provider == ModelProvider.OPENAI:
            from openai import OpenAI
            return OpenAI(api_key=os.getenv("OPENAI_API_KEY"))
        
        elif provider == ModelProvider.CLAUDE:
            try:
                import anthropic
                return anthropic.Anthropic(api_key=os.getenv("ANTHROPIC_API_KEY"))
            except ImportError:
                raise ImportError("anthropic package required for Claude models: pip install anthropic")
        
        elif provider == ModelProvider.GEMINI:
            try:
                import google.generativeai as genai
                genai.configure(api_key=os.getenv("GOOGLE_API_KEY"))
                return genai.GenerativeModel(model_name)
            except ImportError:
                raise ImportError("google-generativeai package required: pip install google-generativeai")
        
        elif provider == ModelProvider.PERPLEXITY:
            # Perplexity uses OpenAI-compatible API
            from openai import OpenAI
            return OpenAI(
                api_key=os.getenv("PERPLEXITY_API_KEY"),
                base_url="https://api.perplexity.ai"
            )
        
        else:
            raise ValueError(f"Unsupported provider: {provider}")
    
    def call_model(
        self,
        selection: ModelSelection,
        messages: List[Dict[str, str]],
        **kwargs
    ) -> Dict[str, Any]:
        """
        Make API call to selected model with unified interface
        
        Args:
            selection: Model selection from select_model()
            messages: List of messages in OpenAI format
            **kwargs: Additional parameters
            
        Returns:
            Unified response format
        """
        import time
        start_time = time.time()
        
        try:
            client = self.get_client(selection.provider, selection.model_name)
            
            if selection.provider in [ModelProvider.OPENAI, ModelProvider.PERPLEXITY]:
                response = client.chat.completions.create(
                    model=selection.model_name,
                    messages=messages,
                    **kwargs
                )
                content = response.choices[0].message.content
                
            elif selection.provider == ModelProvider.CLAUDE:
                # Convert OpenAI format to Claude format
                claude_messages = []
                system_msg = ""
                
                for msg in messages:
                    if msg["role"] == "system":
                        system_msg = msg["content"]
                    else:
                        claude_messages.append(msg)
                
                response = client.messages.create(
                    model=selection.model_name,
                    system=system_msg,
                    messages=claude_messages,
                    max_tokens=kwargs.get('max_tokens', 4096),
                    **{k: v for k, v in kwargs.items() if k != 'max_tokens'}
                )
                content = response.content[0].text
                
            elif selection.provider == ModelProvider.GEMINI:
                # Convert to Gemini format
                prompt = "\n".join([f"{msg['role']}: {msg['content']}" for msg in messages])
                response = client.generate_content(prompt)
                content = response.text
                
            else:
                raise ValueError(f"Unsupported provider: {selection.provider}")
            
            # Track performance
            actual_latency = time.time() - start_time
            self._update_performance_stats(selection.model_name, actual_latency)
            
            return {
                "content": content,
                "model": selection.model_name,
                "provider": selection.provider.value,
                "latency": actual_latency,
                "estimated_cost": selection.estimated_cost
            }
            
        except Exception as e:
            logger.error(f"Model call failed for {selection.model_name}: {e}")
            # Attempt fallback to GPT-4o-mini if available
            if selection.model_name != "gpt-4o-mini" and "gpt-4o-mini" in self.models:
                logger.info("Attempting fallback to gpt-4o-mini")
                fallback_selection = ModelSelection(
                    provider=ModelProvider.OPENAI,
                    model_name="gpt-4o-mini",
                    reasoning="Fallback due to primary model failure",
                    estimated_cost=0.001,
                    estimated_latency=2.0,
                    confidence=0.7
                )
                return self.call_model(fallback_selection, messages, **kwargs)
            
            raise
    
    def _update_performance_stats(self, model_name: str, actual_latency: float):
        """Update performance statistics"""
        if model_name not in self.performance_history['avg_latency_by_model']:
            self.performance_history['avg_latency_by_model'][model_name] = actual_latency
        else:
            # Update rolling average
            current_avg = self.performance_history['avg_latency_by_model'][model_name]
            usage_count = self.performance_history['model_usage'].get(model_name, 1)
            
            self.performance_history['avg_latency_by_model'][model_name] = (
                (current_avg * (usage_count - 1) + actual_latency) / usage_count
            )
    
    def get_performance_stats(self) -> Dict[str, Any]:
        """Get comprehensive performance and usage statistics"""
        return {
            "total_requests": self.performance_history['total_requests'],
            "model_usage_distribution": self.performance_history['model_usage'],
            "average_latency_by_model": self.performance_history['avg_latency_by_model'],
            "available_models": list(self._get_available_models().keys()),
            "total_models_configured": len(self.models),
            "providers_available": list(set(config.provider.value for config in self._get_available_models().values()))
        }
    
    def recommend_setup(self) -> Dict[str, Any]:
        """Recommend optimal setup based on available models"""
        available = self._get_available_models()
        
        recommendations = {
            "current_setup": {
                "available_models": len(available),
                "providers": list(set(config.provider.value for config in available.values())),
                "coverage": {}
            },
            "missing_api_keys": [],
            "recommended_additions": []
        }
        
        # Check coverage for each task type
        for task_type in TaskType:
            suitable_models = [name for name, config in available.items() 
                             if task_type in config.strengths]
            recommendations["current_setup"]["coverage"][task_type.value] = len(suitable_models)
        
        # Identify missing API keys
        for name, config in self.models.items():
            if name not in available:
                recommendations["missing_api_keys"].append({
                    "model": name,
                    "provider": config.provider.value,
                    "env_var": config.api_key_env,
                    "strengths": [s.value for s in config.strengths]
                })
        
        return recommendations


# Global instance
model_manager = ModelManager()