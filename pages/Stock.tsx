import React, { useState, useEffect } from 'react';
import { Truck, ArrowUpRight, ArrowDownLeft, Calendar } from 'lucide-react';
import { Medicine, StockEntry } from '../types';
import { storageService } from '../services/storageService';
import { Button } from '../components/ui/Button';
import { CURRENCY } from '../constants';
import { clsx } from 'clsx';

const Stock: React.FC = () => {
  const [medicines, setMedicines] = useState<Medicine[]>([]);
  const [entries, setEntries] = useState<StockEntry[]>([]);
  
  // Form State
  const [selectedMedId, setSelectedMedId] = useState('');
  const [quantity, setQuantity] = useState(0);
  const [type, setType] = useState<'IN' | 'OUT'>('IN');
  const [reason, setReason] = useState('New Batch');
  const [batch, setBatch] = useState('');

  useEffect(() => {
    const fetchData = async () => {
      const [meds, stockEntries] = await Promise.all([
        storageService.getMedicines(),
        storageService.getStockEntries()
      ]);
      setMedicines(meds);
      setEntries([...stockEntries].reverse());
    };
    fetchData();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedMedId || quantity <= 0) return;

    const med = medicines.find(m => m.id === selectedMedId);
    if (!med) return;

    const entry: StockEntry = {
      id: Date.now().toString(),
      date: new Date().toISOString(),
      medicineId: med.id,
      medicineName: med.name,
      quantity,
      type,
      reason,
      batchNumber: type === 'IN' ? batch : undefined
    };

    await storageService.addStockEntry(entry);
    
    // Refresh
    const [updatedMeds, updatedEntries] = await Promise.all([
      storageService.getMedicines(),
      storageService.getStockEntries()
    ]);
    setMedicines(updatedMeds);
    setEntries([...updatedEntries].reverse());
    
    // Reset Form
    setQuantity(0);
    setBatch('');
  };

  return (
    <div className="h-full flex flex-col lg:flex-row gap-6">
       {/* Left: Entry Form */}
       <div className="w-full lg:w-80 flex flex-col gap-4 shrink-0">
         <div className="glass-panel p-6 rounded-xl border border-gray-200">
           <div className="flex items-center gap-2 mb-4 text-medical-blue">
             <Truck size={24} />
             <h2 className="text-lg font-bold">Stock Management</h2>
           </div>

           <form onSubmit={handleSubmit} className="space-y-4">
             <div>
               <label className="text-xs font-semibold text-gray-500 uppercase">Action Type</label>
               <div className="flex gap-2 mt-1">
                 <button type="button" onClick={() => { setType('IN'); setReason('New Batch'); }} className={clsx("flex-1 py-2 rounded-lg text-sm font-medium border transition-colors", type === 'IN' ? "bg-green-50 border-green-200 text-green-700" : "bg-gray-50 border-gray-200 text-gray-500")}>Stock In</button>
                 <button type="button" onClick={() => { setType('OUT'); setReason('Expired'); }} className={clsx("flex-1 py-2 rounded-lg text-sm font-medium border transition-colors", type === 'OUT' ? "bg-red-50 border-red-200 text-red-700" : "bg-gray-50 border-gray-200 text-gray-500")}>Stock Out</button>
               </div>
             </div>

             <div>
               <label className="text-xs font-semibold text-gray-500 uppercase">Select Medicine</label>
               <select 
                 className="w-full mt-1 px-3 py-2 rounded-lg border border-gray-200 text-sm focus:ring-2 focus:ring-medical-blue outline-none"
                 value={selectedMedId}
                 onChange={(e) => setSelectedMedId(e.target.value)}
                 required
               >
                 <option value="">-- Select SKU --</option>
                 {medicines.map(m => (
                   <option key={m.id} value={m.id}>{m.name} ({m.stock} {m.unit})</option>
                 ))}
               </select>
             </div>

             <div>
               <label className="text-xs font-semibold text-gray-500 uppercase">Quantity</label>
               <input 
                 type="number" 
                 min="1"
                 className="w-full mt-1 px-3 py-2 rounded-lg border border-gray-200 text-sm focus:ring-2 focus:ring-medical-blue outline-none"
                 value={quantity || ''}
                 onChange={(e) => setQuantity(parseInt(e.target.value))}
                 required
               />
             </div>

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
                     className="w-full mt-1 px-3 py-2 rounded-lg border border-gray-200 text-sm focus:ring-2 focus:ring-medical-blue outline-none"
                     value={reason}
                     onChange={(e) => setReason(e.target.value)}
                   >
                     <option value="Expired">Expired</option>
                     <option value="Damaged">Damaged</option>
                     <option value="Lost">Lost/Stolen</option>
                   </select>
                </div>
             )}

             <Button type="submit" className="w-full mt-2" variant={type === 'IN' ? 'primary' : 'danger'}>
               {type === 'IN' ? 'Add Stock' : 'Remove Stock'}
             </Button>
           </form>
         </div>
       </div>

       {/* Right: History Log */}
       <div className="flex-1 glass-panel rounded-xl border border-gray-200 overflow-hidden flex flex-col min-h-[400px]">
         <div className="p-4 border-b border-gray-100 bg-gray-50/50">
           <h3 className="font-semibold text-gray-700">Recent Movements</h3>
         </div>
         <div className="overflow-auto flex-1">
           <table className="w-full text-left min-w-[600px]">
             <thead className="bg-white sticky top-0">
               <tr className="text-xs font-bold text-gray-400 uppercase border-b border-gray-100">
                 <th className="p-4">Date</th>
                 <th className="p-4">Type</th>
                 <th className="p-4">Medicine</th>
                 <th className="p-4 text-center">Qty</th>
                 <th className="p-4">Reason / Batch</th>
               </tr>
             </thead>
             <tbody className="divide-y divide-gray-50">
               {entries.length === 0 && (
                 <tr><td colSpan={5} className="p-8 text-center text-gray-400">No stock history available</td></tr>
               )}
               {entries.map(entry => (
                 <tr key={entry.id} className="hover:bg-blue-50/20">
                   <td className="p-4 text-sm text-gray-500 flex items-center gap-2">
                     <Calendar size={14} />
                     {new Date(entry.date).toLocaleDateString()}
                   </td>
                   <td className="p-4">
                     <span className={clsx("inline-flex items-center gap-1 px-2 py-1 rounded-md text-xs font-bold", 
                       entry.type === 'IN' ? "bg-green-100 text-green-700" : "bg-red-100 text-red-700"
                     )}>
                       {entry.type === 'IN' ? <ArrowDownLeft size={12}/> : <ArrowUpRight size={12}/>}
                       {entry.type}
                     </span>
                   </td>
                   <td className="p-4 font-medium text-gray-800">{entry.medicineName}</td>
                   <td className="p-4 text-center font-bold text-gray-600">{entry.quantity}</td>
                   <td className="p-4 text-sm text-gray-500">
                     {entry.type === 'IN' ? (
                       <span className="font-mono bg-gray-100 px-2 py-0.5 rounded text-xs text-gray-600">{entry.batchNumber || 'N/A'}</span>
                     ) : (
                       entry.reason
                     )}
                   </td>
                 </tr>
               ))}
             </tbody>
           </table>
         </div>
       </div>
    </div>
  );
};

export default Stock;