import React, { useState } from 'react';
import { X, Divide, X as Multiply, Minus, Plus, Equal, Delete } from 'lucide-react';
import { motion } from 'motion/react';

interface CalculatorProps {
  onClose: () => void;
}

export const Calculator: React.FC<CalculatorProps> = ({ onClose }) => {
  const [display, setDisplay] = useState('0');
  const [equation, setEquation] = useState('');

  const handleNumber = (num: string) => {
    setDisplay(display === '0' ? num : display + num);
  };

  const handleOperator = (op: string) => {
    setEquation(display + ' ' + op + ' ');
    setDisplay('0');
  };

  const calculate = () => {
    try {
      // eslint-disable-next-line no-eval
      const result = eval((equation + display).replace('x', '*'));
      setDisplay(String(result));
      setEquation('');
    } catch (e) {
      setDisplay('Error');
    }
  };

  const clear = () => {
    setDisplay('0');
    setEquation('');
  };

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/20 backdrop-blur-sm p-4">
      <motion.div 
        initial={{ opacity: 0, scale: 0.9, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.9, y: 20 }}
        className="bg-gray-900 p-6 rounded-3xl shadow-2xl w-full max-w-xs border border-gray-700 font-sans"
      >
        <div className="flex justify-between items-center mb-4">
          <span className="text-white font-bold text-sm tracking-widest uppercase opacity-60">Calculator</span>
          <button onClick={onClose} className="text-gray-400 hover:text-white transition-colors p-1 hover:bg-gray-800 rounded-lg"><X size={18} /></button>
        </div>
        
        <div className="bg-gray-800 rounded-xl p-4 mb-4 text-right h-24 flex flex-col justify-end shadow-inner">
          <div className="text-gray-400 text-xs h-4 font-mono">{equation}</div>
          <div className="text-white text-3xl font-mono overflow-hidden">{display}</div>
        </div>

        <div className="grid grid-cols-4 gap-3">
          <button onClick={clear} className="col-span-3 bg-gray-700 hover:bg-gray-600 text-red-400 p-4 rounded-xl font-black transition-all active:scale-95 shadow-lg">AC</button>
          <button onClick={() => handleOperator('/')} className="bg-orange-500 hover:bg-orange-600 text-white p-4 rounded-xl flex items-center justify-center transition-all active:scale-95 shadow-lg"><Divide size={20} /></button>
          
          {['7','8','9'].map(n => <button key={n} onClick={() => handleNumber(n)} className="bg-gray-800 hover:bg-gray-700 text-white p-4 rounded-xl font-bold transition-all active:scale-95 shadow-lg">{n}</button>)}
          <button onClick={() => handleOperator('*')} className="bg-orange-500 hover:bg-orange-600 text-white p-4 rounded-xl flex items-center justify-center transition-all active:scale-95 shadow-lg"><Multiply size={20} /></button>

          {['4','5','6'].map(n => <button key={n} onClick={() => handleNumber(n)} className="bg-gray-800 hover:bg-gray-700 text-white p-4 rounded-xl font-bold transition-all active:scale-95 shadow-lg">{n}</button>)}
          <button onClick={() => handleOperator('-')} className="bg-orange-500 hover:bg-orange-600 text-white p-4 rounded-xl flex items-center justify-center transition-all active:scale-95 shadow-lg"><Minus size={20} /></button>

          {['1','2','3'].map(n => <button key={n} onClick={() => handleNumber(n)} className="bg-gray-800 hover:bg-gray-700 text-white p-4 rounded-xl font-bold transition-all active:scale-95 shadow-lg">{n}</button>)}
          <button onClick={() => handleOperator('+')} className="bg-orange-500 hover:bg-orange-600 text-white p-4 rounded-xl flex items-center justify-center transition-all active:scale-95 shadow-lg"><Plus size={20} /></button>

          <button onClick={() => handleNumber('0')} className="col-span-2 bg-gray-800 hover:bg-gray-700 text-white p-4 rounded-xl font-bold transition-all active:scale-95 shadow-lg">0</button>
          <button onClick={() => handleNumber('.')} className="bg-gray-800 hover:bg-gray-700 text-white p-4 rounded-xl font-bold transition-all active:scale-95 shadow-lg">.</button>
          <button onClick={calculate} className="bg-orange-500 hover:bg-orange-600 text-white p-4 rounded-xl flex items-center justify-center transition-all active:scale-95 shadow-lg shadow-orange-500/20"><Equal size={20} /></button>
        </div>
      </motion.div>
    </div>
  );
};
