/**
 * Todo-related endpoint handlers
 */

import { apiClient } from '../client';
import type {
  TodoItem,
  CreateTodoRequest,
  UpdateTodoRequest,
} from '../../../types/api';

export const todoAPI = {
  getTodoItems: async () => {
    const response = await apiClient.get('/api/v2/todos');
    return (response as any).data || [];
  },

  createTodoItem: (data: CreateTodoRequest): Promise<TodoItem> => 
    apiClient.post('/api/v2/todos', data),

  updateTodoItem: (todoId: string, data: UpdateTodoRequest): Promise<TodoItem> => 
    apiClient.patch(`/api/v2/todos/${todoId}`, data),

  deleteTodoItem: (todoId: string) => 
    apiClient.delete(`/api/v2/todos/${todoId}`),
};