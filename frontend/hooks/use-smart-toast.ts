import { toast as sonnerToast } from 'sonner';
import { useCallback, useRef } from 'react';

interface ToastCounters {
  [key: string]: {
    count: number;
    toastId?: string | number;
    timer?: NodeJS.Timeout;
  };
}

export function useSmartToast() {
  const counters = useRef<ToastCounters>({});

  const clearCounters = useCallback(() => {
    Object.values(counters.current).forEach(({ timer }) => {
      if (timer) clearTimeout(timer);
    });
    counters.current = {};
  }, []);

  const success = useCallback((message: string, options?: any) => {
    const toastId = sonnerToast.success(message, {
      duration: 4000,
      ...options,
    });

    // Auto-dismiss after 4 seconds
    setTimeout(() => {
      sonnerToast.dismiss(toastId);
    }, 4000);

    return toastId;
  }, []);

  const error = useCallback((message: string, options?: any) => {
    const key = message;

    if (counters.current[key]) {
      // Update existing toast with count
      counters.current[key].count++;
      const count = counters.current[key].count;

      if (counters.current[key].toastId) {
        sonnerToast.dismiss(counters.current[key].toastId);
      }

      const newToastId = sonnerToast.error(`${message} (×${count})`, {
        duration: 8000,
        ...options,
      });

      counters.current[key].toastId = newToastId;

      // Clear existing timer
      if (counters.current[key].timer) {
        clearTimeout(counters.current[key].timer);
      }

      // Set new auto-dismiss timer
      counters.current[key].timer = setTimeout(() => {
        sonnerToast.dismiss(newToastId);
        delete counters.current[key];
      }, 8000);
    } else {
      // New error
      const toastId = sonnerToast.error(message, {
        duration: 8000,
        ...options,
      });

      counters.current[key] = {
        count: 1,
        toastId,
        timer: setTimeout(() => {
          sonnerToast.dismiss(toastId);
          delete counters.current[key];
        }, 8000),
      };
    }
  }, []);

  const info = useCallback((message: string, options?: any) => {
    const toastId = sonnerToast.info(message, {
      duration: 5000,
      ...options,
    });

    setTimeout(() => {
      sonnerToast.dismiss(toastId);
    }, 5000);

    return toastId;
  }, []);

  const loading = useCallback((message: string, options?: any) => {
    return sonnerToast.loading(message, {
      duration: 0, // Loading toasts should be manually dismissed
      ...options,
    });
  }, []);

  const dismiss = useCallback((toastId?: string | number) => {
    if (toastId) {
      sonnerToast.dismiss(toastId);
    } else {
      sonnerToast.dismiss();
    }
  }, []);

  const clearAll = useCallback(() => {
    // Clear all counters and timers
    clearCounters();
    // Dismiss all toasts
    sonnerToast.dismiss();
  }, [clearCounters]);

  return {
    success,
    error,
    info,
    loading,
    dismiss,
    clearCounters,
    clearAll,
  };
}
