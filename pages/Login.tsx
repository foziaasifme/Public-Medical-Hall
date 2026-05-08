import React, { useState } from 'react';
import { User } from '../types';
import { Button } from '../components/ui/Button';
import { ADMIN_PASS } from '../constants';
import { Stethoscope, Lock, User as UserIcon } from 'lucide-react';
import { storageService } from '../services/storageService';

interface LoginProps {
  onLogin: (user: User) => void;
}

const Login: React.FC<LoginProps> = ({ onLogin }) => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    const users = await storageService.getUsers();
    
    // Check dynamic users first
    const foundUser = users.find(u => u.username === username && u.password === password);
    if (foundUser) {
      onLogin(foundUser);
      return;
    }

    // Fallback to hardcoded defaults if not matched dynamically
    if (username === 'admin' && password === ADMIN_PASS) {
      onLogin({
        id: 'default-admin',
        username: 'admin',
        role: 'admin',
        permissions: { inventory: true, stock: true, suppliers: true, settings: true }
      });
    } else if (username === 'staff' && password === 'staff') {
      onLogin({
        id: 'default-staff',
        username: 'staff',
        role: 'staff',
        permissions: { inventory: false, stock: true, suppliers: false, settings: false }
      });
    } else {
      setError('Invalid credentials');
    }
  };

  return (
    <div className="min-h-screen w-full flex items-center justify-center bg-gradient-to-br from-blue-50 to-gray-100 p-4">
      <div className="bg-white/80 backdrop-blur-xl border border-white/50 p-8 rounded-3xl shadow-2xl w-full max-w-md animate-in fade-in zoom-in duration-300">
        
        <div className="flex flex-col items-center mb-8">
          <div className="w-16 h-16 bg-gradient-to-br from-medical-blue to-blue-400 rounded-2xl flex items-center justify-center shadow-lg shadow-blue-500/30 text-white mb-4">
            <Stethoscope size={32} />
          </div>
          <h1 className="text-2xl font-bold text-gray-800">Barkat Kidney Clinic</h1>
          <p className="text-gray-500 text-sm font-medium">Pharmacy Edition Access</p>
        </div>

        <form onSubmit={handleLogin} className="space-y-4">
          <div className="space-y-1">
             <label className="text-xs font-semibold text-gray-500 ml-1 uppercase">Username</label>
             <div className="relative">
               <UserIcon className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-5 h-5" />
               <input 
                 type="text" 
                 className="w-full pl-10 pr-4 py-3 rounded-xl border border-gray-200 bg-gray-50/50 focus:bg-white focus:ring-2 focus:ring-medical-blue focus:border-transparent outline-none transition-all"
                 placeholder="admin"
                 value={username}
                 onChange={(e) => setUsername(e.target.value)}
               />
             </div>
          </div>

          <div className="space-y-1">
             <label className="text-xs font-semibold text-gray-500 ml-1 uppercase">Password</label>
             <div className="relative">
               <Lock className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-5 h-5" />
               <input 
                 type="password" 
                 className="w-full pl-10 pr-4 py-3 rounded-xl border border-gray-200 bg-gray-50/50 focus:bg-white focus:ring-2 focus:ring-medical-blue focus:border-transparent outline-none transition-all"
                 placeholder="••••"
                 value={password}
                 onChange={(e) => setPassword(e.target.value)}
               />
             </div>
          </div>

          {error && <p className="text-red-500 text-sm text-center font-medium bg-red-50 py-2 rounded-lg">{error}</p>}

          <Button type="submit" className="w-full py-3 text-lg mt-4 shadow-xl shadow-blue-500/20">
            Access System
          </Button>
        </form>

        <div className="mt-8 text-center">
           <p className="text-xs text-gray-400">Default Admin: admin / 1234</p>
           <p className="text-xs text-gray-400">Default Staff: staff / staff</p>
        </div>
      </div>
    </div>
  );
};

export default Login;
