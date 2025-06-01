import { useState, useEffect } from 'react';
import { studentAPI } from '@/lib/api';
import { toast as sonnerToast } from 'sonner';
import type { TodoItem, Course } from '../types';

export function useTodos(course: Course | null, userRole: string) {
  const [todos, setTodos] = useState<TodoItem[]>([]);
  const [loadingTodos, setLoadingTodos] = useState(true);

  useEffect(() => {
    const loadTodos = async () => {
      if (userRole !== 'student') {
        setLoadingTodos(false);
        return;
      }

      try {
        setLoadingTodos(true);

        const response = await studentAPI.getTodoItems();
        const todosData: TodoItem[] = Array.isArray(response) ? response : [];

        // Filter todos for this specific course if we have a course ID
        const courseTodos = course?.id
          ? todosData.filter(
              (todo: TodoItem) =>
                todo.course === course?.title ||
                todo.course === 'General' ||
                todo.course === 'This Course',
            )
          : todosData;

        setTodos(courseTodos);
      } catch (error) {
        console.error('useTodos: Failed to load todos:', error);
        setTodos([]);
      } finally {
        setLoadingTodos(false);
      }
    };

    if (userRole === 'student') {
      loadTodos();
    }
  }, [userRole]);

  const toggleTodo = async (todoId: string) => {
    const todo = todos.find((t) => t.id === todoId);
    if (!todo) return;

    try {
      await studentAPI.updateTodoItem(todoId, {
        completed: !todo.completed,
      });

      setTodos((prev) =>
        prev.map((todo) =>
          todo.id === todoId ? { ...todo, completed: !todo.completed } : todo,
        ),
      );

      sonnerToast.success(
        todo.completed ? 'Task unmarked' : 'Task completed! 🎉',
      );
    } catch (error) {
      console.error('Failed to update todo:', error);
      sonnerToast.error('Failed to update task');
    }
  };

  const deleteTodo = async (todoId: string) => {
    try {
      await studentAPI.deleteTodoItem(todoId);

      setTodos((prev) => prev.filter((todo) => todo.id !== todoId));

      sonnerToast.success('Task deleted successfully!');
    } catch (error) {
      console.error('useTodos: Failed to delete todo:', error);

      if (error instanceof Error && error.message.includes('401')) {
        sonnerToast.error(
          'Authentication failed. Please refresh the page and try again.',
        );
      } else if (error instanceof Error && error.message.includes('404')) {
        sonnerToast.error('Task not found. It may have already been deleted.');
        setTodos((prev) => prev.filter((todo) => todo.id !== todoId));
      } else {
        sonnerToast.error(
          'Failed to delete task: ' +
            (error instanceof Error ? error.message : 'Unknown error'),
        );
      }
    }
  };

  return {
    todos,
    loadingTodos,
    toggleTodo,
    deleteTodo,
  };
}
