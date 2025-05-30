"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { 
  BookOpen, 
  Clock, 
  Target, 
  CheckCircle2, 
  Circle,
  Edit,
  Trash2
} from "lucide-react";
import { cn } from "@/lib/utils";
import type { TodoItem } from '../types';

interface TodosWidgetProps {
  todos: TodoItem[];
  loadingTodos: boolean;
  onToggleTodo: (todoId: string) => void;
  onDeleteTodo: (todoId: string) => void;
}

export function TodosWidget({ todos, loadingTodos, onToggleTodo, onDeleteTodo }: TodosWidgetProps) {
  const getTodoPriorityColor = (priority: string) => {
    switch (priority) {
      case 'high': return 'text-red-600';
      case 'medium': return 'text-orange-600';
      case 'low': return 'text-blue-600';
      default: return 'text-gray-600';
    }
  };

  const getTodoTypeIcon = (type: string) => {
    switch (type) {
      case 'reading': return BookOpen;
      case 'quiz': return Target;
      case 'assignment': return Edit;
      case 'review': return Clock;
      default: return Circle;
    }
  };

  return (
    <Card className="bg-white/90 backdrop-blur-sm border-0 shadow-sm rounded-xl">
      <CardHeader className="pb-3">
        <CardTitle className="text-lg font-semibold">Your Tasks</CardTitle>
      </CardHeader>
      <CardContent className="pt-0">
        {loadingTodos ? (
          <div className="space-y-3">
            {[1, 2].map(i => (
              <div key={i} className="animate-pulse">
                <div className="h-4 bg-gray-200 rounded w-3/4 mb-2"></div>
                <div className="h-3 bg-gray-200 rounded w-1/2"></div>
              </div>
            ))}
          </div>
        ) : todos.length === 0 ? (
          <div className="text-center py-6">
            <CheckCircle2 className="h-8 w-8 text-green-500 mx-auto mb-2" />
            <p className="text-sm text-gray-600">All caught up!</p>
            <p className="text-xs text-gray-500">No pending tasks</p>
          </div>
        ) : (
          <div className="space-y-3">
            {todos.map((todo) => {
              const IconComponent = getTodoTypeIcon(todo.type);
              const priorityColor = getTodoPriorityColor(todo.priority);
              
              return (
                <div
                  key={todo.id}
                  className={cn(
                    "flex items-start gap-3 p-3 rounded-lg transition-all duration-150 group",
                    todo.completed 
                      ? "bg-gray-50 opacity-60" 
                      : "bg-white border border-gray-200 hover:border-gray-300"
                  )}
                >
                  <button 
                    className="mt-0.5"
                    onClick={() => onToggleTodo(todo.id)}
                  >
                    {todo.completed ? (
                      <CheckCircle2 className="h-4 w-4 text-green-500" />
                    ) : (
                      <Circle className="h-4 w-4 text-gray-400" />
                    )}
                  </button>
                  
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <IconComponent className={cn("h-3 w-3", priorityColor)} />
                      <h4 className={cn(
                        "text-sm font-medium",
                        todo.completed ? "line-through text-gray-500" : "text-gray-900"
                      )}>
                        {todo.title}
                      </h4>
                      <Badge 
                        className={cn(
                          "text-xs px-2 py-0.5 text-white font-medium",
                          todo.priority === 'high' ? 'bg-red-500' :
                          todo.priority === 'medium' ? 'bg-orange-500' : 'bg-blue-500'
                        )}
                      >
                        {todo.priority}
                      </Badge>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={(e) => {
                          e.stopPropagation();
                          onDeleteTodo(todo.id);
                        }}
                        className="h-6 w-6 p-0 opacity-0 group-hover:opacity-100 transition-opacity hover:bg-red-100 hover:text-red-600"
                      >
                        <Trash2 className="h-3 w-3" />
                      </Button>
                    </div>
                    <p className="text-xs text-[#6B7280]">
                      Due {todo.dueDate}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
}