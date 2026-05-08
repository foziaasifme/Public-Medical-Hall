import React, { useState, useEffect, useMemo } from 'react';
import { Users, DollarSign, X, Calendar, Clock, FileText, Pill, ClipboardList, Briefcase, BarChart3, TrendingUp, BellOff, Ban, Zap, AreaChart } from 'lucide-react';
import { storageService } from '../services/storageService';
import { Tab } from '../types';
import { LOW_STOCK_THRESHOLD, EXPIRY_WARNING_DAYS } from '../constants';
import { clsx } from 'clsx';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LineChart, Line, PieChart, Pie, Cell, Legend } from 'recharts';

const bannerOptions = [
  "https://blogger.googleusercontent.com/img/b/R29vZ2xl/AVvXsEiR3S0ocpVcR0dAN92lq0HMfVKZIsNYkrDMuzyPMN81_e86qxgRBfvU3TqL86Dm6_F37r6RrkKo399wkM8GgGsp70uCLTMqmHhyphenhyphenYaTj-TVcT19aatZX19wECTdNSmNDzu2qAhdd9ZGULM4llDMu5lIr4r8ULD-d8_13BSKAcWdIZYcNtPUST2-MXUR21dA/s320/Barket%20Kidney%20Banner1.jpg",
  "https://blogger.googleusercontent.com/img/b/R29vZ2xl/AVvXsEiofPtbGSR9vQWwR467BTwgmLxNnzvDw2fDu65Cx0GucGk6lcpamd-fCBKMvPpMfcdQrGS8v7zIhUV8K1jruOaYd1EBL10dCMg-n_S07HsqaYLB42XIXXz22J-SSRlf-2NS-a8zB5aCJ38RNn8YHiL7mBnvnx-ASR58BBVRGD95gJzj9lUfeidA0eDUkYc/s320/Barket%20Kidney%20Banner2.jpg"
];

interface DashboardProps {
  setActiveTab: (tab: any) => void;
}

const Dashboard: React.FC<DashboardProps> = ({ setActiveTab }) => {
  const [sales, setSales] = useState<any[]>([]);
  const [patients, setPatients] = useState<any[]>([]);
  const [medicines, setMedicines] = useState<any[]>([]);
  const [labTests, setLabTests] = useState<any[]>([]);
  const [stockEntries, setStockEntries] = useState<any[]>([]);
  const [suppliers, setSuppliers] = useState<any[]>([]);
  const [users, setUsers] = useState<any[]>([]);
  const [showBanner1, setShowBanner1] = useState(true);
  const [analyticsFilter, setAnalyticsFilter] = useState<'daily' | 'weekly' | 'monthly'>('weekly');

  const [appFeatures, setAppFeatures] = useState<any>(null);

  useEffect(() => {
    const stored = localStorage.getItem('APP_FEATURE_FLAGS');
    if (stored) setAppFeatures(JSON.parse(stored));

    const fetchData = async () => {
      const [s, p, m, l, stock, supps, usrs] = await Promise.all([
        storageService.getSales(),
        storageService.getPatients(),
        storageService.getMedicines(),
        storageService.getLabTests(),
        storageService.getStockEntries(),
        storageService.getSuppliers(),
        storageService.getUsers(),
      ]);
      setSales(s);
      setPatients(p);
      setMedicines(m);
      setLabTests(l);
      setStockEntries(stock);
      setSuppliers(supps);
      setUsers(usrs);
    };
    fetchData();
  }, []);

  const today = new Date();
  const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);

  const dailySales = sales.filter(s => new Date(s.date).toDateString() === today.toDateString());
  const dailyTotal = dailySales.reduce((sum, s) => sum + s.total, 0);

  const monthSales = sales.filter(s => new Date(s.date) >= startOfMonth);
  const monthTotal = monthSales.reduce((sum, s) => sum + s.total, 0);

  const dailyPatients = patients.filter(p => p.registeredAt && new Date(p.registeredAt).toDateString() === today.toDateString()).length;

  const totalMedicines = medicines.length;

  const lowStockCount = medicines.filter(m => m.stock <= (m.minStock || LOW_STOCK_THRESHOLD) && m.stock > 0).length;

  const expiredCount = medicines.filter(m => {
    const expiryDate = new Date(m.expiryDate);
    return expiryDate < today;
  }).length;

  const nearExpiryCount = medicines.filter(m => {
    const expiryDate = new Date(m.expiryDate);
    const diffTime = expiryDate.getTime() - today.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays <= EXPIRY_WARNING_DAYS && diffDays > 0;
  }).length;

  const todayTests = labTests.filter(t => new Date(t.date).toDateString() === today.toDateString()).length;

  const pieData = [
    { name: 'Today Patients', value: dailyPatients },
    { name: 'Total Patients', value: patients.length },
  ];
  const COLORS = ['#3b82f6', '#e5e7eb'];

  // Last 7 days test analysis
  const last7Days = Array.from({ length: 7 }, (_, i) => {
    const d = new Date();
    d.setDate(d.getDate() - (6 - i));
    return d;
  });

  const weekTestAnalysis = last7Days.map(day => {
    const dayStr = day.toDateString();
    const count = labTests.filter(t => new Date(t.date).toDateString() === dayStr).length;
    return {
      name: day.toLocaleDateString('en-US', { weekday: 'short' }),
      Tests: count
    };
  });

  const transactionAnalyticsData = useMemo(() => {
    const now = new Date();
    
    if (analyticsFilter === 'daily') {
      const hours = Array.from({ length: 24 }, (_, i) => ({
        name: `${i.toString().padStart(2, '0')}:00`,
        Sales: 0,
        Purchases: 0
      }));

      sales.forEach(sale => {
        const saleDate = new Date(sale.date);
        if (saleDate.toDateString() === now.toDateString()) {
          hours[saleDate.getHours()].Sales += sale.total;
        }
      });
      stockEntries.forEach(entry => {
        if (entry.type === 'IN') {
          const entryDate = new Date(entry.date);
          if (entryDate.toDateString() === now.toDateString()) {
             const med = medicines.find(m => m.id === entry.medicineId);
             const cost = med ? (med.purchasePrice * entry.quantity) : 0;
             hours[entryDate.getHours()].Purchases += cost;
          }
        }
      });
      return hours;
    } else {
      const daysMap: Record<string, { Sales: number, Purchases: number }> = {};
      
      if (analyticsFilter === 'weekly') {
        for(let i=6; i>=0; i--) {
          const d = new Date();
          d.setDate(d.getDate() - i);
          daysMap[d.toLocaleDateString('en-US', { weekday: 'short' })] = { Sales: 0, Purchases: 0 };
        }
      }

      const matchDateFilter = (date: Date) => {
         if (analyticsFilter === 'weekly') {
           const oneWeekAgo = new Date();
           oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);
           return date >= oneWeekAgo;
         } else if (analyticsFilter === 'monthly') {
           const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
           return date >= startOfMonth;
         }
         return true;
      };

      sales.forEach(sale => {
        const saleDate = new Date(sale.date);
        if (matchDateFilter(saleDate)) {
          const key = analyticsFilter === 'monthly' ? saleDate.getDate().toString() : saleDate.toLocaleDateString('en-US', { weekday: 'short' });
          if (!daysMap[key]) daysMap[key] = { Sales: 0, Purchases: 0 };
          daysMap[key].Sales += sale.total;
        }
      });

      stockEntries.forEach(entry => {
        if (entry.type === 'IN') {
          const entryDate = new Date(entry.date);
          if (matchDateFilter(entryDate)) {
            const key = analyticsFilter === 'monthly' ? entryDate.getDate().toString() : entryDate.toLocaleDateString('en-US', { weekday: 'short' });
            if (!daysMap[key]) daysMap[key] = { Sales: 0, Purchases: 0 };
            const med = medicines.find(m => m.id === entry.medicineId);
            const cost = med ? (med.purchasePrice * entry.quantity) : 0;
            daysMap[key].Purchases += cost;
          }
        }
      });

      if (analyticsFilter === 'monthly') {
        return Object.keys(daysMap).map(k => ({ name: k, Sales: daysMap[k].Sales, Purchases: daysMap[k].Purchases }));
      }

      return Object.keys(daysMap).map(key => ({
        name: key,
        Sales: daysMap[key].Sales,
        Purchases: daysMap[key].Purchases
      }));
    }
  }, [sales, stockEntries, medicines, analyticsFilter]);

  const handleCardClick = (tab: any, filterType?: 'shortage' | 'expired' | 'nearExpiry') => {
    if (filterType) {
      localStorage.setItem('INVENTORY_FILTER_INTENT', filterType);
    }
    setActiveTab(tab);
  };

  const pieTransactionData = useMemo(() => {
    let totalSales = 0;
    let totalPurchases = 0;
    transactionAnalyticsData.forEach(d => {
      totalSales += d.Sales;
      totalPurchases += d.Purchases;
    });
    return [
      { name: 'Purchases', value: totalPurchases, color: '#f59e0b' },
      { name: 'Sales', value: totalSales, color: '#3b82f6' }
    ];
  }, [transactionAnalyticsData]);

  // Derived metrics for the 2x2 grid
  const totalMedicineGroups = useMemo(() => new Set(medicines.map(m => m.category || m.genericName)).size, [medicines]);
  const qtyMedicinesSold = useMemo(() => sales.reduce((sum, sale) => sum + sale.items.reduce((itemSum: number, item: any) => itemSum + item.quantity, 0), 0), [sales]);
  const invoicesGenerated = sales.length;
  const totalSuppliers = suppliers.length;
  const totalUsers = users.length;
  const totalCustomers = patients.length;

  const freqBoughtItem = useMemo(() => {
    if (sales.length === 0) return 'N/A';
    const itemCounts: Record<string, number> = {};
    sales.forEach(sale => {
      sale.items.forEach((item: any) => {
        itemCounts[item.name] = (itemCounts[item.name] || 0) + item.quantity;
      });
    });
    let maxItem = 'N/A';
    let maxCount = 0;
    Object.entries(itemCounts).forEach(([name, count]) => {
      if (count > maxCount) {
        maxCount = count;
        maxItem = name;
      }
    });
    return maxItem;
  }, [sales]);

  return (
    <div className="space-y-6 p-6">
      {/* Banners & Stats */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        {showBanner1 && (
          <div 
            className="xl:col-span-2 rounded-2xl overflow-hidden shadow-lg relative transition-all flex bg-slate-900"
          >
            <button 
              onClick={(e) => {
                e.stopPropagation();
                setShowBanner1(false);
              }} 
              className="absolute top-2 right-2 p-1.5 bg-black/50 text-white rounded-full hover:bg-black/70 z-10"
            >
              <X size={16}/>
            </button>
            <img 
              src="https://t4.ftcdn.net/jpg/02/27/41/31/360_F_227413125_c5CgAhRF9FVpEYKzckx8le5cSMpYx9YP.jpg" 
              alt="Clinic Banner" 
              className="w-full h-full object-cover transition-all duration-700"
              referrerPolicy="no-referrer"
            />
          </div>
        )}
        
        {/* Stats Section */}
        <div className="space-y-6 flex flex-col justify-between h-full">
          {/* Main 6 Cards Grid (as per user request image) */}
          <div className="grid grid-cols-2 gap-2 sm:gap-4 flex-1">
            {[
              { title: 'Medicines', value: totalMedicines, sub: 'Report', icon: Briefcase, color: 'bg-[#27ae60]', onClick: () => handleCardClick(Tab.INVENTORY) },
              { title: 'Sales Of Day', value: dailyTotal.toLocaleString(), sub: 'Report', icon: BarChart3, color: 'bg-[#2980b9]', onClick: () => handleCardClick(Tab.REPORTS) },
              { title: 'Sales Of Month', value: monthTotal.toLocaleString(), sub: 'Report', icon: AreaChart, color: 'bg-[#9fbb58]', onClick: () => handleCardClick(Tab.REPORTS) },
              { title: 'Stock Shortage', value: lowStockCount, sub: 'Report', icon: BellOff, color: 'bg-[#e67e22]', onClick: () => handleCardClick(Tab.INVENTORY, 'shortage') },
              { title: 'Expired Products', value: expiredCount, sub: 'Report', icon: Ban, color: 'bg-[#9b59b6]', onClick: () => handleCardClick(Tab.INVENTORY, 'expired') },
              { title: 'Near Expiry', value: nearExpiryCount, sub: 'Report', icon: Zap, color: 'bg-[#48cfad]', onClick: () => handleCardClick(Tab.INVENTORY, 'nearExpiry') },
            ].map((stat, i) => (
              <div 
                key={i} 
                onClick={stat.onClick}
                className={`${stat.color} p-2 sm:p-4 rounded-xl text-white shadow-md flex flex-col justify-between min-h-[85px] sm:h-[120px] cursor-pointer hover:brightness-95 transition-all group`}
              >
                <div className="flex justify-between items-start gap-1">
                  <h3 className="text-[clamp(0.55rem,2vw,0.85rem)] font-bold tracking-tight leading-tight uppercase">{stat.title}</h3>
                  <stat.icon size={16} className="shrink-0 opacity-80 group-hover:scale-110 transition-transform sm:w-5 sm:h-5" />
                </div>
                <div className="flex justify-between items-end gap-1 mt-auto">
                  <span className="text-[clamp(0.4rem,1.2vw,0.6rem)] font-medium opacity-90 uppercase tracking-widest">{stat.sub}</span>
                  <span className="text-[clamp(0.8rem,3vw,1.4rem)] font-black leading-none">{stat.value}</span>
                </div>
              </div>
            ))}
          </div>

          {/* Optional Stats (Patients / Lab Tests) - Shown if enabled */}
          {(appFeatures?.showPatients === true || appFeatures?.showLabTest === true) && (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {[
                { title: 'Today Patients', value: dailyPatients, icon: Calendar, color: 'bg-blue-500', onClick: () => setActiveTab('PATIENTS'), feature: 'showPatients' },
                { title: 'Today Tests', value: todayTests, icon: ClipboardList, color: 'bg-orange-500', onClick: () => setActiveTab('LAB_TEST'), feature: 'showLabTest' },
              ].filter(stat => appFeatures?.[stat.feature] === true).map((stat, i) => (
                <div 
                  key={i} 
                  onClick={stat.onClick}
                  className={`${stat.color} p-4 rounded-2xl text-white shadow-lg flex flex-col justify-between gap-2 h-full cursor-pointer hover:opacity-90 transition-opacity`}
                >
                  <div className="flex items-center justify-between">
                    <stat.icon size={20} className="opacity-80" />
                    <FileText size={14} className="opacity-40" />
                  </div>
                  <div className="mt-2">
                    <p className="text-[10px] opacity-80 uppercase font-bold tracking-wider">{stat.title}</p>
                    <h3 className="text-xl font-black">{stat.value}</h3>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Charts Section */}
      
      {/* Purchase and Sales Analytics */}
      <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 mb-6">
        <div className="flex justify-between items-center mb-6">
          <h3 className="font-bold text-gray-800">Purchase & Sales Analytics</h3>
          <select 
            className="px-4 py-2 rounded-xl bg-gray-50 border border-gray-200 text-sm font-semibold outline-none focus:ring-2 focus:ring-blue-500/10 focus:border-blue-500 transition-all cursor-pointer"
            value={analyticsFilter}
            onChange={(e) => setAnalyticsFilter(e.target.value as any)}
          >
            <option value="daily">Daily</option>
            <option value="weekly">Weekly</option>
            <option value="monthly">Monthly</option>
          </select>
        </div>
        
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 h-[300px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={transactionAnalyticsData} margin={{ top: 5, right: 20, bottom: 5, left: 0 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E5E7EB" />
                <XAxis 
                  dataKey="name" 
                  axisLine={false} 
                  tickLine={false} 
                  tick={{ fill: '#6B7280', fontSize: 12, fontWeight: 500 }}
                  dy={10}
                />
                <YAxis 
                  allowDecimals={false} 
                  axisLine={false} 
                  tickLine={false}
                  tick={{ fill: '#6B7280', fontSize: 12, fontWeight: 500 }}
                  dx={-10}
                  tickFormatter={(value) => `Rs.${value}`}
                />
                <Tooltip 
                  cursor={{ fill: '#f3f4f6' }}
                  contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 20px -2px rgb(0 0 0 / 0.1)' }}
                  formatter={(value: number) => [`Rs. ${value.toLocaleString()}`, undefined]}
                />
                <Legend wrapperStyle={{ paddingTop: '20px' }} />
                <Bar dataKey="Purchases" fill="#f59e0b" radius={[4, 4, 0, 0]} maxBarSize={40} />
                <Bar dataKey="Sales" fill="#3b82f6" radius={[4, 4, 0, 0]} maxBarSize={40} />
              </BarChart>
            </ResponsiveContainer>
          </div>

          <div className="h-[300px] w-full border-t lg:border-t-0 lg:border-l border-gray-100 pt-6 lg:pt-0 lg:pl-6 flex flex-col">
            <h4 className="text-sm font-semibold text-gray-600 mb-2 text-center">Summary Overview</h4>
            <div className="flex-1 min-h-[220px]">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie 
                    data={pieTransactionData} 
                    innerRadius={60} 
                    outerRadius={80} 
                    paddingAngle={5} 
                    dataKey="value"
                  >
                    {pieTransactionData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip 
                    contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }} 
                    formatter={(value: number) => [`Rs. ${value.toLocaleString()}`, undefined]}
                  />
                  <Legend verticalAlign="bottom" height={36} />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>
      </div>

      {/* 2x2 Summary Grid in One Outer Frame */}
      <div className="border border-gray-200 rounded-xl overflow-hidden mb-6 bg-gray-200 shadow-none">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-[1px]">
          
          {/* Inventory Card */}
          <div className="bg-white flex flex-col">
            <div className="p-4 border-b border-gray-200 flex justify-between items-center">
              <h3 className="font-bold text-gray-900 text-base">Inventory</h3>
              <button 
                onClick={() => setActiveTab(Tab.INVENTORY)}
                className="text-xs text-gray-700 hover:text-blue-600 transition-colors"
              >
                Go to Configuration &raquo;
              </button>
            </div>
            <div className="p-5 flex justify-between items-center flex-1">
               <div className="w-1/2">
                  <p className="text-[22px] font-black text-gray-900 leading-none mb-1.5">{totalMedicines}</p>
                  <p className="text-xs font-medium text-gray-800">Total no of Medicines</p>
               </div>
               <div className="w-1/2">
                  <p className="text-[22px] font-black text-gray-900 leading-none mb-1.5">{totalMedicineGroups}</p>
                  <p className="text-xs font-medium text-gray-800">Medicine Groups</p>
               </div>
            </div>
          </div>

          {/* Quick Report Card */}
          <div className="bg-white flex flex-col">
            <div className="p-4 border-b border-gray-200 flex justify-between items-center">
              <h3 className="font-bold text-gray-900 text-base">Quick Report</h3>
            </div>
            <div className="p-5 flex justify-between items-center flex-1">
               <div className="w-1/2">
                  <p className="text-[22px] font-black text-gray-900 leading-none mb-1.5">{qtyMedicinesSold.toLocaleString()}</p>
                  <p className="text-xs font-medium text-gray-800">Qty of Medicines Sold</p>
               </div>
               <div className="w-1/2">
                  <p className="text-[22px] font-black text-gray-900 leading-none mb-1.5">{invoicesGenerated.toLocaleString()}</p>
                  <p className="text-xs font-medium text-gray-800">Invoices Generated</p>
               </div>
            </div>
          </div>

          {/* My Pharmacy Card */}
          <div className="bg-white flex flex-col">
            <div className="p-4 border-b border-gray-200 flex justify-between items-center">
              <h3 className="font-bold text-gray-900 text-base">My Pharmacy</h3>
              <button 
                onClick={() => setActiveTab(Tab.SETTINGS)}
                className="text-xs text-gray-700 hover:text-blue-600 transition-colors"
              >
                Go to User Management &raquo;
              </button>
            </div>
            <div className="p-5 flex justify-between items-center flex-1">
               <div className="w-1/2">
                  <p className="text-[22px] font-black text-gray-900 leading-none mb-1.5">{totalSuppliers.toString().padStart(2, '0')}</p>
                  <p className="text-xs font-medium text-gray-800">Total no of Suppliers</p>
               </div>
               <div className="w-1/2">
                  <p className="text-[22px] font-black text-gray-900 leading-none mb-1.5">{totalUsers.toString().padStart(2, '0')}</p>
                  <p className="text-xs font-medium text-gray-800">Total no of Users</p>
               </div>
            </div>
          </div>

          {/* Customers Card */}
          {appFeatures?.showPatients === true && (
            <div className="bg-white flex flex-col">
              <div className="p-4 border-b border-gray-200 flex justify-between items-center">
                <h3 className="font-bold text-gray-900 text-base">Customers</h3>
                <button 
                  onClick={() => setActiveTab('PATIENTS')}
                  className="text-xs text-gray-700 hover:text-blue-600 transition-colors"
                >
                  Go to Customers Page &raquo;
                </button>
              </div>
              <div className="p-5 flex justify-between items-center flex-1 relative">
                 <div className="w-1/2 pr-2">
                    <p className="text-[22px] font-black text-gray-900 leading-none mb-1.5">{totalCustomers.toLocaleString()}</p>
                    <p className="text-xs font-medium text-gray-800">Total no of Customers</p>
                 </div>
                 <div className="w-1/2 truncate">
                    <p className="text-[20px] font-black text-gray-900 leading-none mb-1.5 truncate" title={freqBoughtItem}>{freqBoughtItem}</p>
                    <p className="text-xs font-medium text-gray-800">Frequently bought Item</p>
                 </div>
              </div>
            </div>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {(appFeatures?.showPatients === true) && (
          <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 flex flex-col">
            <h3 className="font-bold text-gray-800 mb-4">Patient Traffic</h3>
            <div className="flex-1 min-h-[250px]">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={pieData} innerRadius={60} outerRadius={80} paddingAngle={5} dataKey="value">
                    {pieData.map((entry, index) => <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />)}
                  </Pie>
                  <Tooltip contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }} />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </div>
        )}

        {(appFeatures?.showLabTest === true) && (
          <div className={clsx(
            "bg-white p-6 rounded-2xl shadow-sm border border-gray-100",
            (!appFeatures || appFeatures.showPatients !== false) ? "lg:col-span-2" : "lg:col-span-3"
          )}>
            <h3 className="font-bold text-gray-800 mb-4">One Week Test Analysis</h3>
            <div className="h-[250px] w-full mt-2">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={weekTestAnalysis} margin={{ top: 5, right: 20, bottom: 5, left: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E5E7EB" />
                  <XAxis 
                    dataKey="name" 
                    axisLine={false} 
                    tickLine={false} 
                    tick={{ fill: '#6B7280', fontSize: 12, fontWeight: 500 }}
                    dy={10}
                  />
                  <YAxis 
                    allowDecimals={false} 
                    axisLine={false} 
                    tickLine={false}
                    tick={{ fill: '#6B7280', fontSize: 12, fontWeight: 500 }}
                    dx={-10}
                  />
                  <Tooltip 
                    contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                    cursor={{ stroke: '#f97316', strokeWidth: 1, strokeDasharray: '4 4' }}
                  />
                  <Line 
                    type="monotone" 
                    dataKey="Tests" 
                    stroke="#f97316" 
                    strokeWidth={3} 
                    dot={{ r: 4, fill: '#fff', strokeWidth: 2, stroke: '#f97316' }} 
                    activeDot={{ r: 6, fill: '#f97316', stroke: '#fff', strokeWidth: 2 }} 
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default Dashboard;
