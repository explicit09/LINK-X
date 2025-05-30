import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import {
  Calendar,
  Plus,
  Check,
  X,
  BookmarkPlus,
  BookOpen,
  Brain
} from "lucide-react";

interface TodoItem {
  id: string;
  title: string;
  course: string;
  dueDate?: string;
  type: "quiz" | "assignment" | "reading" | "review";
  priority: "high" | "medium" | "low";
}

interface TodoSectionProps {
  todoItems: TodoItem[];
  showAddTodo: boolean;
  newTodoTitle: string;
  newTodoCourse: string;
  newTodoPriority: "high" | "medium" | "low";
  setShowAddTodo: (show: boolean) => void;
  setNewTodoTitle: (title: string) => void;
  setNewTodoCourse: (course: string) => void;
  setNewTodoPriority: (priority: "high" | "medium" | "low") => void;
  addTodoItem: () => void;
  removeTodoItem: (id: string) => void;
}

const getTodoIcon = (type: TodoItem["type"]) => {
  switch (type) {
    case "quiz": return BookmarkPlus;
    case "assignment": return BookOpen;
    case "reading": return BookOpen;
    case "review": return Brain;
    default: return BookOpen;
  }
};

const getPriorityColor = (priority: TodoItem["priority"]) => {
  switch (priority) {
    case "high": return "text-red-600";
    case "medium": return "text-yellow-600";
    case "low": return "text-green-600";
    default: return "text-gray-600";
  }
};

export const TodoSection = ({
  todoItems,
  showAddTodo,
  newTodoTitle,
  newTodoCourse,
  newTodoPriority,
  setShowAddTodo,
  setNewTodoTitle,
  setNewTodoCourse,
  setNewTodoPriority,
  addTodoItem,
  removeTodoItem
}: TodoSectionProps) => {
  return (
    <Card className="bg-blue-50 border-l-4 border-blue-500 shadow-lg border">
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-full bg-blue-600 flex items-center justify-center shadow-md">
              <Calendar className="h-4 w-4 text-white" />
            </div>
            To Do
          </div>
          <Button 
            size="sm" 
            variant="outline"
            onClick={() => setShowAddTodo(!showAddTodo)}
            className="h-8 w-8 p-0"
          >
            <Plus className="h-4 w-4" />
          </Button>
        </CardTitle>
      </CardHeader>
      <CardContent>
        {/* Add Todo Form */}
        {showAddTodo && (
          <div className="mb-4 p-3 border border-gray-200 rounded-lg bg-gray-50">
            <div className="space-y-2">
              <Input
                placeholder="What needs to be done?"
                value={newTodoTitle}
                onChange={(e) => setNewTodoTitle(e.target.value)}
                className="text-sm"
              />
              <div className="grid grid-cols-2 gap-2">
                <Input
                  placeholder="Course (optional)"
                  value={newTodoCourse}
                  onChange={(e) => setNewTodoCourse(e.target.value)}
                  className="text-sm"
                />
                <select 
                  value={newTodoPriority}
                  onChange={(e) => setNewTodoPriority(e.target.value as "high" | "medium" | "low")}
                  className="text-sm border border-gray-300 rounded-md px-2 py-1"
                >
                  <option value="low">Low Priority</option>
                  <option value="medium">Medium Priority</option>
                  <option value="high">High Priority</option>
                </select>
              </div>
              <div className="flex gap-2">
                <Button 
                  size="sm" 
                  onClick={addTodoItem}
                  className="bg-blue-600 hover:bg-blue-700"
                >
                  <Check className="h-3 w-3 mr-1" />
                  Add
                </Button>
                <Button 
                  size="sm" 
                  variant="outline"
                  onClick={() => setShowAddTodo(false)}
                >
                  <X className="h-3 w-3 mr-1" />
                  Cancel
                </Button>
              </div>
            </div>
          </div>
        )}
        
        <div className="space-y-3 max-h-32 overflow-y-auto">
          {todoItems.length === 0 ? (
            <div className="text-center py-4 text-gray-500">
              <p className="text-sm">No tasks yet!</p>
              <p className="text-xs">Add your first task above</p>
            </div>
          ) : (
            todoItems.slice(0, 2).map((item) => {
              const IconComponent = getTodoIcon(item.type);
              return (
                <div
                  key={item.id}
                  className="flex items-start gap-3 p-3 rounded-lg hover:bg-white hover:shadow-sm transition-all duration-200 group"
                >
                  <IconComponent className={cn("h-4 w-4 mt-0.5", getPriorityColor(item.priority))} />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium sidebar-text truncate">
                      {item.title}
                    </p>
                    <p className="text-xs sidebar-text-muted">
                      {item.course} • {item.dueDate}
                    </p>
                  </div>
                  <Badge variant="outline" className="text-xs">
                    {item.priority}
                  </Badge>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => removeTodoItem(item.id)}
                    className="h-6 w-6 p-0 opacity-0 group-hover:opacity-100 transition-opacity"
                  >
                    <Check className="h-3 w-3 text-green-600" />
                  </Button>
                </div>
              );
            })
          )}
        </div>
      </CardContent>
    </Card>
  );
};