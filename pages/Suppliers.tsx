import React, { useState, useEffect } from 'react';
import { Contact, Search, Phone, Mail } from 'lucide-react';
import { Supplier } from '../types';
import { storageService } from '../services/storageService';
import { Button } from '../components/ui/Button';

const Suppliers: React.FC = () => {
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [name, setName] = useState('');
  const [contact, setContact] = useState('');
  const [email, setEmail] = useState('');

  useEffect(() => {
    const fetchData = async () => {
      const sups = await storageService.getSuppliers();
      setSuppliers(sups);
    };
    fetchData();
  }, []);

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    const newSup: Supplier = {
      id: Date.now().toString(),
      name,
      contact,
      email,
      medicinesSupplied: []
    };
    await storageService.addSupplier(newSup);
    const updated = await storageService.getSuppliers();
    setSuppliers(updated);
    setShowForm(false);
    setName('');
    setContact('');
    setEmail('');
  };

  return (
    <div className="h-full flex flex-col">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-bold text-gray-800 flex items-center gap-3">
          <div className="w-10 h-10 bg-orange-100 text-orange-600 rounded-xl flex items-center justify-center">
            <Contact size={20} />
          </div>
          Distributors & Suppliers
        </h2>
        <Button onClick={() => setShowForm(!showForm)} className="bg-orange-500 hover:bg-orange-600">
          {showForm ? 'Cancel' : 'Add Distributor'}
        </Button>
      </div>

      {showForm && (
        <div className="mb-6 p-6 glass-panel border border-orange-100 rounded-2xl">
          <form onSubmit={handleAdd} className="grid grid-cols-1 md:grid-cols-4 gap-4 items-end">
             <div className="md:col-span-1">
               <label className="text-xs font-bold text-gray-500 uppercase">Company Name</label>
               <input className="w-full mt-1 px-4 py-2 rounded-lg border border-gray-200 outline-none focus:ring-2 focus:ring-orange-500" required value={name} onChange={e => setName(e.target.value)} />
             </div>
             <div>
               <label className="text-xs font-bold text-gray-500 uppercase">Contact Number</label>
               <input className="w-full mt-1 px-4 py-2 rounded-lg border border-gray-200 outline-none focus:ring-2 focus:ring-orange-500" required value={contact} onChange={e => setContact(e.target.value)} />
             </div>
             <div>
               <label className="text-xs font-bold text-gray-500 uppercase">Email (Optional)</label>
               <input className="w-full mt-1 px-4 py-2 rounded-lg border border-gray-200 outline-none focus:ring-2 focus:ring-orange-500" value={email} onChange={e => setEmail(e.target.value)} />
             </div>
             <Button type="submit" className="bg-orange-500 hover:bg-orange-600">Save</Button>
          </form>
        </div>
      )}

      {/* Adjusted grid for wider cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-3 gap-6 overflow-y-auto pb-10">
        {suppliers.length === 0 && <p className="text-gray-400 col-span-full text-center py-10">No suppliers registered.</p>}
        {suppliers.map(s => (
          <div key={s.id} className="glass-panel p-6 rounded-xl border border-gray-200 relative overflow-hidden group hover:scale-[1.01] transition-transform">
            <div className="absolute top-0 right-0 w-24 h-24 bg-orange-50 rounded-bl-[100px] -mr-4 -mt-4 transition-transform group-hover:scale-110"></div>
            
            <h3 className="font-bold text-lg text-gray-800 relative z-10">{s.name}</h3>
            <div className="mt-4 space-y-2 relative z-10">
               <div className="flex items-center gap-3 text-gray-600 text-sm">
                 <Phone size={16} className="text-orange-400" /> {s.contact}
               </div>
               {s.email && (
                 <div className="flex items-center gap-3 text-gray-600 text-sm">
                   <Mail size={16} className="text-orange-400" /> {s.email}
                 </div>
               )}
            </div>
            <div className="mt-6 pt-4 border-t border-gray-100 flex justify-between items-center">
               <span className="text-xs font-semibold text-gray-400">ID: {s.id.substr(-6)}</span>
               <button className="text-orange-500 text-xs font-bold hover:underline">View History</button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default Suppliers;