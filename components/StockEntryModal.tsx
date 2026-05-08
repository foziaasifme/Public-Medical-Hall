import React, { useState, useEffect } from 'react';
import { X, Save, Truck, Activity } from 'lucide-react';
import { Button } from './ui/Button';
import { Medicine } from '../types';
import { motion } from 'motion/react';
import { clsx } from 'clsx';
import { storageService } from '../services/storageService';

interface StockEntryModalProps {
  isOpen: boolean;
  onClose: () => void;
  medicine: Medicine | null;
  onSuccess: () => void;
}

export const StockEntryModal: React.FC<StockEntryModalProps> = ({ isOpen, onClose, medicine, onSuccess }) => {
  const [type, setType] = useState<'IN' | 'OUT'>('IN');
  const [quantity, setQuantity] = useState<number>(1);
  const [reason, setReason] = useState('New Batch');
  const [batch, setBatch] = useState('');
  const [stockPurchasePrice, setStockPurchasePrice] = useState<number>(0);

  useEffect(() => {
    if (isOpen && medicine) {
      setType('IN');
      setQuantity(1);
      setReason('New Batch');
      setBatch(medicine.batchNumber || '');
      setStockPurchasePrice(medicine.purchasePrice || 0);
    }
  }, [isOpen, medicine]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!medicine || quantity <= 0) return;

    try {
      const userStr = localStorage.getItem('user');
      const currentUser = userStr ? JSON.parse(userStr) : null;
      
      const newEntry = {
        id: Date.now().toString(),
        medicineId: medicine.id,
        medicineName: medicine.name,
        type,
        quantity,
        date: new Date().toISOString(),
        userId: currentUser?.id || 'system',
        userName: currentUser?.name || 'System',
        purchasePrice: type === 'IN' ? stockPurchasePrice : medicine.purchasePrice,
        reason,
        batchNumber: type === 'IN' ? batch : medicine.batchNumber
      };

      await storageService.addStockEntry(newEntry as any);
      
      onSuccess();
      onClose();
    } catch (e) {
      console.error(e);
      alert('Failed to save stock entry.');
    }
  };

  if (!isOpen || !medicine) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <motion.div 
        initial={{ opacity: 0, scale: 0.95, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 20 }}
        className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden flex flex-col"
      >
        <div className="p-5 border-b border-gray-100 flex justify-between items-center bg-gray-50">
          <div className="flex items-center gap-3">
             <div className="w-10 h-10 bg-blue-100 text-medical-blue rounded-xl flex items-center justify-center">
               <Truck size={20} />
             </div>
             <div>
               <h3 className="font-bold text-gray-800 text-lg">Stock Management</h3>
               <p className="text-xs text-gray-500 font-bold truncate max-w-[200px]">{medicine.name}</p>
             </div>
          </div>
          <button type="button" onClick={onClose} className="text-gray-400 hover:text-gray-600 bg-white p-2 rounded-full shadow-sm border border-gray-100">
            <X size={20} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div>
            <label className="text-xs font-semibold text-gray-500 uppercase">Action Type</label>
            <div className="flex gap-2 mt-1">
              <button type="button" onClick={() => { setType('IN'); setReason('New Batch'); }} className={clsx("flex-1 py-2 rounded-lg text-sm font-medium border transition-colors", type === 'IN' ? "bg-green-50 border-green-200 text-green-700 shadow-inner" : "bg-gray-50 border-gray-200 text-gray-500")}>Stock In</button>
              <button type="button" onClick={() => { setType('OUT'); setReason('Expired'); }} className={clsx("flex-1 py-2 rounded-lg text-sm font-medium border transition-colors", type === 'OUT' ? "bg-red-50 border-red-200 text-red-700 shadow-inner" : "bg-gray-50 border-gray-200 text-gray-500")}>Stock Out</button>
            </div>
          </div>
          
          <div className="glass-panel p-3 border border-gray-200 rounded-lg flex items-center justify-between mb-2">
            <span className="text-sm font-bold text-gray-700">Current Stock:</span>
            <span className="text-sm font-black text-medical-blue">{medicine.stock} {medicine.unit}</span>
          </div>

          <div>
            <label className="text-xs font-semibold text-gray-500 uppercase">Input Quantity</label>
            <input 
              type="number" 
              min="1"
              max={type === 'OUT' ? medicine.stock : undefined}
              className="w-full mt-1 px-3 py-2 rounded-lg border border-gray-200 text-sm focus:ring-2 focus:ring-medical-blue outline-none font-bold"
              value={quantity || ''}
              onChange={(e) => setQuantity(parseInt(e.target.value))}
              required
            />
          </div>

          {type === 'IN' && (
            <div>
              <label className="text-xs font-semibold text-gray-500 uppercase">Purchase Price</label>
              <input 
                type="number" 
                step="0.01"
                className="w-full mt-1 px-3 py-2 rounded-lg border border-gray-200 text-sm focus:ring-2 focus:ring-medical-blue outline-none"
                value={stockPurchasePrice || ''}
                onChange={(e) => setStockPurchasePrice(parseFloat(e.target.value))}
                placeholder="Current Price"
                required
              />
            </div>
          )}

          {type === 'IN' ? (
             <div>
                <label className="text-xs font-semibold text-gray-500 uppercase">Batch Number</label>
                <input 
                  type="text" 
                  className="w-full mt-1 px-3 py-2 rounded-lg border border-gray-200 text-sm focus:ring-2 focus:ring-medical-blue outline-none"
                  value={batch}
                  onChange={(e) => setBatch(e.target.value)}
                  placeholder="e.g. B-202X"
                />
             </div>
          ) : (
             <div>
                <label className="text-xs font-semibold text-gray-500 uppercase">Reason</label>
                <select 
                  className="w-full mt-1 px-3 py-2 rounded-lg border border-gray-200 text-sm focus:ring-2 focus:ring-medical-blue outline-none font-medium"
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                >
                  <option value="Expired">Expired</option>
                  <option value="Damaged">Damaged</option>
                  <option value="Lost">Lost/Stolen</option>
                  <option value="Correction">Correction</option>
                </select>
             </div>
          )}
          
          <div className="pt-2">
            <Button type="submit" className="w-full shadow-sm" variant={type === 'IN' ? 'primary' : 'danger'}>
              {type === 'IN' ? 'Confirm Stock In' : 'Confirm Stock Out'}
            </Button>
          </div>
        </form>
      </motion.div>
    </div>
  );
};
