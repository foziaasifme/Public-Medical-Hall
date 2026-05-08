import React, { useState, useEffect } from 'react';
import { Settings, ShieldAlert, Save, Eye, EyeOff, UserPlus, Trash2, X, Users, ArrowLeft, Database, GripVertical } from 'lucide-react';
import { clsx } from 'clsx';
import { storageService } from '../services/storageService';
import { User } from '../types';
import { motion, AnimatePresence, Reorder } from 'motion/react';
import { UserFormModal } from '../components/UserFormModal';
import { DataManagement } from '../components/DataManagement';
import { useDialog } from '../DialogContext';

export interface AppFeatures {
  showDashboard: boolean;
  showPatients: boolean;
  showLabTest: boolean;
  showCounter: boolean;
  showReports: boolean;
  showSettings: boolean;
  showInventory: boolean;
  showPrescriptionScanner: boolean;
  showCalculator: boolean;
  showStickyNote: boolean;
  showSuppliers: boolean;
}

export const defaultFeatures: AppFeatures = {
  showDashboard: true,
  showPatients: false,
  showLabTest: false,
  showCounter: true,
  showReports: true,
  showSettings: true,
  showInventory: true,
  showPrescriptionScanner: true,
  showCalculator: true,
  showStickyNote: true,
  showSuppliers: true,
};

export const checkFeatureAllowed = (key: string) => {
   const devFlags = JSON.parse(localStorage.getItem('DEV_MASTER_FLAGS') || 'null') || defaultFeatures;
   return devFlags[key as keyof AppFeatures] !== false;
};

interface DeveloperPortalProps {
  onClose: () => void;
}

export const DeveloperPortal: React.FC<DeveloperPortalProps> = ({ onClose }) => {
  const { showAlert, showConfirm } = useDialog();
  const [features, setFeatures] = useState<AppFeatures>(defaultFeatures);
  const [orderedFeatures, setOrderedFeatures] = useState<any[]>([]);
  const [isSaved, setIsSaved] = useState(false);
  const [users, setUsers] = useState<User[]>([]);
  const [showUserModal, setShowUserModal] = useState(false);
  const [editingUser, setEditingUser] = useState<User | undefined>(undefined);
  const [activePortalTab, setActivePortalTab] = useState<'access' | 'data'>('access');

  const defaultFeatureList = [
    { key: 'showDashboard', label: 'Dashboard Module' },
    { key: 'showPatients', label: 'Patients Module' },
    { key: 'showLabTest', label: 'Lab Test Module' },
    { key: 'showCounter', label: 'Counter Module' },
    { key: 'showReports', label: 'Reports Module' },
    { key: 'showSettings', label: 'Settings Module' },
    { key: 'showInventory', label: 'Inventory Module' },
    { key: 'showPrescriptionScanner', label: 'AI Prescription Scanner' },
    { key: 'showCalculator', label: 'Calculator Utility' },
    { key: 'showStickyNote', label: 'Sticky Note Utility' },
    { key: 'showSuppliers', label: 'Suppliers Module' },
  ];

  useEffect(() => {
    // Migration: If DEV_MASTER_FLAGS is missing but APP_FEATURE_FLAGS exists, use that to initialize.
    const storedMaster = localStorage.getItem('DEV_MASTER_FLAGS');
    const legacyAppFeatures = localStorage.getItem('APP_FEATURE_FLAGS');
    
    if (storedMaster) {
      setFeatures(JSON.parse(storedMaster));
    } else if (legacyAppFeatures) {
      setFeatures(JSON.parse(legacyAppFeatures));
    }

    const storedOrder = localStorage.getItem('DEV_MODULE_ORDER') || localStorage.getItem('APP_MODULE_ORDER');
    if (storedOrder) {
      try {
        const orderKeys = JSON.parse(storedOrder);
        const sorted = [...defaultFeatureList].sort((a, b) => {
          return orderKeys.indexOf(a.key) - orderKeys.indexOf(b.key);
        });
        setOrderedFeatures(sorted);
      } catch (e) {
        setOrderedFeatures(defaultFeatureList);
      }
    } else {
      setOrderedFeatures(defaultFeatureList);
    }

    loadUsers();
  }, []);

  const handleExport = async (type: string, format: string) => {
    try {
      let dataStr = '';
      let filename = `pharma_${type}_${new Date().toISOString().slice(0, 10)}`;
      let mime = 'text/plain';

      // Logic based on types
      if (type === 'full') {
        dataStr = await storageService.exportDataJSON();
        filename += '.json';
        mime = 'application/json';
      } else if (type === 'inventory') {
        dataStr = await storageService.exportDataCSV('medicines');
        filename += '.csv';
        mime = 'text/csv';
      } else if (type === 'sales') {
        dataStr = await storageService.exportDataCSV('sales');
        filename += '.csv';
        mime = 'text/csv';
      } else if (type === 'staff') {
        const users = await storageService.getUsers();
        dataStr = JSON.stringify(users, null, 2);
        filename += '_staff.json';
        mime = 'application/json';
      } else {
        // Fallback for others (patients, lab)
        let rawData: any[] = [];
        if (type === 'patients') rawData = await storageService.getPatients();
        else if (type === 'lab') rawData = await storageService.getLabTests();
        else rawData = await storageService.getMedicines();
        
        dataStr = JSON.stringify(rawData, null, 2);
        filename += `_${type}.json`;
        mime = 'application/json';
      }

      const blob = new Blob([dataStr], { type: mime });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch (error) {
      console.error('Export failed:', error);
      showAlert('Export failed. Please try again.', 'Export Error');
    }
  };

  const handleRestore = () => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.json';
    input.onchange = (e: any) => {
      const file = e.target.files?.[0];
      if (!file) return;
      const reader = new FileReader();
      reader.onload = async (event) => {
        try {
          const json = event.target?.result as string;
          const confirmed = await showConfirm("WARNING: This will overwrite current data. Continue?", "Restore Backup");
          if (confirmed) {
            const result = await storageService.importData(json);
            await showAlert(result.message, result.success ? "Success" : "Error");
            if (result.success) window.location.reload();
          }
        } catch (error) {
          showAlert('Invalid backup file.', 'Error');
        }
      };
      reader.readAsText(file);
    };
    input.click();
  };

  const loadUsers = async () => {
    const u = await storageService.getUsers();
    setUsers(u);
  };

  const handleSave = () => {
    localStorage.setItem('DEV_MASTER_FLAGS', JSON.stringify(features));
    localStorage.setItem('DEV_MODULE_ORDER', JSON.stringify(orderedFeatures.map(f => f.key)));
    setIsSaved(true);
    setTimeout(() => {
      setIsSaved(false);
      window.location.reload(); 
    }, 1500);
  };

  const toggleFeature = (key: keyof AppFeatures) => {
    setFeatures(prev => ({
      ...prev,
      [key]: !prev[key]
    }));
  };

  const handleCreateOrUpdateUser = async (userData: Partial<User>) => {
    if (editingUser) {
      const updatedUser = { ...editingUser, ...userData };
      await storageService.saveUser(updatedUser);
    } else {
      const newUser: User = {
        username: userData.username!,
        password: userData.password!,
        role: userData.role!,
        permissions: userData.permissions!
      };
      await storageService.saveUser(newUser);
    }
    setShowUserModal(false);
    setEditingUser(undefined);
    loadUsers();
  };

  const handleDeleteUser = async (userId: string) => {
    const confirmed = await showConfirm("Are you sure you want to delete this user?", "Delete User");
    if (confirmed) {
      await storageService.deleteUser(userId);
      loadUsers();
    }
  };

  const permissionList: Array<{ key: keyof User['permissions'], label: string }> = [
    { key: 'dashboard', label: 'Dashboard' },
    { key: 'counter', label: 'Counter' },
    { key: 'patients', label: 'Patients' },
    { key: 'labTest', label: 'Lab Test' },
    { key: 'inventory', label: 'Inventory' },
    { key: 'reports', label: 'Reports' },
    { key: 'settings', label: 'Settings' },
    { key: 'stock', label: 'Stock Mgmt' },
    { key: 'suppliers', label: 'Suppliers' },
  ];

  return (
    <div className="min-h-[100dvh] bg-[#F0F2F5] pb-20 overflow-y-auto">
      <div className="max-w-6xl mx-auto p-6 md:p-10 pt-20 relative">
        <motion.button 
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          onClick={onClose}
          className="flex items-center gap-2 text-gray-500 hover:text-medical-blue font-black tracking-widest uppercase text-sm mb-10 transition-all hover:-translate-x-1"
        >
          <ArrowLeft size={18} /> Back to Dashboard
        </motion.button>

        <div className="flex flex-col md:flex-row md:items-end justify-between gap-8 mb-16">
          <div className="flex items-center gap-6">
            <div className="p-6 bg-red-500 text-white rounded-[2rem] shadow-2xl shadow-red-500/30">
              <ShieldAlert size={48} />
            </div>
            <div>
              <p className="text-red-500 font-black uppercase tracking-[0.3em] text-xs mb-1">System Administration</p>
              <h1 className="text-5xl font-black tracking-tighter text-gray-900">Developer Portal</h1>
            </div>
          </div>
          
          <div className="flex gap-4">
            <button 
              onClick={() => setActivePortalTab(activePortalTab === 'access' ? 'data' : 'access')}
              className="bg-white text-gray-900 border-2 border-gray-100 px-8 py-4 rounded-2xl flex items-center gap-3 font-black text-sm uppercase tracking-widest hover:border-medical-blue transition-all active:scale-95"
            >
              <Database size={20} className="text-medical-blue" /> 
              {activePortalTab === 'access' ? 'Data Management' : 'User Access'}
            </button>
            <button 
              onClick={() => {
                setEditingUser(undefined);
                setShowUserModal(true);
              }}
              className="bg-gray-900 text-white px-8 py-4 rounded-2xl flex items-center gap-3 font-black text-sm uppercase tracking-widest hover:bg-gray-800 transition-all shadow-xl shadow-gray-900/10 active:scale-95"
            >
              <UserPlus size={20} /> Create User
            </button>
          </div>
        </div>

        <AnimatePresence mode="wait">
          {activePortalTab === 'access' ? (
            <motion.div 
              key="access"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="grid grid-cols-1 lg:grid-cols-3 gap-10"
            >
              <div className="lg:col-span-1 space-y-10">
                <div className="bg-white rounded-[2.5rem] p-10 shadow-xl border border-white/40">
                  <div className="flex items-center gap-3 mb-2">
                    <Settings className="text-medical-blue" size={24} />
                    <h2 className="text-2xl font-black text-gray-900">Master Authority</h2>
                  </div>
                  <p className="text-[10px] text-gray-400 font-bold uppercase tracking-wider mb-6">Grant Permission for App Features (Drag to Reorder)</p>
                  
                  <Reorder.Group axis="y" values={orderedFeatures} onReorder={setOrderedFeatures} className="space-y-3">
                    {orderedFeatures.map((feat) => {
                      const isEnabled = features[feat.key as keyof AppFeatures];
                      return (
                        <Reorder.Item 
                          key={feat.key}
                          value={feat}
                          whileHover={{ x: 4 }}
                          className="relative"
                        >
                          <div
                            onClick={() => toggleFeature(feat.key as keyof AppFeatures)}
                            className={clsx(
                              "flex items-center justify-between p-4 rounded-2xl border-2 cursor-pointer transition-all",
                              isEnabled ? "border-medical-blue bg-blue-50/30" : "border-gray-50 bg-gray-50 hover:bg-gray-100"
                            )}
                          >
                            <div className="flex items-center gap-3">
                              <GripVertical size={16} className="text-gray-300" />
                              <span className={clsx(
                                "font-bold text-sm select-none",
                                isEnabled ? "text-medical-blue" : "text-gray-400"
                              )}>
                                {feat.label}
                              </span>
                            </div>
                            <div 
                              className={clsx(
                                "p-1.5 rounded-lg",
                                isEnabled ? "text-medical-blue" : "text-gray-300"
                              )}
                            >
                              {isEnabled ? <Eye size={18} /> : <EyeOff size={18} />}
                            </div>
                          </div>
                        </Reorder.Item>
                      );
                    })}
                  </Reorder.Group>

                  <motion.button 
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    onClick={handleSave}
                    className={clsx(
                      "w-full flex items-center justify-center gap-3 mt-10 py-5 rounded-2xl font-black text-white transition-all shadow-xl uppercase tracking-widest text-sm",
                      isSaved ? "bg-green-500" : "bg-medical-blue hover:bg-blue-600 shadow-blue-500/20"
                    )}
                  >
                    <Save size={20} />
                    {isSaved ? "System Updated" : "Apply Changes"}
                  </motion.button>
                </div>
              </div>

              <div className="lg:col-span-2 space-y-8">
                <h2 className="text-2xl font-black text-gray-900 flex items-center gap-3 px-4">
                  <Users className="text-gray-400" size={24} /> User Accounts
                </h2>

                <div className="grid grid-cols-1 gap-6">
                    {users.map(user => (
                      <motion.div 
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        key={user.id} 
                        className="bg-white rounded-[2.5rem] p-8 shadow-xl border border-white/40 group hover:border-medical-blue transition-all"
                      >
                        <div className="flex justify-between items-start mb-8">
                          <div className="flex items-center gap-5">
                            <div className="w-16 h-16 bg-gray-900 text-white rounded-3xl flex items-center justify-center font-black text-2xl shadow-lg group-hover:bg-medical-blue transition-colors">
                              {user.username.charAt(0).toUpperCase()}
                            </div>
                            <div>
                              <div className="flex items-center gap-3">
                                <h3 className="font-black text-3xl text-gray-900 tracking-tighter">{user.username}</h3>
                                <span className="px-3 py-1 bg-gray-100 text-[10px] font-black text-gray-500 uppercase tracking-widest rounded-full">{user.role}</span>
                              </div>
                              <p className="text-gray-400 text-sm font-medium mt-1">ID: {user.id?.slice(0, 8)}</p>
                            </div>
                          </div>
                          <div className="flex gap-2">
                            <button 
                              onClick={() => {
                                setEditingUser(user);
                                setShowUserModal(true);
                              }}
                              className="bg-gray-50 hover:bg-gray-100 text-gray-400 hover:text-gray-900 p-3 rounded-2xl transition-all"
                            >
                              <Settings size={20} />
                            </button>
                            <button 
                              onClick={() => user.id && handleDeleteUser(user.id)}
                              className="bg-red-50 hover:bg-red-500 text-red-500 hover:text-white p-3 rounded-2xl transition-all"
                            >
                              <Trash2 size={20} />
                            </button>
                          </div>
                        </div>
                        
                        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 xl:grid-cols-5 gap-3 pt-8 border-t border-gray-50">
                          {permissionList.map(perm => {
                            const hasPerm = user.permissions[perm.key];
                            return (
                              <div
                                key={perm.key}
                                className={clsx(
                                  "text-[10px] font-bold uppercase tracking-widest p-3 rounded-xl border text-center whitespace-nowrap",
                                  hasPerm 
                                    ? "bg-blue-50/50 border-blue-100 text-medical-blue" 
                                    : "bg-gray-50/50 border-gray-100 text-gray-300 line-through"
                                )}
                              >
                                {perm.label}
                              </div>
                            )
                          })}
                        </div>
                      </motion.div>
                    ))}
                    
                    {users.length === 0 && (
                      <div className="text-center py-24 bg-white rounded-[3rem] border border-dashed border-gray-200 shadow-inner">
                        <Users size={64} className="mx-auto text-gray-100 mb-6" />
                        <p className="text-2xl font-black text-gray-300 italic tracking-tight">System Ghost Town</p>
                        <p className="text-sm text-gray-400 font-medium">Add some staff accounts to secure the facility.</p>
                      </div>
                    )}
                </div>
              </div>
            </motion.div>
          ) : (
            <motion.div
              key="data"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
            >
              <DataManagement 
                onExport={handleExport}
                onRestore={handleRestore}
              />
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      <AnimatePresence>
        {showUserModal && (
          <UserFormModal 
            user={editingUser}
            onClose={() => {
              setShowUserModal(false);
              setEditingUser(undefined);
            }}
            onSave={handleCreateOrUpdateUser}
          />
        )}
      </AnimatePresence>
    </div>
  );
};
