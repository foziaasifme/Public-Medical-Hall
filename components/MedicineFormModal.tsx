import React, { useState, useEffect } from 'react';
import { X, Save, Pill, AlertCircle, Upload } from 'lucide-react';
import { Button } from './ui/Button';
import { Medicine } from '../types';
import { CATEGORIES, UNITS } from '../constants';
import { motion, AnimatePresence } from 'motion/react';

interface MedicineFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (medicine: Medicine) => void;
  initialData?: Medicine | null;
  medicines?: Medicine[];
  onOpenBulkImport?: () => void;
}

export const MedicineFormModal: React.FC<MedicineFormModalProps> = ({ isOpen, onClose, onSave, initialData, medicines = [], onOpenBulkImport }) => {
  const [formData, setFormData] = useState<Partial<Medicine>>({
    name: '',
    genericName: '',
    category: CATEGORIES[0],
    brandName: '',
    modelName: '',
    rackNo: '',
    minStock: 10,
    unit: UNITS[0],
    purchasePrice: 0,
    salePrice: 0,
    stock: 0,
    expiryDate: '',
    batchNumber: '',
  });

  const [isDuplicate, setIsDuplicate] = useState(false);

  useEffect(() => {
    if (initialData) {
      setFormData({
        ...initialData,
        brandName: initialData.brandName || '',
        modelName: initialData.modelName || '',
        rackNo: initialData.rackNo || '',
        minStock: initialData.minStock || 10,
      });
    } else {
      setFormData({
        name: '',
        genericName: '',
        category: CATEGORIES[0],
        brandName: '',
        modelName: '',
        rackNo: '',
        minStock: 10,
        unit: UNITS[0],
        purchasePrice: 0,
        salePrice: 0,
        stock: 0,
        expiryDate: '',
        batchNumber: '',
      });
    }
  }, [initialData, isOpen]);

  useEffect(() => {
    if (formData.name && !initialData) {
      const match = medicines.some(
        m => m.name.toLowerCase().trim() === formData.name?.toLowerCase().trim()
      );
      setIsDuplicate(match);
    } else {
      setIsDuplicate(false);
    }
  }, [formData.name, medicines, initialData]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (isDuplicate) return;

    const medicine: Medicine = {
      id: initialData?.id || Date.now().toString(),
      name: formData.name || 'New Medicine',
      genericName: formData.genericName || '',
      category: formData.category || 'General',
      brandName: formData.brandName || '',
      modelName: formData.modelName || '',
      rackNo: formData.rackNo || '',
      minStock: Number(formData.minStock) || 10,
      unit: (formData.unit as any) || 'Box',
      purchasePrice: Number(formData.purchasePrice),
      salePrice: Number(formData.salePrice),
      stock: Number(formData.stock),
      expiryDate: formData.expiryDate || new Date().toISOString().split('T')[0],
      batchNumber: formData.batchNumber || '',
    };
    onSave(medicine);
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <motion.div 
        initial={{ opacity: 0, scale: 0.95, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 20 }}
        className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl overflow-hidden flex flex-col max-h-[90vh]"
      >
        
        <div className="p-5 border-b border-gray-100 flex justify-between items-center bg-gray-50">
          <div className="flex items-center gap-3">
             <div className="w-10 h-10 bg-blue-100 text-medical-blue rounded-xl flex items-center justify-center">
               <Pill size={20} />
             </div>
             <div>
               <h3 className="font-bold text-gray-800 text-lg">{initialData ? 'Edit Medicine' : 'Add New Medicine'}</h3>
               <div className="flex items-center gap-3 mt-1">
                 <p className="text-xs text-gray-500">Fill in the SKU details below</p>
                 {!initialData && onOpenBulkImport && (
                   <button 
                     type="button" 
                     onClick={onOpenBulkImport}
                     className="flex items-center gap-1.5 text-[10px] font-bold text-medical-blue bg-blue-50 px-2 py-1 rounded-md hover:bg-blue-100 transition-colors"
                   >
                     <Upload size={12} />
                     Bulk CSV File
                   </button>
                 )}
               </div>
             </div>
          </div>
          <button type="button" onClick={onClose} className="text-gray-400 hover:text-gray-600 bg-white p-2 rounded-full shadow-sm border border-gray-100">
            <X size={20} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-6 space-y-6">
           <div className="grid grid-cols-1 md:grid-cols-12 gap-5">

              {/* Row 1: ID/Batch & Name */}
              <div className="col-span-1 md:col-span-4">
                <label className="text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-1 block">ID / Batch</label>
                <input 
                  className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-medical-blue outline-none"
                  placeholder="e.g. B-102"
                  value={formData.batchNumber}
                  onChange={e => setFormData({...formData, batchNumber: e.target.value})}
                />
              </div>
              <div className="col-span-1 md:col-span-8">
                <label className="text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-1 block">Medicine Name</label>
                <input 
                  required
                  className={`w-full px-4 py-3 rounded-xl border ${isDuplicate ? 'border-red-400 bg-red-50 focus:ring-red-400' : 'border-gray-200 focus:ring-medical-blue'} focus:ring-2 outline-none transition-all font-medium`}
                  placeholder="e.g. Panadol Extra"
                  value={formData.name}
                  onChange={e => setFormData({...formData, name: e.target.value})}
                />
                <AnimatePresence>
                  {isDuplicate && (
                    <motion.div 
                      initial={{ opacity: 0, y: -5, height: 0 }}
                      animate={{ opacity: 1, y: 0, height: 'auto' }}
                      exit={{ opacity: 0, y: -5, height: 0 }}
                      className="text-red-500 text-xs font-bold flex items-center gap-1 mt-2 overflow-hidden"
                    >
                      <AlertCircle size={14} /> This medicine name already exists in inventory.
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>

              {/* Row 2: Generic & Category */}
              <div className="col-span-1 md:col-span-8">
                <label className="text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-1 block">Generic Name (Salt)</label>
                <input 
                  required
                  className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-medical-blue outline-none transition-all"
                  placeholder="e.g. Paracetamol + Caffeine"
                  value={formData.genericName}
                  onChange={e => setFormData({...formData, genericName: e.target.value})}
                />
              </div>
              <div className="col-span-1 md:col-span-4">
                <label className="text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-1 block">Category</label>
                <select 
                  className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-medical-blue outline-none bg-white font-medium"
                  value={formData.category}
                  onChange={e => setFormData({...formData, category: e.target.value})}
                >
                  {formData.category && !CATEGORIES.includes(formData.category) && (
                    <option value={formData.category}>{formData.category}</option>
                  )}
                  {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
                </select>
              </div>

              {/* Row 3: Brand Name & Model */}
              <div className="col-span-1 md:col-span-6">
                <label className="text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-1 block">Brand-Name</label>
                <input 
                  className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-medical-blue outline-none transition-all"
                  placeholder="e.g. GSK"
                  value={formData.brandName || ''}
                  onChange={e => setFormData({...formData, brandName: e.target.value})}
                />
              </div>
              <div className="col-span-1 md:col-span-6">
                <label className="text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-1 block">Model / Type</label>
                <input 
                  className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-medical-blue outline-none transition-all"
                  placeholder="e.g. 500mg"
                  value={formData.modelName || ''}
                  onChange={e => setFormData({...formData, modelName: e.target.value})}
                />
              </div>

              {/* Row 4: Rack No., Stock, Min-Stock, Unit */}
              <div className="col-span-1 md:col-span-3">
                <label className="text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-1 block">Rack No.</label>
                <input 
                  className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-medical-blue outline-none transition-all"
                  placeholder="e.g. R-12"
                  value={formData.rackNo || ''}
                  onChange={e => setFormData({...formData, rackNo: e.target.value})}
                />
              </div>
              <div className="col-span-1 md:col-span-3">
                <label className="text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-1 block">Stock</label>
                <div className="flex gap-2">
                  <input 
                    type="number"
                    min="0"
                    required
                    className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-medical-blue outline-none"
                    value={formData.stock}
                    onChange={e => setFormData({...formData, stock: parseInt(e.target.value)})}
                  />
                </div>
              </div>
              <div className="col-span-1 md:col-span-3">
                <label className="text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-1 block">Min-Stock</label>
                <input 
                  type="number"
                  min="0"
                  className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-medical-blue outline-none transition-all"
                  value={formData.minStock || 10}
                  onChange={e => setFormData({...formData, minStock: parseInt(e.target.value) || 0})}
                />
              </div>
              <div className="col-span-1 md:col-span-3">
                <label className="text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-1 block">Unit</label>
                <select 
                  className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-medical-blue outline-none bg-white"
                  value={formData.unit}
                  onChange={e => setFormData({...formData, unit: e.target.value as any})}
                >
                  {UNITS.map(u => <option key={u} value={u}>{u}</option>)}
                </select>
              </div>

              {/* Row 5: Cost Price, Sale Price, Expiry */}
              <div className="col-span-1 md:col-span-4">
                <label className="text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-1 block">Cost Price (Rs.)</label>
                <input 
                  type="number"
                  min="0"
                  step="0.01"
                  required
                  className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-medical-blue outline-none"
                  value={formData.purchasePrice}
                  onChange={e => {
                    const purchasePrice = parseFloat(e.target.value) || 0;
                    const salePrice = Math.round(purchasePrice * 1.25 * 100) / 100;
                    setFormData({...formData, purchasePrice, salePrice});
                  }}
                />
              </div>
              <div className="col-span-1 md:col-span-4">
                <label className="text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-1 block">Sale Price (Rs.)</label>
                <input 
                  type="number"
                  min="0"
                  step="0.01"
                  required
                  className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-medical-blue outline-none bg-gray-50"
                  value={formData.salePrice}
                  onChange={e => setFormData({...formData, salePrice: parseFloat(e.target.value) || 0})}
                />
              </div>
              <div className="col-span-1 md:col-span-4">
                <label className="text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-1 block">Expiry Date</label>
                <input 
                  type="date"
                  required
                  className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-medical-blue outline-none"
                  value={formData.expiryDate}
                  onChange={e => setFormData({...formData, expiryDate: e.target.value})}
                />
              </div>

           </div>
        </form>

        <div className="p-5 border-t border-gray-100 bg-gray-50 flex gap-3">
          <Button variant="secondary" onClick={onClose} className="flex-1 py-3">Cancel</Button>
          <Button onClick={handleSubmit as any} className="flex-1 py-3 gap-2">
            <Save size={18} /> Save Medicine
          </Button>
        </div>
      </motion.div>
    </div>
  );
};