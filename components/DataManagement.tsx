import React from 'react';
import { Download, Upload, FileJson, FileSpreadsheet, FileText, Database, Calendar, Clock, RefreshCw } from 'lucide-react';
import { motion } from 'motion/react';
import { clsx } from 'clsx';

interface DataManagementProps {
  onExport: (type: string, format: string) => void;
  onRestore: (format: string) => void;
}

export const DataManagement: React.FC<DataManagementProps> = ({ onExport, onRestore }) => {
  const exportItems = [
    { title: 'Full System Backup', id: 'full' },
    { title: 'Inventory List', id: 'inventory' },
    { title: 'Sales History', id: 'sales' },
    { title: 'Patients', id: 'patients' },
    { title: 'Lab Test', id: 'lab' },
    { title: 'Staff', id: 'staff' },
  ];

  const formats = [
    { label: 'JSON', icon: FileJson, color: 'text-yellow-600' },
    { label: 'CSV', icon: FileSpreadsheet, color: 'text-green-600' },
    { label: 'TXT', icon: FileText, color: 'text-blue-600' },
    { label: 'SQL', icon: Database, color: 'text-purple-600' },
  ];

  const scheduleItems = [
    { type: 'Daily', day: '', time: '8:00 PM', icon: Clock },
    { type: 'Weekly', day: 'every Friday', time: '8:00 PM', icon: Calendar },
    { type: 'Monthly', day: '1st date of every month', time: '8:00 AM', icon: Calendar },
  ];

  return (
    <div className="space-y-10">
      <div>
        <h2 className="text-3xl font-black text-gray-900 tracking-tight">Data Management</h2>
        <p className="text-gray-500 font-medium">Backup, Export, and Restore database.</p>
      </div>

      {/* Export / Backup Table */}
      <div className="bg-white rounded-[2.5rem] shadow-xl border border-white/40 overflow-hidden">
        <div className="p-8 border-b border-gray-100 bg-gray-50/50 flex justify-between items-center">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-blue-100 text-blue-600 rounded-2xl">
              <Download size={24} />
            </div>
            <h3 className="text-xl font-black text-gray-900 uppercase tracking-tight">Export / Backup</h3>
          </div>
          <span className="text-xs font-bold text-gray-400 uppercase tracking-widest">Backup Formats / Files</span>
        </div>
        
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-gray-50 text-[10px] font-black uppercase tracking-[0.2em] text-gray-400">
                <th className="px-8 py-4 border-b border-gray-100">Item Name</th>
                {formats.map(f => (
                  <th key={f.label} className="px-6 py-4 border-b border-gray-100 text-center">{f.label}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {exportItems.map((item) => (
                <tr key={item.id} className="group hover:bg-blue-50/30 transition-colors">
                  <td className="px-8 py-5 font-bold text-gray-700">{item.title}</td>
                  {formats.map(f => (
                    <td key={f.label} className="px-6 py-5 text-center">
                      <button 
                        onClick={() => onExport(item.id, f.label)}
                        className="p-2.5 rounded-xl hover:bg-white hover:shadow-md hover:text-blue-600 transition-all text-gray-400 group-hover:text-gray-500 active:scale-90"
                      >
                        <f.icon size={20} className={f.color} />
                      </button>
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Restore / Upload Table */}
      <div className="bg-white rounded-[2.5rem] shadow-xl border border-white/40 overflow-hidden">
        <div className="p-8 border-b border-gray-100 bg-gray-50/50 flex justify-between items-center">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-green-100 text-green-600 rounded-2xl">
              <Upload size={24} />
            </div>
            <h3 className="text-xl font-black text-gray-900 uppercase tracking-tight">Restore / Upload</h3>
          </div>
          <span className="text-xs font-bold text-gray-400 uppercase tracking-widest">Restore formats / files</span>
        </div>
        
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <tbody className="divide-y divide-gray-100 text-center">
              <tr className="group">
                <td className="px-8 py-8 font-bold text-gray-700 text-left w-1/3">
                  <div className="flex flex-col">
                    <span>Any File</span>
                    <span className="text-[10px] text-gray-400 font-medium normal-case mt-1">Accept and upload these backup files</span>
                  </div>
                </td>
                {formats.map(f => (
                  <td key={f.label} className="px-6 py-8">
                    <button 
                      onClick={() => onRestore(f.label)}
                      className="flex flex-col items-center gap-2 p-4 rounded-2xl hover:bg-gray-50 transition-all border-2 border-transparent hover:border-green-200 group/btn"
                    >
                      <f.icon size={32} className={clsx(f.color, "group-hover/btn:scale-110 transition-transform")} />
                      <span className="text-[10px] font-black uppercase tracking-widest text-gray-400 group-hover/btn:text-gray-900">{f.label}</span>
                    </button>
                  </td>
                ))}
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      {/* Backup Schedule */}
      <div className="bg-white rounded-[2.5rem] shadow-xl border border-white/40 overflow-hidden">
        <div className="p-8 border-b border-gray-100 bg-gray-100/30">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-purple-100 text-purple-600 rounded-2xl">
              <RefreshCw size={24} />
            </div>
            <h3 className="text-xl font-black text-gray-900 uppercase tracking-tight">Automated Backup Schedule</h3>
          </div>
        </div>
        
        <div className="p-8">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {scheduleItems.map((item) => (
              <div key={item.type} className="bg-gray-50 p-6 rounded-[2rem] border border-gray-100 flex items-center gap-4">
                <div className="p-4 bg-white rounded-2xl shadow-sm border border-gray-100 text-purple-600">
                  <item.icon size={24} />
                </div>
                <div>
                  <h4 className="font-black text-gray-900">{item.type}</h4>
                  <p className="text-xs font-bold text-gray-400 uppercase tracking-wider">{item.day || 'Daily Cycle'}</p>
                  <p className="text-medical-blue font-bold text-sm mt-1">{item.time}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};
