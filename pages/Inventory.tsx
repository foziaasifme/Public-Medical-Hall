import React, { useState, useEffect } from 'react';
import { Plus, Search, Edit, Trash, Truck, ArrowUpRight, ArrowDownLeft, Calendar, LayoutGrid, List, Upload } from 'lucide-react';
import { Medicine, StockEntry, User } from '../types';
import { storageService } from '../services/storageService';
import { Button } from '../components/ui/Button';
import { useDialog } from '../DialogContext';
import { MedicineFormModal } from '../components/MedicineFormModal';
import { BulkImportModal } from '../components/BulkImportModal';
import { StockEntryModal } from '../components/StockEntryModal';
import { MedicineCard } from '../components/MedicineCard';
import { clsx } from 'clsx';
import { formatCurrency, LOW_STOCK_THRESHOLD, EXPIRY_WARNING_DAYS, CATEGORIES, UNITS } from '../constants';

interface InventoryProps {
  user: User;
}

const Inventory: React.FC<InventoryProps> = ({ user }) => {
  const { showConfirm } = useDialog();
  const [activeSubTab, setActiveSubTab] = useState<'products' | 'stock'>('products');
  const [viewMode, setViewMode] = useState<'table' | 'grid'>('table');
  
  // --- INVENTORY / PRODUCTS STATE ---
  const [medicines, setMedicines] = useState<Medicine[]>([]);
  const [search, setSearch] = useState('');
  const [limit, setLimit] = useState(50);
  const [filter, setFilter] = useState<'all' | 'shortage' | 'expired' | 'nearExpiry'>('all');
  const [isFormModalOpen, setFormModalOpen] = useState(false);
  const [isBulkImportOpen, setBulkImportOpen] = useState(false);
  const [editingMedicine, setEditingMedicine] = useState<Medicine | null>(null);
  const [stockModalMed, setStockModalMed] = useState<Medicine | null>(null);

  // --- STOCK STATE ---
  const [stockEntries, setStockEntries] = useState<StockEntry[]>([]);
  const [selectedMedId, setSelectedMedId] = useState('');
  const [quantity, setQuantity] = useState(0);
  const [type, setType] = useState<'IN' | 'OUT'>('IN');
  const [reason, setReason] = useState('New Batch');
  const [batch, setBatch] = useState('');
  const [stockHistoryFilter, setStockHistoryFilter] = useState<'today' | 'all'>('all');
  const [stockHistoryLimit, setStockHistoryLimit] = useState(50);
  const [stockMedSearch, setStockMedSearch] = useState('');
  const [stockPurchasePrice, setStockPurchasePrice] = useState(0);

  // Initial Load & Permissions Check
  useEffect(() => {
    refreshData();
    // Default to available tab if permission for current is missing
    if (!user.permissions.inventory && user.permissions.stock) {
      setActiveSubTab('stock');
    }

    // Check for filter intent from Dashboard
    const intent = localStorage.getItem('INVENTORY_FILTER_INTENT');
    if (intent === 'shortage' || intent === 'expired' || intent === 'nearExpiry') {
      setFilter(intent);
      localStorage.removeItem('INVENTORY_FILTER_INTENT');
    }

    // External triggers (Shortcuts)
    const handleOpenForm = () => {
      setEditingMedicine(null);
      setFormModalOpen(true);
    };
    const handleOpenBulk = () => setBulkImportOpen(true);

    window.addEventListener('inventory_open_form', handleOpenForm);
    window.addEventListener('inventory_open_bulk', handleOpenBulk);

    return () => {
      window.removeEventListener('inventory_open_form', handleOpenForm);
      window.removeEventListener('inventory_open_bulk', handleOpenBulk);
    };
  }, [user]);

  const refreshData = async () => {
    const [meds, entries] = await Promise.all([
      storageService.getMedicines(),
      storageService.getStockEntries()
    ]);
    setMedicines(meds);
    setStockEntries([...entries].reverse());
  };

  // --- PRODUCT LOGIC ---
  const filteredMedicines = React.useMemo(() => {
    const s = search.toLowerCase().trim();
    return medicines.filter(m => {
      const matchesSearch = 
        !s ||
        m.name.toLowerCase().includes(s) ||
        m.genericName.toLowerCase().includes(s) ||
        (m.batchNumber && m.batchNumber.toLowerCase().includes(s)) ||
        (m.rackNo && m.rackNo.toLowerCase().includes(s)) ||
        (m.brandName && m.brandName.toLowerCase().includes(s));
      
      if (!matchesSearch) return false;

      if (filter === 'shortage') {
        return m.stock <= (m.minStock || LOW_STOCK_THRESHOLD) && m.stock > 0;
      }
      if (filter === 'expired') {
        return new Date(m.expiryDate) < new Date();
      }
      if (filter === 'nearExpiry') {
        const expiryDate = new Date(m.expiryDate);
        const diffTime = expiryDate.getTime() - new Date().getTime();
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
        return diffDays <= EXPIRY_WARNING_DAYS && diffDays > 0;
      }

      return true;
    });
  }, [medicines, search, filter]);

  const pagedMedicines = React.useMemo(() => {
    return filteredMedicines.slice(0, limit);
  }, [filteredMedicines, limit]);

  const handleAddNewProduct = () => {
    setEditingMedicine(null);
    setFormModalOpen(true);
  };

  const handleEditProduct = (med: Medicine) => {
    setEditingMedicine(med);
    setFormModalOpen(true);
  };

  const handleDeleteProduct = async (id: string) => {
    const confirmed = await showConfirm("Are you sure you want to delete this medicine?", "Delete Medicine");
    if(confirmed) {
      const updated = medicines.filter(m => m.id !== id);
      await storageService.saveMedicines(updated);
      refreshData();
    }
  };

  const handleSaveProduct = async (med: Medicine) => {
    let updatedList;
    if (editingMedicine) {
      updatedList = medicines.map(m => m.id === med.id ? med : m);
    } else {
      updatedList = [med, ...medicines];
    }
    await storageService.saveMedicines(updatedList);
    refreshData();
  };

  // --- BULK IMPORT LOGIC ---
  const handleBulkImport = async (parsedData: Partial<Medicine>[]) => {
    const list = [...medicines];
    
    parsedData.forEach(item => {
      // Find duplicate by name or by provided ID
      const existingIdx = list.findIndex(m => 
        (item.id && m.id === item.id) || 
        (m.name.toLowerCase().trim() === item.name?.toLowerCase().trim())
      );
      
      if (existingIdx >= 0) {
        // Update existing (maybe just Add stock and update prices)
        const existing = list[existingIdx];
        list[existingIdx] = {
          ...existing,
          stock: existing.stock + (Number(item.stock) || 0),
          purchasePrice: item.purchasePrice ? Number(item.purchasePrice) : existing.purchasePrice,
          salePrice: item.salePrice ? Number(item.salePrice) : existing.salePrice,
          category: item.category ? String(item.category).trim() : existing.category,
          batchNumber: item.batchNumber || existing.batchNumber,
          expiryDate: item.expiryDate || existing.expiryDate,
          brandName: item.brandName || existing.brandName,
          modelName: item.modelName || existing.modelName,
          rackNo: item.rackNo || existing.rackNo,
          minStock: item.minStock !== undefined ? Number(item.minStock) : existing.minStock,
          genericName: item.genericName || existing.genericName
        };
      } else {
        // Create new
        // Helper for flexible matching
        const findMatch = (val: string | undefined, options: string[], fallback: string) => {
          if (!val) return fallback;
          const normalized = val.toLowerCase().trim();
          // Precise match
          const match = options.find(o => o.toLowerCase() === normalized);
          if (match) return match;
          
          // Fuzzy match for common pharmaceutical terms
          if (options === UNITS) {
            if (normalized === 'tab' || normalized === 'tabl') return 'Tablet';
            if (normalized === 'str') return 'Strip';
            if (normalized === 'box' || normalized === 'bx' || normalized === 'pack') return 'Box';
            if (normalized === 'bot' || normalized === 'btl') return 'Bottle';
            if (normalized === 'inj') return 'Injection';
            if (normalized === 'vial') return 'Vial';
            if (normalized === 'amp' || normalized === 'ampoule') return 'Ampoule';
            if (normalized === 'inh' || normalized === 'inhaler') return 'Inhaler';
            if (normalized === 'tub' || normalized === 'tube' || normalized === 'cream') return 'Tube';
          }
          return fallback;
        };

        const newDoc: Medicine = {
          id: item.id || (Date.now().toString() + Math.random().toString(36).substr(2, 5)),
          name: item.name || 'Unnamed',
          genericName: item.genericName || '',
          category: item.category ? String(item.category).trim() : 'General',
          brandName: item.brandName || '',
          modelName: item.modelName || '',
          rackNo: item.rackNo || '',
          minStock: Number(item.minStock) || 10,
          unit: findMatch(item.unit as string, UNITS, 'Box') as any,
          purchasePrice: Number(item.purchasePrice) || 0,
          salePrice: Number(item.salePrice) || 0,
          stock: Number(item.stock) || 0,
          expiryDate: item.expiryDate || new Date().toISOString().split('T')[0],
          batchNumber: item.batchNumber || ''
        };
        list.push(newDoc);
      }
    });

    await storageService.saveMedicines(list);
    await refreshData();
  };

  // --- STOCK LOGIC ---
  const filteredStockEntries = React.useMemo(() => {
    return stockEntries.filter(e => {
      const matchesSearch = !stockMedSearch || e.medicineName.toLowerCase().includes(stockMedSearch.toLowerCase());
      if (!matchesSearch) return false;

      if (stockHistoryFilter === 'today') {
        return new Date(e.date).toDateString() === new Date().toDateString();
      }
      return true;
    });
  }, [stockEntries, stockHistoryFilter, stockMedSearch]);

  const pagedStockEntries = React.useMemo(() => {
    return filteredStockEntries.slice(0, stockHistoryLimit);
  }, [filteredStockEntries, stockHistoryLimit]);

  const handleStockSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedMedId || quantity <= 0) return;

    const med = medicines.find(m => m.id === selectedMedId);
    if (!med) return;

    const entry: StockEntry = {
      id: Date.now().toString(),
      date: new Date().toISOString(),
      medicineId: med.id,
      medicineName: med.name,
      quantity,
      type,
      reason,
      batchNumber: type === 'IN' ? (batch || med.batchNumber) : undefined,
      purchasePrice: type === 'IN' ? stockPurchasePrice : undefined
    };

    await storageService.addStockEntry(entry);
    refreshData();
    
    // Reset Form
    setQuantity(0);
    setBatch('');
    setStockMedSearch('');
    setSelectedMedId('');
    setStockPurchasePrice(0);
  };

  return (
    <div className="h-full flex flex-col pt-2" style={{ marginTop: '-20px' }}>
      {/* Tab Header */}
      <div className="flex flex-col md:flex-row justify-between items-center mb-6 gap-4">
        <div>
          <h2 className="text-2xl font-bold text-gray-800">Inventory & Stock</h2>
          <p className="text-gray-500 text-sm">Manage products and stock movements.</p>
        </div>
      </div>
      
      {/* Summary Metrics */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6" style={{ marginBottom: '12px', marginTop: '-12px' }}>
        <div className="bg-white p-4 rounded-2xl border border-gray-100 shadow-sm">
          <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1">Total Products</p>
          <div className="flex items-end justify-between">
            <h3 className="text-xl font-black text-gray-900">{medicines.length}</h3>
            <span className="text-[10px] text-medical-blue font-bold px-1.5 py-0.5 bg-blue-50 rounded">SKUs</span>
          </div>
        </div>
        <div className="bg-white p-4 rounded-2xl border border-gray-100 shadow-sm">
          <p className="text-[10px] font-bold text-orange-400 uppercase tracking-wider mb-1">Shortage</p>
          <div className="flex items-end justify-between">
             <h3 className="text-xl font-black text-orange-600">{medicines.filter(m => m.stock <= (m.minStock || LOW_STOCK_THRESHOLD) && m.stock > 0).length}</h3>
             <button onClick={() => setFilter('shortage')} className="text-[10px] text-orange-600 hover:underline font-bold">View List</button>
          </div>
        </div>
        <div className="bg-white p-4 rounded-2xl border border-gray-100 shadow-sm">
          <p className="text-[10px] font-bold text-red-400 uppercase tracking-wider mb-1">Expired</p>
          <div className="flex items-end justify-between">
             <h3 className="text-xl font-black text-red-600">{medicines.filter(m => new Date(m.expiryDate) < new Date()).length}</h3>
             <button onClick={() => setFilter('expired')} className="text-[10px] text-red-600 hover:underline font-bold">View List</button>
          </div>
        </div>
        <div className="bg-white p-4 rounded-2xl border border-gray-100 shadow-sm">
          <p className="text-[10px] font-bold text-teal-400 uppercase tracking-wider mb-1">Inventory Value</p>
          <div className="flex items-end justify-between">
             <h3 className="text-xl font-black text-teal-700">
               {medicines.reduce((acc, m) => acc + (m.purchasePrice * m.stock), 0).toLocaleString()}
             </h3>
             <span className="text-[10px] text-teal-600 font-bold uppercase">Rs.</span>
          </div>
        </div>
      </div>

      {/* --- PRODUCTS VIEW --- */}
      {activeSubTab === 'products' && user.permissions.inventory && (
        <>
          <div className="flex flex-col md:flex-row items-center gap-3 mb-4">
            <div className="relative flex-1 w-full md:max-w-md">
               <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4" />
               <input 
                 type="text" 
                 placeholder="Search inventory..." 
                 className="w-full pl-9 pr-4 py-2.5 rounded-xl border border-gray-200 text-sm focus:ring-2 focus:ring-medical-blue outline-none shadow-sm"
                 value={search}
                 onChange={(e) => setSearch(e.target.value)}
               />
            </div>

            <div className="flex bg-white border border-gray-200 p-1 rounded-xl shadow-sm self-start">
              <button 
                onClick={() => setFilter('all')}
                className={clsx(
                  "px-4 py-1.5 rounded-lg text-xs font-bold transition-all",
                  filter === 'all' ? "bg-medical-blue text-white shadow-sm" : "text-gray-500 hover:text-gray-900"
                )}
              >
                All
              </button>
              <button 
                onClick={() => setFilter('shortage')}
                className={clsx(
                  "px-4 py-1.5 rounded-lg text-xs font-bold transition-all",
                  filter === 'shortage' ? "bg-orange-500 text-white shadow-sm" : "text-gray-500 hover:text-orange-600"
                )}
              >
                Shortage
              </button>
              <button 
                onClick={() => setFilter('expired')}
                className={clsx(
                  "px-4 py-1.5 rounded-lg text-xs font-bold transition-all",
                  filter === 'expired' ? "bg-red-500 text-white shadow-sm" : "text-gray-500 hover:text-red-600"
                )}
              >
                Expired
              </button>
              <button 
                onClick={() => setFilter('nearExpiry')}
                className={clsx(
                  "px-4 py-1.5 rounded-lg text-xs font-bold transition-all",
                  filter === 'nearExpiry' ? "bg-teal-500 text-white shadow-sm" : "text-gray-500 hover:text-teal-600"
                )}
              >
                Near Expiry
              </button>
            </div>

            <div className="flex bg-white border border-gray-200 p-1 rounded-xl shadow-sm self-start">
              <button 
                onClick={() => setViewMode('table')}
                className={clsx(
                  "p-1.5 rounded-lg transition-all",
                  viewMode === 'table' ? "bg-gray-100 text-medical-blue shadow-inner" : "text-gray-400 hover:text-gray-600"
                )}
                title="Table View"
              >
                <List size={18} />
              </button>
              <button 
                onClick={() => setViewMode('grid')}
                className={clsx(
                  "p-1.5 rounded-lg transition-all",
                  viewMode === 'grid' ? "bg-gray-100 text-medical-blue shadow-inner" : "text-gray-400 hover:text-gray-600"
                )}
                title="Grid View"
              >
                <LayoutGrid size={18} />
              </button>
            </div>

            <div className="flex gap-2 w-full md:w-auto ml-auto">
              <Button onClick={() => setBulkImportOpen(true)} variant="outline" className="gap-2 shrink-0">
                <Upload size={18} /> Bulk Import
              </Button>
              <Button onClick={handleAddNewProduct} className="gap-2 shadow-lg shadow-blue-500/30 whitespace-nowrap">
                <Plus size={18} /> New SKU
              </Button>
            </div>
          </div>

          <div className="flex-1 overflow-y-auto pr-2 pb-20">
            {viewMode === 'table' ? (
              <div className="bg-white rounded-xl border border-gray-200 overflow-hidden shadow-sm">
                  <table className="w-full text-left">
                    <thead className="bg-gray-50 border-b border-gray-200 sticky top-0 z-10 w-full">
                      <tr className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">
                        <th className="px-3 py-2">ID/Batch</th>
                        <th className="px-3 py-2">Name</th>
                        <th className="px-3 py-2">Generic (Salt)</th>
                        <th className="px-3 py-2 text-center">Category</th>
                        <th className="px-3 py-2 text-center">Brand-Name</th>
                        <th className="px-3 py-2 text-center">Model</th>
                        <th className="px-3 py-2 text-center">Rack No.</th>
                        <th className="px-3 py-2 text-center">Stock</th>
                        <th className="px-3 py-2 text-center">Min-Stock</th>
                        <th className="px-3 py-2 text-center">Unit</th>
                        <th className="px-3 py-2 text-right">Cost Price</th>
                        <th className="px-3 py-2 text-right">Sale Price</th>
                        <th className="px-3 py-2 text-center">Expiry</th>
                        <th className="px-3 py-2 text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                      {pagedMedicines.length === 0 && (
                        <tr>
                          <td colSpan={14} className="py-20 text-center text-gray-400">
                            No medicines found matching your search.
                          </td>
                        </tr>
                      )}
                      {pagedMedicines.map(med => {
                        const isExpired = new Date(med.expiryDate) < new Date();
                        return (
                          <tr 
                            key={med.id} 
                            onClick={() => { if(user.permissions.stock) setStockModalMed(med); }}
                            className={clsx("hover:bg-blue-50/30 transition-colors group cursor-pointer", isExpired && "bg-red-50/30")}
                          >
                            <td className="px-3 py-2 text-xs">
                               <div className="font-mono text-[10px] text-gray-400">#{med.id.slice(-4)}</div>
                               <div className={clsx("font-bold", isExpired ? "text-red-600" : "text-gray-900")}>
                                 {med.batchNumber || 'N/A'}
                               </div>
                            </td>
                            <td className="px-3 py-2">
                              <div className="font-bold text-gray-800 text-sm whitespace-nowrap">{med.name}</div>
                            </td>
                            <td className="px-3 py-2">
                              <div className="text-xs text-gray-500 max-w-[120px] truncate" title={med.genericName}>{med.genericName}</div>
                            </td>
                            <td className="px-3 py-2 text-center">
                              <span className="inline-block px-1.5 py-0.5 bg-gray-100 text-gray-600 rounded text-[10px] font-medium whitespace-nowrap">
                                {med.category}
                              </span>
                            </td>
                            <td className="px-3 py-2 text-center text-xs text-gray-500 whitespace-nowrap">
                              {med.brandName || '-'}
                            </td>
                            <td className="px-3 py-2 text-center text-xs text-gray-500 whitespace-nowrap">
                              {med.modelName || '-'}
                            </td>
                            <td className="px-3 py-2 text-center text-xs text-gray-500 whitespace-nowrap">
                              {med.rackNo ? <span className="p-1 bg-gray-100 rounded font-bold">{med.rackNo}</span> : '-'}
                            </td>
                            <td className="px-3 py-2 text-center">
                              <div className={clsx("text-sm font-black", med.stock <= (med.minStock || LOW_STOCK_THRESHOLD) ? "text-red-600" : "text-gray-700")}>
                                {med.stock}
                              </div>
                            </td>
                            <td className="px-3 py-2 text-center">
                              <div className="text-xs font-bold text-gray-400">
                                {med.minStock || LOW_STOCK_THRESHOLD}
                              </div>
                            </td>
                            <td className="px-3 py-2 text-center">
                               <span className="text-[10px] font-bold text-gray-400 uppercase">{med.unit}</span>
                            </td>
                            <td className="px-3 py-2 text-right font-medium text-gray-600 text-sm whitespace-nowrap">
                              {formatCurrency(med.purchasePrice)}
                            </td>
                            <td className="px-3 py-2 text-right font-bold text-gray-900 text-sm whitespace-nowrap">
                              {formatCurrency(med.salePrice)}
                            </td>
                            <td className="px-3 py-2 text-center text-xs whitespace-nowrap">
                              <div className={clsx("font-bold", isExpired ? "text-red-600 animate-pulse" : "text-gray-500")}>
                                {new Date(med.expiryDate).toLocaleDateString()}
                              </div>
                            </td>
                            <td className="px-3 py-2 text-right">
                               <div className="flex items-center justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                 <button 
                                   onClick={(e) => { e.stopPropagation(); handleEditProduct(med); }} 
                                   className="p-1.5 text-blue-600 hover:bg-blue-100 rounded-lg transition-colors"
                                   title="Edit"
                                 >
                                   <Edit size={14} />
                                 </button>
                                 <button 
                                   onClick={(e) => { e.stopPropagation(); handleDeleteProduct(med.id); }} 
                                   className="p-1.5 text-red-600 hover:bg-red-100 rounded-lg transition-colors"
                                   title="Delete"
                                 >
                                   <Trash size={14} />
                                 </button>
                               </div>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                  {filteredMedicines.length > limit && (
                    <div className="p-4 bg-gray-50 border-t border-gray-100 flex justify-center">
                      <Button variant="outline" size="sm" onClick={() => setLimit(prev => prev + 50)}>
                        Load More Medicines (+50)
                      </Button>
                    </div>
                  )}
              </div>
            ) : (
              <div className="flex flex-col gap-6">
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                  {pagedMedicines.length === 0 && (
                    <div className="col-span-full py-20 text-center text-gray-400">
                      No medicines found matching your search.
                    </div>
                  )}
                  {pagedMedicines.map(med => (
                    <div key={med.id} onClick={() => { if(user.permissions.stock) setStockModalMed(med); }} className="cursor-pointer">
                      <MedicineCard 
                        medicine={med}
                        inventoryMode={true}
                        actionSlot={
                          <div className="flex items-center gap-1">
                            <button 
                              onClick={(e) => { e.stopPropagation(); handleEditProduct(med); }} 
                              className="p-2 text-blue-600 hover:bg-blue-50 rounded-xl transition-colors ring-1 ring-blue-100"
                              title="Edit"
                            >
                              <Edit size={16} />
                            </button>
                            <button 
                              onClick={(e) => { e.stopPropagation(); handleDeleteProduct(med.id); }} 
                              className="p-2 text-red-600 hover:bg-red-50 rounded-xl transition-colors ring-1 ring-red-100"
                              title="Delete"
                            >
                              <Trash size={16} />
                            </button>
                          </div>
                        }
                      />
                    </div>
                  ))}
                </div>
                {filteredMedicines.length > limit && (
                  <div className="flex justify-center pb-10">
                    <Button variant="outline" onClick={() => setLimit(prev => prev + 50)}>
                      Load More Medicines (+50)
                    </Button>
                  </div>
                )}
              </div>
            )}
          </div>
          
          <MedicineFormModal 
            isOpen={isFormModalOpen}
            onClose={() => setFormModalOpen(false)}
            onSave={handleSaveProduct}
            initialData={editingMedicine}
            medicines={medicines}
            onOpenBulkImport={() => {
              setFormModalOpen(false);
              setBulkImportOpen(true);
            }}
          />

          <BulkImportModal 
            isOpen={isBulkImportOpen}
            onClose={() => setBulkImportOpen(false)}
            onImport={handleBulkImport}
          />
          
          <StockEntryModal
            isOpen={!!stockModalMed}
            onClose={() => setStockModalMed(null)}
            medicine={stockModalMed}
            onSuccess={refreshData}
          />
        </>
      )}

      {/* --- STOCK VIEW --- */}
      {activeSubTab === 'stock' && user.permissions.stock && (
        <div className="h-full flex flex-col lg:flex-row gap-6">
           {/* Left: Entry Form */}
           <div className="w-full lg:w-80 flex flex-col gap-4 shrink-0 overflow-y-auto pb-4">
             <div className="glass-panel p-6 rounded-xl border border-gray-200">
               <div className="flex items-center gap-2 mb-4 text-medical-blue">
                 <Truck size={24} />
                 <h2 className="text-lg font-bold">Stock Entry</h2>
               </div>

               <form onSubmit={handleStockSubmit} className="space-y-4">
                 <div>
                   <label className="text-xs font-semibold text-gray-500 uppercase">Action Type</label>
                   <div className="flex gap-2 mt-1">
                     <button type="button" onClick={() => { setType('IN'); setReason('New Batch'); }} className={clsx("flex-1 py-2 rounded-lg text-sm font-medium border transition-colors", type === 'IN' ? "bg-green-50 border-green-200 text-green-700" : "bg-gray-50 border-gray-200 text-gray-500")}>Stock In</button>
                     <button type="button" onClick={() => { setType('OUT'); setReason('Expired'); }} className={clsx("flex-1 py-2 rounded-lg text-sm font-medium border transition-colors", type === 'OUT' ? "bg-red-50 border-red-200 text-red-700" : "bg-gray-50 border-gray-200 text-gray-500")}>Stock Out</button>
                   </div>
                 </div>

                 <div className="relative">
                   <label className="text-xs font-semibold text-gray-500 uppercase">Select Medicine</label>
                   <div className="relative mt-1">
                     <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4" />
                     <input 
                       type="text"
                       placeholder="Search medicines..."
                       className="w-full pl-9 pr-3 py-2 rounded-lg border border-gray-200 text-sm focus:ring-2 focus:ring-medical-blue outline-none"
                       value={stockMedSearch}
                       onChange={(e) => {
                         setStockMedSearch(e.target.value);
                         if(selectedMedId) setSelectedMedId('');
                       }}
                     />
                   </div>
                   
                   {stockMedSearch && !selectedMedId && (
                     <div className="absolute z-50 w-full mt-1 bg-white border border-gray-200 rounded-lg shadow-xl max-h-48 overflow-y-auto">
                       {medicines
                         .filter(m => 
                           m.name.toLowerCase().includes(stockMedSearch.toLowerCase()) || 
                           m.genericName.toLowerCase().includes(stockMedSearch.toLowerCase())
                         )
                         .map(m => (
                           <div 
                             key={m.id}
                             className="px-4 py-2 hover:bg-blue-50 cursor-pointer text-sm border-b border-gray-50 last:border-0"
                             onClick={() => {
                               setSelectedMedId(m.id);
                               setStockMedSearch(m.name);
                               setBatch(m.batchNumber || '');
                               if(type === 'IN') setStockPurchasePrice(m.purchasePrice);
                             }}
                           >
                             <div className="font-bold">{m.name}</div>
                             <div className="text-[10px] text-gray-500 truncate">{m.genericName} • Stock: {m.stock}</div>
                           </div>
                         ))
                       }
                     </div>
                   )}
                   
                   {selectedMedId && (
                     <div className="mt-1 flex justify-between items-center bg-blue-50 px-3 py-1 rounded-md border border-blue-100">
                       <span className="text-[10px] font-bold text-blue-700">✓ {medicines.find(m => m.id === selectedMedId)?.name}</span>
                       <button 
                         type="button" 
                         onClick={() => { setSelectedMedId(''); setStockMedSearch(''); setStockPurchasePrice(0); }}
                         className="text-red-400 hover:text-red-600"
                       >
                         <Trash size={12} />
                       </button>
                     </div>
                   )}
                 </div>

                 <div>
                   <label className="text-xs font-semibold text-gray-500 uppercase">Quantity</label>
                   <input 
                     type="number" 
                     min="1"
                     className="w-full mt-1 px-3 py-2 rounded-lg border border-gray-200 text-sm focus:ring-2 focus:ring-medical-blue outline-none"
                     value={quantity || ''}
                     onChange={(e) => setQuantity(parseInt(e.target.value))}
                     required
                   />
                 </div>

                 {type === 'IN' && (
                   <div>
                     <label className="text-xs font-semibold text-gray-500 uppercase">Purchase Price</label>
                     <input 
                       type="number" 
                       step="0.01"
                       className="w-full mt-1 px-3 py-2 rounded-lg border border-gray-200 text-sm focus:ring-2 focus:ring-medical-blue outline-none"
                       value={stockPurchasePrice || ''}
                       onChange={(e) => setStockPurchasePrice(parseFloat(e.target.value))}
                       placeholder="Current Price"
                     />
                   </div>
                 )}

                 {type === 'IN' ? (
                    <div>
                       <label className="text-xs font-semibold text-gray-500 uppercase">Batch Number</label>
                       <input 
                         type="text" 
                         className="w-full mt-1 px-3 py-2 rounded-lg border border-gray-200 text-sm focus:ring-2 focus:ring-medical-blue outline-none"
                         value={batch}
                         onChange={(e) => setBatch(e.target.value)}
                         placeholder="e.g. B-202X"
                       />
                    </div>
                 ) : (
                    <div>
                       <label className="text-xs font-semibold text-gray-500 uppercase">Reason</label>
                       <select 
                         className="w-full mt-1 px-3 py-2 rounded-lg border border-gray-200 text-sm focus:ring-2 focus:ring-medical-blue outline-none"
                         value={reason}
                         onChange={(e) => setReason(e.target.value)}
                       >
                         <option value="Expired">Expired</option>
                         <option value="Damaged">Damaged</option>
                         <option value="Lost">Lost/Stolen</option>
                       </select>
                    </div>
                 )}

                 <Button type="submit" className="w-full mt-2" variant={type === 'IN' ? 'primary' : 'danger'}>
                   {type === 'IN' ? 'Add Stock' : 'Remove Stock'}
                 </Button>
               </form>
             </div>
           </div>

           {/* Right: History Log */}
           <div className="flex-1 glass-panel rounded-xl border border-gray-200 overflow-hidden flex flex-col min-h-[400px]">
             <div className="p-4 border-b border-gray-100 bg-gray-50/50 flex justify-between items-center">
               <h3 className="font-semibold text-gray-700">Recent Movements</h3>
               <div className="flex bg-white border border-gray-200 p-1 rounded-lg shadow-sm">
                 <div className="px-3 py-1 text-[10px] font-bold text-blue-600 border-r border-gray-100 mr-1">
                   {filteredStockEntries.length} Records
                 </div>
                 <button 
                   onClick={() => setStockHistoryFilter('all')}
                   className={clsx(
                     "px-3 py-1 rounded-md text-[10px] font-bold transition-all",
                     stockHistoryFilter === 'all' ? "bg-gray-100 text-gray-900 shadow-sm" : "text-gray-400 hover:text-gray-600"
                   )}
                 >
                   All
                 </button>
                 <button 
                   onClick={() => setStockHistoryFilter('today')}
                   className={clsx(
                     "px-3 py-1 rounded-md text-[10px] font-bold transition-all",
                     stockHistoryFilter === 'today' ? "bg-medical-blue text-white shadow-sm" : "text-gray-400 hover:text-medical-blue"
                   )}
                 >
                   Today
                 </button>
               </div>
             </div>
             <div className="overflow-auto flex-1 pb-10">
               <div className="p-4 bg-gray-50 flex justify-center border-b border-gray-100">
                  <span className="text-[10px] font-bold text-gray-400 uppercase tracking-[0.2em]">Showing {pagedStockEntries.length} of {filteredStockEntries.length} Records</span>
               </div>
               <table className="w-full text-left min-w-[600px]">
                 <thead className="bg-white sticky top-0">
                   <tr className="text-xs font-bold text-gray-400 uppercase border-b border-gray-100">
                     <th className="p-4">Date</th>
                     <th className="p-4">Type</th>
                     <th className="px-4 py-3 text-left">Medicine Info</th>
                     <th className="p-4 text-center">Qty</th>
                     <th className="p-4">Reason / Batch</th>
                   </tr>
                 </thead>
                 <tbody className="divide-y divide-gray-50">
                    {stockEntries.filter(e => {
                      if (stockHistoryFilter === 'today') {
                        return new Date(e.date).toDateString() === new Date().toDateString();
                      }
                      return true;
                    }).length === 0 && (
                      <tr><td colSpan={5} className="p-8 text-center text-gray-400">No stock history available</td></tr>
                    )}
                    {stockEntries
                      .filter(e => {
                        if (stockHistoryFilter === 'today') {
                          return new Date(e.date).toDateString() === new Date().toDateString();
                        }
                        return true;
                      })
                      .map(entry => (
                      <tr key={entry.id} className="hover:bg-blue-50/20 group transition-colors">
                        <td className="px-4 py-3">
                          <div className="text-xs font-bold text-gray-700">{new Date(entry.date).toLocaleDateString()}</div>
                          <div className="text-[10px] text-gray-400">{new Date(entry.date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</div>
                        </td>
                        <td className="px-4 py-3">
                           <span className={clsx(
                             "inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-black uppercase border",
                             entry.type === 'IN' ? "bg-green-50 text-green-700 border-green-100" : "bg-red-50 text-red-700 border-red-100"
                           )}>
                             {entry.type === 'IN' ? <ArrowDownLeft size={10}/> : <ArrowUpRight size={10}/>}
                             {entry.type}
                           </span>
                        </td>
                        <td className="px-4 py-3">
                           <div className="text-sm font-black text-gray-800 leading-tight">{entry.medicineName}</div>
                           {med && <div className="text-[10px] text-gray-400 font-medium uppercase tracking-wider">{med.category} • {med.unit}</div>}
                        </td>
                        <td className="px-4 py-3 text-center">
                           <div className={clsx("text-sm font-black", entry.type === 'IN' ? "text-green-600" : "text-red-600")}>
                             {entry.type === 'IN' ? '+' : '-'}{entry.quantity}
                           </div>
                        </td>
                        <td className="px-4 py-3 text-right font-bold text-gray-700 text-sm">
                           {entry.purchasePrice ? `Rs. ${entry.purchasePrice.toLocaleString()}` : '-'}
                        </td>
                        <td className="px-4 py-3">
                           {entry.type === 'IN' ? (
                             <div className="flex flex-col gap-1">
                               <span className="font-mono bg-blue-50 text-blue-600 px-2 py-0.5 rounded text-[10px] font-bold border border-blue-100 inline-block w-fit">BATCH: {entry.batchNumber || 'N/A'}</span>
                               <span className="text-[10px] text-gray-400 italic">{entry.reason}</span>
                             </div>
                           ) : (
                             <span className="text-[10px] font-bold text-red-500 uppercase px-2 py-0.5 bg-red-50 rounded border border-red-100">{entry.reason}</span>
                           )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
               </table>
               {filteredStockEntries.length > stockHistoryLimit && (
                 <div className="p-4 bg-gray-50 border-t border-gray-100 flex justify-center">
                   <Button variant="outline" size="sm" onClick={() => setStockHistoryLimit(prev => prev + 50)}>
                     Load More History (+50)
                   </Button>
                 </div>
               )}
             </div>
           </div>
        </div>
      )}
    </div>
  );
};

export default Inventory;
