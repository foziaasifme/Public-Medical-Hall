import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Sidebar } from './components/Sidebar';
import { Calculator } from './components/Calculator';
import { StickyNote } from './components/StickyNote';
import { Tab, User } from './types';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import Counter from './pages/Counter';
import Inventory from './pages/Inventory';
import Patients from './pages/Patients';
import LabTest from './pages/LabTest';
import Reports from './pages/Reports';
import Suppliers from './pages/Suppliers';
import Settings from './pages/Settings';
import DoctorProfile from './pages/DoctorProfile';
import { DeveloperPortal, defaultFeatures, AppFeatures } from './pages/DeveloperPortal';
import { HelpCircle, WifiOff, Stethoscope, LogOut, Calculator as CalculatorIcon, StickyNote as StickyNoteIcon, Users, Pill, X, Camera } from 'lucide-react';
import { clsx } from 'clsx';
import { storageService } from './services/storageService';
import { signInAnonymously } from 'firebase/auth';
import { auth, db } from './firebase';
import { doc, getDocFromServer } from 'firebase/firestore';
import { PatientModal } from './components/PatientModal';
import { PinModal } from './components/PinModal';
import { PrescriptionScanner } from './components/PrescriptionScanner';

const App: React.FC = () => {
  // Initialize with Admin user to make Login window inactive (bypass it)
  const [user, setUser] = useState<User | null>(() => {
    const savedUser = localStorage.getItem('AUTHENTICATED_USER');
    return savedUser ? JSON.parse(savedUser) : null;
  });
  
  const handleSetUser = (newUser: User | null) => {
    setUser(newUser);
    if (newUser) {
      localStorage.setItem('AUTHENTICATED_USER', JSON.stringify(newUser));
    } else {
      localStorage.removeItem('AUTHENTICATED_USER');
    }
  };

  const handleFullBackup = async () => {
    try {
      const data = await storageService.exportDataJSON();
      const blob = new Blob([data], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `full_backup_${new Date().toISOString().split('T')[0]}.json`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    } catch (error) {
      console.error("Backup failed", error);
    }
  };

  const [isDevAuthenticated, setIsDevAuthenticated] = useState(() => localStorage.getItem('DEV_AUTH') === 'true');
  const [activeTab, setActiveTab] = useState<Tab>(Tab.DASHBOARD);
  const [showCalculator, setShowCalculator] = useState(false);
  const [showStickyNote, setShowStickyNote] = useState(false);
  const [showPatientModal, setShowPatientModal] = useState(false);
  const [showDeveloperPortal, setShowDeveloperPortal] = useState(false);
  const [showDevPinModal, setShowDevPinModal] = useState(false);
  const [showPrescriptionScanner, setShowPrescriptionScanner] = useState(false);
  const [companyName, setCompanyName] = useState('Public Medical Hall');

  // Offline Mode State
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [currentHash, setCurrentHash] = useState(window.location.hash);

  const [isAuthReady, setIsAuthReady] = useState(false);
  const isProfileRoute = currentHash === '#/profile';
  const isDevRoute = currentHash === '#/dev';

  useEffect(() => {
    const useFirebase = localStorage.getItem('USE_FIREBASE') === 'true';
    if (!useFirebase) {
      setIsAuthReady(true);
      // Fallback for online status if no firebase
      const handleOnline = () => setIsOnline(true);
      const handleOffline = () => setIsOnline(false);
      window.addEventListener('online', handleOnline);
      window.addEventListener('offline', handleOffline);
      return () => {
        window.removeEventListener('online', handleOnline);
        window.removeEventListener('offline', handleOffline);
      };
    }

    const testConnection = async () => {
      try {
        await getDocFromServer(doc(db, 'settings', 'company'));
        console.log("Firestore connection verified.");
      } catch (error) {
        if (error instanceof Error && error.message.toLowerCase().includes('offline')) {
          console.error("Please check your Firebase configuration. The client is offline.");
        }
      }
    };

    const unsubscribe = auth.onAuthStateChanged((user) => {
      setIsAuthReady(true);
      if (user) {
        testConnection();
      }
    });
    signInAnonymously(auth).catch((error) => {
      console.error("Firebase Auth Error:", error.code, error.message);
      if (error.code === 'auth/configuration-not-found') {
        console.error("Anonymous authentication is not enabled in the Firebase Console. Please enable it under Authentication > Sign-in method.");
      }
    });

    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      unsubscribe();
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  useEffect(() => {
  if (isAuthReady) {
      const loadSettings = async () => {
        const settings = await storageService.getCompanySettings();
        if (settings.name) setCompanyName(settings.name);
        await storageService.checkAutoBackup();
      };
      loadSettings();
    }
  }, [isAuthReady]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Avoid shortcuts when typing in inputs/textareas
      const activeElement = document.activeElement;
      const isInput = activeElement?.tagName === 'INPUT' || activeElement?.tagName === 'TEXTAREA' || activeElement?.tagName === 'SELECT' || (activeElement as HTMLElement)?.isContentEditable;
      
      // Patient Modal (Shift + P) - Existing
      if (e.shiftKey && !e.ctrlKey && !e.altKey && !e.metaKey && e.key.toLowerCase() === 'p') {
        if (!isInput) {
          e.preventDefault();
          setShowPatientModal(true);
        }
      }

      // New Shortcuts (Alt + Key)
      if (e.altKey && !e.ctrlKey && !e.shiftKey && !e.metaKey) {
        const key = e.key.toLowerCase();
        
        // Counter Page (Alt + C)
        if (key === 'c') {
          e.preventDefault();
          if (user) setActiveTab(Tab.COUNTER);
        }
        // Inventory Page (Alt + I)
        if (key === 'i') {
          e.preventDefault();
          if (user) setActiveTab(Tab.INVENTORY);
        }
        // Calculator (Alt + K)
        if (key === 'k') {
          e.preventDefault();
          setShowCalculator(prev => !prev);
        }
        // Sticky Note (Alt + S)
        if (key === 's') {
          e.preventDefault();
          setShowStickyNote(prev => !prev);
        }
        // Logout (Alt + Q)
        if (key === 'q') {
          e.preventDefault();
          if (user) handleLogout();
        }
        // Login (Alt + L)
        if (key === 'l') {
          e.preventDefault();
          if (user) setActiveTab(Tab.DASHBOARD);
          else {
             // If not logged in, focus username field if available
             const userField = document.querySelector('input[type="text"]') as HTMLInputElement;
             if (userField) userField.focus();
          }
        }
        // New SKU (Alt + N)
        if (key === 'n') {
          e.preventDefault();
          if (user) {
            setActiveTab(Tab.INVENTORY);
            window.dispatchEvent(new CustomEvent('inventory_open_form'));
          }
        }
        // Bulk Import (Alt + B)
        if (key === 'b') {
          e.preventDefault();
          if (user) {
            setActiveTab(Tab.INVENTORY);
            window.dispatchEvent(new CustomEvent('inventory_open_bulk'));
          }
        }
        // Full System Backup (Alt + X)
        if (key === 'x') {
          e.preventDefault();
          if (user) handleFullBackup();
        }
      }
    };
    const handleOpenModal = () => setShowPatientModal(true);
    const handleHashChange = () => {
      setCurrentHash(window.location.hash);
    };
    
    const handleOpenDevAccess = () => {
      if (isDevAuthenticated) {
        setShowDeveloperPortal(true);
      } else {
        setShowDevPinModal(true);
      }
    };
    
    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('openPatientModal', handleOpenModal);
    window.addEventListener('requestDevAccess', handleOpenDevAccess);
    window.addEventListener('openDevPortal', handleOpenDevAccess);
    window.addEventListener('hashchange', handleHashChange);

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('openPatientModal', handleOpenModal);
      window.removeEventListener('requestDevAccess', handleOpenDevAccess);
      window.removeEventListener('openDevPortal', handleOpenDevAccess);
      window.removeEventListener('hashchange', handleHashChange);
    };
  }, [isDevAuthenticated, user]);

  if (isProfileRoute) {
    return (
      <div className="min-h-screen bg-[#F0F2F5] overflow-y-auto">
        <DoctorProfile standalone />
      </div>
    );
  }

  const handleLogout = () => {
    handleSetUser(null);
    setIsDevAuthenticated(false);
    localStorage.removeItem('DEV_AUTH');
  };

  if (!user) {
    return <Login onLogin={handleSetUser} />;
  }

  if (showDeveloperPortal) {
    return <DeveloperPortal onClose={() => setShowDeveloperPortal(false)} />;
  }

  const devMasterFlags = JSON.parse(localStorage.getItem('DEV_MASTER_FLAGS') || 'null') || defaultFeatures;
  const userFlags = JSON.parse(localStorage.getItem('APP_FEATURE_FLAGS') || '{}');
  
  const appFeatures: Record<string, boolean> = {};
  Object.keys(defaultFeatures).forEach(key => {
     appFeatures[key] = devMasterFlags[key] !== false && userFlags[key] !== false;
  });

  const moduleOrder = JSON.parse(localStorage.getItem('DEV_MODULE_ORDER') || localStorage.getItem('APP_MODULE_ORDER') || '[]');

  const headerUtilities = [
    {
      key: 'help',
      component: (
        <div key="help" className="relative group/help">
          <button 
            className="p-2 md:p-3 bg-white/10 md:bg-white border md:border-gray-200 rounded-lg md:rounded-xl text-white md:text-gray-400 hover:bg-white/20 md:hover:text-blue-600 md:hover:border-blue-200 md:hover:shadow-lg md:hover:-translate-y-1 transition-all"
            title="Help & Shortcuts"
          >
            <HelpCircle size={20} className="md:w-5 md:h-5 w-[18px] h-[18px]" />
          </button>
          
          {/* Dropdown Card */}
          <div className="absolute right-0 top-full mt-2 w-[320px] md:w-[400px] bg-white rounded-2xl shadow-2xl border border-gray-100 opacity-0 invisible group-hover/help:opacity-100 group-hover/help:visible transition-all duration-200 z-[100] overflow-hidden">
             <div className="p-4 bg-gray-50 border-b border-gray-100 flex items-center gap-2">
                <HelpCircle size={18} className="text-blue-600" />
                <h4 className="font-black text-gray-900 text-sm uppercase tracking-wider">Rules & Shortcuts</h4>
             </div>
             <div className="p-4 max-h-[70vh] overflow-y-auto custom-scrollbar space-y-6">
                {/* Shortcuts Section */}
                <div>
                   <h5 className="text-[10px] font-black text-blue-600 uppercase tracking-[0.2em] mb-3">Keyboard Shortcuts</h5>
                   <div className="grid grid-cols-1 gap-2">
                      {[
                        { label: 'Counter Page', key: 'Alt + C' },
                        { label: 'Inventory Page', key: 'Alt + I' },
                        { label: 'New SKU', key: 'Alt + N' },
                        { label: 'Bulk Import', key: 'Alt + B' },
                        { label: 'Calculator', key: 'Alt + K' },
                        { label: 'Sticky Note', key: 'Alt + S' },
                        { label: 'Login (Dashboard)', key: 'Alt + L' },
                        { label: 'Logout', key: 'Alt + Q' },
                        { label: 'System Backup', key: 'Alt + X' },
                        { label: 'New Patient', key: 'Shift + P' }
                      ].map((s, idx) => (
                        <div key={idx} className="flex items-center justify-between p-2 rounded-lg bg-gray-50/50 border border-transparent hover:border-gray-100 transition-colors">
                           <span className="text-xs font-bold text-gray-600">{s.label}</span>
                           <kbd className="px-2 py-0.5 bg-white border border-gray-200 rounded-md text-[10px] font-black text-gray-400 shadow-sm">{s.key}</kbd>
                        </div>
                      ))}
                   </div>
                </div>

                {/* Rules Section */}
                <div>
                   <h5 className="text-[10px] font-black text-green-600 uppercase tracking-[0.2em] mb-3">Rules & Regulations</h5>
                   <ul className="space-y-2.5">
                      {[
                        'Always verify Batch No. and Expiry Date before selling.',
                        'Prescription is mandatory for Narcotics/Controlled drugs.',
                        'First-in, First-out (FIFO) inventory policy must be followed.',
                        'All sales must be recorded immediately in the system.',
                        'Daily backup of data is mandatory before closing.',
                        'Check low stock reports every morning.',
                        'Maintain storage temperature as per manufacturer guidelines.'
                      ].map((rule, idx) => (
                        <li key={idx} className="flex gap-2.5 items-start">
                           <div className="w-1.5 h-1.5 rounded-full bg-green-500 mt-1.5 shrink-0"></div>
                           <span className="text-xs font-medium text-gray-500 leading-relaxed">{rule}</span>
                        </li>
                      ))}
                   </ul>
                </div>
             </div>
             <div className="p-3 bg-gray-50 border-t border-gray-100 text-center">
                <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Barkat Kidney Clinic Management</span>
             </div>
          </div>
        </div>
      )
    },
    { 
      key: 'showCalculator', 
      component: (
        <button 
          key="calc"
          onClick={() => setShowCalculator(true)}
          className="p-2 md:p-3 bg-white/10 md:bg-white border md:border-gray-200 rounded-lg md:rounded-xl text-white md:text-gray-600 hover:bg-white/20 md:hover:text-blue-600 md:hover:border-blue-200 md:hover:shadow-lg md:hover:-translate-y-1 transition-all group"
          title="Calculator"
        >
          <CalculatorIcon size={20} className="md:w-5 md:h-5 w-[18px] h-[18px]" />
        </button>
      )
    },
    { 
      key: 'showStickyNote', 
      component: (
        <button 
          key="sticky"
          onClick={() => setShowStickyNote(true)}
          className="p-2 md:p-3 bg-white/10 md:bg-white border md:border-gray-200 rounded-lg md:rounded-xl text-white md:text-gray-600 hover:bg-white/20 md:hover:text-yellow-600 md:hover:border-yellow-200 md:hover:shadow-lg md:hover:-translate-y-1 transition-all group relative"
          title="Sticky Notes"
        >
           <div className="absolute top-2 right-2 w-1 md:w-1.5 h-1 md:h-1.5 bg-yellow-400 rounded-full"></div>
           <StickyNoteIcon size={20} className="md:w-5 md:h-5 w-[18px] h-[18px]" />
        </button>
      )
    },
    { 
      key: 'showPrescriptionScanner', 
      component: (
        <button 
          key="scanner"
          onClick={() => setShowPrescriptionScanner(true)}
          className="flex items-center gap-2 p-2 px-3 md:px-4 md:py-3 bg-white/10 md:bg-medical-blue text-white rounded-lg md:rounded-xl md:shadow-lg md:shadow-blue-500/20 md:hover:shadow-blue-500/40 md:hover:-translate-y-1 transition-all group font-bold"
          title="AI Prescription Scanner"
        >
           <Camera size={20} className="md:w-5 md:h-5 w-[18px] h-[18px] group-hover:scale-110 transition-transform" />
           <span className="hidden lg:inline">Scan Prescription</span>
        </button>
      )
    }
  ];

  const orderedHeaderUtilities = moduleOrder.length > 0 
    ? [...headerUtilities].sort((a, b) => moduleOrder.indexOf(a.key) - moduleOrder.indexOf(b.key))
    : headerUtilities;

  const renderContent = () => {
    switch (activeTab) {
      case Tab.DASHBOARD:
        return appFeatures.showDashboard !== false ? <Dashboard setActiveTab={setActiveTab} /> : <div className="p-10 text-center text-gray-400 font-bold">Dashboard Module Disabled</div>;
      case Tab.COUNTER:
        return appFeatures.showCounter !== false ? <Counter setActiveTab={setActiveTab} /> : <div className="p-10 text-center text-gray-400 font-bold">Counter Module Disabled</div>;
      case Tab.INVENTORY:
        return appFeatures.showInventory !== false ? <Inventory user={user} /> : <div className="p-10 text-center text-gray-400 font-bold">Inventory Module Disabled</div>;
      case Tab.SUPPLIERS:
        return appFeatures.showSuppliers !== false ? <Suppliers /> : <div className="p-10 text-center text-gray-400 font-bold">Suppliers Module Disabled</div>;
      case 'LAB_TEST':
        return appFeatures.showLabTest === true ? <LabTest /> : <div className="p-10 text-center text-gray-400 font-bold">Lab Test Module Disabled</div>;
      case 'PATIENTS':
        return appFeatures.showPatients === true ? <Patients /> : <div className="p-10 text-center text-gray-400 font-bold">Patients Module Disabled</div>;
      case Tab.REPORTS:
        return appFeatures.showReports !== false ? <Reports /> : <div className="p-10 text-center text-gray-400 font-bold">Reports Module Disabled</div>;
      case Tab.SETTINGS:
        return appFeatures.showSettings !== false ? <Settings /> : <div className="p-10 text-center text-gray-400 font-bold">Settings Module Disabled</div>;
      default:
        return <Dashboard setActiveTab={setActiveTab} />;
    }
  };

  return (
    <div className="flex flex-col md:flex-row h-screen bg-[#F0F2F5] text-gray-900 font-sans overflow-hidden">
      
      {/* Mobile Top Header (Visible only on Mobile) */}
      <header className="md:hidden flex items-center justify-between p-4 bg-medical-blue text-white shadow-md fixed top-0 left-0 w-full z-30 h-16">
         <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-white/20 backdrop-blur-sm rounded-lg flex items-center justify-center text-white shadow-sm overflow-hidden">
               <img src="https://blogger.googleusercontent.com/img/b/R29vZ2xl/AVvXsEhh-i9gOjyhwEray7cvMv7SQ81RcTAe5DtNa84kzU5pSXGC089rNh1ZBQ2LkGQbEvSgCesoBemqCf8zdg_DQK6XrWefoUTQTRfuwPVQD9vjMkgLOpuS8Q1VMvGSTLeHOKx6JOjefJXNvrgMEi9lcBigww-U6SYCMY2ooxP2P64xOIbbiuLOfMzj-51sZ08/s320/PMH_logo.png" alt="Logo" referrerPolicy="no-referrer" />
            </div>
            <span className="font-extrabold tracking-tight text-lg">{companyName}</span>
         </div>
          <div className="flex items-center gap-2">
            {orderedHeaderUtilities.map(util => (
              appFeatures[util.key] !== false && util.component
            ))}

            <div className="text-right hidden sm:block">
               <p className="text-[10px] font-bold text-blue-100 uppercase tracking-wider">{user.role}</p>
               <p className="text-xs font-bold text-white leading-none capitalize">{user.username}</p>
            </div>
            <button 
               onClick={handleLogout}
               className="p-2 bg-red-500/20 text-white rounded-lg hover:bg-red-500/30 transition-colors"
               aria-label="Logout"
            >
               <LogOut size={18} />
            </button>
         </div>
      </header>

      <Sidebar 
        activeTab={activeTab} 
        onTabChange={setActiveTab} 
        user={user} 
        onLogout={handleLogout} 
        onOpenDevPortal={() => {
          if (isDevAuthenticated) {
            setShowDeveloperPortal(true);
          } else {
            setShowDevPinModal(true);
          }
        }}
      />
      
      {/* Main Content Area */}
      <main className="flex-1 p-4 pt-20 pb-24 md:p-6 md:pb-6 h-screen overflow-y-auto relative flex flex-col transition-all duration-300">
        
        {/* Desktop Header - Hidden on Mobile */}
        <div className="hidden md:flex md:flex-row justify-between items-start md:items-center mb-6 pb-4 border-b border-gray-200 shadow-sm gap-4 animate-in slide-in-from-top-4 duration-500">
          <div className="flex items-center gap-4">
            <img src="https://blogger.googleusercontent.com/img/b/R29vZ2xl/AVvXsEhh-i9gOjyhwEray7cvMv7SQ81RcTAe5DtNa84kzU5pSXGC089rNh1ZBQ2LkGQbEvSgCesoBemqCf8zdg_DQK6XrWefoUTQTRfuwPVQD9vjMkgLOpuS8Q1VMvGSTLeHOKx6JOjefJXNvrgMEi9lcBigww-U6SYCMY2ooxP2P64xOIbbiuLOfMzj-51sZ08/s320/PMH_logo.png" alt="Logo" className="w-8 h-8 rounded-lg object-contain" referrerPolicy="no-referrer" />
            <div>
              <h1 className="text-3xl font-black text-gray-800 tracking-tight leading-none">{companyName}</h1>
              <p className="text-sm font-medium text-gray-500 mt-1 flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></span>
                {new Date().toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            {orderedHeaderUtilities.map(util => (
              appFeatures[util.key] !== false && util.component
            ))}
          </div>
        </div>

        {/* Offline Banner */}
        {!isOnline && (
          <div className="mb-4 bg-gray-800 text-white px-4 py-2 rounded-xl flex items-center justify-between shadow-lg animate-in slide-in-from-top-2">
            <div className="flex items-center gap-3">
              <div className="p-1.5 bg-gray-700 rounded-lg">
                <WifiOff size={16} className="text-red-400" />
              </div>
              <div className="flex flex-col">
                <span className="text-sm font-bold leading-none">Offline Mode Active</span>
                <span className="text-[10px] text-gray-400 font-medium leading-tight">Changes are saved locally and will sync when online.</span>
              </div>
            </div>
            <div className="px-2 py-1 bg-gray-700 rounded text-[10px] font-bold uppercase tracking-wider text-gray-300">
              Local DB Active
            </div>
          </div>
        )}

        {renderContent()}

        {/* Modals */}
        <AnimatePresence>
          {showCalculator && <Calculator onClose={() => setShowCalculator(false)} />}
          {showStickyNote && <StickyNote onClose={() => setShowStickyNote(false)} />}
          {showPatientModal && <PatientModal onClose={() => setShowPatientModal(false)} />}
          {showDevPinModal && (
            <PinModal 
              isOpen={showDevPinModal} 
              onClose={() => setShowDevPinModal(false)} 
              onSuccess={() => {
                setIsDevAuthenticated(true);
                localStorage.setItem('DEV_AUTH', 'true');
                setShowDeveloperPortal(true);
              }}
              requiredPin="03008885072"
              title="Developer Access Key"
            />
          )}
          {showPrescriptionScanner && (
            <PrescriptionScanner 
              onClose={() => setShowPrescriptionScanner(false)} 
              onItemsExtracted={(items) => {
                items.forEach(med => storageService.addToCart(med));
                setActiveTab(Tab.COUNTER);
              }} 
            />
          )}
        </AnimatePresence>
      </main>
    </div>
  );
};

export default App;
