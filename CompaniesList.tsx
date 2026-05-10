
import React, { useState, useMemo } from 'react';
import { Company, Role, CompanyStage, BusinessModel, Team } from '../types';
import { enrichCompanyData, suggestRolesForCompany, isAiEnabled } from '../services/geminiService';

interface CompaniesListProps {
  companies: Company[];
  onAddCompany: (company: Company) => void;
  onUpdateCompany: (company: Company) => void;
}

const PRESET_STAGES: string[] = ['Startup', 'Scaleup', 'Corporate'];
const PRESET_MODELS: string[] = ['SaaS', 'B2B', 'B2C', 'Marketplace', 'Fintech', 'HealthTech', 'AI/ML'];

const CompaniesList: React.FC<CompaniesListProps> = ({ companies, onAddCompany, onUpdateCompany }) => {
  const [isAdding, setIsAdding] = useState(false);
  const [newCompanyName, setNewCompanyName] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [selectedCompany, setSelectedCompany] = useState<Company | null>(null);
  const [activeInterests, setActiveInterests] = useState<string[]>([]);
  const [isEditing, setIsEditing] = useState(false);
  const [duplicateWarning, setDuplicateWarning] = useState<boolean>(false);
  
  const [isCustomStage, setIsCustomStage] = useState(false);
  const [isCustomModel, setIsCustomModel] = useState(false);
  const [editFormData, setEditFormData] = useState<Partial<Company>>({});

  const aiActive = isAiEnabled();

  const initiateAddCompany = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCompanyName) return;
    
    const exists = companies.some(c => c.name.toLowerCase() === newCompanyName.toLowerCase());
    if (exists && !duplicateWarning) {
      setDuplicateWarning(true);
      return;
    }
    
    executeAddCompany();
  };

  const executeAddCompany = async () => {
    setIsLoading(true);
    setDuplicateWarning(false);
    
    let enriched: Partial<Company> = {};
    if (aiActive) {
      enriched = await enrichCompanyData(newCompanyName);
    }

    const newCompany: Company = {
      id: Math.random().toString(36).substr(2, 9),
      name: newCompanyName,
      industry: enriched.industry || 'Tech',
      description: enriched.description || '',
      website: '', 
      careerWebsite: enriched.careerWebsite || '',
      stage: enriched.stage || 'Startup',
      valuation: enriched.valuation,
      leadInvestor: enriched.leadInvestor,
      businessModel: enriched.businessModel || 'SaaS',
      roles: [],
      teams: enriched.teams || []
    };
    onAddCompany(newCompany);
    setNewCompanyName('');
    setIsAdding(false);
    setIsLoading(false);
  };

  const startEditing = (company: Company) => {
    setEditFormData({ ...company });
    setIsCustomStage(!PRESET_STAGES.includes(company.stage || ''));
    setIsCustomModel(!PRESET_MODELS.includes(company.businessModel || ''));
    setIsEditing(true);
  };

  const handleUpdate = (e: React.FormEvent) => {
    e.preventDefault();
    if (selectedCompany && editFormData) {
      const updated = { ...selectedCompany, ...editFormData } as Company;
      onUpdateCompany(updated);
      setSelectedCompany(updated);
      setIsEditing(false);
    }
  };

  const generateAILRoles = async (company: Company) => {
    if (!aiActive) return;
    setIsLoading(true);
    const roles = await suggestRolesForCompany(company.name, company.industry);
    onUpdateCompany({ ...company, roles: [...company.roles, ...roles] });
    setIsLoading(false);
  };

  const toggleInterest = (stage: string) => {
    setActiveInterests(prev => 
      prev.includes(stage) ? prev.filter(s => s !== stage) : [...prev, stage]
    );
  };

  const filteredCompanies = useMemo(() => {
    if (activeInterests.length === 0) return companies;
    return companies.filter(c => {
      if (!c.stage) return false;
      const stageLower = c.stage.toLowerCase();
      
      return activeInterests.some(interest => {
        if (interest === 'Startup') {
          return stageLower === 'startup' || 
                 stageLower.includes('seed') || 
                 stageLower.includes('series');
        }
        return c.stage === interest;
      });
    });
  }, [companies, activeInterests]);

  const getUpsideBadge = (valuation?: number, stage?: string) => {
    if (!valuation) return null;
    const isStartupStage = stage && (
      stage.toLowerCase() === 'startup' || 
      stage.toLowerCase().includes('seed') || 
      stage.toLowerCase().includes('series')
    );

    if (isStartupStage && valuation < 100) {
      return (
        <span className="px-2 py-0.5 bg-amber-100/50 text-amber-700 text-[9px] font-black uppercase tracking-widest rounded-md border border-amber-200">
          High Upside
        </span>
      );
    }
    return null;
  };

  const ensureHttp = (url: string) => {
    if (!url) return '#';
    return url.startsWith('http') ? url : `https://${url}`;
  };

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-2 duration-500">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-6">
        <div>
          <h2 className="text-4xl font-extrabold text-gray-900 tracking-tight">Industry</h2>
          <p className="text-gray-500 mt-1 font-medium italic">Recall every interesting company you thought of.</p>
          
          <div className="flex items-center gap-2 mt-4">
            <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest mr-2">Focus Filter:</span>
            {PRESET_STAGES.map(stage => (
              <button
                key={stage}
                onClick={() => toggleInterest(stage)}
                className={`px-4 py-1.5 rounded-full text-[10px] font-black uppercase tracking-wider transition-all border ${
                  activeInterests.includes(stage)
                    ? 'bg-indigo-600 border-indigo-600 text-white shadow-md'
                    : 'bg-white/40 border-white text-gray-500 hover:text-indigo-600'
                }`}
              >
                {stage}
              </button>
            ))}
          </div>
        </div>
        <button 
          onClick={() => { setIsAdding(true); setDuplicateWarning(false); }}
          className="bg-indigo-600 hover:bg-indigo-700 text-white px-8 py-3 rounded-2xl font-bold shadow-xl shadow-indigo-100 transition-all hover:-translate-y-0.5 whitespace-nowrap"
        >
          Add Company
        </button>
      </div>

      {!aiActive && (
        <div className="p-4 bg-amber-50/50 border border-amber-200 rounded-2xl flex items-center gap-3 animate-in fade-in slide-in-from-top-4 duration-700">
          <div className="w-8 h-8 rounded-full bg-amber-100 flex items-center justify-center text-amber-600 shrink-0">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
          </div>
          <p className="text-sm font-bold text-amber-800">
            AI enrichment is currently offline. <span className="font-medium">Please check your API key in environment variables.</span>
          </p>
        </div>
      )}

      {isAdding && (
        <div className="fixed inset-0 bg-white/20 backdrop-blur-md z-50 flex items-center justify-center p-4">
          <div className="glass-card p-8 max-w-md w-full animate-in zoom-in-95 duration-300">
            <h3 className="text-2xl font-bold mb-6 text-gray-900">New Target</h3>
            <form onSubmit={initiateAddCompany} className="space-y-6">
              <div>
                <label className="block text-xs font-bold text-gray-400 uppercase tracking-widest mb-2">Company Name</label>
                <input 
                  autoFocus
                  type="text"
                  value={newCompanyName}
                  onChange={(e) => { setNewCompanyName(e.target.value); setDuplicateWarning(false); }}
                  placeholder="e.g. Anthropic, Vercel"
                  className={`w-full px-5 py-4 rounded-2xl bg-white/50 border focus:ring-4 focus:ring-indigo-100 outline-none transition-all placeholder:text-gray-300 font-bold ${duplicateWarning ? 'border-amber-400' : 'border-white'}`}
                />
                {duplicateWarning ? (
                  <div className="mt-4 p-4 bg-amber-50 border border-amber-200 rounded-xl animate-in fade-in slide-in-from-top-2">
                    <p className="text-amber-800 text-xs font-bold">⚠️ Already in your synapse!</p>
                    <p className="text-amber-700 text-[10px] mt-1">Are you sure you want to add this company again?</p>
                    <button 
                      type="button"
                      onClick={executeAddCompany}
                      className="mt-3 text-[10px] font-black uppercase tracking-widest text-indigo-600 hover:text-indigo-800"
                    >
                      Confirm: Add Again
                    </button>
                  </div>
                ) : (
                  <p className="mt-3 text-[10px] text-gray-400 italic leading-relaxed">
                    {aiActive ? 'Synapse AI will automatically attempt to map Valuation, Stage, Business Model, and Team Structure.' : 'AI Enrichment is currently unavailable.'}
                  </p>
                )}
              </div>
              <div className="flex gap-4">
                <button 
                  type="button"
                  onClick={() => setIsAdding(false)}
                  className="flex-1 py-4 text-gray-600 font-bold hover:text-gray-900"
                >
                  Cancel
                </button>
                <button 
                  disabled={isLoading}
                  type="submit"
                  className="flex-[2] py-4 bg-indigo-600 text-white font-bold rounded-2xl hover:bg-indigo-700 shadow-lg shadow-indigo-100 disabled:opacity-50"
                >
                  {isLoading ? 'Scanning Synapses...' : (aiActive ? 'Add & Map' : 'Add Company')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
        {filteredCompanies.map(company => (
          <div 
            key={company.id}
            onClick={() => { setSelectedCompany(company); setIsEditing(false); }}
            className="glass-card p-7 hover:-translate-y-1 transition-all duration-300 cursor-pointer group flex flex-col h-full border-transparent hover:border-indigo-100/50"
          >
            <div className="flex items-start justify-between mb-6">
              <div className="w-14 h-14 bg-white/80 rounded-2xl flex items-center justify-center text-indigo-600 font-extrabold text-2xl shadow-sm border border-white uppercase shrink-0">
                {company.name.charAt(0)}
              </div>
              <div className="flex flex-col items-end gap-1.5 min-w-0">
                <span className="px-3 py-1 bg-indigo-50/50 text-indigo-700 text-[9px] font-black uppercase tracking-wider rounded-full border border-indigo-100 max-w-full truncate">
                  {company.stage || 'N/A'}
                </span>
                {getUpsideBadge(company.valuation, company.stage)}
              </div>
            </div>
            
            <h3 className="text-xl font-bold mb-1 text-gray-900 group-hover:text-indigo-600 transition-colors truncate">{company.name}</h3>
            <p className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] mb-3 truncate">{company.industry}</p>
            
            <p className="text-gray-500 text-sm leading-relaxed line-clamp-2 mb-6 font-medium">
              {company.description || 'No summary available.'}
            </p>

            <div className="mt-auto space-y-4">
              <div className="grid grid-cols-2 gap-2">
                <div className="bg-white/30 p-2 rounded-xl border border-white/50">
                  <span className="block text-[8px] font-black text-gray-400 uppercase tracking-widest">Model</span>
                  <span className="text-xs font-bold text-gray-700 truncate block">{company.businessModel || '—'}</span>
                </div>
                <div className="bg-white/30 p-2 rounded-xl border border-white/50">
                  <span className="block text-[8px] font-black text-gray-400 uppercase tracking-widest">Valuation</span>
                  <span className="text-xs font-bold text-gray-700 block">{company.valuation ? `$${company.valuation}M` : '—'}</span>
                </div>
              </div>

              <div className="flex items-center justify-between pt-4 border-t border-white/50">
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></div>
                  <span className="text-[9px] font-black text-gray-400 uppercase tracking-widest">{company.roles.length} Roles</span>
                </div>
                <svg className="w-5 h-5 text-gray-300 group-hover:text-indigo-400 group-hover:translate-x-1 transition-all" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M17 8l4 4m0 0l-4 4m4-4H3" />
                </svg>
              </div>
            </div>
          </div>
        ))}
      </div>

      {selectedCompany && (
        <div className="fixed inset-0 bg-black/10 backdrop-blur-xl z-50 flex items-center justify-center p-4">
          <div className="glass-card p-10 max-w-3xl w-full max-h-[90vh] overflow-y-auto no-scrollbar animate-in zoom-in-95 duration-300 relative">
            <button onClick={() => { setSelectedCompany(null); setIsEditing(false); }} className="absolute top-6 right-6 text-gray-400 hover:text-gray-900 transition-colors">
              <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M6 18L18 6M6 6l12 12" /></svg>
            </button>

            {isEditing ? (
              <form onSubmit={handleUpdate} className="space-y-6 max-w-2xl mx-auto">
                <div className="flex items-center gap-6 mb-8">
                  <div className="w-20 h-20 bg-indigo-600 rounded-3xl flex items-center justify-center text-white font-black text-4xl shadow-md border border-white uppercase">
                    {selectedCompany.name.charAt(0)}
                  </div>
                  <h3 className="text-3xl font-black text-gray-900 tracking-tight">Edit Intelligence</h3>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="col-span-2">
                    <label className="block text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] mb-2 ml-1">Company Name</label>
                    <input 
                      type="text"
                      className="w-full px-4 py-3 bg-white/50 border border-white rounded-xl text-sm font-bold outline-none focus:ring-2 focus:ring-indigo-200"
                      value={editFormData.name || ''}
                      onChange={e => setEditFormData({...editFormData, name: e.target.value})}
                    />
                  </div>

                  <div className="col-span-2">
                    <label className="block text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] mb-2 ml-1">Careers Website</label>
                    <input 
                      type="text"
                      placeholder="e.g. company.com/careers"
                      className="w-full px-4 py-3 bg-white/50 border border-white rounded-xl text-sm font-bold outline-none focus:ring-2 focus:ring-indigo-200"
                      value={editFormData.careerWebsite || ''}
                      onChange={e => setEditFormData({...editFormData, careerWebsite: e.target.value})}
                    />
                  </div>
                  
                  <div>
                    <div className="flex justify-between items-center mb-2 px-1">
                      <label className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em]">Stage</label>
                      <button type="button" onClick={() => setIsCustomStage(!isCustomStage)} className="text-[9px] font-black text-indigo-500 uppercase hover:underline">
                        {isCustomStage ? 'Presets' : 'Type custom'}
                      </button>
                    </div>
                    {isCustomStage ? (
                      <input 
                        type="text"
                        placeholder="e.g. Series B"
                        className="w-full px-4 py-3 bg-white/50 border border-white rounded-xl text-sm font-bold outline-none focus:ring-2 focus:ring-indigo-200"
                        value={editFormData.stage || ''}
                        onChange={e => setEditFormData({...editFormData, stage: e.target.value})}
                      />
                    ) : (
                      <select 
                        className="w-full px-4 py-3 bg-white/50 border border-white rounded-xl text-sm font-bold outline-none focus:ring-2 focus:ring-indigo-200"
                        value={editFormData.stage || ''}
                        onChange={e => setEditFormData({...editFormData, stage: e.target.value})}
                      >
                        {PRESET_STAGES.map(s => <option key={s} value={s}>{s}</option>)}
                      </select>
                    )}
                  </div>

                  <div>
                    <div className="flex justify-between items-center mb-2 px-1">
                      <label className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em]">Business Model</label>
                      <button type="button" onClick={() => setIsCustomModel(!isCustomModel)} className="text-[9px] font-black text-indigo-500 uppercase hover:underline">
                        {isCustomModel ? 'Presets' : 'Type custom'}
                      </button>
                    </div>
                    {isCustomModel ? (
                      <input 
                        type="text"
                        placeholder="e.g. DeepTech"
                        className="w-full px-4 py-3 bg-white/50 border border-white rounded-xl text-sm font-bold outline-none focus:ring-2 focus:ring-indigo-200"
                        value={editFormData.businessModel || ''}
                        onChange={e => setEditFormData({...editFormData, businessModel: e.target.value})}
                      />
                    ) : (
                      <select 
                        className="w-full px-4 py-3 bg-white/50 border border-white rounded-xl text-sm font-bold outline-none focus:ring-2 focus:ring-indigo-200"
                        value={editFormData.businessModel || ''}
                        onChange={e => setEditFormData({...editFormData, businessModel: e.target.value})}
                      >
                        {PRESET_MODELS.map(m => <option key={m} value={m}>{m}</option>)}
                      </select>
                    )}
                  </div>

                  <div>
                    <label className="block text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] mb-2 ml-1">Valuation ($M)</label>
                    <input 
                      type="number"
                      className="w-full px-4 py-3 bg-white/50 border border-white rounded-xl text-sm font-bold outline-none focus:ring-2 focus:ring-indigo-200"
                      value={editFormData.valuation || 0}
                      onChange={e => setEditFormData({...editFormData, valuation: Number(e.target.value)})}
                    />
                  </div>

                  <div>
                    <label className="block text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] mb-2 ml-1">Industry</label>
                    <input 
                      type="text"
                      className="w-full px-4 py-3 bg-white/50 border border-white rounded-xl text-sm font-bold outline-none focus:ring-2 focus:ring-indigo-200"
                      value={editFormData.industry || ''}
                      onChange={e => setEditFormData({...editFormData, industry: e.target.value})}
                    />
                  </div>

                  <div className="col-span-2">
                    <label className="block text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] mb-2 ml-1">Lead Investor</label>
                    <input 
                      type="text"
                      className="w-full px-4 py-3 bg-white/50 border border-white rounded-xl text-sm font-bold outline-none focus:ring-2 focus:ring-indigo-200"
                      value={editFormData.leadInvestor || ''}
                      onChange={e => setEditFormData({...editFormData, leadInvestor: e.target.value})}
                    />
                  </div>
                  
                  <div className="col-span-2">
                    <label className="block text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] mb-2 ml-1">Description</label>
                    <textarea 
                      className="w-full px-4 py-3 bg-white/50 border border-white rounded-xl text-sm font-bold outline-none focus:ring-2 focus:ring-indigo-200"
                      rows={3}
                      value={editFormData.description || ''}
                      onChange={e => setEditFormData({...editFormData, description: e.target.value})}
                    />
                  </div>
                </div>

                <div className="flex gap-4 pt-4">
                  <button 
                    type="button" 
                    onClick={() => setIsEditing(false)}
                    className="flex-1 py-4 text-gray-500 font-bold hover:text-gray-900"
                  >
                    Cancel
                  </button>
                  <button 
                    type="submit"
                    className="flex-[2] py-4 bg-indigo-600 text-white font-black uppercase tracking-widest rounded-2xl hover:bg-indigo-700 shadow-lg shadow-indigo-100 transition-all"
                  >
                    Save Changes
                  </button>
                </div>
              </form>
            ) : (
              <div className="flex flex-col gap-12">
                {/* Header Section */}
                <div className="space-y-8">
                  <div className="flex items-center gap-6">
                    <div className="w-20 h-20 bg-white/80 rounded-3xl flex items-center justify-center text-indigo-600 font-black text-4xl shadow-md border border-white uppercase">
                      {selectedCompany.name.charAt(0)}
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center justify-between mb-1">
                        <h3 className="text-3xl font-black text-gray-900 tracking-tight">{selectedCompany.name}</h3>
                        <div className="flex gap-2">
                          {selectedCompany.careerWebsite && (
                            <a 
                              href={ensureHttp(selectedCompany.careerWebsite)} 
                              target="_blank" 
                              rel="noopener noreferrer"
                              className="p-2 bg-purple-50 hover:bg-purple-600 hover:text-white text-purple-600 rounded-xl border border-purple-100 transition-all shadow-sm flex items-center gap-2"
                              title="View Careers"
                            >
                              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 13.255A23.931 23.931 0 0112 15c-3.183 0-6.22-.62-9-1.745M16 6V4a2 2 0 00-2-2h-4a2 2 0 00-2 2v2m4 6h.01M5 20h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                              </svg>
                              <span className="text-[10px] font-black uppercase tracking-widest hidden sm:inline">Careers</span>
                            </a>
                          )}
                        </div>
                      </div>
                      <div className="flex gap-2 mt-2">
                        <span className="text-indigo-500 font-black text-[10px] tracking-widest uppercase px-2 py-0.5 bg-indigo-50 rounded-md border border-indigo-100">{selectedCompany.stage}</span>
                        <span className="text-gray-500 font-black text-[10px] tracking-widest uppercase px-2 py-0.5 bg-white/80 rounded-md border border-white">{selectedCompany.businessModel}</span>
                      </div>
                    </div>
                    <button 
                      onClick={() => startEditing(selectedCompany)}
                      className="p-3 bg-white/50 hover:bg-white text-gray-400 hover:text-indigo-600 rounded-2xl border border-white transition-all shadow-sm"
                      title="Edit Data"
                    >
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" /></svg>
                    </button>
                  </div>

                  <div className="grid grid-cols-3 gap-4">
                    <div className="bg-white/50 p-4 rounded-2xl border border-white text-center">
                      <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">Valuation</p>
                      <p className="text-2xl font-black text-gray-900">{selectedCompany.valuation ? `$${selectedCompany.valuation}M` : '—'}</p>
                    </div>
                    <div className="bg-white/50 p-4 rounded-2xl border border-white text-center col-span-2 overflow-hidden">
                      <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">Lead Investor</p>
                      <p className="text-xl font-bold text-indigo-600 truncate px-2">{selectedCompany.leadInvestor || 'Not Disclosed'}</p>
                    </div>
                  </div>

                  <div className="bg-white/40 p-6 rounded-[28px] border border-white">
                    <h4 className="text-[10px] font-black text-indigo-400 uppercase tracking-[0.4em] mb-3">Company Summary</h4>
                    <p className="text-gray-600 text-lg leading-relaxed italic font-medium">"{selectedCompany.description || 'No detailed analysis available.'}"</p>
                  </div>
                </div>

                {/* Vertical Stack of Sections */}
                <div className="space-y-12">
                  {/* Organizational Structure */}
                  <div className="space-y-6 pt-8 border-t border-white/40">
                    <div className="flex items-center justify-between">
                      <h4 className="text-xl font-black text-gray-900">Organizational Structure</h4>
                      <p className="text-[9px] font-bold text-gray-400 uppercase tracking-widest bg-white/40 px-3 py-1 rounded-full border border-white">Strategic Divisions</p>
                    </div>
                    {selectedCompany.teams && selectedCompany.teams.length > 0 ? (
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        {selectedCompany.teams.map((team, idx) => (
                          <div key={idx} className="bg-white/30 p-5 rounded-2xl border border-white/60 hover:bg-white/50 transition-colors group/team">
                            <h5 className="font-bold text-gray-800 text-base group-hover:text-indigo-600 transition-colors">{team.name}</h5>
                            <p className="text-xs text-gray-500 font-medium mt-1 leading-relaxed">{team.focus}</p>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="bg-white/10 p-10 rounded-3xl border border-dashed border-white text-center">
                        <p className="text-xs text-gray-400 font-bold uppercase tracking-widest">No team structure mapped for this entity.</p>
                      </div>
                    )}
                  </div>

                  {/* Market Opportunities */}
                  <div className="space-y-6 pt-8 border-t border-white/40">
                    <div className="flex items-center justify-between">
                      <h4 className="text-xl font-black text-gray-900">Market Opportunities</h4>
                      {aiActive && (
                        <button 
                          disabled={isLoading}
                          onClick={() => generateAILRoles(selectedCompany)}
                          className="bg-indigo-600 text-white px-6 py-2.5 rounded-2xl text-xs font-black uppercase tracking-widest hover:bg-indigo-700 transition-all shadow-lg shadow-indigo-100 disabled:opacity-50"
                        >
                          {isLoading ? 'Scanning Market...' : 'AI Pulse Search'}
                        </button>
                      )}
                    </div>

                    {selectedCompany.roles.length > 0 ? (
                      <div className="grid gap-4">
                        {selectedCompany.roles.map(role => (
                          <div key={role.id} className="bg-white/60 p-6 rounded-2xl border border-white flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 group/role">
                            <div className="min-w-0">
                              <h5 className="font-bold text-gray-900 text-lg group-hover:text-indigo-600 transition-colors">{role.title}</h5>
                              <div className="flex flex-wrap gap-2 mt-3">
                                {role.skills.map(skill => (
                                  <span key={skill} className="px-3 py-1 bg-white border border-gray-100 text-gray-500 text-[9px] font-black uppercase tracking-tighter rounded-lg">
                                    {skill}
                                  </span>
                                ))}
                              </div>
                            </div>
                            <span className="px-4 py-1.5 bg-green-100/50 text-green-700 text-[10px] font-black uppercase tracking-widest rounded-full border border-green-200 shrink-0">
                              {role.status}
                            </span>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="bg-white/20 p-16 rounded-[40px] text-center border border-dashed border-white">
                        <p className="text-gray-400 font-bold uppercase tracking-widest text-xs leading-relaxed max-w-xs mx-auto">
                          {aiActive ? 'No active role mapping identified.\nUse AI Pulse Search to identify typical openings.' : 'AI search is offline. No role mapping available.'}
                        </p>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default CompaniesList;
