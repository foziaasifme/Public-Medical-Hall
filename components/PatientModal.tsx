import React, { useState, useEffect } from 'react';
import { X, UserPlus } from 'lucide-react';
import { storageService } from '../services/storageService';
import { Patient } from '../types';
import { motion } from 'motion/react';

export const PatientModal: React.FC<{ onClose: () => void, initialData?: Patient | null }> = ({ onClose, initialData }) => {
  const [name, setName] = useState(initialData?.name || '');
  const [phone, setPhone] = useState(initialData?.phone || '');
  const [age, setAge] = useState(initialData?.age || '');
  const [gender, setGender] = useState<'Male' | 'Female' | 'Other'>(initialData?.gender || 'Male');
  const [address, setAddress] = useState(initialData?.address || '');
  const [referredBy, setReferredBy] = useState(initialData?.referredBy || '');
  const [visitPurpose, setVisitPurpose] = useState(initialData?.visitPurpose || '');
  const [existingReferrers, setExistingReferrers] = useState<string[]>([]);

  useEffect(() => {
    const loadReferrers = async () => {
      const patients = await storageService.getPatients();
      const referrers = new Set<string>();
      patients.forEach(p => {
        if (p.referredBy) referrers.add(p.referredBy);
      });
      setExistingReferrers(Array.from(referrers));
    };
    loadReferrers();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (initialData) {
      const updatedPatient: Patient = {
        ...initialData,
        name,
        phone,
        age,
        gender,
        address,
        referredBy,
        visitPurpose
      };
      await storageService.updatePatient(updatedPatient);
    } else {
      const newPatient: Patient = {
        id: `pat-${Date.now()}`,
        name,
        phone,
        age,
        gender,
        address,
        referredBy,
        visitPurpose,
        history: [],
        isActive: true,
        registeredAt: new Date().toISOString()
      };
      await storageService.addPatient(newPatient);
    }
    window.dispatchEvent(new Event('patientAdded'));
    onClose();
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <motion.div 
        initial={{ opacity: 0, scale: 0.95, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 20 }}
        className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden"
      >
        <div className="p-4 border-b border-gray-100 flex justify-between items-center bg-gray-50">
          <h3 className="font-bold text-gray-800 flex items-center gap-2">
            <UserPlus size={18} className="text-blue-600" /> {initialData ? 'Edit Patient' : 'Add New Patient'}
          </h3>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 p-1 hover:bg-gray-200 rounded-full transition-colors">
            <X size={18} />
          </button>
        </div>
        <form onSubmit={handleSubmit} className="p-4 space-y-3">
          <div>
            <label className="text-[10px] font-bold text-gray-500 uppercase">Name</label>
            <input 
              autoFocus 
              className="w-full mt-1 px-3 py-1.5 rounded-xl border border-gray-200 focus:ring-2 focus:ring-blue-500 outline-none text-sm" 
              value={name} 
              onChange={e => setName(e.target.value)} 
              required 
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-[10px] font-bold text-gray-500 uppercase">Age (Years)</label>
              <input 
                type="number" 
                className="w-full mt-1 px-3 py-1.5 rounded-xl border border-gray-200 focus:ring-2 focus:ring-blue-500 outline-none text-sm" 
                value={age} 
                onChange={e => setAge(e.target.value)} 
              />
            </div>
            <div>
              <label className="text-[10px] font-bold text-gray-500 uppercase">Sex</label>
              <select 
                className="w-full mt-1 px-3 py-1.5 rounded-xl border border-gray-200 focus:ring-2 focus:ring-blue-500 outline-none text-sm" 
                value={gender} 
                onChange={e => setGender(e.target.value as any)}
              >
                <option value="Male">Male</option>
                <option value="Female">Female</option>
                <option value="Other">Other</option>
              </select>
            </div>
          </div>
          <div>
            <label className="text-[10px] font-bold text-gray-500 uppercase">Phone</label>
            <input 
              className="w-full mt-1 px-3 py-1.5 rounded-xl border border-gray-200 focus:ring-2 focus:ring-blue-500 outline-none text-sm" 
              value={phone} 
              onChange={e => setPhone(e.target.value)} 
              required 
            />
          </div>
          <div>
            <label className="text-[10px] font-bold text-gray-500 uppercase">Address</label>
            <input 
              className="w-full mt-1 px-3 py-1.5 rounded-xl border border-gray-200 focus:ring-2 focus:ring-blue-500 outline-none text-sm" 
              value={address} 
              onChange={e => setAddress(e.target.value)} 
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-[10px] font-bold text-gray-500 uppercase">Referred By</label>
              <input 
                list="referrers-list"
                className="w-full mt-1 px-3 py-1.5 rounded-xl border border-gray-200 focus:ring-2 focus:ring-blue-500 outline-none text-sm" 
                value={referredBy} 
                onChange={e => setReferredBy(e.target.value)} 
                placeholder="Select or type new referrer"
              />
              <datalist id="referrers-list">
                {existingReferrers.map((ref, idx) => (
                  <option key={idx} value={ref} />
                ))}
              </datalist>
            </div>
            <div>
              <label className="text-[10px] font-bold text-gray-500 uppercase">Visit Purpose</label>
              <input 
                className="w-full mt-1 px-3 py-1.5 rounded-xl border border-gray-200 focus:ring-2 focus:ring-blue-500 outline-none text-sm" 
                value={visitPurpose} 
                onChange={e => setVisitPurpose(e.target.value)} 
                placeholder="e.g., Checkup, Lab Test"
              />
            </div>
          </div>
          <div className="pt-3 flex gap-3">
            <button type="button" onClick={onClose} className="flex-1 px-4 py-2 rounded-xl font-bold text-gray-600 bg-gray-100 hover:bg-gray-200 transition-colors text-sm">Cancel</button>
            <button type="submit" className="flex-1 px-4 py-2 rounded-xl font-bold text-white bg-blue-600 hover:bg-blue-700 transition-colors text-sm">Save Patient</button>
          </div>
        </form>
      </motion.div>
    </div>
  );
};
