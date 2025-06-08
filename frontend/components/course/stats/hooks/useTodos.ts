import { useState, useEffect } from 'react';
import { toast as sonnerToast } from 'sonner';
import type { TodoItem, Course } from '../types';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/hooks/useAuth';

export function useTodos(course: Course | null, userRole: string) {
  const [todos, setTodos] = useState<TodoItem[]>([]);
  const [loadingTodos, setLoadingTodos] = useState(true);
  const { user } = useAuth();

  useEffect(() => {
    const loadTodos = async () => {
      if (userRole !== 'student' || !user) {
        setLoadingTodos(false);
        return;
      }

      try {
        setLoadingTodos(true);

        // ✅ NEW: Query todos directly from Supabase
        let query = supabase
          .from('user_todos')
          .select(`
            id,
            title,
            course,
            due_date,
            type,
            priority,
            completed,
            created_at
          `)
          .eq('user_id', user.id)
          .order('created_at', { ascending: false });

        // Filter for specific course if provided
        if (course?.id) {
          query = query.or(`course.eq.${course.title},course.eq.General,course.eq.This Course`);
        }

        const { data: todos, error } = await query;

        if (error) {
          throw error;
        }

        // Transform to match interface
        const transformedTodos: TodoItem[] = (todos || []).map(todo => ({
          id: todo.id,
          title: todo.title,
          course: todo.course,
          dueDate: todo.due_date,
          type: todo.type,
          priority: todo.priority,
          completed: todo.completed || false,
        }));

        setTodos(transformedTodos);
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
  }, [userRole, user, course?.id, course?.title]);

  const toggleTodo = async (todoId: string) => {
    const todo = todos.find((t) => t.id === todoId);
    if (!todo || !user) return;

    try {
      // ✅ NEW: Update todo directly in Supabase
      const { error } = await supabase
        .from('user_todos')
        .update({
          completed: !todo.completed,
          updated_at: new Date().toISOString(),
        })
        .eq('id', todoId)
        .eq('user_id', user.id);

      if (error) {
        throw error;
      }

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
    if (!user) return;

    try {
      // ✅ NEW: Delete todo directly from Supabase
      const { error } = await supabase
        .from('user_todos')
        .delete()
        .eq('id', todoId)
        .eq('user_id', user.id);

      if (error) {
        throw error;
      }

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
