import React, { useEffect, useRef } from 'react';
import { X, Printer, Download, CheckCircle } from 'lucide-react';
import { Sale } from '../types';
import { formatCurrency } from '../constants';
import { Button } from './ui/Button';
import { storageService } from '../services/storageService';
import { motion } from 'motion/react';

interface InvoiceModalProps {
  sale: Sale | null;
  onClose: () => void;
}

export const InvoiceModal: React.FC<InvoiceModalProps> = ({ sale, onClose }) => {
  const hasAutoPrinted = useRef(false);
  const [company, setCompany] = React.useState<any>(null);

  useEffect(() => {
    const loadCompany = async () => {
      const settings = await storageService.getCompanySettings();
      setCompany(settings);
    };
    loadCompany();
  }, []);

  // Auto-trigger the Save & Print process when modal opens
  useEffect(() => {
    if (sale && !hasAutoPrinted.current && company) {
      hasAutoPrinted.current = true;
      // Small delay to ensure DOM is rendered before PDF generation
      setTimeout(() => {
        handleSaveAndPrint();
      }, 500);
    }
  }, [sale, company]);

  if (!sale || !company) return null;

  const handleSaveAndPrint = async () => {
    // 1. Generate & Save PDF
    await handleDownloadPDF();
    
    // 2. Trigger Print Dialog (after a short delay to let PDF save start)
    setTimeout(() => {
      window.print();
    }, 800);
  };

  const handleDownloadPDF = async () => {
    // @ts-ignore
    if (typeof window.html2pdf === 'undefined') {
      console.warn("PDF Generator not loaded yet");
      return;
    }
    
    const element = document.getElementById('printable-invoice');
    
    // Construct Filename: CustomerName_Mobile_SaleID.pdf
    const cleanName = sale.customerName?.replace(/[^a-zA-Z0-9]/g, '_') || 'Customer';
    const cleanPhone = sale.customerPhone?.replace(/[^0-9]/g, '') || '';
    const filename = `${cleanName}${cleanPhone ? '_' + cleanPhone : ''}_${sale.id.slice(-6)}.pdf`;

    const opt = {
      margin: 0,
      filename: filename,
      image: { type: 'jpeg', quality: 0.98 },
      html2canvas: { scale: 2, useCORS: true, logging: false },
      // 80mm width, continuous height based on content usually handles better with auto
      // but html2pdf needs format. 297mm is A4 height.
      jsPDF: { unit: 'mm', format: [80, 297], orientation: 'portrait' } 
    };

    try {
      // @ts-ignore
      await window.html2pdf().set(opt).from(element).save();
    } catch (e) {
      console.error("PDF Generation failed", e);
    }
  };

  return (
    <div id="invoice-modal-overlay" className="fixed inset-0 z-[60] flex items-center justify-center bg-black/60 backdrop-blur-sm print:bg-white print:p-0 print:block print:static print:inset-auto print:h-auto">
      <motion.div 
        initial={{ opacity: 0, scale: 0.95, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 20 }}
        id="printable-invoice" 
        className="bg-white rounded-xl shadow-2xl w-full max-w-[320px] overflow-hidden flex flex-col max-h-[90vh] print:shadow-none print:max-w-none print:w-full print:rounded-none print:h-auto print:overflow-visible print:block"
      >
        
        {/* Header (Hidden in Print) */}
        <div className="p-3 border-b border-gray-100 flex justify-between items-center bg-gray-50 print:hidden" data-html2canvas-ignore="true">
          <h3 className="font-bold text-gray-800 text-sm flex items-center gap-2">
            <CheckCircle size={16} className="text-green-500" /> Sale Confirmed
          </h3>
          <button 
            onClick={onClose} 
            className="text-gray-400 hover:text-gray-600 p-1 hover:bg-gray-200 rounded-full transition-colors"
            aria-label="Close Receipt"
          >
            <X size={18} />
          </button>
        </div>

        {/* Invoice Content - Thermal Optimized */}
        <div className="p-4 overflow-y-auto flex-1 bg-white print:p-0 print:overflow-visible print:h-auto font-mono text-sm leading-tight text-black">
          <div className="text-center mb-4">
            <h1 className="text-xl font-black text-black uppercase tracking-widest mb-1">{company.name}</h1>
            {company.doctorName && <p className="text-sm font-bold text-black uppercase">{company.doctorName}</p>}
            {company.doctorDegree && <p className="text-[10px] text-gray-600 font-bold uppercase">{company.doctorDegree}</p>}
            {company.license && <p className="text-[10px] text-gray-600 font-bold uppercase">{company.license}</p>}
            <p className="text-[10px] text-gray-500 mt-1">{company.address}</p>
            <p className="text-[10px] text-gray-500">Tel: {company.contact}</p>
            
            <div className="w-full border-b border-dashed border-gray-400 my-3"></div>
            
            <div className="flex justify-between text-[10px] font-bold text-gray-700">
              <span>{new Date(sale.date).toLocaleDateString()} {new Date(sale.date).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</span>
              <span>#{sale.id.slice(-6)}</span>
            </div>
            <div className="flex justify-between text-[10px] font-bold text-gray-700 mt-1">
               <span>Staff: {sale.staffName}</span>
               <span>Pay: {sale.paymentMethod}</span>
            </div>

            {/* Customer Details */}
            {(sale.customerName || sale.customerPhone || sale.customerId) && (
              <div className="mt-2 text-left border border-gray-300 rounded p-1">
                {sale.customerName && <p className="text-[10px] font-bold truncate">Cust: {sale.customerName}</p>}
                {sale.customerPhone && <p className="text-[10px] text-gray-600">Ph: {sale.customerPhone}</p>}
                {sale.customerId && <p className="text-[10px] text-gray-600">PID: {sale.customerId.slice(-6)}</p>}
              </div>
            )}
            
            <div className="w-full border-b border-dashed border-gray-400 my-3"></div>
          </div>

          <div className="mb-4">
             {/* Thermal Table Layout: Item Name on top, Qty x Price = Total below */}
             <div className="flex flex-col gap-3">
                {sale.items.map((item, idx) => (
                  <div key={idx} className="flex flex-col">
                    <span className="font-bold text-black text-xs uppercase">{item.name}</span>
                    <span className="font-normal text-[10px] text-gray-500 -mt-0.5 mb-0.5">{item.genericName}</span>
                    <div className="flex justify-between items-center text-[10px] text-gray-800 pl-2">
                       <span>{item.quantity} x {item.salePrice} ({item.saleUnit})</span>
                       <span className="font-bold text-black">{formatCurrency(item.salePrice * item.quantity)}</span>
                    </div>
                  </div>
                ))}
             </div>
          </div>

          <div className="w-full border-b border-dashed border-gray-400 my-3"></div>

          <div className="space-y-1 mt-3">
            { (sale.discount || sale.tax) ? (
              <>
                <div className="flex justify-between text-xs text-gray-700">
                  <span>Subtotal</span>
                  <span>{formatCurrency(sale.subTotal || 0)}</span>
                </div>
                {sale.discount ? (
                  <div className="flex justify-between text-xs text-gray-700">
                    <span>Discount</span>
                    <span>- Rs.{sale.discount.toLocaleString()}</span>
                  </div>
                ) : null}
                {sale.tax ? (
                  <div className="flex justify-between text-xs text-gray-700 pb-1">
                    <span>Tax ({sale.taxRate}%)</span>
                    <span>{formatCurrency(sale.tax)}</span>
                  </div>
                ) : null}
                <div className="w-full border-t border-dashed border-gray-400 pt-1">
                  <div className="flex justify-between font-bold text-base text-black">
                    <span>TOTAL</span>
                    <span>{formatCurrency(sale.total)}</span>
                  </div>
                </div>
              </>
            ) : (
              <div className="flex justify-between font-bold text-base text-black">
                <span>TOTAL</span>
                <span>{formatCurrency(sale.total)}</span>
              </div>
            )}
            
            <div className="flex justify-between text-[10px] font-medium text-gray-600 mt-1">
              <span>Items Count</span>
              <span>{sale.items.length}</span>
            </div>
          </div>

          <div className="mt-6 text-center space-y-1">
            <p className="text-[10px] font-bold text-black uppercase">No Return / Exchange</p>
            <p className="text-[10px] text-gray-600">Thank you for your visit!</p>
            <div className="mt-2 text-[9px] text-gray-400 font-mono">
                System: {company.name}
            </div>
            {/* Cut Line for Printer */}
            <div className="print:block hidden pt-4 text-center text-[10px] text-gray-400">
               . . . . . . . . . . . . . . . . . . .
            </div>
          </div>
        </div>

        {/* Footer Actions (Hidden in Print) */}
        <div className="p-3 border-t border-gray-100 bg-gray-50 flex flex-col gap-2 print:hidden" data-html2canvas-ignore="true">
           <Button size="sm" onClick={handleSaveAndPrint} className="w-full gap-2 bg-gray-900 hover:bg-black text-white shadow-lg">
             <Printer size={16} /> Save PDF & Print
           </Button>
           <div className="flex gap-2">
             <Button variant="secondary" size="sm" onClick={onClose} className="flex-1">Close</Button>
             <Button variant="secondary" size="sm" onClick={handleDownloadPDF} className="flex-1 gap-2">
               <Download size={16} /> PDF Only
             </Button>
           </div>
        </div>
      </motion.div>
      
      {/* Print Specific Styles */}
      <style>{`
        @media print {
          @page {
            size: 80mm auto;
            margin: 0;
          }
          
          body {
            visibility: hidden;
            background: white !important;
          }
          
          /* CRITICAL: Ensure modal and its contents are visible and positioned correctly */
          #invoice-modal-overlay {
            visibility: visible;
            position: absolute;
            left: 0;
            top: 0;
            width: 80mm; /* Force width matches paper */
            margin: 0;
            padding: 0;
            background: white !important;
            display: block !important;
          }

          #invoice-modal-overlay * {
            visibility: visible;
          }

          #printable-invoice {
            width: 100% !important;
            max-width: none !important;
            box-shadow: none !important;
            border: none !important;
            position: absolute;
            left: 0;
            top: 0;
            margin: 0;
            padding: 0;
          }
          
          /* Force colors */
          * {
            -webkit-print-color-adjust: exact !important;
            color-adjust: exact !important;
          }
          
          .print\\:hidden {
            display: none !important;
          }
          
          .print\\:block {
             display: block !important;
          }
        }
      `}</style>
    </div>
  );
};