import React, { useState, useEffect } from 'react';
import { X, Lock } from 'lucide-react';
import { Button } from './ui/Button';
import { motion } from 'motion/react';
import { clsx } from 'clsx';

interface PinModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  requiredPin: string;
  title?: string;
}

export const PinModal: React.FC<PinModalProps> = ({ isOpen, onClose, onSuccess, requiredPin, title = "Security Check" }) => {
  const [pin, setPin] = useState('');
  const [error, setError] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setPin('');
      setError(false);
    }
  }, [isOpen]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (pin === requiredPin) {
      onSuccess();
      onClose();
    } else {
      setError(true);
      setPin('');
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
      <motion.div 
        initial={{ opacity: 0, scale: 0.95, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 20 }}
        className="bg-white rounded-2xl shadow-2xl p-6 w-full max-w-sm border border-white/40"
      >
        <div className="flex justify-between items-center mb-6">
          <div className="flex items-center gap-2 text-medical-blue">
            <Lock className="w-5 h-5" />
            <h3 className="font-semibold text-lg">{title}</h3>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="relative">
            <input
              type="password"
              value={pin}
              onChange={(e) => {
                setPin(e.target.value);
                setError(false);
              }}
              placeholder="Enter Master PIN"
              className={clsx(
                "w-full text-center font-bold py-3 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-medical-blue focus:border-transparent bg-gray-50",
                pin.length > 8 ? "text-lg tracking-normal" : "text-2xl tracking-[0.5em]"
              )}
              autoFocus
            />
          </div>
          
          {error && (
            <p className="text-red-500 text-xs text-center font-medium">Incorrect PIN. Access Denied.</p>
          )}

          <div className="flex gap-3 mt-4">
             <Button type="button" variant="secondary" onClick={onClose} className="flex-1">Cancel</Button>
             <Button type="submit" className="flex-1">Verify</Button>
          </div>
        </form>
      </motion.div>
    </div>
  );
};