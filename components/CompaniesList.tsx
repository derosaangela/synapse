
import React, { useState } from 'react';
import { Company, Role } from '../types';
import { enrichCompanyData, suggestRolesForCompany } from '../services/geminiService';

interface CompaniesListProps {
  companies: Company[];
  onAddCompany: (company: Company) => void;
  onUpdateCompany: (company: Company) => void;
}

const CompaniesList: React.FC<CompaniesListProps> = ({ companies, onAddCompany, onUpdateCompany }) => {
  const [isAdding, setIsAdding] = useState(false);
  const [newCompanyName, setNewCompanyName] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [selectedCompany, setSelectedCompany] = useState<Company | null>(null);

  const handleAddCompany = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCompanyName) return;
    setIsLoading(true);
    const enriched = await enrichCompanyData(newCompanyName);
    const newCompany: Company = {
      id: Math.random().toString(36).substr(2, 9),
      name: newCompanyName,
      industry: enriched.industry || 'Tech',
      description: enriched.description || '',
      website: enriched.website || '',
      roles: []
    };
    onAddCompany(newCompany);
    setNewCompanyName('');
    setIsAdding(false);
    setIsLoading(false);
  };

  const generateAILRoles = async (company: Company) => {
    setIsLoading(true);
    const roles = await suggestRolesForCompany(company.name, company.industry);
    onUpdateCompany({ ...company, roles: [...company.roles, ...roles] });
    setIsLoading(false);
  };

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-2 duration-500">
      <div className="flex justify-between items-end">
        <div>
          <h2 className="text-4xl font-extrabold text-gray-900 tracking-tight">Industry</h2>
          <p className="text-gray-500 mt-1 font-medium italic">Track companies and open roles.</p>
        </div>
        <button 
          onClick={() => setIsAdding(true)}
          className="bg-indigo-600 hover:bg-indigo-700 text-white px-8 py-3 rounded-2xl font-bold shadow-xl shadow-indigo-100 transition-all hover:-translate-y-0.5"
        >
          Add Company
        </button>
      </div>

      {isAdding && (
        <div className="fixed inset-0 bg-white/20 backdrop-blur-md z-50 flex items-center justify-center p-4">
          <div className="glass-card p-8 max-w-md w-full animate-in zoom-in-95 duration-300">
            <h3 className="text-2xl font-bold mb-6 text-gray-900">New Target</h3>
            <form onSubmit={handleAddCompany} className="space-y-6">
              <div>
                <label className="block text-xs font-bold text-gray-400 uppercase tracking-widest mb-2">Company Name</label>
                <input 
                  autoFocus
                  type="text"
                  value={newCompanyName}
                  onChange={(e) => setNewCompanyName(e.target.value)}
                  placeholder="e.g. Anthropic, Vercel"
                  className="w-full px-5 py-4 rounded-2xl bg-white/50 border border-white focus:ring-4 focus:ring-indigo-100 outline-none transition-all placeholder:text-gray-300"
                />
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
                  {isLoading ? 'Enriching...' : 'Add & Analyze'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
        {companies.map(company => (
          <div 
            key={company.id}
            onClick={() => setSelectedCompany(company)}
            className="glass-card p-7 hover:-translate-y-1 transition-all duration-300 cursor-pointer group"
          >
            <div className="flex items-start justify-between mb-6">
              <div className="w-14 h-14 bg-white/80 rounded-2xl flex items-center justify-center text-indigo-600 font-extrabold text-2xl shadow-sm border border-white">
                {company.name.charAt(0)}
              </div>
              <span className="px-4 py-1.5 bg-indigo-50/50 text-indigo-700 text-[11px] font-black uppercase tracking-wider rounded-full border border-indigo-100">
                {company.industry}
              </span>
            </div>
            <h3 className="text-xl font-bold mb-3 text-gray-900 group-hover:text-indigo-600 transition-colors">{company.name}</h3>
            <p className="text-gray-500 text-sm leading-relaxed line-clamp-2 mb-6 font-medium">
              {company.description || 'No description added yet. Use AI to enrich this.'}
            </p>
            <div className="flex items-center justify-between mt-auto pt-6 border-t border-white/50">
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></div>
                <span className="text-xs font-bold text-gray-400 uppercase tracking-tighter">{company.roles.length} ROLES</span>
              </div>
              <svg className="w-5 h-5 text-gray-300 group-hover:text-indigo-400 group-hover:translate-x-1 transition-all" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M17 8l4 4m0 0l-4 4m4-4H3" />
              </svg>
            </div>
          </div>
        ))}
      </div>

      {selectedCompany && (
        <div className="fixed inset-0 bg-black/10 backdrop-blur-xl z-50 flex items-center justify-center p-4">
          <div className="glass-card p-10 max-w-2xl w-full max-h-[90vh] overflow-y-auto no-scrollbar animate-in zoom-in-95 duration-300 relative">
            <button onClick={() => setSelectedCompany(null)} className="absolute top-6 right-6 text-gray-400 hover:text-gray-900 transition-colors">
              <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M6 18L18 6M6 6l12 12" /></svg>
            </button>

            <div className="flex items-center gap-6 mb-10">
              <div className="w-20 h-20 bg-white/80 rounded-3xl flex items-center justify-center text-indigo-600 font-black text-4xl shadow-md border border-white">
                {selectedCompany.name.charAt(0)}
              </div>
              <div>
                <h3 className="text-3xl font-black text-gray-900 tracking-tight">{selectedCompany.name}</h3>
                <p className="text-indigo-500 font-bold text-sm tracking-wide uppercase mt-1">{selectedCompany.industry}</p>
              </div>
            </div>

            <p className="text-gray-600 text-lg leading-relaxed mb-10 italic font-medium">"{selectedCompany.description}"</p>

            <div className="space-y-6">
              <div className="flex items-center justify-between border-b border-white pb-4">
                <h4 className="text-xl font-black text-gray-900">Opportunities</h4>
                <button 
                  disabled={isLoading}
                  onClick={() => generateAILRoles(selectedCompany)}
                  className="bg-white/80 border border-white px-5 py-2.5 rounded-2xl text-indigo-600 text-xs font-black uppercase tracking-widest hover:bg-indigo-600 hover:text-white transition-all shadow-sm"
                >
                  {isLoading ? 'Scanning...' : 'Find Roles with AI'}
                </button>
              </div>

              {selectedCompany.roles.length > 0 ? (
                <div className="grid gap-4">
                  {selectedCompany.roles.map(role => (
                    <div key={role.id} className="bg-white/60 p-5 rounded-2xl border border-white flex justify-between items-center group/role">
                      <div>
                        <h5 className="font-bold text-gray-900 text-lg">{role.title}</h5>
                        <div className="flex flex-wrap gap-2 mt-3">
                          {role.skills.map(skill => (
                            <span key={skill} className="px-3 py-1 bg-white border border-gray-100 text-gray-500 text-[9px] font-black uppercase tracking-tighter rounded-lg">
                              {skill}
                            </span>
                          ))}
                        </div>
                      </div>
                      <span className="px-4 py-1.5 bg-green-100/50 text-green-700 text-[10px] font-black uppercase tracking-widest rounded-full border border-green-200">
                        {role.status}
                      </span>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="bg-white/30 p-12 rounded-3xl text-center border border-dashed border-white">
                  <p className="text-gray-400 font-bold uppercase tracking-widest text-xs">No opportunities mapped yet.</p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default CompaniesList;
