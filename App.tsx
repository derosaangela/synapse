
import React, { useState, useEffect } from 'react';
import CompaniesList from './components/CompaniesList';
import NetworkList from './components/NetworkList';
import { Company, Contact } from './types';

const App: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'companies' | 'network'>('companies');
  const [companies, setCompanies] = useState<Company[]>([]);
  const [network, setNetwork] = useState<Contact[]>([]);

  useEffect(() => {
    const savedCompanies = localStorage.getItem('nexus_companies');
    const savedNetwork = localStorage.getItem('nexus_network');
    if (savedCompanies) setCompanies(JSON.parse(savedCompanies));
    if (savedNetwork) setNetwork(JSON.parse(savedNetwork));
  }, []);

  useEffect(() => {
    localStorage.setItem('nexus_companies', JSON.stringify(companies));
  }, [companies]);

  useEffect(() => {
    localStorage.setItem('nexus_network', JSON.stringify(network));
  }, [network]);

  const addCompany = (company: Company) => setCompanies(prev => [...prev, company]);
  const updateCompany = (updatedCompany: Company) => 
    setCompanies(prev => prev.map(c => c.id === updatedCompany.id ? updatedCompany : c));
  
  const addContact = (contact: Contact) => setNetwork(prev => [...prev, contact]);
  const updateContact = (updatedContact: Contact) => 
    setNetwork(prev => prev.map(c => c.id === updatedContact.id ? updatedContact : c));

  return (
    <div className="min-h-screen px-4 py-8 md:px-8 lg:px-12 max-w-6xl mx-auto flex flex-col gap-8">
      {/* Header & Navigation */}
      <header className="flex flex-col md:flex-row items-center justify-between gap-6">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-indigo-600 rounded-2xl flex items-center justify-center shadow-lg shadow-indigo-200">
            <span className="text-white font-bold text-xl">N</span>
          </div>
          <h1 className="text-2xl font-extrabold bg-clip-text text-transparent bg-gradient-to-r from-indigo-600 to-purple-600 tracking-tight">
            Nexus Brain
          </h1>
        </div>

        <nav className="glass-nav p-1.5 flex items-center gap-1">
          <button
            onClick={() => setActiveTab('companies')}
            className={`px-6 py-2 rounded-full text-sm font-semibold transition-all duration-300 ${
              activeTab === 'companies'
                ? 'bg-white text-indigo-600 shadow-sm'
                : 'text-gray-500 hover:text-gray-800'
            }`}
          >
            Industry
          </button>
          <button
            onClick={() => setActiveTab('network')}
            className={`px-6 py-2 rounded-full text-sm font-semibold transition-all duration-300 ${
              activeTab === 'network'
                ? 'bg-white text-purple-600 shadow-sm'
                : 'text-gray-500 hover:text-gray-800'
            }`}
          >
            Network
          </button>
        </nav>
      </header>

      {/* Main Content Area */}
      <main className="flex-1">
        {activeTab === 'companies' ? (
          <CompaniesList 
            companies={companies} 
            onAddCompany={addCompany} 
            onUpdateCompany={updateCompany} 
          />
        ) : (
          <NetworkList 
            network={network} 
            companies={companies} 
            onAddContact={addContact} 
            onUpdateContact={updateContact} 
          />
        )}
      </main>
    </div>
  );
};

export default App;
