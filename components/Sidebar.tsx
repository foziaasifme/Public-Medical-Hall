import React, { useEffect, useState, useMemo } from 'react';
import { 
  Store, 
  Package, 
  Users, 
  Contact, 
  BarChart3, 
  Settings, 
  LogOut,
  Stethoscope,
  FileText,
  TestTubes,
  Code
} from 'lucide-react';
import { Tab, User } from '../types';
import { clsx } from 'clsx';
import { storageService } from '../services/storageService';
import { LOW_STOCK_THRESHOLD, EXPIRY_WARNING_DAYS } from '../constants';
import { defaultFeatures } from '../pages/DeveloperPortal';

interface SidebarProps {
  activeTab: Tab;
  onTabChange: (tab: Tab) => void;
  user: User;
  onLogout: () => void;
  onOpenDevPortal: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({ activeTab, onTabChange, user, onLogout, onOpenDevPortal }) => {
  const [lowStockCount, setLowStockCount] = useState(0);
  const [expiringCount, setExpiringCount] = useState(0);

  // Fetch alert data on mount and whenever activeTab changes (to refresh after edits/sales)
  useEffect(() => {
    const fetchAlerts = async () => {
      const medicines = await storageService.getMedicines();
      const today = new Date();
      
      let low = 0;
      let expiring = 0;

      medicines.forEach(m => {
        // Low Stock
        if (m.stock <= LOW_STOCK_THRESHOLD && m.stock > 0) low++;
        
        // Expiring
        const expiryDate = new Date(m.expiryDate);
        const diffTime = expiryDate.getTime() - today.getTime();
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
        if (diffDays <= EXPIRY_WARNING_DAYS && diffDays > 0) expiring++;
      });

      setLowStockCount(low);
      setExpiringCount(expiring);
    };
    fetchAlerts();
  }, [activeTab]);

  const [appFeatures, setAppFeatures] = useState<any>(null);

  useEffect(() => {
    const devMaster = JSON.parse(localStorage.getItem('DEV_MASTER_FLAGS') || 'null') || defaultFeatures;
    const userFlags = JSON.parse(localStorage.getItem('APP_FEATURE_FLAGS') || '{}');
    const combined: any = {};
    Object.keys(defaultFeatures).forEach(key => {
       combined[key] = devMaster[key] !== false && userFlags[key] !== false;
    });
    setAppFeatures(combined);
  }, []);

  const menuItems = useMemo(() => {
    const baseItems = [
      { id: Tab.DASHBOARD, label: 'Dashboard', icon: BarChart3, allowed: (appFeatures ? appFeatures.showDashboard !== false : true) && (user.permissions.dashboard !== false), featureKey: 'showDashboard' },
      { id: 'PATIENTS', label: 'Patients', icon: Users, allowed: (appFeatures?.showPatients === true) && (user.permissions.patients !== false), featureKey: 'showPatients' },
      { id: 'LAB_TEST', label: 'Lab Test', icon: TestTubes, allowed: (appFeatures?.showLabTest === true) && (user.permissions.labTest !== false), featureKey: 'showLabTest' },
      { id: Tab.COUNTER, label: 'Counter', icon: Store, allowed: (appFeatures ? appFeatures.showCounter !== false : true) && (user.permissions.counter !== false), featureKey: 'showCounter' },
      { id: Tab.REPORTS, label: 'Reports', icon: FileText, allowed: (appFeatures ? appFeatures.showReports !== false : true) && (user.permissions.reports !== false), featureKey: 'showReports' },
      { id: Tab.INVENTORY, label: 'Inventory', icon: Package, allowed: (appFeatures ? appFeatures.showInventory !== false : true) && (user.permissions.inventory !== false), featureKey: 'showInventory' },
      { id: Tab.SETTINGS, label: 'Settings', icon: Settings, allowed: (appFeatures ? appFeatures.showSettings !== false : true) && user.permissions.settings !== false, featureKey: 'showSettings' },
    ];

    const storedOrder = localStorage.getItem('DEV_MODULE_ORDER') || localStorage.getItem('APP_MODULE_ORDER');
    if (storedOrder) {
      try {
        const orderKeys = JSON.parse(storedOrder);
        return [...baseItems].sort((a, b) => {
          const indexA = orderKeys.indexOf(a.featureKey);
          const indexB = orderKeys.indexOf(b.featureKey);
          const finalA = indexA === -1 ? 999 : indexA;
          const finalB = indexB === -1 ? 999 : indexB;
          return finalA - finalB;
        });
      } catch (e) {
        return baseItems;
      }
    }
    return baseItems;
  }, [appFeatures, user.permissions]);

  return (
    <aside className={clsx(
      "fixed md:static z-40 bg-white/60 backdrop-blur-xl border-gray-200 shadow-xl transition-all duration-300",
      // Desktop & Tablet: Compact Icon Sidebar
      "lg:left-0 lg:top-0 lg:w-20 lg:h-screen lg:flex-col lg:border-r lg:justify-between lg:pb-0",
      "md:left-0 md:top-0 md:w-20 md:h-screen md:flex-col md:border-r md:border-t-0 md:justify-between",
      // Mobile: Bottom Navigation
      "bottom-0 left-0 w-full h-auto border-t flex flex-row items-center justify-between px-2 py-1 md:py-0"
    )}>
      {/* Brand Header - Hidden on Mobile, Icon Only on Desktop/Tablet */}
      <div className="hidden md:flex p-6 items-center gap-3 border-b border-gray-100/50 justify-center">
        <div className="w-12 h-12 rounded-2xl flex items-center justify-center overflow-hidden shrink-0">
          <img 
            src="https://blogger.googleusercontent.com/img/b/R29vZ2xl/AVvXsEhh-i9gOjyhwEray7cvMv7SQ81RcTAe5DtNa84kzU5pSXGC089rNh1ZBQ2LkGQbEvSgCesoBemqCf8zdg_DQK6XrWefoUTQTRfuwPVQD9vjMkgLOpuS8Q1VMvGSTLeHOKx6JOjefJXNvrgMEi9lcBigww-U6SYCMY2ooxP2P64xOIbbiuLOfMzj-51sZ08/s320/PMH_logo.png" 
            alt="PMH Logo" 
            className="w-full h-full object-cover"
            referrerPolicy="no-referrer"
          />
        </div>
      </div>

      {/* Navigation Items */}
      <nav className={clsx(
        "flex-1 md:px-3 md:py-6 md:space-y-1.5",
        "flex flex-row md:flex-col w-full md:w-auto overflow-x-auto md:overflow-x-visible items-center md:items-stretch gap-1 md:gap-2 justify-evenly md:justify-start no-scrollbar"
      )}>
        {menuItems.map((item) => {
          if (!item.allowed) return null;
          const Icon = item.icon;
          const isActive = activeTab === item.id;
          const hasAlert = item.id === Tab.INVENTORY && (lowStockCount > 0 || expiringCount > 0);
          
          return (
            <button
              key={item.id}
              onClick={() => onTabChange(item.id)}
              className={clsx(
                "group relative flex items-center transition-all duration-300 rounded-2xl shrink-0",
                item.id === 'PATIENTS' ? "flex" : "",
                // Desktop/Tablet: Centered Icons & Stacked Text
                "lg:flex-col lg:justify-center lg:gap-1 lg:px-2 lg:py-3",
                "md:flex-col md:justify-center md:gap-1 md:px-2 md:py-3",
                // Mobile
                "flex-col gap-1 p-2 min-w-[60px]",
                isActive 
                  ? "bg-gray-900 text-white shadow-lg shadow-gray-900/20" 
                  : "text-gray-500 hover:bg-white hover:text-gray-900 hover:shadow-sm"
              )}
              title={item.label}
            >
              <Icon size={20} className={isActive ? "text-white" : "text-gray-400 group-hover:text-gray-900"} />
              <span className={clsx(
                "font-bold transition-all duration-300",
                // Desktop/Tablet: Visible, Tiny, Centered
                "lg:block lg:text-[9px] lg:mt-1 lg:text-center lg:leading-none",
                "md:block md:text-[9px] md:mt-1 md:text-center md:leading-none",
                // Mobile: Visible, Tiny
                "block text-[9px] text-center"
              )}>
                {item.label}
              </span>
              
              {/* Badge for Alert */}
              {hasAlert && !isActive && (
                <span className="absolute top-2 right-2 md:top-1 md:right-1 lg:top-1 lg:right-1 w-2 h-2 bg-red-500 rounded-full animate-pulse border border-white"></span>
              )}
            </button>
          );
        })}
      </nav>

      {/* Footer / User Info - Icon Only on Desktop/Tablet */}
      <div className="hidden md:flex flex-col items-center gap-2 p-4 border-t border-gray-100/50">
        {user.role === 'admin' && (
          <button 
            onClick={onOpenDevPortal}
            className={clsx(
              "w-full flex items-center justify-center gap-2 text-gray-400 hover:text-blue-600 rounded-xl hover:bg-blue-50 transition-colors font-bold uppercase tracking-widest",
              "lg:p-3 lg:text-[0px]",
              "md:p-3 md:text-[0px]"
            )}
            title="Developer Portal"
          >
            <Code size={18} />
          </button>
        )}
        <button 
          onClick={onLogout}
          className={clsx(
            "w-full flex items-center justify-center gap-2 text-gray-500 hover:text-red-600 rounded-xl hover:bg-red-50 transition-colors font-bold uppercase tracking-widest",
            "lg:p-3 lg:text-[0px]", // Icon only
            "md:p-3 md:text-[0px]"  // Icon only
          )}
          title={`Sign Out (${user.username})`}
        >
          <LogOut size={18} />
        </button>
      </div>
    </aside>
  );
};