import React, { useState, useRef } from 'react';
import { X, Upload, FileText, AlertCircle, CheckCircle } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { Button } from './ui/Button';
import { Medicine } from '../types';

interface BulkImportModalProps {
  isOpen: boolean;
  onClose: () => void;
  onImport: (medicines: Partial<Medicine>[]) => Promise<void>;
}

export const BulkImportModal: React.FC<BulkImportModalProps> = ({ isOpen, onClose, onImport }) => {
  const [isDragging, setIsDragging] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [parsedData, setParsedData] = useState<Partial<Medicine>[] | null>(null);
  const [isImporting, setIsImporting] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  if (!isOpen) return null;

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  const processFile = (selectedFile: File) => {
    setFile(selectedFile);
    setError(null);
    setParsedData(null);

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const text = e.target?.result as string;
        let data: Partial<Medicine>[] = [];

        if (selectedFile.name.endsWith('.json')) {
          const rawData = JSON.parse(text);
          if (!Array.isArray(rawData)) {
            throw new Error('JSON file must contain an array of objects.');
          }
          data = rawData;
        } else if (selectedFile.name.endsWith('.csv')) {
          // Robust CSV parser handling quotes
          const lines = text.split(/\r?\n/).filter(line => line.trim() !== '');
          if (lines.length < 2) throw new Error('CSV file feels empty or missing headers.');
          
          const headerRow = lines[0].replace(/^\ufeff/, '').split(',');
          const rawHeaders = headerRow.map(h => h.trim().replace(/^"|"$/g, ''));
          
          data = lines.slice(1).map(line => {
            const values: string[] = [];
            let current = '';
            let inQuotes = false;
            for (let i = 0; i < line.length; i++) {
              const char = line[i];
              if (char === '"') {
                inQuotes = !inQuotes;
              } else if (char === ',' && !inQuotes) {
                values.push(current.trim().replace(/^"|"$/g, ''));
                current = '';
              } else {
                current += char;
              }
            }
            values.push(current.trim().replace(/^"|"$/g, ''));

            const obj: any = {};
            rawHeaders.forEach((header, i) => {
              obj[header] = values[i] || '';
            });
            return obj;
          });
        } else {
          throw new Error('Unsupported file format. Please upload .csv or .json');
        }

        // Normalize and Map Data
        const normalizedData = data.map(item => {
          const newItem: any = {};
          const headerMap: Record<string, string> = {
            'id': 'id',
            'medid': 'id',
            'medicineid': 'id',
            'name': 'name',
            'item': 'name',
            'medicine': 'name',
            'product': 'name',
            'medicinename': 'name',
            'itemname': 'name',
            'productname': 'name',
            'genericname': 'genericName',
            'generic': 'genericName',
            'salt': 'genericName',
            'saltname': 'genericName',
            'category': 'category',
            'cat': 'category',
            'brandname': 'brandName',
            'brand': 'brandName',
            'modelname': 'modelName',
            'model': 'modelName',
            'type': 'modelName',
            'rackno': 'rackNo',
            'rack': 'rackNo',
            'minstock': 'minStock',
            'minimumstock': 'minStock',
            'alertstock': 'minStock',
            'purchaseprice': 'purchasePrice',
            'purprice': 'purchasePrice',
            'saleprice': 'salePrice',
            'price': 'salePrice',
            'stock': 'stock',
            'quantity': 'stock',
            'qty': 'stock',
            'available': 'stock',
            'expirydate': 'expiryDate',
            'expiry': 'expiryDate',
            'exp': 'expiryDate',
            'batch': 'batchNumber',
            'batchnumber': 'batchNumber',
            'lot': 'batchNumber',
            'unit': 'unit'
          };

          const formatDate = (val: any) => {
            if (!val) return '';
            const s = String(val).trim();
            // Handle DD/MM/YYYY or DD-MM-YYYY
            const ddmmyyyy = /^(\d{1,2})[/-](\d{1,2})[/-](\d{4})$/;
            const match = s.match(ddmmyyyy);
            if (match) {
              return `${match[3]}-${match[2].padStart(2, '0')}-${match[1].padStart(2, '0')}`;
            }
            // Handle YYYY-MM-DD (already correct) or MM/DD/YYYY
            // If it starts with 4 digits, assume it's YYYY...
            if (/^\d{4}/.test(s)) return s;
            
            // Generic try
            try {
              const d = new Date(s);
              if (!isNaN(d.getTime())) {
                return d.toISOString().split('T')[0];
              }
            } catch {
              return s;
            }
            return s;
          };

          Object.keys(item).forEach(key => {
            const normalizedKey = key.toLowerCase().replace(/\s+/g, '').replace(/[^a-z0-9]/g, '');
            const mappedKey = headerMap[normalizedKey] || key;
            
            let val = item[key];
            if (['purchasePrice', 'salePrice', 'stock', 'minStock'].includes(mappedKey)) {
              newItem[mappedKey] = val ? Number(String(val).replace(/[^0-9.]/g, '')) : 0;
            } else if (mappedKey === 'expiryDate') {
              newItem[mappedKey] = formatDate(val);
            } else {
              newItem[mappedKey] = typeof val === 'string' ? val.trim() : val;
            }
          });
          return newItem;
        });

        // Validate basic fields
        if (normalizedData.length > 0) {
          const first = normalizedData[0];
          if (!first.name) {
             throw new Error('Import data must have at least a "name" column/field.');
          }
        }

        setParsedData(normalizedData);
      } catch (err: any) {
        setError(err.message || 'Failed to parse file.');
      }
    };
    reader.readAsText(selectedFile);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      processFile(e.dataTransfer.files[0]);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      processFile(e.target.files[0]);
    }
  };

  const handleImport = async () => {
    if (!parsedData) return;
    setIsImporting(true);
    try {
      await onImport(parsedData);
      onClose();
    } catch (err: any) {
      setError(err.message || 'Failed to import data.');
    } finally {
      setIsImporting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <motion.div 
        initial={{ opacity: 0, scale: 0.95, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 20 }}
        className="bg-white rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden flex flex-col"
      >
        <div className="p-5 border-b border-gray-100 flex justify-between items-center bg-gray-50">
          <div className="flex items-center gap-3">
             <div className="w-10 h-10 bg-blue-100 text-medical-blue rounded-xl flex items-center justify-center">
               <Upload size={20} />
             </div>
             <div>
               <h3 className="font-bold text-gray-800 text-lg">Bulk Import Inventory</h3>
               <p className="text-xs text-gray-500">Upload CSV or JSON files</p>
             </div>
          </div>
          <button type="button" onClick={onClose} className="text-gray-400 hover:text-gray-600 bg-white p-2 rounded-full shadow-sm border border-gray-100">
            <X size={20} />
          </button>
        </div>

        <div className="p-6">
           {!parsedData && (
              <>
                 <div 
                   onDragOver={handleDragOver}
                   onDragLeave={handleDragLeave}
                   onDrop={handleDrop}
                   onClick={() => fileInputRef.current?.click()}
                   className={`border-2 border-dashed rounded-2xl p-10 text-center cursor-pointer transition-all duration-200 
                     ${isDragging ? 'border-medical-blue bg-blue-50' : 'border-gray-200 hover:border-medical-blue hover:bg-gray-50'}`}
                 >
                   <Upload size={40} className={`mx-auto mb-4 ${isDragging ? 'text-medical-blue' : 'text-gray-400'}`} />
                   <h4 className="text-sm font-bold text-gray-700 mb-1">Click or drag file to this area to upload</h4>
                   <p className="text-xs text-gray-500">Support for a single or bulk upload. Strictly prohibit from uploading company data or other band files.</p>
                   <p className="text-[10px] font-bold text-gray-400 mt-4 uppercase">Accepted formats: .csv, .json</p>
                 </div>
                 <input 
                   type="file" 
                   ref={fileInputRef} 
                   onChange={handleFileChange} 
                   accept=".csv,.json" 
                   className="hidden" 
                 />
              </>
           )}

           <AnimatePresence>
             {error && (
               <motion.div 
                 initial={{ opacity: 0, y: -10, height: 0 }}
                 animate={{ opacity: 1, y: 0, height: 'auto' }}
                 className="mt-4 p-3 bg-red-50 border border-red-100 rounded-xl flex items-start gap-2 text-red-600 text-sm"
               >
                 <AlertCircle size={18} className="shrink-0 mt-0.5" />
                 <span>{error}</span>
               </motion.div>
             )}
           </AnimatePresence>

           {parsedData && !error && (
             <div className="mt-2">
               <div className="p-4 bg-green-50 border border-green-100 rounded-xl flex items-center justify-between">
                 <div className="flex items-center gap-3">
                   <div className="p-2 bg-green-100 text-green-600 rounded-lg">
                     <FileText size={20} />
                   </div>
                   <div>
                     <h4 className="text-sm font-bold text-gray-800">{file?.name}</h4>
                     <p className="text-xs text-green-600 font-medium">Successfully parsed {parsedData.length} items</p>
                   </div>
                 </div>
                 <CheckCircle className="text-green-500" size={24} />
               </div>

               <div className="flex gap-3 mt-6">
                 <Button type="button" variant="outline" className="flex-1" onClick={() => { setParsedData(null); setFile(null); }}>
                   Cancel & Re-upload
                 </Button>
                 <Button onClick={handleImport} className="flex-1" loading={isImporting}>
                   Import {parsedData.length} Items
                 </Button>
               </div>
             </div>
           )}

           {!parsedData && (
             <div className="mt-6 flex justify-end">
                <Button type="button" variant="outline" onClick={onClose}>Cancel</Button>
             </div>
           )}
        </div>
      </motion.div>
    </div>
  );
};
