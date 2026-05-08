import React, { useState, useEffect, useMemo } from 'react';
import { Search, ShoppingCart, Trash2, Plus, Minus, CreditCard, Banknote, FileText, X, ChevronRight, Package2, User, Phone, ChevronUp, Pill } from 'lucide-react';
import { Medicine, CartItem, Sale, Patient } from '../types';
import { Tab } from '../types';
import { MedicineCard } from '../components/MedicineCard';
import { Button } from '../components/ui/Button';
import { InvoiceModal } from '../components/InvoiceModal';
import { storageService } from '../services/storageService';
import { CURRENCY, CATEGORIES, UNITS, formatCurrency } from '../constants';
import { clsx } from 'clsx';
import { useDialog } from '../DialogContext';

interface CounterProps {
  setActiveTab: (tab: Tab) => void;
}

const Counter: React.FC<CounterProps> = ({ setActiveTab }) => {
  const { showAlert } = useDialog();
  const [medicines, setMedicines] = useState<Medicine[]>([]);
  const [search, setSearch] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [selectedUnit, setSelectedUnit] = useState('All');
  
  const [cart, setCart] = useState<CartItem[]>([]);
  const [paymentMethod, setPaymentMethod] = useState<'Cash' | 'Credit'>('Cash');
  const [patients, setPatients] = useState<Patient[]>([]);
  const [customerName, setCustomerName] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');
  const [customerId, setCustomerId] = useState('');
  
  const [customerSearch, setCustomerSearch] = useState('');
  const [isCustomerDropdownOpen, setIsCustomerDropdownOpen] = useState(false);
  const [discountAmount, setDiscountAmount] = useState<number>(0);
  const [taxRate, setTaxRate] = useState<number>(0);
  
  // Mobile Cart State
  const [isMobileCartOpen, setIsMobileCartOpen] = useState(false);

  const [lastSale, setLastSale] = useState<Sale | null>(null);
  const [showInvoice, setShowInvoice] = useState(false);

  // Unit Selection Modal State
  const [selectedMedForUnit, setSelectedMedForUnit] = useState<Medicine | null>(null);
  
  const [appFeatures, setAppFeatures] = useState<any>(null);

  // Load initial data
  const loadData = async () => {
    const featureFlags = localStorage.getItem('APP_FEATURE_FLAGS');
    if (featureFlags) setAppFeatures(JSON.parse(featureFlags));

    const [meds, pats, settings] = await Promise.all([
      storageService.getMedicines(),
      storageService.getPatients(),
      storageService.getCompanySettings()
    ]);
    setMedicines(meds);
    setPatients(pats);
    setTaxRate(settings.taxRate || 0);
  };

  useEffect(() => {
    loadData();

    // Initial cart load
    setCart(storageService.getCart());

    // Listen for cart updates from other places (like the Prescription Scanner in the header)
    const handleCartUpdate = (e: any) => {
      setCart(e.detail);
    };

    window.addEventListener('cart-updated', handleCartUpdate);
    return () => window.removeEventListener('cart-updated', handleCartUpdate);
  }, []);

  const filteredMedicines = useMemo(() => {
    const term = search.toLowerCase();
    const today = new Date();
    today.setHours(0,0,0,0);

    return medicines.filter(m => {
      // 1. Expiry Check - Hide Expired Items
      const expiry = new Date(m.expiryDate);
      if (expiry < today) return false; 

      // 2. Search
      const matchesSearch = 
        m.name.toLowerCase().includes(term) || 
        m.genericName.toLowerCase().includes(term);

      // 3. Filters
      const matchesCategory = selectedCategory === 'All' || m.category === selectedCategory;
      const matchesUnit = selectedUnit === 'All' || m.unit === selectedUnit;

      return matchesSearch && matchesCategory && matchesUnit;
    });
  }, [medicines, search, selectedCategory, selectedUnit]);

  const filteredCustomerSearch = useMemo(() => {
    if (!customerSearch.trim()) return patients.slice(0, 4);
    const term = customerSearch.toLowerCase();
    return patients.filter(p => 
      p.name.toLowerCase().includes(term) || 
      (p.phone && p.phone.includes(term))
    ).slice(0, 4);
  }, [patients, customerSearch]);

  const handleCustomerSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setCustomerSearch(val);
    setCustomerId('');
    setIsCustomerDropdownOpen(true);
    
    // Auto-parse Name and Phone from string
    const phoneMatch = val.match(/\b\d([\d\-\s]{8,})\d\b/);
    if (phoneMatch) {
       setCustomerPhone(phoneMatch[0].trim());
       setCustomerName(val.replace(phoneMatch[0], '').replace(/[-#,()]/g,'').trim());
    } else {
       setCustomerName(val.trim());
       setCustomerPhone('');
    }
  };

  const handleSelectCustomer = (p: Patient) => {
    setCustomerId(p.id);
    setCustomerName(p.name);
    setCustomerPhone(p.phone);
    setCustomerSearch(p.phone ? `${p.name} - ${p.phone}` : p.name);
    setIsCustomerDropdownOpen(false);
  };


  // Conversion Logic
  const getConversionOptions = (med: Medicine) => {
    const options = [];
    options.push({ unit: med.unit, price: med.salePrice, factor: 1, label: `Base (${med.unit})` });

    if (med.unit === 'Box') {
      options.push({ unit: 'Strip', price: med.salePrice / 10, factor: 0.1, label: 'Loose Strip (1/10 Box)' });
      options.push({ unit: 'Tablet', price: med.salePrice / 100, factor: 0.01, label: 'Loose Tablet (1/100 Box)' });
    } else if (med.unit === 'Strip') {
      options.push({ unit: 'Box', price: med.salePrice * 10, factor: 10, label: 'Full Box (10 Strips)' });
      options.push({ unit: 'Tablet', price: med.salePrice / 10, factor: 0.1, label: 'Loose Tablet (1/10 Strip)' });
    } else if (med.unit === 'Tablet') {
      options.push({ unit: 'Strip', price: med.salePrice * 10, factor: 10, label: 'Full Strip (10 Tabs)' });
      options.push({ unit: 'Box', price: med.salePrice * 100, factor: 100, label: 'Full Box (100 Tabs)' });
    }

    return options;
  };

  const handleMedicineClick = (medicine: Medicine) => {
    if (['Box', 'Strip', 'Tablet'].includes(medicine.unit)) {
      setSelectedMedForUnit(medicine);
    } else {
      addToCart(medicine, medicine.unit, medicine.salePrice, 1);
    }
  };

  const addToCart = (medicine: Medicine, saleUnit: string, salePrice: number, skuDeduction: number) => {
    const existingIndex = cart.findIndex(item => item.id === medicine.id && item.saleUnit === saleUnit);
    
    if (existingIndex >= 0) {
      const existingItem = cart[existingIndex];
      const totalSkuRequired = (existingItem.quantity + 1) * skuDeduction;
      if (totalSkuRequired > medicine.stock) {
          showAlert(`Insufficient stock! You have ${medicine.stock} ${medicine.unit}(s).`, "Stock Warning");
          return;
      }

      const newCart = [...cart];
      newCart[existingIndex] = { ...existingItem, quantity: existingItem.quantity + 1 };
      storageService.saveCart(newCart);
    } else {
      if (skuDeduction > medicine.stock) {
         showAlert(`Insufficient stock! You need ${skuDeduction} ${medicine.unit}(s) but only have ${medicine.stock}.`, "Stock Warning");
         return;
      }

      storageService.saveCart([...cart, { 
        ...medicine, 
        quantity: 1,
        saleUnit,
        salePrice,
        skuDeduction
      }]);
    }
    setSelectedMedForUnit(null);
  };

  const removeFromCart = (index: number) => {
    const newCart = cart.filter((_, i) => i !== index);
    storageService.saveCart(newCart);
  };

  const updateQuantity = (index: number, newQty: number) => {
    if (newQty < 0) return; 
    
    const newCart = cart.map((item, i) => {
      if (i === index) {
        if (newQty === 0) return item; 
        
        const med = medicines.find(m => m.id === item.id);
        if (med) {
          const requiredStock = newQty * item.skuDeduction;
          if (requiredStock > med.stock) {
              return item;
          }
        }
        return { ...item, quantity: newQty };
      }
      return item;
    });
    storageService.saveCart(newCart);
  };

  const subtotal = cart.reduce((sum, item) => sum + (item.salePrice * item.quantity), 0);
  const taxAmount = (subtotal - discountAmount) * (taxRate / 100);
  const total = Math.max(0, subtotal - discountAmount + taxAmount);

  const handleCheckout = async () => {
    if (cart.length === 0) return;

    const sale: Sale = {
      id: Math.floor(Math.random() * 900000 + 100000).toString(),
      date: new Date().toISOString(),
      items: cart,
      subTotal: subtotal,
      discount: discountAmount,
      tax: taxAmount,
      taxRate: taxRate,
      total: total,
      staffName: 'Staff',
      paymentMethod,
      customerName: customerName || 'Walk-in Customer',
      customerPhone: customerPhone || 'N/A',
      customerId: customerId || undefined
    };

    // The Service now handles:
    // 1. Saving Sale
    // 2. Decrementing Stock
    // 3. Creating "Sale" log in Stock History
    await storageService.addSale(sale);
    
    // Refresh local state to reflect new stock levels
    await loadData();
    
    storageService.clearCart();
    setCustomerName('');
    setCustomerPhone('');
    setCustomerId('');
    setDiscountAmount(0);
    setLastSale(sale);
    setIsMobileCartOpen(false); // Close mobile cart
    setShowInvoice(true);
  };

  return (
    <>
      <div className="flex h-full gap-6 relative">
        {/* Left: Medicine Grid */}
        <div className="flex-1 flex flex-col h-full overflow-hidden">
          {/* Controls */}
          <div className="mb-6 flex flex-col sm:flex-row gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 w-5 h-5" />
              <input 
                type="text" 
                placeholder="Search Brand or Salt..." 
                className="w-full pl-12 pr-4 py-3.5 rounded-2xl border-none bg-white shadow-sm focus:ring-2 focus:ring-blue-100 outline-none text-base text-gray-700"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                autoFocus
              />
            </div>
            
            <div className="flex gap-2 items-center overflow-x-auto pb-1 sm:pb-0">
               <button 
                 onClick={() => setActiveTab(Tab.INVENTORY)}
                 className="hidden sm:flex items-center gap-2 px-4 py-3 rounded-2xl bg-medical-blue/10 border border-medical-blue/20 text-medical-blue shadow-sm shrink-0 hover:bg-medical-blue/20 transition-all cursor-pointer text-left"
               >
                 <Pill size={16} />
                 <div className="flex flex-col">
                   <span className="text-[10px] font-bold uppercase leading-none opacity-70">Inventory</span>
                   <span className="text-sm font-black leading-tight">{medicines.length} Items</span>
                 </div>
               </button>

               {(!appFeatures || appFeatures.showInventory !== false) && (
                 <button 
                   onClick={() => setActiveTab(Tab.INVENTORY)}
                   className="px-4 py-3 rounded-2xl bg-white shadow-sm text-gray-600 text-sm font-bold hover:bg-gray-50 flex items-center gap-2 border border-gray-100 transition-all hover:border-gray-300"
                   title="Go to Inventory"
                 >
                   <Package2 size={16} />
                 </button>
               )}
               
               {(!appFeatures || appFeatures.showSuppliers !== false) && (
                 <button 
                   onClick={() => setActiveTab(Tab.SUPPLIERS)}
                   className="px-4 py-3 rounded-2xl bg-white shadow-sm text-gray-600 text-sm font-bold hover:bg-gray-50 flex items-center gap-2 border border-gray-100 transition-all hover:border-gray-300"
                 >
                   <User size={16} />
                 </button>
               )}
            </div>
          </div>

          {/* Grid */}
          <div className="flex-1 overflow-y-auto pr-2 pb-20">
            {/* Horizontal Grid Layout Adjustment */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4 gap-4 p-1">
              {filteredMedicines.map(med => (
                <MedicineCard key={med.id} medicine={med} onClick={handleMedicineClick} />
              ))}
            </div>
            {filteredMedicines.length === 0 && (
               <div className="flex flex-col items-center justify-center h-64 text-gray-400">
                 <Package2 size={48} className="mb-4 opacity-50" />
                 <p className="font-medium">No medicines found.</p>
                 <p className="text-xs mt-2 opacity-70">(Expired items are hidden)</p>
               </div>
            )}
          </div>
        </div>

        {/* Right: Cart (Responsive) */}
        {/* On desktop: Relative sidebar. On mobile: Fixed modal-like overlay controlled by isMobileCartOpen */}
        <div className={clsx(
           "flex flex-col bg-white/80 backdrop-blur-2xl transition-all duration-300 ease-in-out",
           // Desktop Styles
           "lg:w-96 lg:relative lg:flex lg:h-full lg:rounded-[2rem] lg:border lg:border-white/60 lg:shadow-xl lg:translate-y-0 lg:opacity-100 lg:z-auto",
           // Mobile Styles (Fixed Overlay)
           "fixed inset-0 z-50 h-full w-full",
           isMobileCartOpen ? "translate-y-0 opacity-100" : "translate-y-full opacity-0 lg:opacity-100 lg:translate-y-0 pointer-events-none lg:pointer-events-auto"
        )}>
          {/* Cart Header */}
          <div className="px-6 py-3 border-b border-gray-100 bg-white/40 flex items-center justify-between h-[45px]">
            <div className="flex items-center gap-2">
               <h2 className="font-extrabold text-gray-800 text-lg flex items-center gap-2">
                 <ShoppingCart className="text-medical-blue fill-current" size={20} /> Current Sale
               </h2>
               <span className="bg-blue-600 text-white text-xs font-bold px-2.5 py-1 rounded-full shadow-lg shadow-blue-500/30">
                 {cart.length}
               </span>
            </div>
            {/* Close Button for Mobile */}
            <button 
               onClick={() => setIsMobileCartOpen(false)}
               className="lg:hidden p-2 rounded-full bg-gray-100 text-gray-500 hover:bg-gray-200"
            >
               <X size={20} />
            </button>
          </div>

          {/* Customer Details Inputs Fixed Under Header */}
          <div className="px-4 py-2 bg-gray-50/50 border-b border-gray-100 flex-shrink-0 h-[95px] flex flex-col justify-center">
            <div className="flex justify-between items-center px-1 mb-1">
              <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Customer Search / Add</label>
              {customerSearch && (
                <button 
                  onClick={() => { 
                    setCustomerId(''); 
                    setCustomerName(''); 
                    setCustomerPhone(''); 
                    setCustomerSearch(''); 
                    setIsCustomerDropdownOpen(false); 
                  }}
                  className="text-[10px] font-bold text-red-500 hover:text-red-600 transition-colors"
                >
                  Clear
                </button>
              )}
            </div>

            <div className="relative">
              <div className="relative group">
                <User className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4 transition-colors group-focus-within:text-blue-500" />
                <input 
                  type="text"
                  className="w-full pl-9 pr-3 py-1.5 rounded-xl bg-white border border-gray-200 text-xs font-semibold outline-none focus:ring-2 focus:ring-blue-500/10 focus:border-blue-500 transition-all"
                  placeholder="Type Name & Mobile (e.g. Ali 0300...)"
                  value={customerSearch}
                  onChange={handleCustomerSearchChange}
                  onFocus={() => setIsCustomerDropdownOpen(true)}
                />
              </div>

              {isCustomerDropdownOpen && (
                <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-gray-100 rounded-xl shadow-lg z-50 overflow-hidden">
                  {filteredCustomerSearch.map(p => (
                    <div 
                      key={p.id}
                      className="px-4 py-2.5 flex items-center justify-between hover:bg-blue-50 cursor-pointer border-b border-gray-50 last:border-0 transition-colors"
                      onClick={() => handleSelectCustomer(p)}
                    >
                      <span className="text-xs font-bold text-gray-800">{p.name}</span>
                      <span className="text-[10px] font-semibold text-gray-500">{p.phone}</span>
                    </div>
                  ))}
                  
                  {(!customerId && customerSearch && filteredCustomerSearch.length === 0) && (
                    <div className="px-4 py-3 text-center">
                       <p className="text-[10px] text-gray-400 font-semibold mb-2">No existing patient found.</p>
                       <button 
                         onClick={async () => {
                           const newPatient: Patient = {
                             id: `pat-${Date.now()}`,
                             name: customerName || 'Unknown',
                             phone: customerPhone,
                             history: [],
                             isActive: true,
                             registeredAt: new Date().toISOString()
                           };
                           await storageService.addPatient(newPatient);
                           const updatedPatients = await storageService.getPatients();
                           setPatients(updatedPatients);
                           handleSelectCustomer(newPatient);
                           window.dispatchEvent(new Event('patient-added'));
                         }}
                         className="w-full py-2 bg-blue-50 text-blue-600 rounded-xl text-[10px] font-bold uppercase tracking-wider hover:bg-blue-600 hover:text-white transition-all flex items-center justify-center gap-2 border border-blue-100 outline-none"
                       >
                         <Plus size={12} /> Add "{customerName}" to Database
                       </button>
                    </div>
                  )}
                  {(!customerId && customerSearch && filteredCustomerSearch.length > 0) && (
                     <div className="p-2 bg-gray-50 border-t border-gray-100">
                       <button 
                         onClick={async () => {
                           const newPatient: Patient = {
                             id: `pat-${Date.now()}`,
                             name: customerName || 'Unknown',
                             phone: customerPhone,
                             history: [],
                             isActive: true,
                             registeredAt: new Date().toISOString()
                           };
                           await storageService.addPatient(newPatient);
                           const updatedPatients = await storageService.getPatients();
                           setPatients(updatedPatients);
                           handleSelectCustomer(newPatient);
                           window.dispatchEvent(new Event('patient-added'));
                         }}
                         className="w-full py-1.5 text-[10px] font-bold text-blue-600 hover:text-blue-700 hover:bg-blue-50 rounded-lg transition-colors flex items-center justify-center gap-1"
                       >
                          <Plus size={12}/> Or Add as New Patient
                       </button>
                     </div>
                  )}
                </div>
              )}
            </div>
            
            {/* Auto-extracted summary display */}
            {!customerId && (customerName || customerPhone) && (
              <div className="flex items-center gap-2 mt-2 px-2 opacity-70">
                {customerName && <span className="text-[9px] font-bold bg-gray-200/50 text-gray-500 px-2 py-0.5 rounded-full">Name: {customerName}</span>}
                {customerPhone && <span className="text-[9px] font-bold bg-green-100/50 text-green-700 px-2 py-0.5 rounded-full">Phone: {customerPhone}</span>}
              </div>
            )}
          </div>

          <div className="flex-1 overflow-y-auto p-4 space-y-3">
            {cart.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center text-gray-400 opacity-60">
                <ShoppingCart size={48} className="mb-3" />
                <p>Cart is empty</p>
              </div>
            ) : (
              cart.map((item, idx) => (
                <div key={`${item.id}-${item.saleUnit}`} className="bg-white p-2.5 rounded-xl border border-gray-50 shadow-[0_2px_10px_rgb(0,0,0,0.02)] flex items-center gap-2 group transition-all hover:scale-[1.01]">
                  
                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5">
                      <h4 className="font-bold text-gray-800 text-xs truncate max-w-[120px]">{item.name}</h4>
                      <span className="text-[9px] font-bold text-gray-500 bg-gray-100 px-1 py-0.5 rounded uppercase tracking-wider shrink-0">{item.saleUnit}</span>
                    </div>
                  </div>
                  
                  {/* Controls & Price */}
                  <div className="flex items-center gap-2 shrink-0">
                    <div className="flex items-center bg-gray-50 rounded-lg p-0.5 border border-gray-200">
                       <button onClick={() => updateQuantity(idx, item.quantity - 1)} className="w-6 h-6 flex items-center justify-center hover:bg-white rounded text-gray-600"><Minus size={10} /></button>
                       <input 
                         type="number"
                         min="1"
                         className="w-6 text-center bg-transparent text-xs font-bold text-gray-800 outline-none p-0 border-none focus:ring-0"
                         value={item.quantity}
                         onChange={(e) => {
                           const val = parseInt(e.target.value);
                           if (!isNaN(val)) updateQuantity(idx, val);
                         }}
                       />
                       <button onClick={() => updateQuantity(idx, item.quantity + 1)} className="w-6 h-6 flex items-center justify-center hover:bg-white rounded text-gray-600"><Plus size={10} /></button>
                    </div>

                    <span className="text-xs w-14 text-right font-bold text-medical-blue">{formatCurrency(item.salePrice * item.quantity)}</span>
                  </div>

                  {/* Delete */}
                  <button onClick={() => removeFromCart(idx)} className="text-gray-300 hover:text-red-500 transition-colors shrink-0 ml-1">
                     <Trash2 size={14} />
                  </button>
                </div>
              ))
            )}
          </div>

          <div className="p-6 bg-white border-t border-gray-100 shadow-[0_-4px_20px_rgba(0,0,0,0.05)]">
            <div className="space-y-3 mb-6">
              <div className="flex justify-between items-center text-xs text-gray-500 font-medium px-1">
                <span>Subtotal</span>
                <span>{formatCurrency(subtotal)}</span>
              </div>
              
              <div className="flex justify-between items-center px-1">
                <span className="text-xs text-gray-500 font-medium">Discount</span>
                <div className="flex justify-end gap-1 items-center">
                  <span className="text-xs font-bold text-gray-400">Rs.</span>
                  <input
                    type="number"
                    min="0"
                    placeholder="0"
                    className="w-16 text-right py-1 px-2 border-b border-gray-200 outline-none text-xs font-bold text-gray-800 bg-transparent focus:border-blue-500 transition-colors"
                    value={discountAmount || ''}
                    onChange={(e) => {
                      const val = parseInt(e.target.value);
                      setDiscountAmount(isNaN(val) ? 0 : val);
                    }}
                  />
                </div>
              </div>

              {discountAmount > 0 && (
                <div className="w-full h-px bg-gray-100 my-1"></div>
              )}

              {taxRate > 0 && (
                <div className="flex justify-between items-center text-xs text-gray-500 font-medium px-1">
                  <span>Sales Tax ({taxRate}%)</span>
                  <span>{formatCurrency(taxAmount)}</span>
                </div>
              )}

              <div className="flex justify-between items-center text-[18px] leading-[31px] font-black text-[#050d21] px-1">
                <span>Total</span>
                <span>{formatCurrency(total)}</span>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <div className="flex bg-gray-50 p-1 rounded-xl border border-gray-100 shrink-0">
                {['Cash', 'Credit'].map((method) => (
                  <button
                    key={method}
                    onClick={() => setPaymentMethod(method as any)}
                    className={clsx(
                      "px-3 py-2 rounded-lg text-[10px] font-bold transition-all flex items-center gap-1 uppercase tracking-wide",
                      paymentMethod === method 
                        ? "bg-white text-gray-900 shadow-sm border border-gray-200" 
                        : "text-gray-500 hover:text-gray-700 hover:bg-white/50 border border-transparent"
                    )}
                  >
                    {method === 'Cash' && <Banknote size={14} />}
                    {method === 'Credit' && <CreditCard size={14} />}
                    {method}
                  </button>
                ))}
              </div>

              <Button 
                className="flex-1 py-3 text-sm font-bold rounded-xl shadow-[0_8px_16px_-4px_rgba(37,99,235,0.3)] bg-gradient-to-r from-blue-600 to-blue-500 hover:from-blue-700 hover:to-blue-600 transform active:scale-[0.98] transition-all whitespace-nowrap" 
                onClick={handleCheckout}
                disabled={cart.length === 0}
              >
                Confirm & Print
              </Button>
            </div>
          </div>
        </div>
      </div>
      
      {/* Mobile Floating Cart Summary Bar */}
      {!isMobileCartOpen && cart.length > 0 && (
         <div className="lg:hidden fixed bottom-[4.5rem] left-0 w-full px-4 z-30 animate-in slide-in-from-bottom-5 fade-in duration-300">
            <button 
               onClick={() => setIsMobileCartOpen(true)}
               className="w-full bg-gray-900 text-white p-4 rounded-2xl shadow-2xl flex items-center justify-between group active:scale-[0.98] transition-all border border-gray-700"
            >
               <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-white/10 rounded-xl flex items-center justify-center font-bold text-white group-hover:bg-white/20 transition-colors">
                     {cart.reduce((acc, item) => acc + item.quantity, 0)}
                  </div>
                  <div className="text-left">
                     <p className="text-[10px] text-gray-400 font-bold uppercase tracking-wider">Total</p>
                     <p className="text-lg font-black leading-none">{formatCurrency(total)}</p>
                  </div>
               </div>
               <div className="flex items-center gap-2 text-sm font-bold bg-white text-gray-900 px-4 py-2 rounded-xl">
                  View Cart <ChevronUp size={16} />
               </div>
            </button>
         </div>
      )}

      {showInvoice && lastSale && (
        <InvoiceModal 
          sale={lastSale} 
          onClose={() => setShowInvoice(false)} 
        />
      )}

      {/* Unit Selection Modal */}
      {selectedMedForUnit && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-md p-4 animate-in fade-in zoom-in duration-200">
           <div className="bg-white rounded-[2rem] shadow-2xl w-full max-w-sm overflow-hidden border border-white/50">
             <div className="p-5 border-b border-gray-100 flex justify-between items-center bg-gray-50/50">
                <h3 className="font-bold text-gray-900 text-lg">Select Unit</h3>
                <button onClick={() => setSelectedMedForUnit(null)} className="p-1 hover:bg-gray-200 rounded-full transition-colors"><X size={20} className="text-gray-500"/></button>
             </div>
             <div className="p-5 bg-white/80">
               <div className="mb-6 text-center">
                 <h4 className="font-black text-xl text-gray-800">{selectedMedForUnit.name}</h4>
                 <div className="inline-block mt-2 px-3 py-1 bg-blue-50 text-blue-600 rounded-lg text-xs font-bold">
                   Available: {selectedMedForUnit.stock} {selectedMedForUnit.unit}s
                 </div>
               </div>
               <div className="space-y-3">
                 {getConversionOptions(selectedMedForUnit).map((opt) => (
                   <button 
                     key={opt.unit}
                     onClick={() => addToCart(selectedMedForUnit, opt.unit, opt.price, opt.factor)}
                     className="w-full flex items-center justify-between p-4 rounded-2xl border border-gray-100 bg-white hover:border-blue-500 hover:shadow-lg hover:shadow-blue-500/10 transition-all group"
                   >
                     <div className="text-left">
                       <span className="block font-bold text-gray-800 text-sm group-hover:text-blue-600 transition-colors">{opt.label}</span>
                       <span className="text-[10px] text-gray-400 font-semibold uppercase tracking-wider">Sell as {opt.unit}</span>
                     </div>
                     <div className="flex items-center gap-3">
                       <span className="font-bold text-gray-900 text-lg">{formatCurrency(opt.price)}</span>
                       <ChevronRight size={18} className="text-gray-300 group-hover:text-blue-500" />
                     </div>
                   </button>
                 ))}
               </div>
             </div>
           </div>
        </div>
      )}
    </>
  );
};

export default Counter;