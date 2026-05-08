import React, { createContext, useContext, useState, useCallback } from 'react';

type DialogType = 'alert' | 'confirm' | 'prompt';

interface DialogOptions {
  title?: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  defaultValue?: string;
  type: DialogType;
}

interface DialogContextType {
  showAlert: (message: string, title?: string) => Promise<void>;
  showConfirm: (message: string, title?: string) => Promise<boolean>;
  showPrompt: (message: string, defaultValue?: string, title?: string) => Promise<string | null>;
}

const DialogContext = createContext<DialogContextType | undefined>(undefined);

export const useDialog = () => {
  const context = useContext(DialogContext);
  if (!context) {
    throw new Error('useDialog must be used within a DialogProvider');
  }
  return context;
};

export const DialogProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [dialog, setDialog] = useState<DialogOptions | null>(null);
  const [resolver, setResolver] = useState<((value: any) => void) | null>(null);
  const [inputValue, setInputValue] = useState('');

  const showAlert = useCallback((message: string, title: string = 'Alert') => {
    setDialog({ type: 'alert', message, title, confirmText: 'OK' });
    return new Promise<void>((resolve) => {
      setResolver(() => resolve);
    });
  }, []);

  const showConfirm = useCallback((message: string, title: string = 'Confirm') => {
    setDialog({ type: 'confirm', message, title, confirmText: 'Confirm', cancelText: 'Cancel' });
    return new Promise<boolean>((resolve) => {
      setResolver(() => resolve);
    });
  }, []);

  const showPrompt = useCallback((message: string, defaultValue: string = '', title: string = 'Prompt') => {
    setDialog({ type: 'prompt', message, title, confirmText: 'Submit', cancelText: 'Cancel', defaultValue });
    setInputValue(defaultValue);
    return new Promise<string | null>((resolve) => {
      setResolver(() => resolve);
    });
  }, []);

  const handleConfirm = () => {
    if (resolver) {
      if (dialog?.type === 'prompt') {
        resolver(inputValue);
      } else if (dialog?.type === 'confirm') {
        resolver(true);
      } else {
        resolver(undefined);
      }
    }
    setDialog(null);
    setResolver(null);
  };

  const handleCancel = () => {
    if (resolver) {
      if (dialog?.type === 'confirm') {
        resolver(false);
      } else if (dialog?.type === 'prompt') {
        resolver(null);
      }
    }
    setDialog(null);
    setResolver(null);
  };

  return (
    <DialogContext.Provider value={{ showAlert, showConfirm, showPrompt }}>
      {children}
      {dialog && (
        <DialogUI 
          options={dialog} 
          onConfirm={handleConfirm} 
          onCancel={handleCancel}
          inputValue={inputValue}
          setInputValue={setInputValue}
        />
      )}
    </DialogContext.Provider>
  );
};

import { motion, AnimatePresence } from 'motion/react';
import { X, AlertCircle, HelpCircle, MessageSquare } from 'lucide-react';
import { Button } from './components/ui/Button';

const DialogUI: React.FC<{
  options: DialogOptions;
  onConfirm: () => void;
  onCancel: () => void;
  inputValue: string;
  setInputValue: (v: string) => void;
}> = ({ options, onConfirm, onCancel, inputValue, setInputValue }) => {
  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
      <motion.div 
        initial={{ opacity: 0, scale: 0.95, y: 10 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 10 }}
        className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden border border-gray-100"
      >
        <div className="p-4 border-b border-gray-50 flex justify-between items-center bg-gray-50/50">
          <div className="flex items-center gap-2">
            {options.type === 'alert' && <AlertCircle className="text-blue-500" size={18} />}
            {options.type === 'confirm' && <HelpCircle className="text-orange-500" size={18} />}
            {options.type === 'prompt' && <MessageSquare className="text-medical-blue" size={18} />}
            <h3 className="font-bold text-gray-900">{options.title}</h3>
          </div>
          <button onClick={onCancel} className="p-1 hover:bg-gray-200 rounded-full transition-colors">
            <X size={18} className="text-gray-400" />
          </button>
        </div>
        
        <div className="p-6">
          <p className="text-gray-600 mb-6 whitespace-pre-wrap">{options.message}</p>
          
          {options.type === 'prompt' && (
            <input 
              type="text"
              className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-medical-blue outline-none mb-6"
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              autoFocus
              onKeyDown={(e) => e.key === 'Enter' && onConfirm()}
            />
          )}
          
          <div className="flex justify-end gap-3">
            {options.type !== 'alert' && (
              <Button variant="secondary" onClick={onCancel} className="px-6">
                {options.cancelText || 'Cancel'}
              </Button>
            )}
            <Button onClick={onConfirm} className="px-6 min-w-[100px]">
              {options.confirmText || 'OK'}
            </Button>
          </div>
        </div>
      </motion.div>
    </div>
  );
};
