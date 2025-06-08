import { useState, useEffect } from 'react';
import { toast as sonnerToast } from 'sonner';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/hooks/useAuth';

interface TodoItem {
  id: string;
  title: string;
  course: string;
  dueDate?: string;
  type: 'quiz' | 'assignment' | 'reading' | 'review';
  priority: 'high' | 'medium' | 'low';
}

export const useTodoItems = (userRole: string) => {
  const [todoItems, setTodoItems] = useState<TodoItem[]>([]);
  const [showAddTodo, setShowAddTodo] = useState(false);
  const [newTodoTitle, setNewTodoTitle] = useState('');
  const [newTodoCourse, setNewTodoCourse] = useState('');
  const [newTodoPriority, setNewTodoPriority] = useState<
    'high' | 'medium' | 'low'
  >('medium');
  const [newTodoType, setNewTodoType] = useState<
    'quiz' | 'assignment' | 'reading' | 'review'
  >('assignment');
  
  const { user } = useAuth();

  const loadTodoItems = async () => {
    try {
      if (userRole === 'student' && user) {
        // ✅ NEW: Query todo items directly from Supabase
        const { data: todos, error } = await supabase
          .from('user_todos')
          .select(`
            id,
            title,
            course,
            due_date,
            type,
            priority,
            created_at
          `)
          .eq('user_id', user.id)
          .order('created_at', { ascending: false });

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
        }));

        setTodoItems(transformedTodos);
      } else {
        setTodoItems([]);
      }
    } catch (error) {
      console.warn('Failed to load todo items:', error);
      setTodoItems([]);
    }
  };

  const addTodoItem = async () => {
    if (!newTodoTitle.trim()) return;

    try {
      if (userRole === 'student' && user) {
        // ✅ NEW: Insert todo item directly into Supabase
        const { data: newTodo, error } = await supabase
          .from('user_todos')
          .insert({
            user_id: user.id,
            title: newTodoTitle,
            course: newTodoCourse || 'General',
            type: newTodoType,
            priority: newTodoPriority,
            created_at: new Date().toISOString(),
          })
          .select()
          .single();

        if (error) {
          throw error;
        }

        // Add to local state
        const todoToAdd: TodoItem = {
          id: newTodo.id,
          title: newTodo.title,
          course: newTodo.course,
          dueDate: newTodo.due_date,
          type: newTodo.type,
          priority: newTodo.priority,
        };

        setTodoItems((prev) => [todoToAdd, ...prev]);
      }

      // Clear form
      setNewTodoTitle('');
      setNewTodoCourse('');
      setShowAddTodo(false);

      sonnerToast.success('Todo item added successfully!');
    } catch (error) {
      console.error('Error adding todo item:', error);
      sonnerToast.error('Failed to add todo item');
    }
  };

  const removeTodoItem = async (id: string) => {
    try {
      if (userRole === 'student' && user) {
        // ✅ NEW: Delete todo item directly from Supabase
        const { error } = await supabase
          .from('user_todos')
          .delete()
          .eq('id', id)
          .eq('user_id', user.id); // Ensure user can only delete their own todos

        if (error) {
          throw error;
        }

        setTodoItems((prev) => prev.filter((item) => item.id !== id));
        sonnerToast.success('Todo item deleted successfully!');
      }
    } catch (error) {
      console.error('Error deleting todo item:', error);

      if (error instanceof Error && error.message.includes('401')) {
        sonnerToast.error(
          'Authentication failed. Please refresh the page and try again.',
        );
      } else if (error instanceof Error && error.message.includes('404')) {
        sonnerToast.error(
          'Todo item not found. It may have already been deleted.',
        );
        setTodoItems((prev) => prev.filter((item) => item.id !== id));
      } else {
        sonnerToast.error(
          'Failed to delete todo item: ' +
            (error instanceof Error ? error.message : 'Unknown error'),
        );
      }
    }
  };

  useEffect(() => {
    loadTodoItems();
  }, [userRole, user]);

  return {
    todoItems,
    showAddTodo,
    newTodoTitle,
    newTodoCourse,
    newTodoPriority,
    newTodoType,
    setShowAddTodo,
    setNewTodoTitle,
    setNewTodoCourse,
    setNewTodoPriority,
    setNewTodoType,
    addTodoItem,
    removeTodoItem,
    loadTodoItems,
  };
};
