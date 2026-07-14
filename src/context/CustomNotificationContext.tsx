import React, { createContext, useContext, useState, useEffect } from 'react';

type NotificationType = 'success' | 'error' | 'info' | 'warning' | 'confirm';

interface CustomNotificationOptions {
  title?: string;
  message: string;
  type?: NotificationType;
  onConfirm?: () => void;
  onCancel?: () => void;
}

interface CustomNotificationContextType {
  show: (options: CustomNotificationOptions) => void;
}

const CustomNotificationContext = createContext<CustomNotificationContextType | undefined>(undefined);

export const useCustomNotification = () => {
  const context = useContext(CustomNotificationContext);
  if (!context) {
    throw new Error('useCustomNotification must be used within CustomNotificationProvider');
  }
  return context;
};

export const CustomNotificationProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [visible, setVisible] = useState(false);
  const [options, setOptions] = useState<CustomNotificationOptions | null>(null);

  const show = (newOptions: CustomNotificationOptions) => {
    setOptions(newOptions);
    setVisible(true);
  };

  const handleConfirm = () => {
    setVisible(false);
    if (options?.onConfirm) options.onConfirm();
  };

  const handleCancel = () => {
    setVisible(false);
    if (options?.onCancel) options.onCancel();
  };

  // Override the native window.alert globally!
  useEffect(() => {
    const nativeAlert = window.alert;
    window.alert = (message?: any) => {
      show({
        title: 'Notification Detail',
        message: String(message || ''),
        type: String(message || '').toLowerCase().includes('fail') || String(message || '').toLowerCase().includes('error') ? 'error' : 'success'
      });
    };

    // Also override window.confirm
    const nativeConfirm = window.confirm;
    window.confirm = (message?: string): boolean => {
      return nativeConfirm(message);
    };

    return () => {
      window.alert = nativeAlert;
      window.confirm = nativeConfirm;
    };
  }, []);

  return (
    <CustomNotificationContext.Provider value={{ show }}>
      {children}
      {visible && options && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 animate-fade-in font-display">
          {/* Backdrop */}
          <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-md" onClick={handleCancel}></div>

          {/* Modal Box */}
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-white/10 rounded-3xl p-6 max-w-sm w-full shadow-2xl relative z-10 animate-scale-up text-center">
            {/* Header icon */}
            <div className="mx-auto mb-4 flex items-center justify-center size-14 rounded-full">
              {options.type === 'error' && (
                <div className="bg-rose-50 dark:bg-rose-950/30 text-rose-500 p-3 rounded-full flex items-center justify-center size-14">
                  <span className="material-symbols-outlined text-3xl font-black">error</span>
                </div>
              )}
              {options.type === 'success' && (
                <div className="bg-emerald-50 dark:bg-emerald-950/30 text-emerald-500 p-3 rounded-full flex items-center justify-center size-14">
                  <span className="material-symbols-outlined text-3xl font-black">check_circle</span>
                </div>
              )}
              {(options.type === 'info' || !options.type) && (
                <div className="bg-blue-50 dark:bg-blue-950/30 text-blue-500 p-3 rounded-full flex items-center justify-center size-14">
                  <span className="material-symbols-outlined text-3xl font-black">info</span>
                </div>
              )}
              {options.type === 'warning' && (
                <div className="bg-amber-50 dark:bg-amber-950/30 text-amber-500 p-3 rounded-full flex items-center justify-center size-14">
                  <span className="material-symbols-outlined text-3xl font-black">warning</span>
                </div>
              )}
              {options.type === 'confirm' && (
                <div className="bg-primary/10 dark:bg-primary/20 text-primary p-3 rounded-full flex items-center justify-center size-14">
                  <span className="material-symbols-outlined text-3xl font-black">help_center</span>
                </div>
              )}
            </div>

            {/* Title */}
            <h3 className="text-base font-black text-slate-800 dark:text-white uppercase tracking-wider mb-2">
              {options.title || 'System Notification'}
            </h3>

            {/* Message */}
            <p className="text-xs text-slate-500 dark:text-slate-400 mb-6 leading-relaxed whitespace-pre-wrap">
              {options.message}
            </p>

            {/* Buttons */}
            <div className="flex items-center gap-3">
              {options.type === 'confirm' && (
                <button
                  onClick={handleCancel}
                  className="flex-1 py-2.5 border border-slate-200 dark:border-white/10 text-slate-700 dark:text-white rounded-xl text-[10px] uppercase font-bold tracking-widest hover:bg-slate-50 dark:hover:bg-white/5 transition-all"
                >
                  Cancel
                </button>
              )}
              <button
                onClick={handleConfirm}
                className={`flex-1 py-2.5 text-white rounded-xl text-[10px] uppercase font-bold tracking-widest transition-all shadow-md ${options.type === 'error' ? 'bg-rose-500 hover:bg-rose-600 shadow-rose-500/20' : options.type === 'warning' ? 'bg-amber-500 hover:bg-amber-600 shadow-amber-500/20' : 'bg-primary hover:bg-primary/95 shadow-primary/20'}`}
              >
                Ok
              </button>
            </div>
          </div>
        </div>
      )}
    </CustomNotificationContext.Provider>
  );
};