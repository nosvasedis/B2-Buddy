
import React, { createContext, useContext, useState, useCallback, ReactNode } from 'react';
import { playSound } from '../services/soundService';

type NotificationType = 'success' | 'error' | 'info' | 'levelup';

interface Notification {
  id: string;
  message: string;
  type: NotificationType;
}

interface NotificationContextType {
  notify: (message: string, type?: NotificationType) => void;
}

const NotificationContext = createContext<NotificationContextType | undefined>(undefined);

export const useNotification = () => {
  const context = useContext(NotificationContext);
  if (!context) {
    throw new Error('useNotification must be used within a NotificationProvider');
  }
  return context;
};

export const NotificationProvider: React.FC<{ children: ReactNode; soundEnabled: boolean }> = ({ children, soundEnabled }) => {
  const [notifications, setNotifications] = useState<Notification[]>([]);

  const notify = useCallback((message: string, type: NotificationType = 'info') => {
    const id = Date.now().toString();
    
    // Sound effects based on type
    if (soundEnabled) {
        if (type === 'success') playSound('success');
        else if (type === 'error') playSound('error');
        else if (type === 'levelup') playSound('levelUp');
        else playSound('pop');
    }

    setNotifications((prev) => [...prev, { id, message, type }]);

    // Auto dismiss
    setTimeout(() => {
      setNotifications((prev) => prev.filter((n) => n.id !== id));
    }, 3000);
  }, [soundEnabled]);

  return (
    <NotificationContext.Provider value={{ notify }}>
      {children}
      <div className="fixed top-4 left-0 w-full flex flex-col items-center pointer-events-none z-[9999] space-y-2 px-4">
        {notifications.map((n) => (
          <div
            key={n.id}
            className={`
              pointer-events-auto min-w-[300px] max-w-md w-full backdrop-blur-md border-l-4 shadow-2xl rounded-r-xl rounded-l-sm p-4 flex items-center gap-3 transform transition-all duration-500 animate-slide-down
              ${n.type === 'success' ? 'bg-emerald-900/90 border-emerald-400 text-emerald-100' : ''}
              ${n.type === 'error' ? 'bg-rose-900/90 border-rose-500 text-rose-100' : ''}
              ${n.type === 'info' ? 'bg-slate-900/90 border-indigo-400 text-indigo-100' : ''}
              ${n.type === 'levelup' ? 'bg-purple-900/90 border-amber-400 text-amber-100' : ''}
            `}
          >
            <div className={`
              w-8 h-8 rounded-full flex items-center justify-center text-lg shrink-0
              ${n.type === 'success' ? 'bg-emerald-800' : ''}
              ${n.type === 'error' ? 'bg-rose-800' : ''}
              ${n.type === 'info' ? 'bg-indigo-800' : ''}
              ${n.type === 'levelup' ? 'bg-amber-600' : ''}
            `}>
              {n.type === 'success' && '✓'}
              {n.type === 'error' && '✕'}
              {n.type === 'info' && 'ℹ'}
              {n.type === 'levelup' && '🚀'}
            </div>
            <div>
              <p className="font-bold text-sm">{n.type === 'levelup' ? 'LEVEL UP!' : n.type.toUpperCase()}</p>
              <p className="text-xs font-medium opacity-90">{n.message}</p>
            </div>
          </div>
        ))}
      </div>
    </NotificationContext.Provider>
  );
};
