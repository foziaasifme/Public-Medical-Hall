import React, { useEffect, useState } from 'react';
import { X, Printer, Download, FileText } from 'lucide-react';
import { Patient, LabTestRecord, CompanySettings } from '../types';
import { Button } from './ui/Button';
import { storageService } from '../services/storageService';
import { motion } from 'motion/react';

interface LabReportModalProps {
  patient: Patient;
  tests: LabTestRecord[];
  onClose: () => void;
}

export const LabReportModal: React.FC<LabReportModalProps> = ({ patient, tests, onClose }) => {
  const [company, setCompany] = useState<CompanySettings | null>(null);

  useEffect(() => {
    storageService.getCompanySettings().then(setCompany);
  }, []);

  const handleDownloadPDF = async () => {
    // @ts-ignore
    if (typeof window.html2pdf === 'undefined') {
      console.warn("PDF Generator not loaded yet");
      return;
    }
    const element = document.getElementById('printable-lab-report');
    const filename = `LabReport_${patient.name.replace(/\s+/g, '_')}_${new Date().toISOString().split('T')[0]}.pdf`;
    const opt = {
      margin: 10,
      filename: filename,
      image: { type: 'jpeg', quality: 0.98 },
      html2canvas: { scale: 2, useCORS: true },
      jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' }
    };
    try {
      // @ts-ignore
      await window.html2pdf().set(opt).from(element).save();
    } catch (e) {
      console.error("PDF Generation failed", e);
    }
  };

  const handlePrint = () => {
    window.print();
  };

  if (!company) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm print:bg-white print:block print:static print:inset-auto">
      <motion.div 
        initial={{ opacity: 0, scale: 0.95, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 20 }}
        className="bg-white rounded-xl shadow-2xl w-full max-w-3xl overflow-hidden flex flex-col max-h-[90vh] print:shadow-none print:max-w-none print:w-full print:rounded-none print:h-auto print:block"
      >
        {/* Header */}
        <div className="p-4 border-b border-gray-100 flex justify-between items-center bg-gray-50 print:hidden" data-html2canvas-ignore="true">
          <h3 className="font-bold text-gray-800 flex items-center gap-2">
            <FileText size={18} className="text-blue-600" /> Lab Report Preview
          </h3>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 p-1 hover:bg-gray-200 rounded-full">
            <X size={18} />
          </button>
        </div>

        {/* Printable Content */}
        <div id="printable-lab-report" className="p-8 overflow-y-auto flex-1 bg-white print:p-0 print:overflow-visible text-black">
          {/* Clinic Header */}
          <div className="text-center mb-8 border-b-2 border-gray-800 pb-6">
            <h1 className="text-3xl font-black uppercase tracking-wider text-gray-900">{company.name}</h1>
            {company.doctorName && <p className="text-lg font-bold mt-1 text-gray-800">{company.doctorName}</p>}
            {company.doctorDegree && <p className="text-sm text-gray-600 font-bold">{company.doctorDegree}</p>}
            <p className="text-sm text-gray-500 mt-2">{company.address}</p>
            <p className="text-sm text-gray-500">Contact: {company.contact}</p>
          </div>

          {/* Patient Info */}
          <div className="flex justify-between items-start mb-8 bg-gray-50 p-4 rounded-lg border border-gray-200">
            <div>
              <p className="text-xs text-gray-500 uppercase font-bold mb-1">Patient Details</p>
              <h2 className="text-xl font-bold text-gray-900">{patient.name}</h2>
              <p className="text-sm text-gray-700 font-medium mt-1">PID: {patient.id.slice(-6)} | Phone: {patient.phone}</p>
              <p className="text-sm text-gray-700">Age/Sex: {patient.age ? `${patient.age}Y` : '-'} / {patient.gender || '-'}</p>
              {patient.referredBy && <p className="text-sm text-gray-700 mt-1">Ref By: <span className="font-bold">{patient.referredBy}</span></p>}
            </div>
            <div className="text-right">
              <p className="text-xs text-gray-500 uppercase font-bold mb-1">Report Date</p>
              <p className="text-sm font-bold text-gray-900">{new Date().toLocaleDateString()}</p>
            </div>
          </div>

          {/* Test Results */}
          <div className="mb-8 min-h-[300px]">
            <h3 className="text-lg font-bold border-b-2 border-gray-800 pb-2 mb-4 uppercase tracking-wider text-gray-900">Test Results</h3>
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b-2 border-gray-300 bg-gray-50/50">
                  <th className="py-3 px-2 font-bold text-xs text-gray-600 uppercase">Test Name</th>
                  <th className="py-3 px-2 font-bold text-xs text-gray-600 uppercase">Result</th>
                  <th className="py-3 px-2 font-bold text-xs text-gray-600 uppercase">Unit</th>
                  <th className="py-3 px-2 font-bold text-xs text-gray-600 uppercase">Normal Range</th>
                  <th className="py-3 px-2 font-bold text-xs text-gray-600 uppercase">Date</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {tests.map(test => (
                  <tr key={test.id}>
                    <td className="py-3 px-2 text-sm font-bold text-gray-900">{test.testType}</td>
                    <td className="py-3 px-2 text-sm font-black text-blue-700">{test.resultValue}</td>
                    <td className="py-3 px-2 text-sm text-gray-600">{test.unit}</td>
                    <td className="py-3 px-2 text-sm text-gray-600">{test.normalRange}</td>
                    <td className="py-3 px-2 text-sm text-gray-600">{new Date(test.date).toLocaleDateString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Footer */}
          <div className="mt-16 pt-8 border-t border-gray-300 flex justify-between items-end">
            <div className="text-xs text-gray-500 font-medium">
              <p>This is a computer-generated report.</p>
              <p>System: {company.name}</p>
            </div>
            <div className="text-center">
              <div className="w-48 border-b-2 border-gray-800 mb-2"></div>
              <p className="text-sm font-bold uppercase text-gray-800">Authorized Signature</p>
            </div>
          </div>
        </div>

        {/* Actions */}
        <div className="p-4 border-t border-gray-100 bg-gray-50 flex justify-end gap-3 print:hidden" data-html2canvas-ignore="true">
          <Button variant="secondary" onClick={onClose}>Close</Button>
          <Button variant="secondary" onClick={handlePrint} className="gap-2">
            <Printer size={16} /> Print
          </Button>
          <Button onClick={handleDownloadPDF} className="gap-2 bg-blue-600 hover:bg-blue-700 text-white">
            <Download size={16} /> Download PDF
          </Button>
        </div>
      </motion.div>

      <style>{`
        @media print {
          @page { size: A4 portrait; margin: 10mm; }
          body { background: white !important; }
          .print\\:hidden { display: none !important; }
          .print\\:block { display: block !important; }
          #printable-lab-report { width: 100% !important; height: auto !important; }
        }
      `}</style>
    </div>
  );
};
