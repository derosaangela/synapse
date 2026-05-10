
import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { extractContactFromNaturalLanguage } from '../services/geminiService';
import { Contact } from '../types';

interface AIImportModalProps {
  isOpen: boolean;
  onClose: () => void;
  onImport: (contact: Partial<Contact>) => void;
  currentCity: string;
}

const AIImportModal: React.FC<AIImportModalProps> = ({ isOpen, onClose, onImport, currentCity }) => {
  const [description, setDescription] = useState('');
  const [isExtracting, setIsExtracting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleExtract = async () => {
    if (!description.trim()) return;
    
    setIsExtracting(true);
    setError(null);
    
    try {
      const extractedContact = await extractContactFromNaturalLanguage(description, currentCity);
      if (extractedContact && extractedContact.name) {
        onImport(extractedContact);
        onClose();
        setDescription('');
      } else {
        setError("Could not extract contact details. Try being more specific!");
      }
    } catch (err) {
      console.error(err);
      setError("Something went wrong. Please try again.");
    } finally {
      setIsExtracting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-black/20 backdrop-blur-sm">
        <motion.div 
          initial={{ opacity: 0, scale: 0.9, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.9, y: 20 }}
          className="bg-white rounded-[40px] w-full max-w-2xl p-10 shadow-2xl border border-gray-100 relative overflow-hidden"
        >
          {/* Background Decoration */}
          <div className="absolute top-0 right-0 -mr-20 -mt-20 w-64 h-64 bg-indigo-50 rounded-full blur-3xl opacity-50" />
          <div className="absolute bottom-0 left-0 -ml-20 -mb-20 w-64 h-64 bg-purple-50 rounded-full blur-3xl opacity-50" />

          <button 
            onClick={onClose}
            className="absolute top-8 right-8 p-2 rounded-full hover:bg-gray-100 text-gray-400 transition-colors z-10"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>

          <div className="relative z-10">
            <div className="flex items-center gap-4 mb-2">
               <div className="w-10 h-10 bg-indigo-600 rounded-2xl flex items-center justify-center text-white shadow-lg shadow-indigo-100">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
                </svg>
              </div>
              <h3 className="text-2xl font-black text-gray-900 uppercase tracking-tight">AI Contact Import</h3>
            </div>
            <p className="text-gray-500 font-medium mb-8 italic">Just describe who you met and Synapse will do the rest.</p>

            <div className="space-y-6">
              <div className="relative">
                <textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className="w-full px-8 py-8 rounded-[32px] bg-gray-50/50 border border-indigo-50 focus:ring-4 focus:ring-indigo-100 outline-none transition-all font-medium text-gray-700 text-lg min-h-[240px] shadow-inner resize-none placeholder:text-gray-300"
                  placeholder="e.g. I met Sarah Chen yesterday at the Brew Coffee Shop. She's a Lead Engineer at Vercel. We talked about Next.js and hiking in the Peak District. Her email is sarah@vercel.com."
                  disabled={isExtracting}
                />
                
                {isExtracting && (
                  <div className="absolute inset-0 flex items-center justify-center bg-white/60 backdrop-blur-[2px] rounded-[32px] animate-in fade-in duration-300">
                    <div className="flex flex-col items-center gap-4">
                       <div className="flex gap-1.5">
                        <motion.div animate={{ height: [12, 28, 12] }} transition={{ repeat: Infinity, duration: 0.6 }} className="w-1.5 bg-indigo-600 rounded-full" />
                        <motion.div animate={{ height: [28, 12, 28] }} transition={{ repeat: Infinity, duration: 0.6, delay: 0.2 }} className="w-1.5 bg-indigo-400 rounded-full" />
                        <motion.div animate={{ height: [12, 28, 12] }} transition={{ repeat: Infinity, duration: 0.6, delay: 0.4 }} className="w-1.5 bg-indigo-600 rounded-full" />
                      </div>
                      <span className="text-xs font-black uppercase tracking-[0.2em] text-indigo-600">Extracting Intel...</span>
                    </div>
                  </div>
                )}
              </div>

              {error && (
                <motion.div 
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="p-4 bg-rose-50 border border-rose-100 rounded-2xl text-rose-600 text-sm font-bold flex items-center gap-3"
                >
                  <svg className="w-5 h-5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                  </svg>
                  {error}
                </motion.div>
              )}

              <div className="grid grid-cols-2 gap-4">
                <button
                  type="button"
                  onClick={onClose}
                  className="py-5 rounded-[24px] font-black uppercase tracking-widest text-[11px] text-gray-400 hover:text-gray-900 transition-all"
                >
                  Cancel
                </button>
                <button
                  onClick={handleExtract}
                  disabled={isExtracting || !description.trim()}
                  className="bg-indigo-600 text-white py-5 rounded-[24px] font-black uppercase tracking-widest text-[11px] shadow-xl shadow-indigo-100 hover:bg-indigo-700 disabled:opacity-50 transition-all active:scale-95 flex items-center justify-center gap-2"
                >
                  {isExtracting ? 'Analysing...' : 'Extract & Save'}
                  {!isExtracting && (
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M13 7l5 5m0 0l-5 5m5-5H6" />
                    </svg>
                  )}
                </button>
              </div>
            </div>

            <div className="mt-10 pt-8 border-t border-gray-50">
              <div className="flex items-center gap-4 text-gray-400">
                <div className="text-[10px] font-black uppercase tracking-[0.2em] whitespace-nowrap">Pro Tip:</div>
                <div className="h-px bg-gray-50 flex-1" />
              </div>
              <p className="text-[11px] font-medium text-gray-400 mt-3 leading-relaxed">
                Mention things like name, workplace, how you met, and any specific details. The AI will categorize them automatically into your memory vault.
              </p>
            </div>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};

export default AIImportModal;
