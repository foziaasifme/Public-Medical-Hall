import React, { useState, useEffect } from 'react';
import { X, UserPlus, Save, Shield, User as UserIcon, Lock } from 'lucide-react';
import { motion } from 'motion/react';
import { Button } from './ui/Button';
import { User } from '../types';

interface UserFormModalProps {
  user?: User;
  onClose: () => void;
  onSave: (userData: Partial<User>) => void;
}

export const UserFormModal: React.FC<UserFormModalProps> = ({ user, onClose, onSave }) => {
  const [username, setUsername] = useState(user?.username || '');
  const [password, setPassword] = useState(user?.password || '');
  const [role, setRole] = useState<'admin' | 'staff'>(user?.role || 'staff');
  const [permissions, setPermissions] = useState(user?.permissions || {
    inventory: false,
    stock: true,
    suppliers: false,
    settings: false,
    dashboard: true,
    patients: true,
    labTest: false,
    counter: true,
    reports: false
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!username || (!user && !password)) return;
    
    onSave({
      username,
      password,
      role,
      permissions
    });
    onClose();
  };

  const togglePermission = (key: keyof typeof permissions) => {
    setPermissions(prev => ({
      ...prev,
      [key]: !prev[key]
    }));
  };

  const permissionLabels: Record<string, string> = {
    inventory: 'Manage Inventory',
    stock: 'Stock Operations',
    suppliers: 'Supplier Management',
    settings: 'System Settings',
    dashboard: 'View Dashboard',
    patients: 'Patient Records',
    labTest: 'Lab Reports',
    counter: 'Point of Sale',
    reports: 'Financial Reports'
  };

  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
      <motion.div 
        initial={{ opacity: 0, scale: 0.95, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 20 }}
        className="bg-white rounded-3xl shadow-2xl w-full max-w-2xl overflow-hidden border border-white/40 flex flex-col max-h-[90vh]"
      >
        <div className="bg-medical-blue p-6 text-white flex justify-between items-center shrink-0">
          <div className="flex items-center gap-3">
            <div className="bg-white/20 p-2 rounded-xl">
              <UserPlus className="w-6 h-6" />
            </div>
            <div>
              <h2 className="text-xl font-bold">{user ? 'Edit User' : 'Add New Staff Account'}</h2>
              <p className="text-blue-100 text-xs opacity-80">Configure access levels and credentials</p>
            </div>
          </div>
          <button onClick={onClose} className="bg-white/10 hover:bg-white/20 p-2 rounded-xl transition-colors">
            <X size={20} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-8 space-y-8 overflow-y-auto">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-4">
                <h3 className="text-sm font-bold text-gray-500 uppercase tracking-widest flex items-center gap-2">
                  <UserIcon size={14} /> Basic Information
                </h3>
                <div className="space-y-4 bg-gray-50 p-6 rounded-2xl border border-gray-100">
                  <div className="space-y-1">
                    <label className="text-xs font-semibold text-gray-500 ml-1">Username</label>
                    <input
                      type="text"
                      value={username}
                      onChange={(e) => setUsername(e.target.value)}
                      className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-medical-blue bg-white"
                      placeholder="e.g. jame_doe"
                      required
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs font-semibold text-gray-500 ml-1">Password</label>
                    <div className="relative">
                       <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4" />
                       <input
                         type="password"
                         value={password}
                         onChange={(e) => setPassword(e.target.value)}
                         className="w-full pl-11 pr-4 py-3 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-medical-blue bg-white"
                         placeholder={user ? "Leave blank to keep current" : "Enter password"}
                         required={!user}
                       />
                    </div>
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs font-semibold text-gray-500 ml-1">Primary Role</label>
                    <select
                      value={role}
                      onChange={(e) => setRole(e.target.value as any)}
                      className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-medical-blue bg-white"
                    >
                      <option value="staff">Staff Member</option>
                      <option value="admin">Administrator</option>
                    </select>
                  </div>
                </div>
            </div>

            <div className="space-y-4">
                <h3 className="text-sm font-bold text-gray-500 uppercase tracking-widest flex items-center gap-2">
                  <Shield size={14} /> Permissions
                </h3>
                <div className="bg-gray-50 p-6 rounded-2xl border border-gray-100 grid grid-cols-1 gap-3">
                  {Object.entries(permissionLabels).map(([key, label]) => (
                    <label key={key} className="flex items-center justify-between p-3 bg-white rounded-xl border border-gray-100 hover:border-medical-blue transition-colors cursor-pointer group">
                      <span className="text-sm font-medium text-gray-700">{label}</span>
                      <div 
                        onClick={() => togglePermission(key as any)}
                        className={`w-12 h-6 rounded-full transition-all relative ${permissions[key as keyof typeof permissions] ? 'bg-medical-blue' : 'bg-gray-200'}`}
                      >
                        <div className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-all ${permissions[key as keyof typeof permissions] ? 'left-7' : 'left-1'}`} />
                      </div>
                    </label>
                  ))}
                </div>
            </div>
          </div>

          <div className="flex gap-4 pt-4 border-t border-gray-100 shrink-0">
            <Button type="button" variant="secondary" onClick={onClose} className="flex-1 py-4">Cancel</Button>
            <Button type="submit" className="flex-1 py-4 gap-2">
              <Save size={20} /> {user ? 'Update Account' : 'Create Account'}
            </Button>
          </div>
        </form>
      </motion.div>
    </div>
  );
};
