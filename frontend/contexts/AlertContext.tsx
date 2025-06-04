'use client';

import React, { createContext, useContext, useState, useCallback, ReactNode } from 'react';
import { AlertTriangle, X, Clock, Target } from 'lucide-react';

export interface Alert {
  id: string;
  type: 'urgent' | 'warning' | 'info' | 'success';
  title: string;
  message: string;
  courseId?: string;
  moduleId?: string;
  actionLabel?: string;
  actionUrl?: string;
  dismissible?: boolean;
  autoHide?: boolean;
  duration?: number; // in milliseconds
}

interface AlertContextType {
  alerts: Alert[];
  addAlert: (alert: Omit<Alert, 'id'>) => string;
  removeAlert: (id: string) => void;
  clearAlerts: () => void;
  addUrgentCourseAlert: (courseId: string, title: string, message: string, actionUrl?: string) => string;
}

const AlertContext = createContext<AlertContextType | undefined>(undefined);

export const useAlert = () => {
  const context = useContext(AlertContext);
  if (!context) {
    throw new Error('useAlert must be used within an AlertProvider');
  }
  return context;
};

interface AlertProviderProps {
  children: ReactNode;
}

export const AlertProvider: React.FC<AlertProviderProps> = ({ children }) => {
  const [alerts, setAlerts] = useState<Alert[]>([]);

  const addAlert = useCallback((alertData: Omit<Alert, 'id'>) => {
    const id = Math.random().toString(36).substr(2, 9);
    const alert: Alert = {
      id,
      dismissible: true,
      autoHide: false,
      ...alertData,
    };

    setAlerts(current => {
      // Check for duplicate alerts based on title and courseId
      const isDuplicate = current.some(existingAlert => 
        existingAlert.title === alert.title && 
        existingAlert.courseId === alert.courseId
      );
      
      if (isDuplicate) {
        return current; // Don't add duplicate
      }
      
      return [...current, alert];
    });

    // Auto-hide if specified
    if (alert.autoHide && alert.duration) {
      setTimeout(() => {
        removeAlert(id);
      }, alert.duration);
    }

    return id;
  }, []);

  const removeAlert = useCallback((id: string) => {
    setAlerts(current => current.filter(alert => alert.id !== id));
  }, []);

  const clearAlerts = useCallback(() => {
    setAlerts([]);
  }, []);

  const addUrgentCourseAlert = useCallback((
    courseId: string, 
    title: string, 
    message: string, 
    actionUrl?: string
  ) => {
    return addAlert({
      type: 'urgent',
      title,
      message,
      courseId,
      actionLabel: actionUrl ? 'Take Action' : undefined,
      actionUrl,
      dismissible: true,
      autoHide: false,
    });
  }, [addAlert]);

  const contextValue: AlertContextType = {
    alerts,
    addAlert,
    removeAlert,
    clearAlerts,
    addUrgentCourseAlert,
  };

  return (
    <AlertContext.Provider value={contextValue}>
      {children}
      <AlertBanner alerts={alerts} onRemoveAlert={removeAlert} />
    </AlertContext.Provider>
  );
};

const AlertBanner: React.FC<{ alerts: Alert[]; onRemoveAlert: (id: string) => void }> = ({ alerts, onRemoveAlert }) => {

  if (alerts.length === 0) {
    return null;
  }

  // Show only the most recent urgent alert, or the most recent alert if no urgent ones
  const urgentAlerts = alerts.filter(alert => alert.type === 'urgent');
  const displayAlert = urgentAlerts.length > 0 
    ? urgentAlerts[urgentAlerts.length - 1] 
    : alerts[alerts.length - 1];

  const getAlertStyles = (type: Alert['type']) => {
    switch (type) {
      case 'urgent':
        return {
          container: 'bg-red-50 border-red-200 border-l-4 border-l-red-500',
          icon: 'text-red-600',
          title: 'text-red-800',
          message: 'text-red-700',
          button: 'bg-red-600 hover:bg-red-700 text-white',
          closeButton: 'text-red-400 hover:text-red-600'
        };
      case 'warning':
        return {
          container: 'bg-orange-50 border-orange-200 border-l-4 border-l-orange-500',
          icon: 'text-orange-600',
          title: 'text-orange-800',
          message: 'text-orange-700',
          button: 'bg-orange-600 hover:bg-orange-700 text-white',
          closeButton: 'text-orange-400 hover:text-orange-600'
        };
      case 'info':
        return {
          container: 'bg-blue-50 border-blue-200 border-l-4 border-l-blue-500',
          icon: 'text-blue-600',
          title: 'text-blue-800',
          message: 'text-blue-700',
          button: 'bg-blue-600 hover:bg-blue-700 text-white',
          closeButton: 'text-blue-400 hover:text-blue-600'
        };
      case 'success':
        return {
          container: 'bg-green-50 border-green-200 border-l-4 border-l-green-500',
          icon: 'text-green-600',
          title: 'text-green-800',
          message: 'text-green-700',
          button: 'bg-green-600 hover:bg-green-700 text-white',
          closeButton: 'text-green-400 hover:text-green-600'
        };
      default:
        return {
          container: 'bg-gray-50 border-gray-200 border-l-4 border-l-gray-500',
          icon: 'text-gray-600',
          title: 'text-gray-800',
          message: 'text-gray-700',
          button: 'bg-gray-600 hover:bg-gray-700 text-white',
          closeButton: 'text-gray-400 hover:text-gray-600'
        };
    }
  };

  const getIcon = (type: Alert['type']) => {
    switch (type) {
      case 'urgent':
        return <AlertTriangle className="h-5 w-5" />;
      case 'warning':
        return <Clock className="h-5 w-5" />;
      case 'info':
        return <Target className="h-5 w-5" />;
      case 'success':
        return <Target className="h-5 w-5" />;
      default:
        return <AlertTriangle className="h-5 w-5" />;
    }
  };

  const styles = getAlertStyles(displayAlert.type);

  return (
    <div className={`fixed top-0 left-0 right-0 z-50 p-4 ${styles.container} shadow-lg`}>
      <div className="max-w-7xl mx-auto flex items-center justify-between">
        <div className="flex items-start space-x-3">
          <div className={styles.icon}>
            {getIcon(displayAlert.type)}
          </div>
          <div className="flex-1 min-w-0">
            <h3 className={`font-medium ${styles.title}`}>
              {displayAlert.title}
            </h3>
            <p className={`mt-1 text-sm ${styles.message}`}>
              {displayAlert.message}
            </p>
          </div>
        </div>
        
        <div className="flex items-center space-x-4 ml-4">
          {displayAlert.actionLabel && displayAlert.actionUrl && (
            <a
              href={displayAlert.actionUrl}
              className={`inline-flex items-center px-4 py-2 text-sm font-medium rounded-md ${styles.button} transition-colors`}
            >
              {displayAlert.actionLabel}
            </a>
          )}
          
          {displayAlert.dismissible && (
            <button
              onClick={() => onRemoveAlert(displayAlert.id)}
              className={`p-1 rounded-md ${styles.closeButton} hover:bg-white/20 transition-colors`}
              aria-label="Dismiss alert"
            >
              <X className="h-4 w-4" />
            </button>
          )}
        </div>
      </div>
      
      {/* Multiple alerts indicator */}
      {alerts.length > 1 && (
        <div className="max-w-7xl mx-auto mt-2">
          <div className="flex items-center justify-center">
            <span className={`text-xs ${styles.message}`}>
              {alerts.length - 1} more alert{alerts.length > 2 ? 's' : ''}
            </span>
          </div>
        </div>
      )}
    </div>
  );
};