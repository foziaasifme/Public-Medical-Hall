import React from 'react';
import { Medicine } from '../types';
import { clsx } from 'clsx';
import { Pill, Activity, Calendar } from 'lucide-react';
import { LOW_STOCK_THRESHOLD, formatCurrency } from '../constants';

interface MedicineCardProps {
  medicine: Medicine;
  onClick?: (medicine: Medicine) => void;
  actionSlot?: React.ReactNode; 
  inventoryMode?: boolean;
}

export const MedicineCard: React.FC<MedicineCardProps> = ({ medicine, onClick, actionSlot, inventoryMode }) => {
  const isLowStock = medicine.stock <= (medicine.minStock || LOW_STOCK_THRESHOLD) && medicine.stock > 0;
  const isOutOfStock = medicine.stock === 0;
  const isExpired = new Date(medicine.expiryDate) < new Date();

  return (
    <div 
      onClick={() => !isOutOfStock && onClick && onClick(medicine)}
      className={clsx(
        "relative flex flex-row items-stretch gap-4 p-4 rounded-2xl transition-all duration-300 group overflow-hidden cursor-pointer",
        "bg-white/90 backdrop-blur-xl border border-white/60",
        "hover:shadow-[0_8px_30px_rgb(0,0,0,0.12)] hover:border-blue-200 hover:scale-[1.01]",
        isOutOfStock 
          ? "opacity-60 grayscale" 
          : "shadow-sm",
        isExpired && "border-red-200 bg-red-50/30"
      )}
    >
      {/* Left: Icon & visual indicator */}
      <div className="flex flex-col items-center gap-2 shrink-0">
        <div className={clsx(
          "w-14 h-14 rounded-2xl flex items-center justify-center transition-colors duration-300 shadow-sm border border-white",
          isExpired ? "bg-red-100 text-red-600" : (isLowStock ? "bg-red-50 text-red-500" : "bg-blue-50 text-blue-600 group-hover:bg-blue-600 group-hover:text-white")
        )}>
          <Pill size={24} strokeWidth={2} />
        </div>
        
        {/* Status Badge */}
        {isExpired ? (
          <span className="w-full text-center text-[10px] font-bold text-red-600 bg-red-100 py-1 rounded-lg uppercase tracking-wider border border-red-200 animate-pulse">Exp</span>
        ) : isOutOfStock ? (
          <span className="w-full text-center text-[10px] font-bold text-gray-500 bg-gray-100 py-1 rounded-lg uppercase tracking-wider">Out</span>
        ) : isLowStock ? (
          <span className="w-full text-center text-[10px] font-bold text-red-600 bg-red-50 py-1 rounded-lg uppercase tracking-wider animate-pulse border border-red-100">Low</span>
        ) : (
          <span className="w-full text-center text-[10px] font-bold text-emerald-600 bg-emerald-50 py-1 rounded-lg uppercase tracking-wider border border-emerald-100">Ok</span>
        )}
      </div>

      {/* Right: Content */}
      <div className="flex-1 min-w-0 flex flex-col justify-between py-0.5">
        <div>
           <div className="flex justify-between items-start gap-2">
             <div className="min-w-0 flex-1">
               <h3 className="font-bold text-gray-900 leading-tight truncate text-base group-hover:text-blue-700 transition-colors">
                 {medicine.name}
               </h3>
               <div className="flex items-center gap-2 mt-0.5">
                 <span className="text-[10px] font-bold text-gray-400 bg-gray-100 px-1.5 py-0.5 rounded uppercase tracking-wider">{medicine.category}</span>
                 {inventoryMode && (
                   <>
                     <span className="text-[10px] font-mono text-gray-400 bg-gray-100 px-1.5 py-0.5 rounded">#{medicine.id.slice(-4)}</span>
                     {medicine.batchNumber && <span className="text-[10px] font-bold text-blue-500 bg-blue-50 px-1.5 py-0.5 rounded">Batch: {medicine.batchNumber}</span>}
                   </>
                 )}
               </div>
             </div>
           </div>
           
           <p className="text-xs text-gray-500 font-medium truncate flex items-center gap-1 mt-1">
             <Activity size={10} className="text-blue-400" />
             {medicine.genericName}
           </p>

           {medicine.rackNo && (
             <p className="text-[10px] text-gray-500 font-semibold truncate flex items-center gap-1 mt-1">
               <span className="bg-blue-50 text-blue-700 px-1.5 py-0.5 rounded uppercase tracking-wider font-black border border-blue-100 italic">Rack: {medicine.rackNo}</span>
             </p>
           )}

           {inventoryMode && (
             <div className="mt-2 flex flex-wrap gap-2">
               <span className="px-2 py-0.5 bg-gray-100 text-gray-600 rounded text-[9px] font-bold uppercase tracking-wider">{medicine.category}</span>
               <div className={clsx("flex items-center gap-1 text-[9px] font-bold uppercase", isExpired ? "text-red-500" : "text-gray-400")}>
                 <Calendar size={10} />
                 {new Date(medicine.expiryDate).toLocaleDateString()}
               </div>
             </div>
           )}
        </div>

        <div className="mt-3 pt-3 border-t border-gray-100 flex items-end justify-between">
           <div className="flex flex-col">
              <span className="text-[9px] font-bold text-gray-400 uppercase tracking-wider mb-0.5">{medicine.unit}</span>
              <div className="flex flex-col gap-0.5">
                {inventoryMode && <span className="text-[10px] font-bold text-gray-400">Buy: {formatCurrency(medicine.purchasePrice)}</span>}
                <span className="text-lg font-black text-gray-900 leading-none tracking-tight">{formatCurrency(medicine.salePrice)}</span>
              </div>
           </div>
           
           {actionSlot ? (
              <div className="flex gap-2 ml-2 w-1/2 justify-end items-center" onClick={(e) => e.stopPropagation()}>
                 {inventoryMode && (
                   <div className={clsx("text-xs font-black mr-2", isLowStock ? "text-red-600" : "text-gray-700")}>
                     {medicine.stock}
                   </div>
                 )}
                 {actionSlot}
              </div>
           ) : (
              !isOutOfStock && (
                <div className="text-xs font-semibold text-gray-500 bg-gray-50 px-2 py-1 rounded-lg border border-gray-100">
                   Qty: {medicine.stock}
                </div>
              )
           )}
        </div>
      </div>
    </div>
  );
};