import { useState, useCallback, useEffect, useRef } from 'react';
import { APIError } from '@/lib/api/client';
import { toast } from 'sonner';

interface UseApiOptions {
  onSuccess?: (data: any) => void;
  onError?: (error: APIError) => void;
  showErrorToast?: boolean;
  showSuccessToast?: boolean;
  successMessage?: string;
}

interface UseApiState<T> {
  data: T | null;
  error: APIError | null;
  isLoading: boolean;
}

export function useApi<T = any>(
  apiFunction: (...args: any[]) => Promise<T>,
  options: UseApiOptions = {}
) {
  const [state, setState] = useState<UseApiState<T>>({
    data: null,
    error: null,
    isLoading: false,
  });
  
  const isMountedRef = useRef(true);
  
  useEffect(() => {
    return () => {
      isMountedRef.current = false;
    };
  }, []);
  
  const execute = useCallback(
    async (...args: any[]) => {
      setState(prev => ({ ...prev, isLoading: true, error: null }));
      
      try {
        const result = await apiFunction(...args);
        
        if (!isMountedRef.current) return result;
        
        setState({
          data: result,
          error: null,
          isLoading: false,
        });
        
        if (options.showSuccessToast) {
          toast.success(options.successMessage || 'Success!');
        }
        
        if (options.onSuccess) {
          options.onSuccess(result);
        }
        
        return result;
      } catch (error) {
        if (!isMountedRef.current) return;
        
        const apiError = error instanceof APIError 
          ? error 
          : new APIError(500, 'An unexpected error occurred');
        
        setState({
          data: null,
          error: apiError,
          isLoading: false,
        });
        
        if (options.showErrorToast !== false) {
          toast.error(apiError.message);
        }
        
        if (options.onError) {
          options.onError(apiError);
        }
        
        throw apiError;
      }
    },
    [apiFunction, options]
  );
  
  const reset = useCallback(() => {
    setState({
      data: null,
      error: null,
      isLoading: false,
    });
  }, []);
  
  return {
    ...state,
    execute,
    reset,
  };
}

// Mutation hook for POST/PUT/DELETE operations
export function useApiMutation<TData = any, TVariables = any>(
  apiFunction: (variables: TVariables) => Promise<TData>,
  options: UseApiOptions = {}
) {
  return useApi<TData>(apiFunction, options);
}

// Query hook for GET operations with automatic execution
export function useApiQuery<T = any>(
  apiFunction: () => Promise<T>,
  dependencies: any[] = [],
  options: UseApiOptions & { enabled?: boolean } = {}
) {
  const { execute, ...state } = useApi<T>(apiFunction, options);
  
  useEffect(() => {
    if (options.enabled !== false) {
      execute();
    }
  }, [...dependencies, options.enabled]);
  
  return {
    ...state,
    refetch: execute,
  };
}