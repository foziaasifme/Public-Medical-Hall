import React, { useState, useEffect } from 'react';
import { X, StickyNote as NoteIcon } from 'lucide-react';
import { motion } from 'motion/react';

interface StickyNoteProps {
  onClose: () => void;
}

export const StickyNote: React.FC<StickyNoteProps> = ({ onClose }) => {
  const [note, setNote] = useState('');

  useEffect(() => {
    const saved = localStorage.getItem('pharma_core_sticky_note');
    if (saved) setNote(saved);
  }, []);

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/20 backdrop-blur-sm p-4">
      <motion.div 
        initial={{ opacity: 0, scale: 0.9, rotate: -3 }}
        animate={{ opacity: 1, scale: 1, rotate: 1 }}
        exit={{ opacity: 0, scale: 0.9, rotate: -3 }}
        className="bg-yellow-100 p-0 rounded-tl-3xl rounded-br-3xl rounded-tr-md rounded-bl-md shadow-[10px_10px_0px_rgba(0,0,0,0.1)] w-full max-w-sm overflow-hidden flex flex-col h-80 border border-yellow-200/50"
      >
        <div className="bg-yellow-200/50 p-3 flex justify-between items-center border-b border-yellow-200">
           <div className="flex items-center gap-2 text-yellow-800/60 font-bold uppercase tracking-widest text-xs">
             <NoteIcon size={14} /> Quick Notes
           </div>
           <button onClick={onClose} className="text-yellow-800/40 hover:text-yellow-800 transition-colors"><X size={18} /></button>
        </div>
        <textarea 
          className="flex-1 bg-transparent p-6 resize-none outline-none text-gray-700 font-medium leading-relaxed text-sm placeholder-yellow-800/30 font-mono"
          placeholder="Type your notes here..."
          value={note}
          onChange={(e) => {
             setNote(e.target.value);
             localStorage.setItem('pharma_core_sticky_note', e.target.value);
          }}
          autoFocus
        />
        <div className="p-2 text-right bg-yellow-200/30">
           <span className="text-[10px] text-yellow-800/40 font-bold uppercase">Auto-saved</span>
        </div>
      </motion.div>
    </div>
  );
};
