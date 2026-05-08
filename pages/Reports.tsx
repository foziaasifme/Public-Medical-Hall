import React, { useEffect, useState, useMemo } from 'react';
import { storageService } from '../services/storageService';
import { Sale, Medicine, Patient, PatientReport, LabTestRecord } from '../types';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LineChart, Line } from 'recharts';
import { formatCurrency, LOW_STOCK_THRESHOLD } from '../constants';
import { Calendar, Filter, ChevronRight, Clock, FileText, Search, User, Phone, Trash2, Edit2, ChevronDown, X } from 'lucide-react';
import { Button } from '../components/ui/Button';
import { clsx } from 'clsx';
import { LabReportModal } from '../components/LabReportModal';
import { PatientModal } from '../components/PatientModal';
import { useDialog } from '../DialogContext';
import { motion, AnimatePresence } from 'motion/react';

type FilterType = 'daily' | 'weekly' | 'monthly' | 'custom';

const Reports: React.FC = () => {
  const { showAlert, showConfirm, showPrompt } = useDialog();
  const [sales, setSales] = useState<Sale[]>([]);
  const [medicines, setMedicines] = useState<Medicine[]>([]);
  const [patients, setPatients] = useState<Patient[]>([]);
  const [patientReports, setPatientReports] = useState<PatientReport[]>([]);
  const [labTests, setLabTests] = useState<LabTestRecord[]>([]);
  const [stockEntries, setStockEntries] = useState<any[]>([]);
  
  // Feature Flags
  const [appFeatures, setAppFeatures] = useState<any>(null);
  
  // Report Form States
  const [reportPatientId, setReportPatientId] = useState('');
  const [reportDetails, setReportDetails] = useState('');
  const [reportDate, setReportDate] = useState(new Date().toISOString().split('T')[0]);
  
  // Tabs State
  const [activeTab, setActiveTab] = useState<string | null>(null);
  const [selectedPatientRecord, setSelectedPatientRecord] = useState<Patient | null>(null);
  const [selectedReportPatient, setSelectedReportPatient] = useState<Patient | null>(null);
  const [editingPatient, setEditingPatient] = useState<Patient | null>(null);
  
  // Filter States
  const [filterType, setFilterType] = useState<FilterType>('weekly');
  const [customDate, setCustomDate] = useState(new Date().toISOString().split('T')[0]);
  const [searchQuery, setSearchQuery] = useState('');
  
  // Date Range Filters for Medicine and Patient tabs
  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');

  // Accordion state
  const [expandedCategories, setExpandedCategories] = useState<Record<string, boolean>>({});

  // Unique SKUs Modal
  const [showUniqueSKUs, setShowUniqueSKUs] = useState(false);

  // Pagination for Sales
  const [salePage, setSalePage] = useState(1);
  const SALE_ITEMS_PER_PAGE = 10;

  useEffect(() => {
    setSalePage(1);
  }, [filterType, customDate, searchQuery]);

  useEffect(() => {
    const featureFlags = localStorage.getItem('APP_FEATURE_FLAGS');
    if (featureFlags) setAppFeatures(JSON.parse(featureFlags));

    const fetchData = async () => {
      const [s, m, p, pr, lt, se] = await Promise.all([
        storageService.getSales(),
        storageService.getMedicines(),
        storageService.getPatients(),
        storageService.getPatientReports(),
        storageService.getLabTests(),
        storageService.getStockEntries()
      ]);
      setSales(s);
      setMedicines(m);
      setPatients(p);
      setPatientReports(pr);
      setLabTests(lt);
      setStockEntries(se);
    };
    fetchData();
  }, []);

  const loadPatients = async () => {
    const [p, pr, lt] = await Promise.all([
      storageService.getPatients(),
      storageService.getPatientReports(),
      storageService.getLabTests()
    ]);
    setPatients(p);
    setPatientReports(pr);
    setLabTests(lt);
  };

  const handleDeletePatient = async (id: string) => {
    const confirmed = await showConfirm('Are you sure you want to delete this patient?', 'Delete Patient');
    if (confirmed) {
      await storageService.deletePatient(id);
      loadPatients();
    }
  };

  const handleDeleteSale = async (id: string) => {
    const confirmed = await showConfirm('Are you sure you want to delete this sale record? Note: This does not restore stock.', 'Delete Sale');
    if (confirmed) {
      await storageService.deleteSale(id);
      setSales(sales.filter(s => s.id !== id));
    }
  };

  const handleReceivePayment = async (sale: Sale) => {
    const confirmed = await showConfirm(`Confirm receipt of amount for Sale #${sale.id.slice(-6)}?`, 'Receive Payment');
    if (confirmed) {
      const updatedSale = { ...sale, paymentMethod: 'Cash' as const };
      await storageService.updateSale(updatedSale);
      setSales(sales.map(s => s.id === sale.id ? updatedSale : s));
      
      const receiptContent = `
        <div style="font-family: monospace; width: 300px; margin: 0 auto;">
          <h2 style="text-align: center;">Payment Receipt</h2>
          <p><strong>Sale ID:</strong> ${sale.id.slice(-6)}</p>
          <p><strong>Date:</strong> ${new Date().toLocaleString()}</p>
          <p><strong>Patient:</strong> ${sale.customerName || 'Walk-in'}</p>
          <p><strong>Total Paid:</strong> Rs. ${sale.total.toLocaleString()}</p>
          <hr/>
          <p style="text-align: center;">Thank you!</p>
        </div>
      `;
      // We keep window.open for printing as it's a standard print flow, but it's technically a pop-up.
      // However the prompt was specifically about "pop-up windows built by the app".
      // Let's keep the print flow but warn that it might be blocked in iframe.
      const win = window.open('', '_blank');
      if (win) {
        win.document.write(receiptContent);
        win.document.close();
        win.focus();
        setTimeout(() => win.print(), 500);
      }
    }
  };

  const handleEditSale = async (sale: Sale) => {
    const newName = await showPrompt("Edit Customer Name:", sale.customerName || "", "Edit Customer");
    const newPhone = await showPrompt("Edit Customer Phone:", sale.customerPhone || "", "Edit Customer");
    if (newName !== null || newPhone !== null) {
      const updatedSale = { 
        ...sale, 
        customerName: newName ?? sale.customerName,
        customerPhone: newPhone ?? sale.customerPhone 
      };
      await storageService.updateSale(updatedSale);
      setSales(sales.map(s => s.id === sale.id ? updatedSale : s));
    }
  };

  // --- Filtering Logic ---
  const filteredSales = useMemo(() => {
    const now = new Date();
    
    return sales.filter(sale => {
      const saleDate = new Date(sale.date);
      const saleDateStr = sale.date.split('T')[0];

      // Date filter
      let matchesDate = true;
      switch (filterType) {
        case 'daily':
          matchesDate = saleDateStr === new Date().toISOString().split('T')[0];
          break;
        case 'weekly':
          const oneWeekAgo = new Date();
          oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);
          matchesDate = saleDate >= oneWeekAgo;
          break;
        case 'monthly':
          const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
          matchesDate = saleDate >= startOfMonth;
          break;
        case 'custom':
          matchesDate = saleDateStr === customDate;
          break;
      }
      
      // Search filter (Patient Name/Phone/PID)
      const matchesSearch = !searchQuery || 
        (sale.customerName?.toLowerCase().includes(searchQuery.toLowerCase())) ||
        (sale.customerPhone?.toLowerCase().includes(searchQuery.toLowerCase())) ||
        (sale.customerId?.toLowerCase().includes(searchQuery.toLowerCase()));

      return matchesDate && matchesSearch;
    });
  }, [sales, filterType, customDate, searchQuery]);

  const filteredPatients = useMemo(() => {
    let filtered = patients.filter(p => 
      !searchQuery || 
      p.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
      p.phone.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.id.toLowerCase().includes(searchQuery.toLowerCase())
    );

    if (fromDate || toDate) {
      filtered = filtered.filter(p => {
        const hasSale = sales.some(s => s.customerId === p.id && (!fromDate || s.date.split('T')[0] >= fromDate) && (!toDate || s.date.split('T')[0] <= toDate));
        const hasLab = labTests.some(lt => lt.patientId === p.id && (!fromDate || lt.date >= fromDate) && (!toDate || lt.date <= toDate));
        const hasReport = patientReports.some(pr => pr.patientId === p.id && (!fromDate || pr.date >= fromDate) && (!toDate || pr.date <= toDate));
        return hasSale || hasLab || hasReport;
      });
    }
    
    return filtered;
  }, [patients, searchQuery, sales, labTests, patientReports, fromDate, toDate]);
  const creditSales = useMemo(() => filteredSales.filter(s => s.paymentMethod === 'Credit'), [filteredSales]);
  const totalCredit = creditSales.reduce((acc, curr) => acc + curr.total, 0);

  const filteredPurchases = useMemo(() => {
    const now = new Date();
    return stockEntries.filter(entry => {
      if (entry.type !== 'IN') return false;
      const entryDate = new Date(entry.date);
      const entryDateStr = entry.date.split('T')[0];
      
      let matchesDate = true;
      if (activeTab === 'purchase_history') {
        switch (filterType) {
          case 'daily':
            matchesDate = entryDateStr === new Date().toISOString().split('T')[0];
            break;
          case 'weekly':
            const oneWeekAgo = new Date();
            oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);
            matchesDate = entryDate >= oneWeekAgo;
            break;
          case 'monthly':
            const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
            matchesDate = entryDate >= startOfMonth;
            break;
          case 'custom':
            matchesDate = entryDateStr === customDate;
            break;
        }
      } else if (fromDate || toDate) {
        matchesDate = (!fromDate || entryDateStr >= fromDate) && (!toDate || entryDateStr <= toDate);
      }

      const matchesSearch = !searchQuery || 
        entry.medicineName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        entry.batchNumber?.toLowerCase().includes(searchQuery.toLowerCase());

      return matchesDate && matchesSearch;
    });
  }, [stockEntries, filterType, customDate, searchQuery, fromDate, toDate, activeTab]);

  // --- Chart Data Preparation ---
  const chartData = useMemo(() => {
    if (filterType === 'daily' || filterType === 'custom') {
      const hours = Array.from({ length: 24 }, (_, i) => ({
        name: `${i.toString().padStart(2, '0')}:00`,
        sales: 0,
        count: 0
      }));

      filteredSales.forEach(sale => {
        const hour = new Date(sale.date).getHours();
        hours[hour].sales += sale.total;
        hours[hour].count += 1;
      });
      return hours;
    } else {
      const daysMap: Record<string, number> = {};
      
      if (filterType === 'weekly') {
        for(let i=6; i>=0; i--) {
          const d = new Date();
          d.setDate(d.getDate() - i);
          daysMap[d.toLocaleDateString('en-US', { weekday: 'short' })] = 0;
        }
      }

      filteredSales.forEach(sale => {
        const dateKey = new Date(sale.date).toLocaleDateString('en-US', { 
          weekday: filterType === 'weekly' ? 'short' : undefined,
          day: filterType === 'monthly' ? 'numeric' : undefined,
          month: filterType === 'monthly' ? 'short' : undefined,
        });
        
        const key = filterType === 'monthly' ? new Date(sale.date).getDate() : dateKey;
        
        if (filterType === 'monthly') {
             const dayNum = new Date(sale.date).getDate();
             if (!daysMap[dayNum]) daysMap[dayNum] = 0;
             daysMap[dayNum] += sale.total;
        } else {
             if (daysMap[dateKey] !== undefined) daysMap[dateKey] += sale.total;
             else daysMap[dateKey] = (daysMap[dateKey] || 0) + sale.total;
        }
      });

      if (filterType === 'monthly') {
          return Object.keys(daysMap).map(k => ({ name: k, sales: daysMap[k] }));
      }

      return Object.keys(daysMap).map(key => ({
        name: key,
        sales: daysMap[key]
      }));
    }
  }, [filteredSales, filterType]);

  const categoryData = useMemo(() => {
    const catMap: Record<string, number> = {};
    filteredSales.forEach(sale => {
      sale.items.forEach(item => {
        if (!catMap[item.category]) catMap[item.category] = 0;
        catMap[item.category] += (item.salePrice * item.quantity);
      });
    });

    return Object.keys(catMap).map(key => ({
      name: key,
      value: catMap[key]
    })).sort((a, b) => b.value - a.value).slice(0, 6);
  }, [filteredSales]);

  const totalRevenue = filteredSales.reduce((acc, curr) => acc + curr.total, 0);
  const totalTransactions = filteredSales.length;
  const avgTicket = totalTransactions > 0 ? totalRevenue / totalTransactions : 0;
  const lowStockCount = medicines.filter(m => m.stock <= LOW_STOCK_THRESHOLD && m.stock > 0).length;

  const handleLogReport = async (e: React.FormEvent) => {
    e.preventDefault();
    const targetPatientId = selectedPatientRecord ? selectedPatientRecord.id : reportPatientId;
    if (!targetPatientId || !reportDetails || !reportDate) return;

    const patient = patients.find(p => p.id === targetPatientId);
    if (!patient) return;

    const newReport: PatientReport = {
      id: `rep-${Date.now()}`,
      patientId: patient.id,
      patientName: patient.name,
      date: reportDate,
      details: reportDetails
    };

    await storageService.addPatientReport(newReport);
    setPatientReports(await storageService.getPatientReports());
    setReportPatientId('');
    setReportDetails('');
  };

  return (
    <div className="h-full overflow-y-auto pb-10 flex flex-col">
       
       {/* Header & Controls */}
       <div className="mb-6 flex flex-col xl:flex-row justify-between items-start xl:items-center gap-4">
         <div>
            <h2 className="text-2xl font-bold text-gray-800 flex items-center gap-2">
              {activeTab === null ? (
                 <><FileText className="text-medical-blue" /> Report Center</>
              ) : (
                 <button onClick={() => setActiveTab(null)} className="flex items-center gap-2 hover:text-medical-blue transition-colors text-gray-500 font-bold text-sm uppercase tracking-wider">
                    <ChevronRight className="rotate-180" size={18} /> Back to Report Hub
                 </button>
              )}
            </h2>
            {activeTab !== null && (
               <div className="mt-4">
                 <h3 className="text-2xl font-black text-gray-900 capitalize px-2">{activeTab.replace('_', ' ')}</h3>
               </div>
            )}
         </div>

         {activeTab !== null && (
         <div className="flex flex-wrap items-center gap-2 bg-white p-2 rounded-xl border border-gray-200 shadow-sm">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4" />
              <input 
                type="text" 
                placeholder={activeTab === 'profit_margin' ? "Search Product..." : activeTab === 'inventory_valuation' ? "Search..." : "Search..."}
                className="pl-9 pr-4 py-2 rounded-lg border border-gray-200 text-sm outline-none focus:ring-1 focus:ring-blue-500"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
            
            {(activeTab === 'sales_log' || activeTab === 'purchase_history') && (
              <>
                <div className="flex gap-1 bg-gray-100 p-1 rounded-lg">
                  {(['daily', 'weekly', 'monthly'] as const).map((t) => (
                    <button
                      key={t}
                      onClick={() => setFilterType(t)}
                      className={clsx(
                        "px-4 py-1.5 rounded-md text-xs font-bold uppercase tracking-wider transition-all",
                        filterType === t 
                          ? "bg-white text-medical-blue shadow-sm" 
                          : "text-gray-500 hover:text-gray-700 hover:bg-gray-200/50"
                      )}
                    >
                      {t === 'daily' ? 'Today' : t}
                    </button>
                  ))}
                  <button
                    onClick={() => setFilterType('custom')}
                    className={clsx(
                      "px-4 py-1.5 rounded-md text-xs font-bold uppercase tracking-wider transition-all",
                      filterType === 'custom' 
                        ? "bg-white text-medical-blue shadow-sm" 
                        : "text-gray-500 hover:text-gray-700 hover:bg-gray-200/50"
                    )}
                  >
                    Date Wise
                  </button>
                </div>

                {filterType === 'custom' && (
                  <div className="flex items-center gap-2 px-2 border-l border-gray-200">
                    <Calendar size={16} className="text-gray-400" />
                    <input 
                      type="date" 
                      value={customDate}
                      onChange={(e) => setCustomDate(e.target.value)}
                      className="text-sm font-bold text-gray-700 bg-transparent outline-none cursor-pointer"
                    />
                  </div>
                )}
              </>
            )}

            {(activeTab === 'patient_records' || activeTab === 'profit_margin') && (
              <div className="flex items-center gap-2 bg-gray-50 p-1 rounded-lg border border-gray-200 ml-auto">
                <span className="text-xs font-bold text-gray-500 px-2">FROM</span>
                <input 
                  type="date" 
                  value={fromDate} 
                  onChange={e => setFromDate(e.target.value)} 
                  className="text-sm font-bold text-gray-700 bg-transparent outline-none cursor-pointer" 
                />
                <span className="text-xs font-bold text-gray-500 px-2">TO</span>
                <input 
                  type="date" 
                  value={toDate} 
                  onChange={e => setToDate(e.target.value)} 
                  className="text-sm font-bold text-gray-700 bg-transparent outline-none cursor-pointer" 
                />
              </div>
            )}
         </div>
         )}
       </div>

       {activeTab === null && (
         <div className="space-y-10 animate-in fade-in duration-500">
           {[
             {
               title: '1. Inventory & Stock Reports',
               id: 'inventory',
               reports: [
                 {
                   id: 'low_stock',
                   name: 'Low Stock Alerts',
                   desc: 'Identifies inventory items currently at or below the minimum required stock threshold.',
                   fields: ['SKU/ID', 'Medicine Name', 'Current Stock', 'Threshold Level'],
                   insight: `${lowStockCount} items critically low on stock.`
                 },
                 {
                    id: 'inventory_valuation',
                    name: 'Inventory Valuation',
                    desc: 'Calculates the total financial value of all current stock based on purchase and sale prices.',
                    fields: ['Product Name', 'Current Stock', 'Purchase Value', 'Potential Revenue'],
                    insight: `Total Stock Value: ${formatCurrency(medicines.reduce((acc, m) => acc + (m.purchasePrice * m.stock), 0))}`
                 }
               ]
             },
             {
               title: '2. Sales & Revenue Reports',
               id: 'sales',
               reports: [
                 {
                   id: 'sales_log',
                   name: 'Detailed Sales Log',
                   desc: 'Chronological tracking of all point-of-sale transactions and revenues.',
                   fields: ['Date/Time', 'Patient', 'Payment Method', 'Items Sold', 'Total Amount'],
                   insight: `${filteredSales.length} transactions processed in selected period.`
                 }
               ]
             },
             {
               title: '3. Purchase & Supplier Reports',
               id: 'purchases',
               reports: [
                 {
                   id: 'purchase_history',
                   name: 'Purchase History',
                   desc: 'Historical record of stock intake and associated purchase costs.',
                   fields: ['Date', 'Medicine Name', 'Batch', 'Quantity', 'Unit Cost', 'Total Cost'],
                   insight: `${stockEntries.filter(s => s.type === 'IN').length} total restock entries.`
                 }
               ]
             },
             {
               title: '4. Financial & Tax Reports',
               id: 'financial',
               reports: [
                 {
                   id: 'profit_margin',
                   name: 'Profit Margin Analysis',
                   desc: 'Comparative view of purchase versus retail pricing to highlight profitability per SKU.',
                   fields: ['Product Name', 'Purchase Price', 'Sale Price', 'Profit Per Unit', 'Margin %'],
                   insight: `Average profit margin tracked across ${medicines.length} items.`
                 },
                 {
                   id: 'credit_sales',
                   name: 'Outstanding Credit & Receivables',
                   desc: 'Overview of all unpaid credit invoices requiring collection.',
                   fields: ['Date', 'Customer Name', 'Phone', 'Items', 'Amount Due'],
                   insight: `Total Outstanding Receivables: ${formatCurrency(totalCredit)}.`
                 }
               ]
             },
             {
               title: '5. Compliance & Audit Reports',
               id: 'compliance',
               reports: [
                 {
                   id: 'patient_records',
                   name: 'Patient Audit Records',
                   desc: 'Comprehensive audit logs of patient dispensations, diagnostics, and clinical notes.',
                   fields: ['Patient ID', 'Name', 'Age/Sex', 'Contact', 'Clinical History'],
                   insight: `${patients.length} patient records maintained securely.`,
                   requires: 'showPatients'
                 }
               ]
             }
           ].map(category => {
              // Check permissions
              const validReports = category.reports.filter(r => {
                 if ((r as any).requires === 'showPatients' && appFeatures?.showPatients !== true) return false;
                 return true;
              });

              if (validReports.length === 0) return null;

              return (
                <div key={category.id} className="bg-white rounded-3xl p-6 md:p-8 border border-gray-100 shadow-sm transition-all overflow-hidden">
                  <button 
                    onClick={() => setExpandedCategories(prev => ({...prev, [category.id]: !prev[category.id]}))}
                    className={clsx("w-full flex items-center justify-between text-left focus:outline-none transition-all", expandedCategories[category.id] ? "mb-6 pb-4 border-b border-gray-100" : "")}
                  >
                    <h3 className="text-xl font-black text-gray-900 tracking-tight">{category.title}</h3>
                    <div className={clsx("p-2 rounded-full transition-colors", expandedCategories[category.id] ? "bg-medical-blue/10 text-medical-blue" : "bg-gray-50 text-gray-400 hover:bg-gray-100")}>
                       <ChevronDown size={20} className={clsx("transition-transform duration-300", expandedCategories[category.id] && "rotate-180")} />
                    </div>
                  </button>
                  
                  <AnimatePresence initial={false}>
                    {expandedCategories[category.id] && (
                      <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        transition={{ duration: 0.3 }}
                        className="overflow-hidden"
                      >
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-2">
                          {validReports.map(report => (
                             <div 
                               key={report.id} 
                               onClick={() => setActiveTab(report.id)}
                               className="group cursor-pointer bg-gray-50 hover:bg-blue-50/50 p-6 rounded-2xl border border-gray-100 hover:border-blue-200 transition-all text-left flex flex-col justify-between"
                             >
                               <div>
                                  <h4 className="text-lg font-bold text-gray-800 group-hover:text-blue-700 transition-colors mb-2">{report.name}</h4>
                                  <p className="text-sm text-gray-600 mb-4 leading-relaxed">{report.desc}</p>
                                  
                                  <div className="bg-white p-4 rounded-xl border border-gray-100 mb-4">
                                     <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-2">Key Data Fields</p>
                                     <ul className="text-xs text-gray-600 space-y-1.5 list-disc list-inside">
                                       {report.fields.map(f => <li key={f}>{f}</li>)}
                                     </ul>
                                  </div>
                               </div>
                               <div className="flex justify-between items-center bg-gray-100/80 group-hover:bg-blue-100/50 p-3 rounded-xl transition-colors">
                                  <span className="text-xs font-bold text-gray-500 group-hover:text-blue-600">{report.insight}</span>
                                  <ChevronRight size={16} className="text-gray-400 group-hover:text-blue-600" />
                               </div>
                             </div>
                          ))}
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              );
           })}
         </div>
       )}

       {activeTab === 'sales_log' && (
         <>
           {/* Metrics Cards */}
       <div className="grid grid-cols-1 md:grid-cols-5 gap-6 mb-8">
         <div className="glass-panel p-6 rounded-[2rem] border border-white/60 shadow-[0_8px_30px_rgb(0,0,0,0.04)] bg-white/80">
           <p className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">Revenue</p>
           <h3 className="text-xl font-black text-gray-900 tracking-tight">{formatCurrency(totalRevenue)}</h3>
         </div>
         
         <div className="glass-panel p-6 rounded-[2rem] border border-white/60 shadow-[0_8px_30px_rgb(0,0,0,0.04)] bg-white/80">
           <p className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">Credit (Lend)</p>
           <h3 className="text-xl font-black text-gray-900 tracking-tight">{formatCurrency(totalCredit)}</h3>
         </div>
         
         <div className="glass-panel p-6 rounded-[2rem] border border-white/60 shadow-[0_8px_30px_rgb(0,0,0,0.04)] bg-white/80">
           <p className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">Transactions</p>
           <h3 className="text-xl font-black text-gray-900 tracking-tight">{totalTransactions}</h3>
         </div>
         
         <div className="glass-panel p-6 rounded-[2rem] border border-white/60 shadow-[0_8px_30px_rgb(0,0,0,0.04)] bg-white/80">
           <p className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">Avg. Ticket</p>
           <h3 className="text-xl font-black text-gray-900 tracking-tight">{formatCurrency(Math.round(avgTicket))}</h3>
         </div>

         <div className="glass-panel p-6 rounded-[2rem] border border-white/60 shadow-[0_8px_30px_rgb(0,0,0,0.04)] bg-white/80">
           <p className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">Low Stock SKUs</p>
           <h3 className="text-xl font-black text-gray-900 tracking-tight">{lowStockCount}</h3>
         </div>
       </div>

       {/* Patient Report Log Form */}
       <div className="glass-panel border border-gray-200 rounded-[2rem] overflow-hidden flex flex-col min-h-[600px]">
         <div className="p-6 border-b border-gray-100 bg-white/50 flex justify-between items-center shrink-0">
            <h3 className="font-bold text-gray-800 text-lg">Detailed Activity Log</h3>
            <span className="text-xs font-bold text-gray-400 uppercase">{filteredSales.length} Records</span>
         </div>
         
         <div className="overflow-x-auto flex-1">
           <table className="w-full text-left">
             <thead className="bg-gray-50/50">
               <tr className="text-[10px] font-extrabold text-gray-400 uppercase tracking-wider">
                 <th className="p-4">Time / Date</th>
                 <th className="p-4">Patient</th>
                 <th className="p-4">Payment</th>
                 <th className="p-4">Items</th>
                 <th className="p-4 text-right">Amount</th>
                 <th className="p-4 text-right">Actions</th>
               </tr>
             </thead>
             <tbody className="divide-y divide-gray-100">
                {filteredSales.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="p-8 text-center text-gray-400 font-medium">
                      No activity found.
                    </td>
                  </tr>
                ) : (
                  [...filteredSales].reverse().slice((salePage - 1) * SALE_ITEMS_PER_PAGE, salePage * SALE_ITEMS_PER_PAGE).map((sale) => (
                    <tr key={sale.id} className="hover:bg-blue-50/30 transition-colors group">
                       <td className="p-4 text-sm font-medium text-gray-600 flex items-center gap-2">
                          <Clock size={14} className="text-gray-300 group-hover:text-blue-400" />
                          <div>
                            <span className="block text-gray-900 font-bold">{new Date(sale.date).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</span>
                            <span className="text-[10px] text-gray-400">{new Date(sale.date).toLocaleDateString()}</span>
                          </div>
                       </td>
                       <td className="p-4">
                         <div className="text-sm font-bold text-gray-900">{sale.customerName || 'Walk-in'}</div>
                         <div className="text-xs text-gray-500">{sale.customerPhone}</div>
                       </td>
                       <td className="p-4">
                         <div className="flex flex-col items-start gap-1">
                           <span className={clsx(
                             "text-[9px] font-bold uppercase tracking-wider px-2 py-1 rounded-md border",
                             sale.paymentMethod === 'Cash' ? "bg-green-50 text-green-700 border-green-100" : "bg-purple-50 text-purple-700 border-purple-100"
                           )}>
                             {sale.paymentMethod}
                           </span>
                           {sale.paymentMethod === 'Credit' && (
                             <button
                               onClick={() => handleReceivePayment(sale)}
                               className="text-[10px] font-bold text-blue-600 hover:text-blue-800 underline decoration-blue-300 underline-offset-2"
                             >
                               Receive
                             </button>
                           )}
                         </div>
                       </td>
                       <td className="p-4 text-sm text-gray-600">
                         {sale.items.map(i => i.name).join(', ').slice(0, 30)}{sale.items.length > 1 ? '...' : ''}
                       </td>
                       <td className="p-4 text-right text-sm font-black text-gray-900">
                         {formatCurrency(sale.total)}
                       </td>
                       <td className="p-4 text-right">
                         <div className="flex justify-end gap-2">
                           <button 
                             onClick={() => handleEditSale(sale)}
                             className="text-blue-600 hover:text-blue-800 p-1"
                             title="Edit"
                           >
                             <Edit2 size={16} />
                           </button>
                           <button 
                             onClick={() => handleDeleteSale(sale.id)}
                             className="text-red-600 hover:text-red-800 p-1"
                             title="Delete"
                           >
                             <Trash2 size={16} />
                           </button>
                         </div>
                       </td>
                    </tr>
                  ))
                )}
             </tbody>
           </table>
         </div>
         {/* Pagination Controls */}
         {Math.ceil(filteredSales.length / SALE_ITEMS_PER_PAGE) > 1 && (
           <div className="p-4 border-t border-gray-100 bg-gray-50/50 flex items-center justify-between">
             <span className="text-sm text-gray-500">
               Showing {((salePage - 1) * SALE_ITEMS_PER_PAGE) + 1} to {Math.min(salePage * SALE_ITEMS_PER_PAGE, filteredSales.length)} of {filteredSales.length}
             </span>
             <div className="flex gap-2">
               <button
                 disabled={salePage === 1}
                 onClick={() => setSalePage(p => p - 1)}
                 className="px-3 py-1 bg-white border border-gray-200 rounded-lg text-sm font-bold text-gray-600 disabled:opacity-50"
               >
                 Prev
               </button>
               <button
                 disabled={salePage >= Math.ceil(filteredSales.length / SALE_ITEMS_PER_PAGE)}
                 onClick={() => setSalePage(p => p + 1)}
                 className="px-3 py-1 bg-white border border-gray-200 rounded-lg text-sm font-bold text-gray-600 disabled:opacity-50"
               >
                 Next
               </button>
             </div>
           </div>
         )}
       </div>
       </>
       )}

       {activeTab === 'patient_records' && !selectedPatientRecord && (
         <div className="glass-panel border border-gray-200 rounded-[2rem] overflow-hidden flex flex-col">
           <div className="p-6 border-b border-gray-100 bg-white/50 flex justify-between items-center">
              <h3 className="font-bold text-gray-800 text-lg">Patient Records</h3>
              <span className="text-xs font-bold text-gray-400 uppercase">{filteredPatients.length} Patients</span>
           </div>
           
           <div className="overflow-x-auto">
             <table className="w-full text-left">
               <thead className="bg-gray-50/50">
                 <tr className="text-[10px] font-extrabold text-gray-400 uppercase tracking-wider">
                   <th className="p-4">PID</th>
                   <th className="p-4">Name</th>
                   <th className="p-4">Age/Sex</th>
                   <th className="p-4">Phone</th>
                   <th className="p-4">Lab Report</th>
                   <th className="p-4 text-right">Actions</th>
                 </tr>
               </thead>
               <tbody className="divide-y divide-gray-100">
                  {filteredPatients.length === 0 ? (
                    <tr>
                      <td colSpan={8} className="p-8 text-center text-gray-400 font-medium">
                        No patients found.
                      </td>
                    </tr>
                  ) : (
                    filteredPatients.map((patient) => (
                      <tr key={patient.id} className="hover:bg-blue-50/30 transition-colors group">
                         <td className="px-4 py-2 text-sm font-bold text-gray-900">
                            {patient.id.slice(-6)}
                         </td>
                         <td className="px-4 py-2">
                           <div className="text-sm font-bold text-gray-900">{patient.name}</div>
                         </td>
                         <td className="px-4 py-2 text-sm text-gray-600">
                           {patient.age ? `${patient.age}Y` : '-'} / {patient.gender ? patient.gender.charAt(0) : '-'}
                         </td>
                         <td className="px-4 py-2 text-sm text-gray-600">
                           {patient.phone}
                         </td>
                         <td className="px-4 py-2">
                           {labTests.filter(t => t.patientId === patient.id).length > 0 ? (
                             <button 
                               onClick={() => setSelectedReportPatient(patient)}
                               className="flex items-center gap-1 text-blue-600 hover:text-blue-800 font-bold text-xs bg-blue-50 px-3 py-1.5 rounded-lg transition-colors"
                             >
                               <FileText size={14} /> View Report
                             </button>
                           ) : (
                             <span className="text-xs text-gray-400 font-medium">-</span>
                           )}
                         </td>
                         <td className="px-4 py-2 text-right">
                           <div className="flex justify-end gap-2">
                             <button 
                               onClick={() => setEditingPatient(patient)}
                               className="text-blue-600 hover:text-blue-800 p-1"
                               title="Edit"
                             >
                               <Edit2 size={16} />
                             </button>
                             <button 
                               onClick={() => handleDeletePatient(patient.id)}
                               className="text-red-600 hover:text-red-800 p-1"
                               title="Delete"
                             >
                               <Trash2 size={16} />
                             </button>
                           </div>
                         </td>
                      </tr>
                    ))
                  )}
               </tbody>
             </table>
           </div>
         </div>
       )}

       {activeTab === 'patient_records' && selectedPatientRecord && (
         <div className="flex flex-col gap-6">
           <div className="flex items-center gap-4">
             <button 
               onClick={() => setSelectedPatientRecord(null)}
               className="p-2 bg-white rounded-xl border border-gray-200 hover:bg-gray-50 text-gray-600"
             >
               <ChevronRight className="rotate-180" size={20} />
             </button>
             <div>
               <h3 className="text-2xl font-bold text-gray-800">{selectedPatientRecord.name}</h3>
               <p className="text-sm text-gray-500 font-medium">PID: {selectedPatientRecord.id.slice(-6)} | Phone: {selectedPatientRecord.phone}</p>
             </div>
           </div>

           <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
             {/* Lab Tests */}
             <div className="glass-panel border border-gray-200 rounded-[2rem] overflow-hidden flex flex-col">
               <div className="p-6 border-b border-gray-100 bg-white/50">
                  <h3 className="font-bold text-gray-800 text-lg">Lab Tests</h3>
               </div>
               <div className="overflow-x-auto p-4">
                 {labTests.filter(lt => lt.patientId === selectedPatientRecord.id && (!fromDate || lt.date >= fromDate) && (!toDate || lt.date <= toDate)).length === 0 ? (
                   <p className="text-sm text-gray-500 text-center py-4">No lab tests recorded.</p>
                 ) : (
                   <div className="space-y-3">
                     {labTests.filter(lt => lt.patientId === selectedPatientRecord.id && (!fromDate || lt.date >= fromDate) && (!toDate || lt.date <= toDate)).map(test => (
                       <div key={test.id} className="bg-gray-50 p-3 rounded-xl border border-gray-100">
                         <div className="flex justify-between items-start mb-1">
                           <span className="font-bold text-sm text-gray-800">{test.testType}</span>
                           <span className="text-xs text-gray-500">{new Date(test.date).toLocaleDateString()}</span>
                         </div>
                         <div className="flex justify-between items-center">
                           <span className="text-xs text-gray-600">Result: <strong className="text-gray-900">{test.resultValue} {test.unit}</strong></span>
                           <span className="text-[10px] text-gray-400">Normal: {test.normalRange}</span>
                         </div>
                       </div>
                     ))}
                   </div>
                 )}
               </div>
             </div>

             {/* Medicines (Sales) */}
             <div className="glass-panel border border-gray-200 rounded-[2rem] overflow-hidden flex flex-col">
               <div className="p-6 border-b border-gray-100 bg-white/50">
                  <h3 className="font-bold text-gray-800 text-lg">Medicines Purchased</h3>
               </div>
               <div className="overflow-x-auto p-4">
                 {sales.filter(s => (s.customerId === selectedPatientRecord.id || s.customerPhone === selectedPatientRecord.phone) && (!fromDate || s.date.split('T')[0] >= fromDate) && (!toDate || s.date.split('T')[0] <= toDate)).length === 0 ? (
                   <p className="text-sm text-gray-500 text-center py-4">No purchases recorded.</p>
                 ) : (
                   <div className="space-y-3">
                     {sales.filter(s => (s.customerId === selectedPatientRecord.id || s.customerPhone === selectedPatientRecord.phone) && (!fromDate || s.date.split('T')[0] >= fromDate) && (!toDate || s.date.split('T')[0] <= toDate)).map(sale => (
                       <div key={sale.id} className="bg-gray-50 p-3 rounded-xl border border-gray-100">
                         <div className="flex justify-between items-start mb-2">
                           <span className="text-xs text-gray-500">{new Date(sale.date).toLocaleDateString()}</span>
                           <span className="font-bold text-sm text-gray-900">{formatCurrency(sale.total)}</span>
                         </div>
                         <div className="flex flex-wrap gap-1">
                           {sale.items.map((item, idx) => (
                             <span key={idx} className="text-[10px] bg-blue-50 text-blue-700 px-2 py-1 rounded-md border border-blue-100">
                               {item.name} x{item.quantity}
                             </span>
                           ))}
                         </div>
                       </div>
                     ))}
                   </div>
                 )}
               </div>
             </div>

             {/* Patient Reports */}
             <div className="glass-panel border border-gray-200 rounded-[2rem] overflow-hidden flex flex-col lg:col-span-2">
               <div className="p-6 border-b border-gray-100 bg-white/50 flex justify-between items-center">
                  <h3 className="font-bold text-gray-800 text-lg">Doctor Reports & Notes</h3>
               </div>
               <div className="p-4 border-b border-gray-100 bg-gray-50/50">
                 <form onSubmit={handleLogReport} className="flex flex-col gap-3">
                   <textarea 
                     className="w-full px-4 py-2 rounded-xl border border-gray-200 focus:ring-2 focus:ring-blue-500 outline-none resize-none text-sm" 
                     rows={2}
                     value={reportDetails}
                     onChange={e => setReportDetails(e.target.value)}
                     placeholder="Enter new report details, diagnosis, or notes..."
                     required
                   />
                   <div className="flex justify-between items-center">
                     <input 
                       type="date"
                       className="px-4 py-2 rounded-xl border border-gray-200 focus:ring-2 focus:ring-blue-500 outline-none text-sm" 
                       value={reportDate}
                       onChange={e => setReportDate(e.target.value)}
                       required
                     />
                     <button type="submit" className="bg-blue-600 text-white px-4 py-2 rounded-xl font-bold text-sm hover:bg-blue-700 transition-colors">
                       Save Note
                     </button>
                   </div>
                 </form>
               </div>
               <div className="overflow-x-auto p-4">
                 {patientReports.filter(pr => pr.patientId === selectedPatientRecord.id && (!fromDate || pr.date >= fromDate) && (!toDate || pr.date <= toDate)).length === 0 ? (
                   <p className="text-sm text-gray-500 text-center py-4">No reports recorded.</p>
                 ) : (
                   <div className="space-y-3">
                     {patientReports.filter(pr => pr.patientId === selectedPatientRecord.id && (!fromDate || pr.date >= fromDate) && (!toDate || pr.date <= toDate)).map(report => (
                       <div key={report.id} className="bg-gray-50 p-4 rounded-xl border border-gray-100">
                         <div className="flex justify-between items-start mb-2">
                           <span className="font-bold text-sm text-gray-800">Report</span>
                           <span className="text-xs text-gray-500">{new Date(report.date).toLocaleDateString()}</span>
                         </div>
                         <p className="text-sm text-gray-700 whitespace-pre-wrap">{report.details}</p>
                       </div>
                     ))}
                   </div>
                 )}
               </div>
             </div>
           </div>
         </div>
       )}

        {activeTab === 'purchase_history' && (
          <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="glass-panel p-6 rounded-[2rem] border border-white/60 shadow-sm bg-blue-50/50">
                <p className="text-xs font-bold text-blue-600 uppercase tracking-wider mb-2">Total Purchase</p>
                <h3 className="text-3xl font-black text-blue-700 tracking-tight">
                  {formatCurrency(filteredPurchases.reduce((acc, p) => acc + (p.purchasePrice * p.quantity), 0))}
                </h3>
                <p className="text-[10px] text-blue-600 mt-1 font-bold">Based on current filter</p>
              </div>

              <div className="glass-panel p-6 rounded-[2rem] border border-white/60 shadow-sm bg-orange-50/50">
                <p className="text-xs font-bold text-orange-600 uppercase tracking-wider mb-2">Items Restocked</p>
                <h3 className="text-3xl font-black text-orange-700 tracking-tight">
                  {filteredPurchases.reduce((acc, p) => acc + p.quantity, 0)}
                </h3>
                <p className="text-[10px] text-orange-600 mt-1 font-bold">Total units added</p>
              </div>

              <div 
                className="glass-panel p-6 rounded-[2rem] border border-white/60 shadow-sm bg-purple-50/50 cursor-pointer hover:bg-purple-100/50 transition-colors group"
                onClick={() => setShowUniqueSKUs(true)}
              >
                <p className="text-xs font-bold text-purple-600 uppercase tracking-wider mb-2 group-hover:text-purple-700">Unique SKUs</p>
                <h3 className="text-xl font-black text-purple-700 tracking-tight">
                  {new Set(filteredPurchases.map(p => p.medicineId)).size}
                </h3>
                <p className="text-[10px] text-purple-600 mt-1 font-bold group-hover:underline">Different products restocked (Click to view)</p>
              </div>
            </div>

            <div className="glass-panel border border-gray-200 rounded-[2rem] overflow-hidden flex flex-col">
              <div className="p-6 border-b border-gray-100 bg-white/50 flex justify-between items-center">
                <h3 className="font-bold text-gray-800 text-lg">Purchase History</h3>
                <span className="text-xs font-bold text-gray-400 uppercase">{filteredPurchases.length} Entries</span>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-left">
                  <thead className="bg-gray-50/50">
                    <tr className="text-[10px] font-extrabold text-gray-400 uppercase tracking-wider">
                      <th className="p-4">Date</th>
                      <th className="p-4">Medicine Name</th>
                      <th className="p-4">Batch</th>
                      <th className="p-4 text-center">Qty</th>
                      <th className="p-4 text-right">Purchase Price</th>
                      <th className="p-4 text-right">Total Cost</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {filteredPurchases.length === 0 ? (
                      <tr><td colSpan={6} className="p-8 text-center text-gray-400">No purchase records found.</td></tr>
                    ) : (
                      [...filteredPurchases].reverse().map((entry) => (
                        <tr key={entry.id} className="hover:bg-blue-50/30 transition-colors">
                          <td className="p-4 text-sm text-gray-600">
                            {new Date(entry.date).toLocaleDateString()}
                          </td>
                          <td className="p-4">
                            <div className="text-sm font-bold text-gray-900">{entry.medicineName}</div>
                          </td>
                          <td className="p-4">
                            <span className="font-mono text-xs bg-gray-100 px-2 py-0.5 rounded text-gray-600">{entry.batchNumber || 'N/A'}</span>
                          </td>
                          <td className="p-4 text-center font-bold text-gray-700">{entry.quantity}</td>
                          <td className="p-4 text-right text-sm font-medium text-gray-600">
                            {formatCurrency(entry.purchasePrice)}
                          </td>
                          <td className="p-4 text-right text-sm font-black text-gray-900">
                            {formatCurrency(entry.purchasePrice * entry.quantity)}
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'profit_margin' && (
          <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="glass-panel p-6 rounded-[2rem] border border-white/60 shadow-sm bg-green-50/50">
                <p className="text-xs font-bold text-green-600 uppercase tracking-wider mb-2">Realized Profit</p>
                <h3 className="text-xl font-black text-green-700 tracking-tight">
                  {formatCurrency(filteredSales.reduce((acc, sale) => {
                    return acc + sale.items.reduce((itemAcc, item) => {
                      const profitPerUnit = (item.salePrice - (item.purchasePrice || 0));
                      return itemAcc + (profitPerUnit * item.quantity);
                    }, 0);
                  }, 0))}
                </h3>
                <p className="text-[10px] text-green-600 mt-1 font-bold">Based on current filters</p>
              </div>

              <div className="glass-panel p-6 rounded-[2rem] border border-white/60 shadow-sm bg-blue-50/50">
                <p className="text-xs font-bold text-blue-600 uppercase tracking-wider mb-2">Potential Margin</p>
                <h3 className="text-3xl font-black text-blue-700 tracking-tight">
                  {formatCurrency(medicines.reduce((acc, med) => acc + (med.salePrice - med.purchasePrice), 0))}
                </h3>
                <p className="text-[10px] text-blue-600 mt-1 font-bold">Sum of per-unit margins</p>
              </div>

              <div className="glass-panel p-6 rounded-[2rem] border border-white/60 shadow-sm bg-orange-50/50">
                <p className="text-xs font-bold text-orange-600 uppercase tracking-wider mb-2">Items Tracked</p>
                <h3 className="text-3xl font-black text-orange-700 tracking-tight">{medicines.length}</h3>
                <p className="text-[10px] text-orange-600 mt-1 font-bold">SKUs in inventory</p>
              </div>
            </div>

            <div className="glass-panel border border-gray-200 rounded-[2rem] overflow-hidden flex flex-col">
              <div className="p-6 border-b border-gray-100 bg-white/50 flex justify-between items-center">
                <h3 className="font-bold text-gray-800 text-lg">Product Profitability</h3>
                <span className="text-xs font-bold text-gray-400 uppercase">Per Unit analysis</span>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-left">
                  <thead className="bg-gray-50/50">
                    <tr className="text-[10px] font-extrabold text-gray-400 uppercase tracking-wider">
                      <th className="p-4">Product Name</th>
                      <th className="p-4 text-right">Purchase Price</th>
                      <th className="p-4 text-right">Sale Price</th>
                      <th className="p-4 text-right">Profit Per Unit</th>
                      <th className="p-4 text-center">Margin %</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {medicines
                      .filter(m => m.name.toLowerCase().includes(searchQuery.toLowerCase()) || m.genericName.toLowerCase().includes(searchQuery.toLowerCase()))
                      .map((med) => {
                        const profit = med.salePrice - med.purchasePrice;
                        const marginPercent = med.salePrice > 0 ? (profit / med.salePrice) * 100 : 0;
                        return (
                          <tr key={med.id} className="hover:bg-blue-50/30 transition-colors group">
                            <td className="p-4">
                              <div className="text-sm font-bold text-gray-900">{med.name}</div>
                              <div className="text-[10px] text-gray-500 font-medium uppercase">{med.category}</div>
                            </td>
                            <td className="p-4 text-right font-medium text-gray-600 text-sm">
                              {formatCurrency(med.purchasePrice)}
                            </td>
                            <td className="p-4 text-right font-bold text-gray-900 text-sm">
                              {formatCurrency(med.salePrice)}
                            </td>
                            <td className="p-4 text-right">
                              <span className={clsx(
                                "text-sm font-black px-3 py-1 rounded-lg",
                                profit > 0 ? "bg-green-100 text-green-700" : "bg-red-100 text-red-700"
                              )}>
                                {formatCurrency(profit)}
                              </span>
                            </td>
                            <td className="p-4 text-center">
                              <span className="text-xs font-bold text-gray-500">
                                {marginPercent.toFixed(1)}%
                              </span>
                            </td>
                          </tr>
                        );
                      })}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'credit_sales' && (
          <div className="glass-panel border border-gray-200 rounded-[2rem] overflow-hidden flex flex-col">
            <div className="p-6 border-b border-gray-100 bg-white/50 flex justify-between items-center">
              <div>
                 <h3 className="font-bold text-gray-800 text-lg">Outstanding Credit & Receivables</h3>
                 <p className="text-xs text-gray-500 mt-1">Transactions requiring payment collection.</p>
              </div>
              <div className="text-right">
                 <p className="text-[10px] font-bold text-red-400 uppercase tracking-wider mb-1">Total Outstanding</p>
                 <span className="text-xl font-black text-red-600">{formatCurrency(totalCredit)}</span>
              </div>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left">
                <thead className="bg-gray-50/50">
                  <tr className="text-[10px] font-extrabold text-gray-400 uppercase tracking-wider">
                    <th className="p-4">Date</th>
                    <th className="p-4">Customer</th>
                    <th className="p-4">Phone</th>
                    <th className="p-4">Items</th>
                    <th className="p-4 text-right">Amount Due</th>
                    <th className="p-4 text-center">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {creditSales.length === 0 ? (
                    <tr><td colSpan={6} className="p-8 text-center text-gray-400">No outstanding credit found.</td></tr>
                  ) : (
                    creditSales.map(sale => (
                      <tr key={sale.id} className="hover:bg-red-50/30 transition-colors">
                         <td className="p-4 text-sm text-gray-600">{new Date(sale.date).toLocaleDateString()}</td>
                         <td className="p-4 font-bold text-gray-900 text-sm">{sale.customerName || 'Unknown'}</td>
                         <td className="p-4 text-sm text-gray-600">{sale.customerPhone || 'N/A'}</td>
                         <td className="p-4 text-sm text-gray-500">{sale.items.map(i => i.name).join(', ')}</td>
                         <td className="p-4 text-right font-black text-red-600">{formatCurrency(sale.total)}</td>
                         <td className="p-4 text-center">
                           <button
                             onClick={() => handleReceivePayment(sale)}
                             className="text-xs font-bold text-blue-600 hover:text-white hover:bg-blue-600 border border-blue-600 px-3 py-1.5 rounded-lg transition-colors"
                           >
                             Mark Paid
                           </button>
                         </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {activeTab === 'low_stock' && (
          <div className="glass-panel border border-gray-200 rounded-[2rem] overflow-hidden flex flex-col">
            <div className="p-6 border-b border-gray-100 bg-white/50 flex justify-between items-center">
              <div>
                 <h3 className="font-bold text-gray-800 text-lg">Low Stock Alerts</h3>
                 <p className="text-xs text-gray-500 mt-1">Items at or below the threshold of {LOW_STOCK_THRESHOLD}.</p>
              </div>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left">
                <thead className="bg-gray-50/50">
                  <tr className="text-[10px] font-extrabold text-gray-400 uppercase tracking-wider">
                    <th className="p-4">SKU/ID</th>
                    <th className="p-4">Product Name</th>
                    <th className="p-4">Category</th>
                    <th className="p-4 text-right">Current Stock</th>
                    <th className="p-4 text-right">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {medicines.filter(m => m.stock <= LOW_STOCK_THRESHOLD).length === 0 ? (
                    <tr><td colSpan={5} className="p-8 text-center text-gray-400">All inventory levels are healthy.</td></tr>
                  ) : (
                    medicines.filter(m => m.stock <= LOW_STOCK_THRESHOLD).map(med => (
                      <tr key={med.id} className="hover:bg-red-50/30 transition-colors">
                         <td className="p-4 font-mono text-xs text-gray-500">{med.id.slice(0, 8)}</td>
                         <td className="p-4 font-bold text-gray-900 text-sm">{med.name}</td>
                         <td className="p-4 text-xs font-bold text-gray-500 uppercase">{med.category}</td>
                         <td className="p-4 text-right font-black text-gray-900">{med.stock}</td>
                         <td className="p-4 text-right">
                           <span className={clsx("text-[10px] font-bold uppercase tracking-wider px-2 py-1 rounded-md", med.stock === 0 ? 'bg-red-100 text-red-700' : 'bg-orange-100 text-orange-700')}>
                              {med.stock === 0 ? 'Out of Stock' : 'Low Stock'}
                           </span>
                         </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {activeTab === 'inventory_valuation' && (
          <div className="glass-panel border border-gray-200 rounded-[2rem] overflow-hidden flex flex-col">
            <div className="p-6 border-b border-gray-100 bg-white/50 flex justify-between items-center">
              <div>
                 <h3 className="font-bold text-gray-800 text-lg">Inventory Valuation</h3>
                 <p className="text-xs text-gray-500 mt-1">Financial assessment of current active stock.</p>
              </div>
              <div className="text-right">
                 <p className="text-[10px] font-bold text-blue-400 uppercase tracking-wider mb-1">Total Potential Revenue</p>
                 <span className="text-xl font-black text-blue-600">{formatCurrency(medicines.reduce((acc, m) => acc + (m.salePrice * m.stock), 0))}</span>
              </div>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left">
                <thead className="bg-gray-50/50">
                  <tr className="text-[10px] font-extrabold text-gray-400 uppercase tracking-wider">
                    <th className="p-4">Category</th>
                    <th className="p-4 text-center">Total SKUs</th>
                    <th className="p-4 text-center">Total Quantities</th>
                    <th className="p-4 text-right">Total Purchase Value</th>
                    <th className="p-4 text-right">Potential Revenue</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {Object.entries(medicines.reduce((acc: Record<string, {skus: number, qty: number, purchase: number, revenue: number}>, med) => {
                     if (!acc[med.category]) acc[med.category] = { skus: 0, qty: 0, purchase: 0, revenue: 0 };
                     acc[med.category].skus += 1;
                     acc[med.category].qty += med.stock;
                     acc[med.category].purchase += (med.purchasePrice * med.stock);
                     acc[med.category].revenue += (med.salePrice * med.stock);
                     return acc;
                  }, {})).map(([cat, data]: [string, any]) => (
                    <tr key={cat} className="hover:bg-blue-50/30 transition-colors">
                       <td className="p-4 font-bold text-gray-900 text-sm uppercase">{cat}</td>
                       <td className="p-4 text-center text-sm font-medium text-gray-600">{data.skus}</td>
                       <td className="p-4 text-center text-sm font-medium text-gray-600">{data.qty}</td>
                       <td className="p-4 text-right font-medium text-gray-600 text-sm">{formatCurrency(data.purchase)}</td>
                       <td className="p-4 text-right font-black text-gray-900 text-sm">{formatCurrency(data.revenue)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {selectedReportPatient && (
          <LabReportModal 
            patient={selectedReportPatient} 
            tests={labTests.filter(t => t.patientId === selectedReportPatient.id)} 
            onClose={() => setSelectedReportPatient(null)} 
          />
        )}

        {editingPatient && (
          <PatientModal 
            initialData={editingPatient}
            onClose={() => {
              setEditingPatient(null);
              loadPatients();
            }}
          />
        )}

        <AnimatePresence>
           {showUniqueSKUs && (
              <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
                 <motion.div
                    initial={{ opacity: 0, scale: 0.95, y: 10 }}
                    animate={{ opacity: 1, scale: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.95, y: 10 }}
                    className="bg-white rounded-[2rem] w-full max-w-2xl overflow-hidden flex flex-col shadow-2xl"
                    style={{ maxHeight: 'calc(100vh - 4rem)' }}
                 >
                    <div className="p-6 border-b border-gray-100 flex justify-between items-center bg-gray-50/50">
                       <div>
                          <h3 className="text-xl font-bold text-gray-900">Restocked Unique SKUs</h3>
                          <p className="text-xs text-gray-500 font-medium">List of unique physical products added to inventory</p>
                       </div>
                       <button onClick={() => setShowUniqueSKUs(false)} className="p-2 bg-white rounded-full hover:bg-gray-100 transition-colors border border-gray-200">
                          <X size={20} className="text-gray-500" />
                       </button>
                    </div>
                    <div className="p-4 overflow-y-auto">
                       <ul className="space-y-2">
                          {Array.from(new Set(filteredPurchases.map(p => p.medicineId))).map(uniqueIdStr => {
                             const uniqueId = uniqueIdStr as string;
                             const matchingEntries = filteredPurchases.filter(p => p.medicineId === uniqueId);
                             const firstEntry = matchingEntries[0];
                             const totalQty = matchingEntries.reduce((sum, e) => sum + e.quantity, 0);
                             const medRef = medicines.find(m => m.id === uniqueId);
                             return (
                               <li key={uniqueId} className="flex flex-col sm:flex-row justify-between items-start sm:items-center p-4 rounded-xl border border-gray-100 bg-white hover:border-purple-200 transition-colors">
                                 <div>
                                    <div className="font-bold text-gray-900 text-sm">{firstEntry?.medicineName || 'Unknown Medicine'}</div>
                                    <div className="text-[10px] text-gray-500 uppercase tracking-widest mt-1">Cat: {medRef?.category || 'N/A'} • ID: {uniqueId.slice(0,6)}</div>
                                 </div>
                                 <div className="mt-2 sm:mt-0 text-right">
                                    <span className="text-sm font-black text-purple-700 bg-purple-50 px-3 py-1 rounded-lg">
                                      + {totalQty} Total Added
                                    </span>
                                 </div>
                               </li>
                             );
                          })}
                          {filteredPurchases.length === 0 && (
                            <div className="py-12 text-center text-gray-400 font-bold">No restocked items found matching filter.</div>
                          )}
                       </ul>
                    </div>
                 </motion.div>
              </div>
           )}
        </AnimatePresence>
     </div>
   );
 };

export default Reports;
