import React, { useState, useEffect } from 'react';
import { TestTubes, Plus, Activity, Phone, Mail, Printer, Edit2, ClipboardList, Trash2, Search, FileText, X } from 'lucide-react';
import { clsx } from 'clsx';
import { storageService } from '../services/storageService';
import { Patient, LabTestRecord, CompanySettings } from '../types';
import { useDialog } from '../DialogContext';

const AVAILABLE_TESTS = [
  { category: 'KIDNEY FUNCTION TEST (KFT)', name: 'Urea', unit: 'mg/dL', normalRange: '13 - 43' },
  { category: 'KIDNEY FUNCTION TEST (KFT)', name: 'Creatinine', unit: 'mg/dL', normalRange: '0.7 - 1.3' },
  { category: 'KIDNEY FUNCTION TEST (KFT)', name: 'Uric Acid', unit: 'mg/dL', normalRange: '3.5 - 7.2' },
  { category: 'KIDNEY FUNCTION TEST (KFT)', name: 'Calcium, Total', unit: 'mg/dL', normalRange: '8.7 - 10.4' },
  { category: 'KIDNEY FUNCTION TEST (KFT)', name: 'Phosphorus', unit: 'mg/dL', normalRange: '2.4 - 5.1' },
  { category: 'KIDNEY FUNCTION TEST (KFT)', name: 'Alkaline Phosphatase (ALP)', unit: 'U/L', normalRange: '30 - 120' },
  { category: 'KIDNEY FUNCTION TEST (KFT)', name: 'Total Protein', unit: 'g/dL', normalRange: '5.7 - 8.2' },
  { category: 'KIDNEY FUNCTION TEST (KFT)', name: 'Albumin', unit: 'g/dL', normalRange: '3.2 - 4.8' },
  { category: 'KIDNEY FUNCTION TEST (KFT)', name: 'Sodium', unit: 'mEq/L', normalRange: '136 - 145' },
  { category: 'KIDNEY FUNCTION TEST (KFT)', name: 'Potassium', unit: 'mEq/L', normalRange: '3.5 - 5.1' },
  { category: 'KIDNEY FUNCTION TEST (KFT)', name: 'Chloride', unit: 'mEq/L', normalRange: '98 - 107' },
  { category: 'COMPLETE BLOOD COUNT (CBC)', name: 'Hemoglobin', unit: 'g/dL', normalRange: '13.0 - 17.0' },
  { category: 'COMPLETE BLOOD COUNT (CBC)', name: 'WBC Count', unit: '10^3/uL', normalRange: '4.0 - 11.0' },
  { category: 'COMPLETE BLOOD COUNT (CBC)', name: 'Platelets', unit: '10^3/uL', normalRange: '150 - 400' },
  { category: 'OTHER TESTS', name: 'HbA1c', unit: '%', normalRange: '4.0 - 5.6' }
];

const LabTest: React.FC = () => {
  const { showAlert, showConfirm } = useDialog();
  const [patients, setPatients] = useState<Patient[]>([]);
  const [labTests, setLabTests] = useState<LabTestRecord[]>([]);
  const [company, setCompany] = useState<CompanySettings | null>(null);
  
  const [selectedPatientId, setSelectedPatientId] = useState('');
  const [testDate, setTestDate] = useState(new Date().toISOString().split('T')[0]);
  const [reportingDate, setReportingDate] = useState(new Date().toISOString().split('T')[0]);
  const [editingTestId, setEditingTestId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [reportModalPatientId, setReportModalPatientId] = useState<string | null>(null);
  
  // Multiple test form state
  const [formTests, setFormTests] = useState<{name: string, value: string, notes: string}[]>([
    { name: 'Creatinine', value: '', notes: '' }
  ]);

  useEffect(() => {
    const loadData = async () => {
      const p = await storageService.getPatients();
      const lt = await storageService.getLabTests();
      const comp = await storageService.getCompanySettings();
      setPatients(p);
      setLabTests(lt);
      setCompany(comp);
    };
    loadData();
  }, []);

  const handleAddTestRow = () => {
    setFormTests([...formTests, { name: AVAILABLE_TESTS[0].name, value: '', notes: '' }]);
  };

  const handleRemoveTestRow = (index: number) => {
    setFormTests(formTests.filter((_, i) => i !== index));
  };

  const handleTestChange = (index: number, field: 'name' | 'value' | 'notes', val: string) => {
    const newTests = [...formTests];
    newTests[index][field] = val;
    setFormTests(newTests);
  };

  const handleAddTest = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedPatientId || formTests.length === 0) return;

    const patient = patients.find(p => p.id === selectedPatientId);
    if (!patient) return;

    if (editingTestId) {
      // Logic for editing a single test row
      const ft = formTests[0];
      const template = AVAILABLE_TESTS.find(t => t.name === ft.name);
      if (!template) return;

      const updatedTest: LabTestRecord = {
        id: editingTestId,
        patientId: patient.id,
        patientName: patient.name,
        date: testDate,
        reportingDate: reportingDate,
        testType: template.name,
        category: template.category,
        resultValue: ft.value,
        unit: template.unit,
        normalRange: template.normalRange,
        notes: ft.notes
      };

      await storageService.updateLabTest(updatedTest);
    } else {
      // Logic for adding multiple new tests
      for (const ft of formTests) {
        if (!ft.value) continue;
        
        const template = AVAILABLE_TESTS.find(t => t.name === ft.name);
        if (!template) continue;

        const newTest: LabTestRecord = {
          id: `lt-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
          patientId: patient.id,
          patientName: patient.name,
          date: testDate,
          reportingDate: reportingDate,
          testType: template.name,
          category: template.category,
          resultValue: ft.value,
          unit: template.unit,
          normalRange: template.normalRange,
          notes: ft.notes
        };

        await storageService.addLabTest(newTest);
      }
    }

    setLabTests(await storageService.getLabTests());
    handleReset();
  };

  const handleEditTest = (test: LabTestRecord) => {
    setEditingTestId(test.id);
    setSelectedPatientId(test.patientId);
    setTestDate(test.date);
    setReportingDate(test.reportingDate || test.date);
    setFormTests([{ name: test.testType, value: test.resultValue, notes: test.notes || '' }]);
    
    // Smooth scroll to form on mobile
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleReset = () => {
    setSelectedPatientId('');
    setTestDate(new Date().toISOString().split('T')[0]);
    setReportingDate(new Date().toISOString().split('T')[0]);
    setFormTests([{ name: 'Creatinine', value: '', notes: '' }]);
    setEditingTestId(null);
  };

  const handleDeleteTest = async (id: string) => {
    const confirmed = await showConfirm('Are you sure you want to delete this test result?', 'Delete Result');
    if (confirmed) {
      await storageService.deleteLabTest(id);
      setLabTests(await storageService.getLabTests());
    }
  };

  const handleQuickReportView = async () => {
    if (!searchQuery.trim()) return;
    
    const query = searchQuery.trim().toLowerCase();
    const patient = patients.find(p => 
      p.name.toLowerCase().includes(query) || 
      p.phone.includes(query) || 
      p.id.toLowerCase().includes(query) ||
      p.id.toLowerCase().endsWith(query)
    );

    if (!patient) {
      await showAlert("Patient not found.", "Search Result");
      return;
    }

    const hasTests = labTests.some(t => t.patientId === patient.id);
    if (!hasTests) {
      await showAlert(`Report not found for ${patient.name}.`, "No Data");
      return;
    }

    setReportModalPatientId(patient.id);
  };

  const selectedPatient = patients.find(p => p.id === (reportModalPatientId || selectedPatientId));
  const patientTests = labTests
    .filter(t => t.patientId === selectedPatientId)
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

  // Group tests by category for the report
  const testsByCategory = patientTests.reduce((acc, test) => {
    const cat = test.category || 'OTHER TESTS';
    if (!acc[cat]) acc[cat] = [];
    acc[cat].push(test);
    return acc;
  }, {} as Record<string, LabTestRecord[]>);

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-500 pb-10">
      <div className="flex justify-between items-center bg-white p-6 rounded-2xl shadow-sm border border-gray-100 print:hidden">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 bg-blue-50 text-blue-600 rounded-xl flex items-center justify-center shadow-inner">
            <TestTubes size={24} />
          </div>
          <div>
            <h2 className="text-2xl font-black text-gray-800 tracking-tight">Lab Tests</h2>
            <p className="text-sm font-medium text-gray-500">Record and monitor patient test results</p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
            <input 
              type="text"
              placeholder="Search Name, Phone or PID..."
              className="pl-10 pr-4 py-2 rounded-xl border border-gray-200 outline-none focus:ring-2 focus:ring-medical-blue w-64 text-sm font-medium"
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleQuickReportView()}
            />
          </div>
          <button 
            onClick={handleQuickReportView}
            className="bg-medical-blue text-white px-4 py-2 rounded-xl font-bold flex items-center gap-2 hover:bg-blue-600 transition-colors shadow-sm"
          >
            <FileText size={18} /> View Report
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Add Test Form - Hidden in Print */}
        <div className="lg:col-span-1 bg-white p-6 rounded-2xl shadow-sm border border-gray-100 print:hidden h-fit">
          <h3 className="text-lg font-bold text-gray-800 mb-4 flex items-center gap-2">
            {editingTestId ? <Edit2 size={18} className="text-medical-blue" /> : <Plus size={18} className="text-medical-blue" />} 
            {editingTestId ? 'Edit Test Result' : 'Add Test Result'}
          </h3>
          <form onSubmit={handleAddTest} className="space-y-4">
            <div>
              <label className="text-xs font-bold text-gray-500 uppercase">Patient</label>
              <select 
                className="w-full mt-1 px-4 py-2 rounded-xl border border-gray-200 focus:ring-2 focus:ring-blue-500 outline-none"
                value={selectedPatientId}
                onChange={e => setSelectedPatientId(e.target.value)}
                required
              >
                <option value="">Select Patient</option>
                {patients.map(p => <option key={p.id} value={p.id}>{p.name} ({p.phone})</option>)}
              </select>
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-xs font-bold text-gray-500 uppercase">Test Date</label>
                <input 
                  type="date"
                  className="w-full mt-1 px-4 py-2 rounded-xl border border-gray-200 focus:ring-2 focus:ring-blue-500 outline-none"
                  value={testDate}
                  onChange={e => setTestDate(e.target.value)}
                  required
                />
              </div>
              <div>
                <label className="text-xs font-bold text-gray-500 uppercase">Reporting Date</label>
                <input 
                  type="date"
                  className="w-full mt-1 px-4 py-2 rounded-xl border border-gray-200 focus:ring-2 focus:ring-blue-500 outline-none"
                  value={reportingDate}
                  onChange={e => setReportingDate(e.target.value)}
                  required
                />
              </div>
            </div>

            <div className="space-y-3 pt-2 border-t border-gray-100">
              <div className="flex justify-between items-center">
                <label className="text-xs font-bold text-gray-500 uppercase">Test Results</label>
                <button type="button" onClick={handleAddTestRow} className="text-xs font-bold text-blue-600 hover:text-blue-800 flex items-center gap-1">
                  <Plus size={14} /> Add Test
                </button>
              </div>
              
              {formTests.map((ft, index) => {
                const template = AVAILABLE_TESTS.find(t => t.name === ft.name);
                return (
                  <div key={index} className="p-3 bg-gray-50 rounded-xl border border-gray-100 space-y-3 relative">
                    {formTests.length > 1 && (
                      <button type="button" onClick={() => handleRemoveTestRow(index)} className="absolute top-2 right-2 text-red-400 hover:text-red-600">
                        <Plus size={16} className="rotate-45" />
                      </button>
                    )}
                    
                    <div>
                      <select 
                        className="w-full px-3 py-1.5 text-sm rounded-lg border border-gray-200 focus:ring-2 focus:ring-blue-500 outline-none pr-8"
                        value={ft.name}
                        onChange={e => handleTestChange(index, 'name', e.target.value)}
                      >
                        {AVAILABLE_TESTS.map(t => <option key={t.name} value={t.name}>{t.name}</option>)}
                      </select>
                    </div>
                    
                    <div className="flex gap-3">
                      <div className="flex-1 relative">
                        <input 
                          type="number"
                          step="0.01"
                          placeholder="Result"
                          className="w-full px-3 py-1.5 text-sm rounded-lg border border-gray-200 focus:ring-2 focus:ring-blue-500 outline-none"
                          value={ft.value}
                          onChange={e => handleTestChange(index, 'value', e.target.value)}
                          required
                        />
                        <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[10px] text-gray-400 font-bold">
                          {template?.unit}
                        </span>
                      </div>
                    </div>
                    
                    {template?.normalRange && (
                      <div className="text-[10px] text-gray-500 font-medium">
                        Normal: {template.normalRange} {template.unit}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>

            <div className="flex gap-3 mt-4">
              <button 
                type="button" 
                onClick={handleReset}
                className="flex-1 bg-gray-100 text-gray-700 px-4 py-2 rounded-xl font-bold hover:bg-gray-200 transition-colors"
              >
                Reset
              </button>
              <button 
                type="submit" 
                className={clsx(
                  "flex-[2] text-white px-6 py-2 rounded-xl font-bold transition-colors",
                  editingTestId ? "bg-amber-600 hover:bg-amber-700" : "bg-blue-600 hover:bg-blue-700"
                )}
              >
                {editingTestId ? 'Update Result' : 'Save Results'}
              </button>
            </div>
          </form>
        </div>

        {/* Formal Report View */}
        <div className="lg:col-span-2 overflow-x-auto">
          {selectedPatient ? (
            <div className="a4-container shadow-2xl border border-gray-200 print:shadow-none print:border-none">
              
              {/* Print Button */}
              <button 
                onClick={handlePrint}
                className="absolute top-4 right-4 bg-gray-900 text-white p-2 rounded-full hover:bg-black transition-colors print:hidden shadow-md flex items-center gap-2 px-4 z-10"
                title="Print Report"
              >
                <Printer size={18} /> <span className="font-bold text-sm">Print Report</span>
              </button>

              {/* Header - Matching Attached Logo Style */}
              <div className="flex justify-between items-center border-b-8 border-blue-100 pb-4 mb-2">
                <div className="flex items-center gap-4">
                   <div className="w-20 h-20 bg-blue-700 text-white rounded-full flex items-center justify-center shrink-0 shadow-lg border-4 border-blue-100">
                     <Plus size={40} strokeWidth={3} />
                   </div>
                   <div>
                     <h1 className="text-3xl font-black text-blue-800 uppercase tracking-wider">{company?.name || 'DRLOGY PATHOLOGY LAB'}</h1>
                     <p className="text-sm font-bold text-gray-800 mt-1 flex items-center gap-2">
                       <Activity size={16} className="text-blue-600" /> Accurate | Caring | Instant
                     </p>
                     <p className="text-xs text-gray-500 mt-1">{company?.address || '105-108, SMART VISION COMPLEX, HEALTHCARE ROAD'}</p>
                   </div>
                </div>
                <div className="text-right text-sm">
                   <p className="flex items-center justify-end gap-2 font-bold text-gray-700">
                     <Phone size={16} className="text-green-600"/> {company?.contact || '0123456789'}
                   </p>
                   <p className="flex items-center justify-end gap-2 mt-1 font-medium text-gray-600">
                     <Mail size={16} className="text-yellow-500"/> contact@pathlab.com
                   </p>
                </div>
              </div>
              
              {/* Patient Info */}
              <div className="flex justify-between items-start border-b border-gray-300 pb-4 mb-6">
                <div className="flex-1">
                  <h2 className="text-xl font-bold text-gray-900">{selectedPatient.name}</h2>
                  <p className="text-sm text-gray-600 mt-1">Age : {selectedPatient.age || '-'} Years</p>
                  <p className="text-sm text-gray-600">Sex : {selectedPatient.gender || '-'}</p>
                  <p className="text-sm text-gray-600">PID : {selectedPatient.id.slice(-6)}</p>
                </div>
                <div className="flex-1 text-xs text-gray-500 border-l border-gray-300 pl-4 space-y-1">
                  <p><span className="font-bold text-gray-700">Registered on:</span> {selectedPatient.registeredAt ? new Date(selectedPatient.registeredAt).toLocaleDateString() : new Date().toLocaleDateString()}</p>
                  <p><span className="font-bold text-gray-700">Collected on:</span> {testDate ? new Date(testDate).toLocaleDateString() : new Date().toLocaleDateString()}</p>
                  <p><span className="font-bold text-gray-700">Reported on:</span> {reportingDate ? new Date(reportingDate).toLocaleDateString() : new Date().toLocaleDateString()}</p>
                </div>
              </div>

              {/* Table */}
              <table className="w-full text-left mb-8">
                <thead>
                  <tr className="border-b-2 border-gray-300">
                    <th className="py-1 font-bold text-gray-800 w-1/3">Investigation</th>
                    <th className="py-1 font-bold text-gray-800 w-1/4">Result</th>
                    <th className="py-1 font-bold text-gray-800 w-1/4">Reference Value</th>
                    <th className="py-1 font-bold text-gray-800 w-1/6">Unit</th>
                  </tr>
                </thead>
                <tbody>
                  {Object.keys(testsByCategory).length > 0 ? (
                    Object.entries(testsByCategory).map(([category, tests]: [string, LabTestRecord[]]) => (
                      <React.Fragment key={category}>
                        {/* Category Header Hidden as per request */}
                        <tr className="hidden print:hidden">
                          <td colSpan={4} className="py-4 text-center">
                            <h3 className="text-lg font-bold text-gray-800 uppercase tracking-widest border-b border-gray-300 inline-block pb-1">
                              {category}
                            </h3>
                          </td>
                        </tr>
                        
                        {/* Category Tests */}
                        {tests.map(test => {
                           let isHigh = false;
                           let isLow = false;
                           if (test.normalRange) {
                             const [min, max] = test.normalRange.split('-').map(s => parseFloat(s.trim()));
                             const val = parseFloat(test.resultValue as string);
                             if (!isNaN(min) && !isNaN(max) && !isNaN(val)) {
                               if (val > max) isHigh = true;
                               if (val < min) isLow = true;
                             }
                           }

                           return (
                             <tr key={test.id} className="border-b border-gray-100 group">
                               <td className="py-1 pr-4">
                                 <p className="font-bold text-gray-800">{test.testType}</p>
                                 {test.notes && <p className="text-[10px] text-gray-500 mt-0.5">{test.notes}</p>}
                               </td>
                               <td className="py-1">
                                 <span className={`font-bold ${isHigh ? 'text-red-600' : isLow ? 'text-blue-600' : 'text-gray-800'}`}>
                                   {test.resultValue}
                                 </span>
                                 {isHigh && <span className="ml-2 text-[10px] font-bold text-red-600 bg-red-50 px-1.5 py-0.5 rounded">High</span>}
                                 {isLow && <span className="ml-2 text-[10px] font-bold text-blue-600 bg-blue-50 px-1.5 py-0.5 rounded">Low</span>}
                               </td>
                               <td className="py-1 text-sm text-gray-600">{test.normalRange || '-'}</td>
                               <td className="py-1 text-sm text-gray-600">
                                 <div className="flex items-center justify-between">
                                   <span>{test.unit || '-'}</span>
                                   <button 
                                     onClick={() => handleEditTest(test)}
                                     className="text-blue-600 hover:text-blue-800 p-1 opacity-0 group-hover:opacity-100 transition-opacity print:hidden"
                                     title="Edit Test Result"
                                   >
                                     <Edit2 size={14} />
                                   </button>
                                 </div>
                               </td>
                             </tr>
                           );
                        })}
                      </React.Fragment>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={4} className="py-8 text-center text-gray-400 text-sm">
                        No test results recorded for this patient.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>

              {/* Footer */}
              <div className="absolute bottom-[20mm] left-[20mm] right-[20mm]">
                <div className="pt-4 border-t border-gray-300 flex justify-between items-end">
                  <div className="text-center">
                    <div className="w-40 border-b border-gray-400 mb-1"></div>
                    <p className="text-xs font-bold text-gray-800">Medical Lab Technician</p>
                  </div>
                  <div className="text-center text-xs text-gray-500 pb-2">
                    **** End of Report ****
                  </div>
                  <div className="text-center">
                    <div className="w-40 border-b border-gray-400 mb-1"></div>
                    <p className="text-xs font-bold text-gray-800">{company?.doctorName || 'Dr. Payal Shah'}</p>
                    <p className="text-[10px] text-gray-500">{company?.doctorDegree || '(MD, Pathologist)'}</p>
                  </div>
                </div>
                
                {/* Bottom Bar */}
                <div className="mt-6 bg-blue-700 text-white flex justify-between items-center px-6 py-2 rounded-lg">
                  <span className="font-bold tracking-widest uppercase text-sm">Sample Collection</span>
                  <span className="font-bold flex items-center gap-2 text-lg">
                    <Phone size={20} className="text-green-400" /> {company?.contact || '0123456789'}
                  </span>
                </div>
              </div>

            </div>
          ) : (
            <div className="bg-white p-8 rounded-2xl shadow-sm border border-gray-100 text-center h-full flex flex-col items-center justify-center print:hidden">
              <div className="w-16 h-16 bg-gray-50 text-gray-300 rounded-full flex items-center justify-center mb-4">
                <Activity size={32} />
              </div>
              <h3 className="text-lg font-bold text-gray-800 mb-2">Select a Patient</h3>
              <p className="text-gray-500 max-w-sm">
                Choose a patient from the list to view their formal laboratory report.
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Lab Tests Log Table */}
      <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 print:hidden overflow-hidden flex flex-col">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-lg font-bold text-gray-800 flex items-center gap-2">
            <ClipboardList className="text-medical-blue" size={20} /> 
            Recent Lab Tests Log
          </h3>
          <span className="text-xs font-bold text-gray-400 uppercase">
            Today's Tests: {labTests.filter(t => new Date(t.date).toDateString() === new Date().toDateString()).length}
          </span>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="text-[10px] font-bold text-gray-400 uppercase tracking-wider border-b border-gray-100">
                <th className="px-4 py-2">Date</th>
                <th className="px-4 py-2">Patient Name</th>
                <th className="px-4 py-2">Test Type</th>
                <th className="px-4 py-2">Result</th>
                <th className="px-4 py-2">Normal Range</th>
                <th className="px-4 py-2 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {labTests.length === 0 ? (
                <tr>
                  <td colSpan={6} className="p-4 text-center text-gray-400">No lab tests found.</td>
                </tr>
              ) : (
                labTests.slice(0, 10).map(test => (
                  <tr key={test.id} className="hover:bg-blue-50/20 transition-colors">
                    <td className="px-4 py-2 text-xs text-gray-500 whitespace-nowrap">
                      {new Date(test.date).toLocaleDateString()}
                    </td>
                    <td className="px-4 py-2">
                      <div className="text-sm font-bold text-gray-800">{test.patientName}</div>
                    </td>
                    <td className="px-4 py-2">
                      <div className="text-xs font-medium text-gray-600">{test.testType}</div>
                      <div className="text-[10px] text-gray-400 uppercase">{test.category}</div>
                    </td>
                    <td className="px-4 py-2">
                      <span className="text-sm font-bold text-gray-900">{test.resultValue} {test.unit}</span>
                    </td>
                    <td className="px-4 py-2 text-xs text-gray-500">
                      {test.normalRange} {test.unit}
                    </td>
                    <td className="px-4 py-2 text-right">
                      <div className="flex justify-end gap-2">
                        <button 
                          onClick={() => handleEditTest(test)}
                          className="p-1.5 text-blue-600 hover:bg-blue-100 rounded-lg transition-colors"
                          title="Edit"
                        >
                          <Edit2 size={14} />
                        </button>
                        <button 
                          onClick={() => {
                            setSelectedPatientId(test.patientId);
                            setReportModalPatientId(test.patientId);
                          }}
                          className="p-1.5 text-green-600 hover:bg-green-100 rounded-lg transition-colors"
                          title="View Report"
                        >
                          <FileText size={14} />
                        </button>
                        <button 
                          onClick={() => handleDeleteTest(test.id)}
                          className="p-1.5 text-red-600 hover:bg-red-100 rounded-lg transition-colors"
                          title="Remove"
                        >
                          <Trash2 size={14} />
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

      {reportModalPatientId && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-in fade-in duration-300">
          <div className="bg-white w-full max-w-[900px] max-h-[90vh] overflow-y-auto rounded-2xl relative shadow-2xl p-4 md:p-8">
            <button 
              onClick={() => setReportModalPatientId(null)}
              className="absolute top-4 right-4 p-2 hover:bg-gray-100 rounded-full text-gray-400 hover:text-gray-600 transition-colors z-[110]"
            >
              <X size={24} />
            </button>
            <div className="print:p-0">
               {/* Reuse the existing report view logic here by making sure selectedPatient and patientTests are correctly computed */}
               {(() => {
                 const modalPatient = patients.find(p => p.id === reportModalPatientId);
                 if (!modalPatient) return null;

                 const modalTests = labTests
                   .filter(t => t.patientId === reportModalPatientId)
                   .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

                 const modalTestsByCategory = modalTests.reduce((acc, test) => {
                   const cat = test.category || 'OTHER TESTS';
                   if (!acc[cat]) acc[cat] = [];
                   acc[cat].push(test);
                   return acc;
                 }, {} as Record<string, LabTestRecord[]>);

                 return (
                   <div className="a4-container shadow-none border-none mx-auto min-h-0 py-0">
                      {/* Header */}
                      <div className="flex justify-between items-center border-b-8 border-blue-100 pb-4 mb-2">
                        <div className="flex items-center gap-4">
                          <div className="w-20 h-20 bg-blue-700 text-white rounded-full flex items-center justify-center shrink-0 shadow-lg border-4 border-blue-100">
                            <Plus size={40} strokeWidth={3} />
                          </div>
                          <div>
                            <h1 className="text-3xl font-black text-blue-800 uppercase tracking-wider">{company?.name || 'DRLOGY PATHOLOGY LAB'}</h1>
                            <p className="text-sm font-bold text-gray-800 mt-1 flex items-center gap-2">
                              <Activity size={16} className="text-blue-600" /> Accurate | Caring | Instant
                            </p>
                            <p className="text-xs text-gray-500 mt-1">{company?.address || 'Clinic Address'}</p>
                          </div>
                        </div>
                        <div className="text-right text-sm">
                          <p className="flex items-center justify-end gap-2 font-bold text-gray-700">
                            <Phone size={16} className="text-green-600"/> {company?.contact || '0123456789'}
                          </p>
                          <p className="flex items-center justify-end gap-2 mt-1 font-medium text-gray-600">
                            <Mail size={16} className="text-yellow-500"/> {company?.email || 'contact@pathlab.com'}
                          </p>
                        </div>
                      </div>

                      {/* Patient Info */}
                      <div className="flex justify-between items-start border-b border-gray-300 pb-4 mb-6">
                        <div className="flex-1">
                          <h2 className="text-xl font-bold text-gray-900">{modalPatient.name}</h2>
                          <p className="text-sm text-gray-600 mt-1">Age : {modalPatient.age || '-'} Years</p>
                          <p className="text-sm text-gray-600">Sex : {modalPatient.gender || '-'}</p>
                          <p className="text-sm text-gray-600">PID : {modalPatient.id.slice(-6)}</p>
                        </div>
                        <div className="flex-1 text-xs text-gray-500 border-l border-gray-300 pl-4 space-y-1">
                          <p><span className="font-bold text-gray-700">Registered on:</span> {modalPatient.registeredAt ? new Date(modalPatient.registeredAt).toLocaleDateString() : new Date().toLocaleDateString()}</p>
                          <p><span className="font-bold text-gray-700">Collected on:</span> {modalTests[0] ? new Date(modalTests[0].date).toLocaleDateString() : new Date().toLocaleDateString()}</p>
                          <p><span className="font-bold text-gray-700">Reported on:</span> {modalTests[0]?.reportingDate ? new Date(modalTests[0].reportingDate).toLocaleDateString() : new Date().toLocaleDateString()}</p>
                        </div>
                      </div>

                      {/* Table */}
                      <table className="w-full text-left mb-8">
                        <thead>
                          <tr className="border-b-2 border-gray-300">
                            <th className="py-1 font-bold text-gray-800 w-1/3">Investigation</th>
                            <th className="py-1 font-bold text-gray-800 w-1/4">Result</th>
                            <th className="py-1 font-bold text-gray-800 w-1/4">Reference Value</th>
                            <th className="py-1 font-bold text-gray-800 w-1/6">Unit</th>
                          </tr>
                        </thead>
                        <tbody>
                          {(Object.entries(modalTestsByCategory) as [string, LabTestRecord[]][]).map(([category, tests]) => (
                            <React.Fragment key={category}>
                              <tr className="hidden print:hidden">
                                <td colSpan={4} className="py-2 text-center font-bold uppercase tracking-widest border-b border-gray-200">{category}</td>
                              </tr>
                              {tests.map(test => {
                                 let isHigh = false;
                                 let isLow = false;
                                 if (test.normalRange) {
                                   const [min, max] = test.normalRange.split('-').map(s => parseFloat(s.trim()));
                                   const val = parseFloat(test.resultValue as string);
                                   if (!isNaN(min) && !isNaN(max) && !isNaN(val)) {
                                     if (val > max) isHigh = true;
                                     if (val < min) isLow = true;
                                   }
                                 }
                                 return (
                                   <tr key={test.id} className="border-b border-gray-100">
                                     <td className="py-2 pr-4 font-bold text-gray-800">{test.testType}</td>
                                     <td className="py-2">
                                       <span className={clsx("font-bold", isHigh && "text-red-600", isLow && "text-blue-600")}>{test.resultValue}</span>
                                     </td>
                                     <td className="py-2 text-sm text-gray-600">{test.normalRange || '-'}</td>
                                     <td className="py-2 text-sm text-gray-600">{test.unit}</td>
                                   </tr>
                                 );
                              })}
                            </React.Fragment>
                          ))}
                        </tbody>
                      </table>

                      {/* Signatures */}
                      <div className="mt-auto pt-10 flex justify-between items-end border-t border-gray-300">
                        <div className="text-center">
                          <div className="w-40 border-b border-gray-400 mb-1"></div>
                          <p className="text-xs font-bold text-gray-800">Medical Lab Technician</p>
                        </div>
                        <div className="text-center text-xs text-gray-500 pb-2">
                          **** End of Report ****
                        </div>
                        <div className="text-center">
                           <div className="w-40 border-b border-gray-400 mb-1"></div>
                           <p className="text-xs font-bold text-gray-800">{company?.doctorName || 'Dr. Payal Shah'}</p>
                           <p className="text-[10px] text-gray-500">{company?.doctorDegree || '(MD, Pathologist)'}</p>
                        </div>
                      </div>
                   </div>
                 );
               })()}
               
               <div className="mt-8 flex justify-center gap-4 print:hidden">
                 <button 
                   onClick={() => window.print()} 
                   className="bg-medical-blue text-white px-8 py-2 rounded-xl font-bold flex items-center gap-2"
                 >
                   <Printer size={20} /> Print
                 </button>
                 <button 
                   onClick={() => setReportModalPatientId(null)} 
                   className="bg-gray-100 text-gray-700 px-8 py-2 rounded-xl font-bold"
                 >
                   Close
                 </button>
               </div>
            </div>
          </div>
        </div>
      )}
      
      {/* Print Styles */}
      <style>{`
        @media print {
          @page {
            size: A4;
            margin: 0;
          }
          body {
            background: white;
          }
          .print\\:hidden {
            display: none !important;
          }
          /* Hide sidebar and header from App.tsx */
          aside, header {
            display: none !important;
          }
          /* Ensure the report takes full page */
          main {
            padding: 0 !important;
            margin: 0 !important;
            width: 100% !important;
          }
        }
      `}</style>
    </div>
  );
};

export default LabTest;
