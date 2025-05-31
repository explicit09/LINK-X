"""
Micro-Agent System - Specialized agents for complex educational queries
Handles coding, research, and multi-step problem solving with tool integration
"""

import logging
import time
import json
from typing import Dict, Any, List, Optional, Generator
from dataclasses import dataclass
from enum import Enum
import asyncio
from concurrent.futures import ThreadPoolExecutor

from .model_manager import model_manager, TaskType
from .prompt_manager import prompt_manager

logger = logging.getLogger(__name__)


class AgentType(Enum):
    """Types of specialized micro-agents"""
    CODING_ASSISTANT = "coding_assistant"
    RESEARCH_AGENT = "research_agent"
    MATH_SOLVER = "math_solver"
    CREATIVE_TUTOR = "creative_tutor"


@dataclass
class AgentTask:
    """A task for a micro-agent to execute"""
    agent_type: AgentType
    query: str
    context: Dict[str, Any]
    student_profile: Dict[str, Any]
    tools_required: List[str]
    max_steps: int = 5
    timeout_seconds: int = 30


@dataclass
class AgentStep:
    """A single step in agent execution"""
    step_number: int
    action: str
    tool_used: Optional[str]
    input_data: Any
    output_data: Any
    reasoning: str
    success: bool
    execution_time: float


@dataclass
class AgentResult:
    """Result from micro-agent execution"""
    task: AgentTask
    steps: List[AgentStep]
    final_answer: str
    success: bool
    total_time: float
    tools_used: List[str]
    confidence: float
    error_message: Optional[str] = None


class ToolRegistry:
    """Registry of available tools for micro-agents"""
    
    def __init__(self):
        self.tools = self._initialize_tools()
    
    def _initialize_tools(self) -> Dict[str, Dict[str, Any]]:
        """Initialize available tools"""
        return {
            "code_executor": {
                "description": "Execute Python code safely in sandboxed environment",
                "input_schema": {"code": "str", "timeout": "int"},
                "output_schema": {"stdout": "str", "stderr": "str", "success": "bool"},
                "safety_level": "medium",
                "max_execution_time": 10
            },
            "web_search": {
                "description": "Search the web for current information",
                "input_schema": {"query": "str", "num_results": "int"},
                "output_schema": {"results": "List[Dict]", "summary": "str"},
                "safety_level": "low",
                "max_execution_time": 5
            },
            "docs_search": {
                "description": "Search programming documentation and references",
                "input_schema": {"language": "str", "topic": "str"},
                "output_schema": {"documentation": "str", "examples": "List[str]"},
                "safety_level": "low",
                "max_execution_time": 3
            },
            "math_calculator": {
                "description": "Perform mathematical calculations and symbolic math",
                "input_schema": {"expression": "str", "mode": "str"},
                "output_schema": {"result": "Any", "steps": "List[str]"},
                "safety_level": "low",
                "max_execution_time": 5
            },
            "file_analyzer": {
                "description": "Analyze uploaded files and extract information",
                "input_schema": {"file_path": "str", "analysis_type": "str"},
                "output_schema": {"summary": "str", "key_points": "List[str]"},
                "safety_level": "high",
                "max_execution_time": 15
            }
        }
    
    def get_tool(self, tool_name: str) -> Optional[Dict[str, Any]]:
        """Get tool configuration"""
        return self.tools.get(tool_name)
    
    def list_tools(self) -> List[str]:
        """List available tool names"""
        return list(self.tools.keys())
    
    def get_tools_for_agent(self, agent_type: AgentType) -> List[str]:
        """Get recommended tools for agent type"""
        tool_mapping = {
            AgentType.CODING_ASSISTANT: ["code_executor", "docs_search", "web_search"],
            AgentType.RESEARCH_AGENT: ["web_search", "file_analyzer", "docs_search"],
            AgentType.MATH_SOLVER: ["math_calculator", "code_executor"],
            AgentType.CREATIVE_TUTOR: ["web_search", "file_analyzer"]
        }
        return tool_mapping.get(agent_type, [])


class MicroAgent:
    """
    Base micro-agent with planning and execution capabilities
    
    Implements the plan → execute → reflect pattern for complex tasks
    """
    
    def __init__(self, agent_type: AgentType):
        self.agent_type = agent_type
        self.tool_registry = ToolRegistry()
        self.executor = ThreadPoolExecutor(max_workers=2)
        
        # Performance tracking
        self.execution_stats = {
            'total_tasks': 0,
            'successful_tasks': 0,
            'avg_execution_time': 0.0,
            'tool_usage': {},
            'error_types': {}
        }
    
    async def execute_task(self, task: AgentTask) -> AgentResult:
        """
        Execute a complex task using planning and tool integration
        
        Args:
            task: AgentTask with query and requirements
            
        Returns:
            AgentResult with steps and final answer
        """
        start_time = time.time()
        steps = []
        tools_used = []
        
        try:
            # Step 1: Plan the task
            plan = await self._create_plan(task)
            logger.info(f"Created plan with {len(plan)} steps for {task.agent_type.value}")
            
            # Step 2: Execute plan steps
            for step_num, planned_action in enumerate(plan, 1):
                if step_num > task.max_steps:
                    break
                
                step_start = time.time()
                step_result = await self._execute_step(
                    planned_action, task, step_num
                )
                
                steps.append(step_result)
                
                if step_result.tool_used:
                    tools_used.append(step_result.tool_used)
                
                if not step_result.success:
                    logger.warning(f"Step {step_num} failed: {step_result.reasoning}")
                    break
                
                # Check timeout
                if time.time() - start_time > task.timeout_seconds:
                    logger.warning(f"Task timeout after {task.timeout_seconds}s")
                    break
            
            # Step 3: Generate final answer
            final_answer = await self._synthesize_answer(task, steps)
            
            total_time = time.time() - start_time
            success = len(steps) > 0 and any(step.success for step in steps)
            
            # Calculate confidence based on successful steps
            confidence = sum(1 for step in steps if step.success) / len(steps) if steps else 0.0
            
            result = AgentResult(
                task=task,
                steps=steps,
                final_answer=final_answer,
                success=success,
                total_time=total_time,
                tools_used=list(set(tools_used)),
                confidence=confidence
            )
            
            self._update_stats(result)
            return result
            
        except Exception as e:
            logger.error(f"Agent execution failed: {e}")
            return AgentResult(
                task=task,
                steps=steps,
                final_answer=f"I apologize, but I encountered an error: {str(e)}",
                success=False,
                total_time=time.time() - start_time,
                tools_used=tools_used,
                confidence=0.0,
                error_message=str(e)
            )
    
    async def _create_plan(self, task: AgentTask) -> List[Dict[str, Any]]:
        """Create execution plan for the task"""
        # Select appropriate model for planning
        model_selection = model_manager.select_model(
            task_type=TaskType.COMPLEX_REASONING,
            query=task.query,
            context=task.context,
            constraints={"max_latency_seconds": 5}
        )
        
        # Load planning prompt template
        planning_prompt = self._render_planning_prompt(task)
        
        # Get plan from model
        messages = [{"role": "user", "content": planning_prompt}]
        response = model_manager.call_model(model_selection, messages, max_tokens=800)
        
        # Parse plan
        try:
            plan_data = json.loads(response["content"])
            return plan_data.get("steps", [])
        except json.JSONDecodeError:
            # Fallback: create simple plan
            return [{"action": "analyze", "tool": None, "description": "Analyze the query"}]
    
    async def _execute_step(
        self, 
        planned_action: Dict[str, Any], 
        task: AgentTask, 
        step_num: int
    ) -> AgentStep:
        """Execute a single step of the plan"""
        step_start = time.time()
        
        action = planned_action.get("action", "unknown")
        tool_name = planned_action.get("tool")
        
        try:
            if tool_name and tool_name in self.tool_registry.tools:
                # Execute with tool
                tool_result = await self._execute_tool(
                    tool_name, planned_action.get("input", {}), task
                )
                success = tool_result.get("success", True)
                output = tool_result
            else:
                # Execute without tool (reasoning/analysis)
                output = await self._execute_reasoning(planned_action, task)
                success = True
            
            return AgentStep(
                step_number=step_num,
                action=action,
                tool_used=tool_name,
                input_data=planned_action.get("input", {}),
                output_data=output,
                reasoning=planned_action.get("description", ""),
                success=success,
                execution_time=time.time() - step_start
            )
            
        except Exception as e:
            logger.error(f"Step execution failed: {e}")
            return AgentStep(
                step_number=step_num,
                action=action,
                tool_used=tool_name,
                input_data=planned_action.get("input", {}),
                output_data={"error": str(e)},
                reasoning=f"Step failed: {e}",
                success=False,
                execution_time=time.time() - step_start
            )
    
    async def _execute_tool(
        self, 
        tool_name: str, 
        tool_input: Dict[str, Any], 
        task: AgentTask
    ) -> Dict[str, Any]:
        """Execute a tool safely"""
        tool_config = self.tool_registry.get_tool(tool_name)
        if not tool_config:
            raise ValueError(f"Unknown tool: {tool_name}")
        
        # Safety check
        if tool_config["safety_level"] == "high":
            logger.warning(f"High-risk tool {tool_name} requires additional validation")
        
        # Simulate tool execution (in production, integrate with actual tools)
        if tool_name == "code_executor":
            return await self._simulate_code_execution(tool_input)
        elif tool_name == "web_search":
            return await self._simulate_web_search(tool_input)
        elif tool_name == "docs_search":
            return await self._simulate_docs_search(tool_input)
        elif tool_name == "math_calculator":
            return await self._simulate_math_calculation(tool_input)
        else:
            return {"result": f"Simulated {tool_name} execution", "success": True}
    
    async def _execute_reasoning(
        self, 
        planned_action: Dict[str, Any], 
        task: AgentTask
    ) -> Dict[str, Any]:
        """Execute reasoning step without tools"""
        # Use model for reasoning
        model_selection = model_manager.select_model(
            task_type=TaskType.COMPLEX_REASONING,
            query=planned_action.get("description", ""),
            constraints={"max_latency_seconds": 3}
        )
        
        reasoning_prompt = f"""
Task: {task.query}
Current Step: {planned_action.get('description', '')}
Student Level: {task.student_profile.get('expertise_level', 'intermediate')}

Provide detailed reasoning for this step. Be educational and clear.
"""
        
        messages = [{"role": "user", "content": reasoning_prompt}]
        response = model_manager.call_model(model_selection, messages, max_tokens=400)
        
        return {"reasoning": response["content"], "success": True}
    
    async def _synthesize_answer(
        self, 
        task: AgentTask, 
        steps: List[AgentStep]
    ) -> str:
        """Synthesize final answer from execution steps"""
        # Collect all step outputs
        step_summaries = []
        for step in steps:
            if step.success:
                summary = f"Step {step.step_number}: {step.reasoning}"
                if step.output_data and isinstance(step.output_data, dict):
                    if "result" in step.output_data:
                        summary += f" Result: {step.output_data['result']}"
                step_summaries.append(summary)
        
        # Use model to synthesize final answer
        model_selection = model_manager.select_model(
            task_type=TaskType.COMPLEX_REASONING,
            query=task.query,
            context=task.context
        )
        
        synthesis_prompt = f"""
Original Question: {task.query}
Student Profile: {task.student_profile}

Execution Steps Completed:
{chr(10).join(step_summaries)}

Please provide a comprehensive, educational answer that:
1. Directly addresses the original question
2. Incorporates insights from the execution steps
3. Is appropriate for the student's level: {task.student_profile.get('expertise_level', 'intermediate')}
4. Uses {task.student_profile.get('tone_preference', 'casual')} tone

Format the answer clearly with examples where helpful.
"""
        
        messages = [{"role": "user", "content": synthesis_prompt}]
        response = model_manager.call_model(model_selection, messages, max_tokens=1000)
        
        return response["content"]
    
    def _render_planning_prompt(self, task: AgentTask) -> str:
        """Render planning prompt for the agent type"""
        available_tools = self.tool_registry.get_tools_for_agent(self.agent_type)
        
        base_prompt = f"""
You are a {self.agent_type.value} micro-agent. Create a step-by-step plan to answer this educational query.

QUERY: {task.query}
STUDENT LEVEL: {task.student_profile.get('expertise_level', 'intermediate')}
AVAILABLE TOOLS: {available_tools}

Create a plan with 2-4 steps. Each step should have:
- action: brief description of what to do
- tool: tool name to use (or null for reasoning)
- input: input parameters for the tool
- description: educational explanation of this step

Return ONLY valid JSON:
{{
  "steps": [
    {{
      "action": "analyze_query",
      "tool": null,
      "input": {{}},
      "description": "First, let's break down what you're asking..."
    }},
    {{
      "action": "research_solution",
      "tool": "web_search",
      "input": {{"query": "specific search terms", "num_results": 3}},
      "description": "Now I'll search for current information..."
    }}
  ]
}}
"""
        return base_prompt
    
    # Tool simulation methods (replace with real implementations)
    async def _simulate_code_execution(self, tool_input: Dict[str, Any]) -> Dict[str, Any]:
        """Simulate code execution"""
        code = tool_input.get("code", "")
        if "print" in code:
            return {
                "stdout": "Hello, World!",
                "stderr": "",
                "success": True,
                "result": "Code executed successfully"
            }
        else:
            return {
                "stdout": "",
                "stderr": "",
                "success": True,
                "result": f"Code analyzed: {len(code)} characters"
            }
    
    async def _simulate_web_search(self, tool_input: Dict[str, Any]) -> Dict[str, Any]:
        """Simulate web search"""
        query = tool_input.get("query", "")
        return {
            "results": [
                {"title": f"Result 1 for {query}", "url": "https://example.com/1"},
                {"title": f"Result 2 for {query}", "url": "https://example.com/2"}
            ],
            "summary": f"Found relevant information about {query}",
            "success": True
        }
    
    async def _simulate_docs_search(self, tool_input: Dict[str, Any]) -> Dict[str, Any]:
        """Simulate documentation search"""
        language = tool_input.get("language", "python")
        topic = tool_input.get("topic", "general")
        return {
            "documentation": f"Documentation for {topic} in {language}",
            "examples": [f"Example 1 for {topic}", f"Example 2 for {topic}"],
            "success": True
        }
    
    async def _simulate_math_calculation(self, tool_input: Dict[str, Any]) -> Dict[str, Any]:
        """Simulate math calculation"""
        expression = tool_input.get("expression", "2+2")
        try:
            # Simple evaluation for demo (use safe math library in production)
            result = eval(expression) if expression.replace('+', '').replace('-', '').replace('*', '').replace('/', '').replace('(', '').replace(')', '').replace('.', '').replace(' ', '').isdigit() else "Complex calculation"
            return {
                "result": str(result),
                "steps": [f"Calculating: {expression}", f"Result: {result}"],
                "success": True
            }
        except:
            return {
                "result": "Calculation error",
                "steps": ["Invalid expression"],
                "success": False
            }
    
    def _update_stats(self, result: AgentResult):
        """Update execution statistics"""
        self.execution_stats['total_tasks'] += 1
        if result.success:
            self.execution_stats['successful_tasks'] += 1
        
        # Update rolling average
        current_avg = self.execution_stats['avg_execution_time']
        total_tasks = self.execution_stats['total_tasks']
        
        self.execution_stats['avg_execution_time'] = (
            (current_avg * (total_tasks - 1) + result.total_time) / total_tasks
        )
        
        # Track tool usage
        for tool in result.tools_used:
            if tool not in self.execution_stats['tool_usage']:
                self.execution_stats['tool_usage'][tool] = 0
            self.execution_stats['tool_usage'][tool] += 1
    
    def get_stats(self) -> Dict[str, Any]:
        """Get agent performance statistics"""
        total = self.execution_stats['total_tasks']
        return {
            **self.execution_stats,
            'success_rate': (self.execution_stats['successful_tasks'] / total * 100) if total > 0 else 0,
            'agent_type': self.agent_type.value
        }


class MicroAgentManager:
    """Manager for micro-agent system"""
    
    def __init__(self):
        self.agents = {
            AgentType.CODING_ASSISTANT: MicroAgent(AgentType.CODING_ASSISTANT),
            AgentType.RESEARCH_AGENT: MicroAgent(AgentType.RESEARCH_AGENT),
            AgentType.MATH_SOLVER: MicroAgent(AgentType.MATH_SOLVER),
            AgentType.CREATIVE_TUTOR: MicroAgent(AgentType.CREATIVE_TUTOR)
        }
    
    def select_agent(self, query: str, routing_decision: Any) -> AgentType:
        """Select appropriate agent based on query analysis"""
        query_lower = query.lower()
        
        # Coding patterns
        if any(keyword in query_lower for keyword in 
               ["code", "program", "debug", "implement", "algorithm", "function"]):
            return AgentType.CODING_ASSISTANT
        
        # Research patterns  
        elif any(keyword in query_lower for keyword in
                ["research", "compare", "latest", "trends", "investigate", "analyze"]):
            return AgentType.RESEARCH_AGENT
        
        # Math patterns
        elif any(keyword in query_lower for keyword in
                ["calculate", "solve", "equation", "math", "formula"]):
            return AgentType.MATH_SOLVER
        
        # Default to creative tutor for complex educational tasks
        else:
            return AgentType.CREATIVE_TUTOR
    
    async def process_complex_query(
        self,
        query: str,
        context: Dict[str, Any],
        student_profile: Dict[str, Any],
        routing_decision: Any
    ) -> AgentResult:
        """Process complex query with appropriate micro-agent"""
        
        # Select agent
        agent_type = self.select_agent(query, routing_decision)
        agent = self.agents[agent_type]
        
        # Create task
        task = AgentTask(
            agent_type=agent_type,
            query=query,
            context=context,
            student_profile=student_profile,
            tools_required=agent.tool_registry.get_tools_for_agent(agent_type),
            max_steps=5,
            timeout_seconds=30
        )
        
        # Execute task
        logger.info(f"Processing complex query with {agent_type.value}")
        result = await agent.execute_task(task)
        
        return result
    
    def get_system_stats(self) -> Dict[str, Any]:
        """Get comprehensive micro-agent system statistics"""
        return {
            "agents": {agent_type.value: agent.get_stats() 
                      for agent_type, agent in self.agents.items()},
            "tool_registry": {
                "available_tools": len(self.agents[AgentType.CODING_ASSISTANT].tool_registry.tools),
                "tools": list(self.agents[AgentType.CODING_ASSISTANT].tool_registry.tools.keys())
            }
        }


# Global instance
micro_agent_manager = MicroAgentManager()