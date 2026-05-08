import React, { useState, useEffect } from 'react';
import { storageService } from '../services/storageService';
import { Patient, LabTestRecord } from '../types';
import { Plus, Trash2, Edit2, ToggleLeft, ToggleRight, Search, Download, FileText } from 'lucide-react';
import { useDialog } from '../DialogContext';
import { LabReportModal } from '../components/LabReportModal';
import { PatientModal } from '../components/PatientModal';

const Patients: React.FC = () => {
  const { showConfirm } = useDialog();
  const [patients, setPatients] = useState<Patient[]>([]);
  const [labTests, setLabTests] = useState<LabTestRecord[]>([]);
  const [selectedReportPatient, setSelectedReportPatient] = useState<Patient | null>(null);
  const [editingPatient, setEditingPatient] = useState<Patient | null>(null);
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    loadPatients();
    const handlePatientAdded = () => loadPatients();
    window.addEventListener('patientAdded', handlePatientAdded);
    return () => window.removeEventListener('patientAdded', handlePatientAdded);
  }, []);

  const loadPatients = async () => {
    const data = await storageService.getPatients();
    const tests = await storageService.getLabTests();
    setPatients(data);
    setLabTests(tests);
  };

  const filteredPatients = patients.filter(p => 
    p.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
    p.phone.includes(searchQuery)
  );

  const handleDelete = async (id: string) => {
    // Using custom UI instead of confirm() for iframe compatibility
    const confirmed = await showConfirm('Are you sure you want to delete this patient?', 'Delete Patient');
    if (confirmed) {
      await storageService.deletePatient(id);
      loadPatients();
    }
  };

  const toggleStatus = async (patient: Patient) => {
    await storageService.updatePatient({ ...patient, isActive: !patient.isActive });
    loadPatients();
  };

  const exportPatientData = async (patient: Patient) => {
    const reports = await storageService.getPatientReports();
    const labTests = await storageService.getLabTests();
    
    const patientReports = reports.filter(r => r.patientId === patient.id);
    const patientLabTests = labTests.filter(t => t.patientId === patient.id);

    const data = {
      patientInfo: patient,
      reports: patientReports,
      labTests: patientLabTests
    };

    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `patient_${patient.name.replace(/\s+/g, '_')}_${patient.id}.json`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="p-6 space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold text-gray-800">Patients</h2>
        <div className="flex items-center gap-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4" />
            <input 
              type="text" 
              placeholder="Search by Name or Phone..." 
              className="pl-9 pr-4 py-2 rounded-xl border border-gray-200 text-sm outline-none focus:ring-2 focus:ring-blue-500 w-64"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
          <button 
            onClick={() => window.dispatchEvent(new Event('openPatientModal'))}
            className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-xl font-bold hover:bg-blue-700 transition-colors shadow-sm"
          >
            <Plus size={18} /> Add Patient
          </button>
        </div>
      </div>
      
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
        <table className="w-full text-left">
          <thead className="bg-gray-50 text-gray-500 text-xs uppercase">
            <tr>
              <th className="px-6 py-4">PID</th>
              <th className="px-6 py-4">Name</th>
              <th className="px-6 py-4">Age/Sex</th>
              <th className="px-6 py-4">Phone</th>
              <th className="px-6 py-4">Date</th>
              <th className="px-6 py-4">Lab Report</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {filteredPatients.map(p => (
              <tr key={p.id} className={!p.isActive ? 'opacity-50' : ''}>
                <td className="px-6 py-4 font-bold text-gray-900">{p.id.slice(-6)}</td>
                <td className="px-6 py-4 font-bold text-gray-800">{p.name}</td>
                <td className="px-6 py-4 text-gray-600">{p.age ? `${p.age}Y` : '-'} / {p.gender ? p.gender.charAt(0) : '-'}</td>
                <td className="px-6 py-4 text-gray-600">{p.phone}</td>
                <td className="px-6 py-4 text-gray-600 text-xs">
                  {p.registeredAt ? new Date(p.registeredAt).toLocaleDateString() : '-'}
                </td>
                <td className="px-6 py-4">
                  {labTests.filter(t => t.patientId === p.id).length > 0 ? (
                    <button 
                      onClick={() => setSelectedReportPatient(p)}
                      className="flex items-center gap-1 text-blue-600 hover:text-blue-800 font-bold text-xs bg-blue-50 px-3 py-1.5 rounded-lg transition-colors"
                    >
                      <FileText size={14} /> View Report
                    </button>
                  ) : (
                    <span className="text-xs text-gray-400 font-medium">-</span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {selectedReportPatient && (
        <LabReportModal 
          patient={selectedReportPatient} 
          tests={labTests.filter(t => t.patientId === selectedReportPatient.id)} 
          onClose={() => setSelectedReportPatient(null)} 
        />
      )}

      {/* We dispatch the custom event to open the modal, but if we have an editingPatient, we can just render it here or let App.tsx handle it. 
          Actually, since App.tsx handles the global modal, it's better to render a specific one here for editing, or update App.tsx to support editing.
          Let's render a local one for editing to keep it simple. */}
      {editingPatient && (
        <PatientModal 
          initialData={editingPatient}
          onClose={() => setEditingPatient(null)}
        />
      )}
    </div>
  );
};

export default Patients;
