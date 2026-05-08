import React, { useState, useRef } from 'react';
import { Camera, Upload, X, Loader2, Pill, Check, AlertCircle, ShoppingCart } from 'lucide-react';
import { GoogleGenAI } from "@google/genai";
import { Medicine } from '../types';
import { storageService } from '../services/storageService';
import { clsx } from 'clsx';
import { motion, AnimatePresence } from 'motion/react';

interface PrescriptionScannerProps {
  onClose: () => void;
  onItemsExtracted: (items: Medicine[]) => void;
}

export const PrescriptionScanner: React.FC<PrescriptionScannerProps> = ({ onClose, onItemsExtracted }) => {
  const [isScanning, setIsScanning] = useState(false);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [results, setResults] = useState<{ originalName: string; matchedMedicine: Medicine | null }[]>([]);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async () => {
      const base64 = reader.result as string;
      setPreviewUrl(base64);
      analyzeImage(base64.split(',')[1]);
    };
    reader.readAsDataURL(file);
  };

  const analyzeImage = async (base64Data: string) => {
    setIsScanning(true);
    setError(null);
    setResults([]);

    try {
      const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
      
      const prompt = `Analyze this doctor's prescription image and extract a list of medicine names. 
      Return only a JSON array of strings containing the medicine names.
      Example: ["Panadol", "Amoxicillin", "Enervon"].
      Don't include any other text.`;

      const response = await ai.models.generateContent({
        model: "gemini-3-flash-preview",
        contents: [
          {
            parts: [
              { text: prompt },
              { inlineData: { mimeType: "image/jpeg", data: base64Data } }
            ]
          }
        ],
        config: {
            responseMimeType: "application/json"
        }
      });

      const text = response.text;
      const extractedNames: string[] = JSON.parse(text || "[]");

      // Now match with inventory
      const medicines = await storageService.getMedicines();
      const matchedResults = extractedNames.map(name => {
        const matched = medicines.find(m => 
          m.name.toLowerCase().includes(name.toLowerCase()) || 
          m.genericName.toLowerCase().includes(name.toLowerCase())
        );
        return { originalName: name, matchedMedicine: matched || null };
      });

      setResults(matchedResults);
    } catch (err) {
      console.error(err);
      setError("Failed to analyze prescription. Please try again or upload a clearer image.");
    } finally {
      setIsScanning(false);
    }
  };

  const handleAddAll = () => {
    const itemsToAdd = results
      .filter(r => r.matchedMedicine !== null)
      .map(r => r.matchedMedicine!) as Medicine[];
    
    if (itemsToAdd.length > 0) {
      onItemsExtracted(itemsToAdd);
      onClose();
    }
  };

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
      <motion.div 
        initial={{ opacity: 0, scale: 0.95, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        className="bg-white rounded-3xl shadow-2xl w-full max-w-lg overflow-hidden flex flex-col max-h-[90vh]"
      >
        <div className="p-6 border-b border-gray-100 flex items-center justify-between bg-medical-blue text-white">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-white/20 rounded-xl flex items-center justify-center">
              <Camera size={20} />
            </div>
            <div>
              <h2 className="text-xl font-bold">Scan Prescription</h2>
              <p className="text-xs text-blue-100 opacity-80 uppercase tracking-wider font-bold">AI Extraction Tool</p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-white/10 rounded-full transition-colors">
            <X size={24} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {!previewUrl ? (
            <div className="space-y-4">
              <div 
                onClick={() => fileInputRef.current?.click()}
                className="border-2 border-dashed border-gray-200 rounded-3xl p-10 flex flex-col items-center justify-center gap-4 hover:border-medical-blue hover:bg-blue-50/50 transition-all cursor-pointer group"
              >
                <div className="w-16 h-16 bg-gray-50 group-hover:bg-medical-blue/10 rounded-2xl flex items-center justify-center transition-colors">
                  <Upload className="text-gray-400 group-hover:text-medical-blue" size={32} />
                </div>
                <div className="text-center">
                  <p className="font-bold text-gray-700">Upload Prescription Image</p>
                  <p className="text-sm text-gray-500">Supports PNG, JPG (Max 5MB)</p>
                </div>
                <input 
                  type="file" 
                  ref={fileInputRef} 
                  className="hidden" 
                  accept="image/*" 
                  onChange={handleFileSelect}
                />
              </div>

              <div className="bg-amber-50 border border-amber-100 rounded-2xl p-4 flex gap-3 text-amber-800">
                <AlertCircle size={20} className="shrink-0" />
                <p className="text-sm leading-relaxed">
                  Make sure the prescriptions are clearly legible. AI might make mistakes with handwritten notes.
                </p>
              </div>
            </div>
          ) : (
            <div className="space-y-6">
              <div className="relative rounded-2xl overflow-hidden border border-gray-200 bg-gray-50">
                <img src={previewUrl} alt="Prescription" className="w-full h-48 object-contain" />
                {isScanning && (
                  <div className="absolute inset-0 bg-black/40 backdrop-blur-[2px] flex flex-col items-center justify-center text-white p-4">
                    <Loader2 className="animate-spin mb-3 text-blue-400" size={40} />
                    <p className="font-bold text-lg animate-pulse">Analyzing with Gemini AI...</p>
                    <p className="text-xs opacity-70 mt-1">Detecting medicines and generic names</p>
                  </div>
                )}
                {!isScanning && (
                  <button 
                    onClick={() => { setPreviewUrl(null); setResults([]); }}
                    className="absolute top-2 right-2 p-2 bg-black/50 text-white rounded-full hover:bg-black/70 transition-colors"
                  >
                    <X size={16} />
                  </button>
                )}
              </div>

              {error && (
                <div className="bg-red-50 border border-red-100 rounded-2xl p-4 text-red-700 text-sm flex gap-2">
                  <X /> {error}
                </div>
              )}

              {results.length > 0 && (
                <div className="space-y-3">
                  <h3 className="font-bold text-gray-800 px-1">Extracted Medicines</h3>
                  <div className="space-y-2">
                    {results.map((res, i) => (
                      <div 
                        key={i} 
                        className={clsx(
                          "p-3 rounded-2xl border flex items-center justify-between transition-all",
                          res.matchedMedicine ? "bg-green-50/50 border-green-100" : "bg-gray-50 border-gray-100 opacity-60"
                        )}
                      >
                        <div className="flex items-center gap-3">
                          <div className={clsx(
                            "w-8 h-8 rounded-lg flex items-center justify-center",
                            res.matchedMedicine ? "bg-green-500 text-white" : "bg-gray-200 text-gray-500"
                          )}>
                            <Pill size={16} />
                          </div>
                          <div>
                            <p className="font-bold text-sm text-gray-800 capitalize">{res.originalName}</p>
                            {res.matchedMedicine && (
                              <p className="text-[10px] text-green-700 font-bold uppercase tracking-tight">
                                Matches: {res.matchedMedicine.name} ({res.matchedMedicine.genericName})
                              </p>
                            )}
                            {!res.matchedMedicine && (
                              <p className="text-[10px] text-gray-500 font-bold">Not found in inventory</p>
                            )}
                          </div>
                        </div>
                        {res.matchedMedicine && <Check className="text-green-500" size={18} />}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {results.length > 0 && !isScanning && (
          <div className="p-6 border-t border-gray-100">
            <button 
              onClick={handleAddAll}
              disabled={!results.some(r => r.matchedMedicine !== null)}
              className="w-full py-4 bg-medical-blue text-white rounded-2xl font-bold flex items-center justify-center gap-3 shadow-lg shadow-blue-500/20 hover:-translate-y-1 active:translate-y-0 transition-all disabled:opacity-50 disabled:translate-y-0"
            >
              <ShoppingCart size={20} />
              Add All Matches to Cart
            </button>
          </div>
        )}
      </motion.div>
    </div>
  );
};
