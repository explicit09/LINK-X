import { useState, useEffect } from 'react';
import { studentAPI } from '@/lib/api';
import { toast as sonnerToast } from 'sonner';

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

  const loadTodoItems = async () => {
    try {
      if (userRole === 'student') {
        const realTodos = await studentAPI.getTodoItems();
        const todosData: TodoItem[] = Array.isArray(realTodos) ? realTodos : [];
        setTodoItems(todosData);
      } else {
        setTodoItems([]);
      }
    } catch (error) {
      console.warn('Failed to load real todo items:', error);
      setTodoItems([]);
    }
  };

  const addTodoItem = async () => {
    if (!newTodoTitle.trim()) return;

    try {
      if (userRole === 'student') {
        const newTodo = await studentAPI.createTodoItem({
          title: newTodoTitle,
          course: newTodoCourse || 'General',
          type: newTodoType,
          priority: newTodoPriority,
        });

        setTodoItems((prev) => [...prev, newTodo]);
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
      if (userRole === 'student') {
        await studentAPI.deleteTodoItem(id);

        setTodoItems((prev) => {
          const filtered = prev.filter((item) => item.id !== id);
          return filtered;
        });

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
  }, [userRole]);

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
