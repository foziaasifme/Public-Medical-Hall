import React, { useState, useEffect } from 'react';
import { 
  Settings as SettingsIcon, 
  ShieldAlert, 
  RotateCcw, 
  Building2, 
  Save, 
  Code2, 
  Globe, 
  Mail, 
  Phone,
  LayoutDashboard,
  Database,
  Download,
  Upload,
  FileJson,
  FileText
} from 'lucide-react';
import { Button } from '../components/ui/Button';
import { InstallButton } from '../components/InstallButton';
import { storageService } from '../services/storageService';
import { CompanySettings, Medicine, Sale, StockEntry, Patient, PatientReport, LabTestRecord, Supplier } from '../types';
import { useDialog } from '../DialogContext';
import { AppFeatures, defaultFeatures } from './DeveloperPortal';

const Settings: React.FC = () => {
  const { showConfirm } = useDialog();
  const [company, setCompany] = useState<CompanySettings>({
    name: '',
    license: '',
    address: '',
    contact: '',
    contactPersonName: '',
    doctorName: '',
    doctorDegree: '',
    backupWeekly: true,
    backupWeeklyDay: 'Friday',
    backupWeeklyTime: '09:30',
    backupDataType: 'full'
  });
  const [saveStatus, setSaveStatus] = useState('');
  
  const [devMasterFlags, setDevMasterFlags] = useState<AppFeatures>(defaultFeatures);
  const [appFeatures, setAppFeatures] = useState<AppFeatures>(defaultFeatures);

  useEffect(() => {
    const loadSettings = async () => {
      const settings = await storageService.getCompanySettings();
      setCompany(settings);
    };
    loadSettings();

    // Load feature flags
    const masterStr = localStorage.getItem('DEV_MASTER_FLAGS');
    const master = masterStr ? JSON.parse(masterStr) : defaultFeatures;
    setDevMasterFlags(master);

    const userStr = localStorage.getItem('APP_FEATURE_FLAGS');
    if (userStr) {
      setAppFeatures(JSON.parse(userStr));
    } else {
      setAppFeatures(master);
    }
  }, []);

  const arrayToCSV = (data: any[]) => {
    if (data.length === 0) return '';
    const headers = Object.keys(data[0]);
    const cleanHeader = headers.join(',');
    const rows = data.map(obj => headers.map(h => {
        let val = obj[h];
        if (typeof val === 'object') val = JSON.stringify(val);
        val = String(val ?? '').replace(/"/g, '""');
        return `"${val}"`;
    }).join(','));
    return [cleanHeader, ...rows].join('\n');
  };

  const handleExport = async (category: string, format: 'json' | 'csv') => {
    let dataToExport: any = [];
    let filename = `${category}_${new Date().toISOString().split('T')[0]}`;
    
    switch (category) {
      case 'full':
        dataToExport = {
          medicines: await storageService.getMedicines(),
          sales: await storageService.getSales(),
          stockEntries: await storageService.getStockEntries(),
          patients: await storageService.getPatients(),
          patientReports: await storageService.getPatientReports(),
          labTests: await storageService.getLabTests(),
          suppliers: await storageService.getSuppliers(),
          company: await storageService.getCompanySettings(),
          timestamp: new Date().toISOString(),
        };
        break;
      case 'inventory':
        dataToExport = await storageService.getMedicines();
        break;
      case 'stock_reports':
        dataToExport = await storageService.getStockEntries();
        break;
      case 'sales_reports':
        dataToExport = await storageService.getSales();
        break;
      case 'purchase_reports':
        dataToExport = await storageService.getSuppliers();
        break;
      case 'financial_reports':
        dataToExport = await storageService.getSales();
        break;
    }

    let finalContent = '';
    let mimeType = 'text/plain';

    if (format === 'json') {
      finalContent = JSON.stringify(dataToExport, null, 2);
      filename += '.json';
      mimeType = 'application/json';
    } else {
      if (category === 'full') {
        alert('Full CSV backup generates combined JSON text inside CSV extension (JSON highly recommended)');
        finalContent = JSON.stringify(dataToExport, null, 2);
        filename += '.csv';
      } else {
        finalContent = arrayToCSV(dataToExport);
        filename += '.csv';
        mimeType = 'text/csv';
      }
    }

    const blob = new Blob([finalContent], { type: mimeType });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    modalCleanup(a, url);
  };

  const modalCleanup = (a: HTMLAnchorElement, url: string) => {
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const parseCSV = (csvContent: string) => {
    try {
      const lines = csvContent.split(/\r?\n/).filter(line => line.trim() !== '');
      if (lines.length < 2) return [];
      const rawHeaders = lines[0].split(',').map(h => h.trim().replace(/^"|"$/g, ''));
      
      const headerMap: Record<string, string> = {
        'id': 'id', 'medid': 'id', 'medicineid': 'id',
        'name': 'name', 'item': 'name', 'medicine': 'name', 'product': 'name',
        'genericname': 'genericName', 'generic': 'genericName', 'salt': 'genericName',
        'category': 'category', 'cat': 'category',
        'purchaseprice': 'purchasePrice', 'purprice': 'purchasePrice',
        'saleprice': 'salePrice', 'price': 'salePrice',
        'stock': 'stock', 'quantity': 'stock', 'qty': 'stock',
        'expirydate': 'expiryDate', 'expiry': 'expiryDate', 'exp': 'expiryDate',
        'batch': 'batchNumber', 'batchnumber': 'batchNumber', 'lot': 'batchNumber',
        'unit': 'unit'
      };

      return lines.slice(1).map(line => {
        const obj: any = {};
        const currentline = line.split(/,(?=(?:(?:[^"]*"){2})*[^"]*$)/);
        
        rawHeaders.forEach((rawHeader, i) => {
          const normalizedKey = rawHeader.toLowerCase().replace(/\s+/g, '').replace(/[^a-z0-9]/g, '');
          const mappedKey = headerMap[normalizedKey] || rawHeader;
          
          let val: any = currentline[i] ? currentline[i].trim().replace(/^"|"$/g, '').replace(/""/g, '"') : '';
          
          if(val.startsWith('{') || val.startsWith('[')) {
             try { val = JSON.parse(val); } catch { /* ignore */ }
          } else if (['purchasePrice', 'salePrice', 'stock'].includes(mappedKey)) {
             val = val ? Number(String(val).replace(/[^0-9.]/g, '')) : 0;
          } else if (!isNaN(Number(val)) && val !== '' && !['id', 'batchNumber', 'expiryDate'].includes(mappedKey)) {
             val = Number(val) as any;
          }
          obj[mappedKey] = val;
        });
        return obj;
      }).filter(o => Object.keys(o).length > 0 && (o.id !== undefined || o.name !== undefined));
    } catch (e) {
      console.error(e);
      return [];
    }
  };

  const handleImport = async (e: React.ChangeEvent<HTMLInputElement>, category: string) => {
      const file = e.target.files?.[0];
      if (!file) return;
      const confirmed = await showConfirm(`Are you sure you want to upload data for ${category}? Existing records will be updated.`, 'Upload Data');
      if(!confirmed) {
        e.target.value = "";
        return;
      }

      const reader = new FileReader();
      reader.onload = async (evt) => {
         const content = evt.target?.result as string;
         try {
            if (file.name.endsWith('.json')) {
               if (category === 'full') {
                  await storageService.importData(content);
               } else if (category === 'inventory') {
                  const data = JSON.parse(content);
                  const medicines = await storageService.getMedicines();
                  const incoming = Array.isArray(data) ? data : data.medicines || [];
                  incoming.forEach((i: any) => {
                     const idx = medicines.findIndex(m => m.id === i.id);
                     if(idx >= 0) medicines[idx] = {...medicines[idx], ...i};
                     else medicines.push(i);
                  });
                  await storageService.saveMedicines(medicines);
               }
               alert('JSON Data Uploaded Successfully');
            } else if (file.name.endsWith('.csv')) {
               const parsedArray = parseCSV(content);
               if (category === 'inventory') {
                  const medicines = await storageService.getMedicines();
                  parsedArray.forEach((i: any) => {
                    const existingIdx = medicines.findIndex(m => 
                      (i.id && m.id === i.id) || 
                      (m.name.toLowerCase().trim() === i.name?.toLowerCase().trim())
                    );
                    if (existingIdx >= 0) {
                      medicines[existingIdx] = { ...medicines[existingIdx], ...i };
                    } else {
                      if (!i.id) i.id = `med-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
                      medicines.push(i);
                    }
                  });
                  await storageService.saveMedicines(medicines);
               } else if (category === 'stock_reports') {
                  const current = await storageService.getStockEntries();
                  const fresh = [...current];
                  parsedArray.forEach((i: any) => {
                    if (!i.id) i.id = `import-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
                    const idx = fresh.findIndex(s => s.id === i.id);
                    if (idx >= 0) fresh[idx] = { ...fresh[idx], ...i };
                    else fresh.push(i);
                  });
                  await storageService.saveStockEntries(fresh);
               } else if (category === 'sales_reports' || category === 'financial_reports') {
                  const current = await storageService.getSales();
                  const fresh = [...current];
                  parsedArray.forEach((i: any) => {
                    if (!i.id) i.id = `import-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
                    const idx = fresh.findIndex(s => s.id === i.id);
                    if (idx >= 0) fresh[idx] = { ...fresh[idx], ...i };
                    else fresh.push(i);
                  });
                  await storageService.saveSales(fresh);
               }
               alert('CSV Data Uploaded Successfully');
            }
            window.location.reload();
         } catch (err) {
            console.error(err);
            alert('Invalid File Format');
         }
      };
      reader.readAsText(file);
  };

  const handleExportAllCsv = async () => {
    const categories = ['inventory', 'stock_reports', 'sales_reports', 'purchase_reports', 'financial_reports'];
    for (const cat of categories) {
      await handleExport(cat, 'csv');
      await new Promise(resolve => setTimeout(resolve, 500));
    }
  };

  const DataRow = ({ title, onCsv, onJson }: { title: string, onCsv: () => void, onJson: () => void }) => (
     <div className="flex items-center justify-between p-3 rounded-xl border border-gray-100 bg-white hover:border-blue-200 transition-colors">
        <span className="text-sm font-bold text-gray-700">{title}</span>
        <div className="flex items-center gap-2">
           <button onClick={onCsv} className="px-3 py-1 bg-gray-50 border border-gray-200 rounded-lg text-xs font-bold text-gray-600 hover:bg-white hover:text-blue-600 transition-colors flex items-center gap-1">
             CSV
           </button>
           <button onClick={onJson} className="px-3 py-1 bg-gray-50 border border-gray-200 rounded-lg text-xs font-bold text-gray-600 hover:bg-white hover:text-purple-600 transition-colors flex items-center gap-1">
             JSON
           </button>
        </div>
     </div>
  );

  const DataRowUpload = ({ title, onUpload }: { title: string, onUpload: (e: React.ChangeEvent<HTMLInputElement>) => void }) => (
     <div className="flex items-center justify-between p-3 rounded-xl border border-gray-100 bg-white hover:border-emerald-200 transition-colors">
        <span className="text-sm font-bold text-gray-700">{title}</span>
        <div className="flex items-center gap-2">
           <label className="cursor-pointer px-3 py-1 bg-gray-50 border border-gray-200 rounded-lg text-xs font-bold text-gray-600 hover:bg-white hover:text-emerald-600 transition-colors flex items-center gap-1">
             JSON / CSV
             <input type="file" accept=".csv,.json" className="hidden" onChange={onUpload} />
           </label>
        </div>
     </div>
  );

  const handleSaveCompany = async (e: React.FormEvent) => {
    e.preventDefault();
    let updatedCompany = { ...company };

    if (updatedCompany.backupMonthly && updatedCompany.backupMonthlyDate) {
        const [year, month, day] = updatedCompany.backupMonthlyDate.split('-').map(Number);
        const date = new Date(year, month - 1, day);
        
        // Get last day of the current month
        const lastDayOfCurrentMonth = new Date(year, month, 0).getDate();
        
        if (date.getDate() === lastDayOfCurrentMonth) {
            // It IS the last day. Calculate last day of next month.
            const nextMonthDate = new Date(year, month + 1, 0);
            updatedCompany.backupMonthlyDate = nextMonthDate.toISOString().split('T')[0];
        }
    }
    
    try {
      await storageService.saveCompanySettings(updatedCompany);
      setCompany(updatedCompany); 
      setSaveStatus('Settings Saved!');
      setTimeout(() => setSaveStatus(''), 2000);
    } catch (e) {
      setSaveStatus('Error saving settings');
    }
  };

  const toggleAppFeature = (key: keyof AppFeatures) => {
    const nextFeats = { ...appFeatures, [key]: !appFeatures[key] };
    setAppFeatures(nextFeats);
    localStorage.setItem('APP_FEATURE_FLAGS', JSON.stringify(nextFeats));
    setSaveStatus('Features Updated. Reloading...');
    setTimeout(() => {
        window.location.reload();
    }, 600);
  };

  const featureOptions: Array<{ key: keyof AppFeatures, label: string }> = [
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

  return (
    <div className="h-full overflow-y-auto pb-10">
      <div className="max-w-4xl mx-auto space-y-8">
        
        <h2 className="text-2xl font-bold text-gray-800 flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <SettingsIcon className="text-gray-400" /> System Configuration
          </div>
          <InstallButton />
        </h2>

        {/* 1. Company Information */}
        <section className="glass-panel p-6 rounded-2xl border border-gray-200">
          <div className="flex items-center gap-3 mb-6 pb-4 border-b border-gray-100">
             <div className="w-10 h-10 bg-blue-100 text-medical-blue rounded-xl flex items-center justify-center">
               <Building2 size={20} />
             </div>
             <div>
               <h3 className="font-bold text-lg text-gray-800">Company Information</h3>
               <p className="text-xs text-gray-500">Details printed on invoices and headers.</p>
             </div>
          </div>

          <form onSubmit={handleSaveCompany} className="grid grid-cols-1 md:grid-cols-2 gap-6">
             <div className="col-span-2 md:col-span-1">
               <label className="text-xs font-bold text-gray-500 uppercase">Company Name</label>
               <input 
                 className="w-full mt-1 px-4 py-2 rounded-xl border border-gray-200 focus:ring-2 focus:ring-blue-500 outline-none" 
                 value={company.name}
                 onChange={e => setCompany({...company, name: e.target.value})}
                 placeholder="e.g. My Pharmacy"
                 required
               />
             </div>
             <div className="col-span-2 md:col-span-1">
               <label className="text-xs font-bold text-gray-500 uppercase">License Number</label>
               <input 
                 className="w-full mt-1 px-4 py-2 rounded-xl border border-gray-200 focus:ring-2 focus:ring-blue-500 outline-none" 
                 value={company.license}
                 onChange={e => setCompany({...company, license: e.target.value})}
                 placeholder="e.g. LIC-12345"
               />
             </div>
             <div className="col-span-2">
               <label className="text-xs font-bold text-gray-500 uppercase">Address</label>
               <input 
                 className="w-full mt-1 px-4 py-2 rounded-xl border border-gray-200 focus:ring-2 focus:ring-blue-500 outline-none" 
                 value={company.address}
                 onChange={e => setCompany({...company, address: e.target.value})}
                 placeholder="Full Address"
               />
             </div>
             <div className="col-span-2 md:col-span-1">
               <label className="text-xs font-bold text-gray-500 uppercase">Contact Number</label>
               <input 
                 className="w-full mt-1 px-4 py-2 rounded-xl border border-gray-200 focus:ring-2 focus:ring-blue-500 outline-none" 
                 value={company.contact}
                 onChange={e => setCompany({...company, contact: e.target.value})}
                 placeholder="Phone Number"
               />
             </div>
             <div className="col-span-2 md:col-span-1">
               <label className="text-xs font-bold text-gray-500 uppercase">Contact Person Name</label>
               <input 
                 className="w-full mt-1 px-4 py-2 rounded-xl border border-gray-200 focus:ring-2 focus:ring-blue-500 outline-none" 
                 value={company.contactPersonName || company.doctorName || ''}
                 onChange={e => setCompany({...company, contactPersonName: e.target.value, doctorName: e.target.value})}
                 placeholder="Name"
               />
             </div>
             <div className="col-span-2 md:col-span-1">
               <label className="text-xs font-bold text-gray-500 uppercase">Mobile No.</label>
               <input 
                 className="w-full mt-1 px-4 py-2 rounded-xl border border-gray-200 focus:ring-2 focus:ring-blue-500 outline-none" 
                 value={company.mobileNo || ''}
                 onChange={e => setCompany({...company, mobileNo: e.target.value})}
                 placeholder="Mobile Number"
               />
             </div>
             <div className="col-span-2 md:col-span-1">
               <label className="text-xs font-bold text-gray-500 uppercase">WhatsApp No. (if not same)</label>
               <input 
                 className="w-full mt-1 px-4 py-2 rounded-xl border border-gray-200 focus:ring-2 focus:ring-blue-500 outline-none" 
                 value={company.whatsappNo || ''}
                 onChange={e => setCompany({...company, whatsappNo: e.target.value})}
                 placeholder="WhatsApp Number"
               />
             </div>

             {/* Financial Settings */}
             <div className="col-span-2 mt-4 pt-4 border-t border-gray-100">
               <h4 className="font-bold text-gray-700 text-sm uppercase mb-4">Financial Settings</h4>
               <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                 <div>
                   <label className="text-xs font-bold text-gray-500 uppercase">Sales Tax (%)</label>
                   <input 
                     type="number"
                     min="0"
                     max="100"
                     step="0.01"
                     className="w-full mt-1 px-4 py-2 rounded-xl border border-gray-200 focus:ring-2 focus:ring-blue-500 outline-none"
                     value={company.taxRate ?? 0}
                     onChange={e => setCompany({...company, taxRate: parseFloat(e.target.value) || 0})}
                   />
                 </div>
               </div>
             </div>

             {/* Auto Backup Settings */}
             <div className="col-span-2 mt-4 pt-4 border-t border-gray-100">
               <div className="flex justify-between items-center mb-4">
                 <h4 className="font-bold text-gray-700 text-sm uppercase">Auto-Backup Settings</h4>
                 <div className="w-1/3">
                   <label className="text-xs font-bold text-gray-500 uppercase">Backup Type</label>
                   <select
                     className="w-full mt-1 px-4 py-2 rounded-xl border border-gray-200 focus:ring-2 focus:ring-blue-500 outline-none"
                     value={company.backupDataType || 'full'}
                     onChange={e => setCompany({...company, backupDataType: e.target.value as any})}
                   >
                     <option value="full">Full System Backup</option>
                     <option value="inventory">Inventory List</option>
                     <option value="reports">All Reports</option>
                   </select>
                 </div>
               </div>
               
               <div className="space-y-4">
                 
                 {/* Daily Backup */}
                 <div className="grid grid-cols-1 md:grid-cols-3 gap-6 items-end">
                   <div className="flex flex-col justify-end pb-2">
                     <label className="flex items-center gap-2 cursor-pointer">
                       <input 
                         type="checkbox" 
                         className="w-4 h-4 text-blue-600 rounded border-gray-300 focus:ring-blue-500"
                         checked={company.backupDaily || false}
                         onChange={e => setCompany({...company, backupDaily: e.target.checked})}
                       />
                       <span className="text-sm font-medium text-gray-700">Daily Backup</span>
                     </label>
                   </div>
                   <div>
                     <label className="text-xs font-bold text-gray-500 uppercase">Time</label>
                     <input 
                       type="time"
                       className="w-full mt-1 px-4 py-2 rounded-xl border border-gray-200 focus:ring-2 focus:ring-blue-500 outline-none disabled:opacity-50 disabled:bg-gray-50"
                       value={company.backupDailyTime || '23:00'}
                       onChange={e => setCompany({...company, backupDailyTime: e.target.value})}
                       disabled={!company.backupDaily}
                     />
                   </div>
                   <div>
                     <label className="text-xs font-bold text-gray-500 uppercase">Daily</label>
                     <input 
                       type="date"
                       className="w-full mt-1 px-4 py-2 rounded-xl border border-gray-200 focus:ring-2 focus:ring-blue-500 outline-none disabled:opacity-50 disabled:bg-gray-50"
                       value={company.backupDailyDate || ''}
                       onChange={e => setCompany({...company, backupDailyDate: e.target.value})}
                       disabled={!company.backupDaily}
                     />
                   </div>
                 </div>

                 {/* Weekly Backup */}
                 <div className="grid grid-cols-1 md:grid-cols-3 gap-6 items-end">
                   <div className="flex flex-col justify-end pb-2">
                     <label className="flex items-center gap-2 cursor-pointer">
                       <input 
                         type="checkbox" 
                         className="w-4 h-4 text-blue-600 rounded border-gray-300 focus:ring-blue-500"
                         checked={company.backupWeekly || false}
                         onChange={e => setCompany({...company, backupWeekly: e.target.checked})}
                       />
                       <span className="text-sm font-medium text-gray-700">Weekly Backup</span>
                     </label>
                   </div>
                   <div>
                     <label className="text-xs font-bold text-gray-500 uppercase">Time</label>
                     <input 
                       type="time"
                       className="w-full mt-1 px-4 py-2 rounded-xl border border-gray-200 focus:ring-2 focus:ring-blue-500 outline-none disabled:opacity-50 disabled:bg-gray-50"
                       value={company.backupWeeklyTime || '23:00'}
                       onChange={e => setCompany({...company, backupWeeklyTime: e.target.value})}
                       disabled={!company.backupWeekly}
                     />
                   </div>
                   <div>
                     <label className="text-xs font-bold text-gray-500 uppercase">Weekly</label>
                     <select
                       className="w-full mt-1 px-4 py-2 rounded-xl border border-gray-200 focus:ring-2 focus:ring-blue-500 outline-none disabled:opacity-50 disabled:bg-gray-50"
                       value={company.backupWeeklyDay || 'Friday'}
                       onChange={e => setCompany({...company, backupWeeklyDay: e.target.value})}
                       disabled={!company.backupWeekly}
                     >
                       <option value="Sunday">Sunday</option>
                       <option value="Monday">Monday</option>
                       <option value="Tuesday">Tuesday</option>
                       <option value="Wednesday">Wednesday</option>
                       <option value="Thursday">Thursday</option>
                       <option value="Friday">Friday</option>
                       <option value="Saturday">Saturday</option>
                     </select>
                   </div>
                 </div>

                 {/* Monthly Backup */}
                 <div className="grid grid-cols-1 md:grid-cols-3 gap-6 items-end">
                   <div className="flex flex-col justify-end pb-2">
                     <label className="flex items-center gap-2 cursor-pointer">
                       <input 
                         type="checkbox" 
                         className="w-4 h-4 text-blue-600 rounded border-gray-300 focus:ring-blue-500"
                         checked={company.backupMonthly || false}
                         onChange={e => setCompany({...company, backupMonthly: e.target.checked})}
                       />
                       <span className="text-sm font-medium text-gray-700">Monthly Backup</span>
                     </label>
                   </div>
                   <div>
                     <label className="text-xs font-bold text-gray-500 uppercase">Time</label>
                     <input 
                       type="time"
                       className="w-full mt-1 px-4 py-2 rounded-xl border border-gray-200 focus:ring-2 focus:ring-blue-500 outline-none disabled:opacity-50 disabled:bg-gray-50"
                       value={company.backupMonthlyTime || '23:00'}
                       onChange={e => setCompany({...company, backupMonthlyTime: e.target.value})}
                       disabled={!company.backupMonthly}
                     />
                   </div>
                   <div>
                     <label className="text-xs font-bold text-gray-500 uppercase">Monthly</label>
                     <input 
                       type="date"
                       className="w-full mt-1 px-4 py-2 rounded-xl border border-gray-200 focus:ring-2 focus:ring-blue-500 outline-none disabled:opacity-50 disabled:bg-gray-50"
                       value={company.backupMonthlyDate || ''}
                       onChange={e => setCompany({...company, backupMonthlyDate: e.target.value})}
                       disabled={!company.backupMonthly}
                     />
                   </div>
                 </div>

               </div>
             </div>
             
             <div className="col-span-2 pt-2 flex items-center gap-4">
               <Button type="submit" className="gap-2">
                 <Save size={16} /> Save Changes
               </Button>
               {saveStatus && !saveStatus.includes('Features Updated') && <span className="text-green-600 text-sm font-bold animate-pulse">{saveStatus}</span>}
             </div>
          </form>
        </section>

        {/* 1.5 App Module Features (Staff Admin) */}
        <section className="glass-panel p-6 rounded-2xl border border-gray-200">
           <div className="flex items-center gap-3 mb-6 pb-4 border-b border-gray-100">
              <div className="w-10 h-10 bg-indigo-100 text-indigo-600 rounded-xl flex items-center justify-center">
                <LayoutDashboard size={20} />
              </div>
              <div>
                <h3 className="font-bold text-lg text-gray-800">App Toggles</h3>
                <p className="text-xs text-gray-500">Enable or disable permitted features for your clinic.</p>
              </div>
           </div>
           
           <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
             {featureOptions.map(opt => {
               const isPermitted = devMasterFlags[opt.key] !== false;
               if (!isPermitted) return null;
               
               const isEnabled = appFeatures[opt.key] !== false;
               
               return (
                 <label 
                    key={opt.key}
                    className={`flex items-center justify-between p-4 rounded-xl border-2 cursor-pointer transition-all ${isEnabled ? 'border-indigo-500 bg-indigo-50/20' : 'border-gray-100 bg-gray-50'}`}
                 >
                    <span className={`text-sm font-bold ${isEnabled ? 'text-indigo-800' : 'text-gray-500'}`}>{opt.label}</span>
                    <div className={`w-12 h-6 rounded-full transition-all relative ${isEnabled ? 'bg-indigo-500' : 'bg-gray-300'}`}>
                      <div className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-all ${isEnabled ? 'left-7' : 'left-1'}`} />
                    </div>
                    <input 
                      type="checkbox" 
                      className="hidden" 
                      checked={isEnabled} 
                      onChange={() => toggleAppFeature(opt.key)}
                    />
                 </label>
               )
             })}
           </div>
           {saveStatus.includes('Features Updated') && (
              <p className="mt-4 text-sm font-bold text-indigo-600 animate-pulse">{saveStatus}</p>
           )}
        </section>

        {/* Data Management Section */}
        <section className="glass-panel p-6 rounded-2xl border border-gray-200">
           <div className="flex items-center gap-3 mb-6 pb-4 border-b border-gray-100">
              <div className="w-10 h-10 bg-emerald-100 text-emerald-600 rounded-xl flex items-center justify-center">
                <Database size={20} />
              </div>
              <div>
                <h3 className="font-bold text-lg text-gray-800">Data Management</h3>
                <p className="text-xs text-gray-500">Export and Restore your system data.</p>
              </div>
           </div>
           
           <div className="grid grid-cols-1 xl:grid-cols-2 gap-8">
              {/* Export / Backup */}
              <div>
                 <h4 className="font-bold text-gray-800 mb-4 flex items-center gap-2"><Download size={16} className="text-blue-500" /> Export / Backup</h4>
                 <div className="space-y-4">
                    <DataRow title="Full System Backup" onCsv={() => handleExport('full', 'csv')} onJson={() => handleExport('full', 'json')} />
                    <div className="flex items-center justify-between p-3 rounded-xl border border-emerald-100 bg-emerald-50 hover:border-emerald-200 transition-colors">
                        <span className="text-sm font-bold text-gray-700">Export All Tables as CSV</span>
                        <button onClick={handleExportAllCsv} className="px-3 py-1 bg-white border border-emerald-200 rounded-lg text-xs font-bold text-emerald-600 hover:bg-emerald-600 hover:text-white transition-colors flex items-center gap-1">
                          <Download size={14} /> Download All (CSV)
                        </button>
                    </div>
                    <DataRow title="Inventory List" onCsv={() => handleExport('inventory', 'csv')} onJson={() => handleExport('inventory', 'json')} />
                    
                    <div className="pt-2">
                       <p className="text-xs font-bold text-gray-400 uppercase mb-3 text-center border-b border-gray-100 pb-2">From Report Center</p>
                       <div className="space-y-4">
                         <DataRow title="Inventory & Stock Reports" onCsv={() => handleExport('stock_reports', 'csv')} onJson={() => handleExport('stock_reports', 'json')} />
                         <DataRow title="Sales & Revenue Reports" onCsv={() => handleExport('sales_reports', 'csv')} onJson={() => handleExport('sales_reports', 'json')} />
                         <DataRow title="Purchase & Supplier Reports" onCsv={() => handleExport('purchase_reports', 'csv')} onJson={() => handleExport('purchase_reports', 'json')} />
                         <DataRow title="Financial & Tax Reports" onCsv={() => handleExport('financial_reports', 'csv')} onJson={() => handleExport('financial_reports', 'json')} />
                       </div>
                    </div>
                 </div>
              </div>

              {/* Restore / Upload */}
              <div>
                 <h4 className="font-bold text-gray-800 mb-4 flex items-center gap-2"><Upload size={16} className="text-emerald-500" /> Restore / Upload</h4>
                 <div className="space-y-4">
                    <DataRowUpload title="Full System" onUpload={(e) => handleImport(e, 'full')} />
                    <DataRowUpload title="Inventory List" onUpload={(e) => handleImport(e, 'inventory')} />
                    
                    <div className="pt-2">
                       <p className="text-xs font-bold text-gray-400 uppercase mb-3 text-center border-b border-gray-100 pb-2">From Report Center</p>
                       <div className="space-y-4">
                         <DataRowUpload title="Inventory & Stock Reports" onUpload={(e) => handleImport(e, 'stock_reports')} />
                         <DataRowUpload title="Sales & Revenue Reports" onUpload={(e) => handleImport(e, 'sales_reports')} />
                         <DataRowUpload title="Purchase & Supplier Reports" onUpload={(e) => handleImport(e, 'purchase_reports')} />
                         <DataRowUpload title="Financial & Tax Reports" onUpload={(e) => handleImport(e, 'financial_reports')} />
                       </div>
                    </div>
                 </div>
              </div>
           </div>
        </section>

        {/* 2. Developer Info & Danger Zone */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
           {/* Developer Info */}
           <section className="glass-panel p-6 rounded-2xl border border-gray-200 flex flex-col h-full">
              <div className="flex items-center gap-3 mb-4">
                 <div className="w-10 h-10 bg-gray-900 text-white rounded-xl flex items-center justify-center">
                   <Code2 size={20} />
                 </div>
                 <h3 className="font-bold text-lg text-gray-800">Developer Info</h3>
              </div>
              
               <div className="flex-1 bg-gray-50 rounded-xl p-5 border border-gray-100 relative overflow-hidden">
                 <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-br from-blue-500/10 to-purple-500/10 rounded-full -mr-10 -mt-10"></div>
                 
                 <h4 className="font-black text-xl text-gray-900 mb-1">Muhammad Asif Anwar</h4>
                 <p className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-6">Full Stack Developer</p>
                 
                 <div className="space-y-3">
                    <div className="flex items-center gap-3 text-sm font-medium text-gray-700">
                      <div className="w-8 h-8 rounded-lg bg-white flex items-center justify-center shadow-sm text-green-500">
                        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" viewBox="0 0 16 16">
                          <path d="M13.601 2.326A7.85 7.85 0 0 0 7.994 0C3.627 0 .068 3.558.064 7.926c-.003 1.396.366 2.76 1.057 3.965L0 16l4.204-1.102a7.9 7.9 0 0 0 3.79.965h.004c4.368 0 7.926-3.558 7.93-7.93A7.9 7.9 0 0 0 13.6 2.326zM7.994 14.521a6.6 6.6 0 0 1-3.356-.92l-.24-.144-2.494.654.666-2.433-.156-.251a6.56 6.56 0 0 1-1.007-3.505c-.004-3.639 2.961-6.6 6.602-6.6a6.59 6.59 0 0 1 4.66 1.937 6.59 6.59 0 0 1 1.93 4.663c-.005 3.64-2.962 6.598-6.605 6.598zm3.628-4.96c-.198-.1-1.176-.58-1.358-.646-.182-.066-.315-.1-.448.1-.133.2-.516.646-.632.78-.116.133-.232.15-.43.05-.198-.1-.84-.31-1.602-.576-.762-.266-1.317-.576-1.442-.71-.125-.134-.48-.522-.48-1.272s.498-1.12.68-1.252c.182-.132.398-.166.53-.166.133 0 .266.002.384.008.125.006.29-.046.448.332.166.39.564 1.393.614 1.493.05.1.082.215.016.348-.066.132-.1.215-.2.315-.098.1-.2.232-.29.314-.1.082-.2.18-.08.384.116.2.53.864 1.134 1.405.78.7 1.442.915 1.64.101.348zm0 0"/>
                        </svg>
                      </div>
                      <a href="https://wa.me/923026834300" target="_blank" rel="noreferrer" className="hover:underline text-gray-700 hover:text-green-600">
                        +92 302 6834300
                      </a>
                    </div>
                    <div className="flex items-center gap-3 text-sm font-medium text-gray-700">
                      <div className="w-8 h-8 rounded-lg bg-white flex items-center justify-center shadow-sm text-blue-600">
                        <Globe size={16} />
                      </div>
                      <a href="https://media-plus1.vercel.app/" target="_blank" rel="noreferrer" className="hover:underline text-gray-700 hover:text-blue-600">
                        Mediaplus
                      </a>
                    </div>
                    <div className="flex items-center gap-3 text-sm font-medium text-gray-700">
                      <div className="w-8 h-8 rounded-lg bg-white flex items-center justify-center shadow-sm text-red-600">
                        <Mail size={16} />
                      </div>
                      <a href="mailto:m.asif.anwar@gmail.com" className="hover:underline text-gray-700 hover:text-red-600">
                        m.asif.anwar@gmail.com
                      </a>
                    </div>
                 </div>
              </div>
           </section>

           {/* Danger Zone */}
           <section className="glass-panel p-6 rounded-2xl border border-red-100 bg-red-50/20 flex flex-col h-full">
              <div className="flex items-center gap-3 mb-4">
                 <div className="w-10 h-10 bg-red-100 text-red-600 rounded-xl flex items-center justify-center">
                   <ShieldAlert size={20} />
                 </div>
                 <h3 className="font-bold text-lg text-gray-800">Danger Zone</h3>
              </div>
              
              <div className="flex-1 flex flex-col justify-between">
                 <p className="text-sm text-gray-600 mb-4 leading-relaxed">
                   Performing a factory reset will permanently delete all local data including medicines, sales history, suppliers, and settings. This action cannot be undone.
                 </p>
                 <Button variant="danger" className="w-full justify-center gap-2" onClick={async () => {
                   const confirmed = await showConfirm("CRITICAL WARNING: Are you sure you want to delete ALL data? This cannot be undone.", "Factory Reset");
                   if(confirmed) {
                     await storageService.resetData();
                     window.location.reload();
                   }
                 }}>
                   <RotateCcw size={18} /> Factory Reset System
                 </Button>
              </div>
           </section>
        </div>

      </div>
    </div>
  );
};

export default Settings;
