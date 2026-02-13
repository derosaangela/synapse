
import React, { useState, useEffect, useRef } from 'react';
import CompaniesList from './components/CompaniesList';
import NetworkList from './components/NetworkList';
import { Company, Contact } from './types';

const SUGGESTED_CITIES = ['London', 'New York'];

const App: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'companies' | 'network'>('companies');
  const [companies, setCompanies] = useState<Company[]>([]);
  const [network, setNetwork] = useState<Contact[]>([]);
  const [userLocation, setUserLocation] = useState<string>('');
  const [isEditingLocation, setIsEditingLocation] = useState(false);
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const savedCompanies = localStorage.getItem('synapse_companies');
    const savedNetwork = localStorage.getItem('synapse_network');
    const savedLocation = localStorage.getItem('synapse_user_location');
    
    if (savedCompanies) setCompanies(JSON.parse(savedCompanies));
    if (savedNetwork) setNetwork(JSON.parse(savedNetwork));
    if (savedLocation) setUserLocation(savedLocation);
  }, []);

  useEffect(() => {
    localStorage.setItem('synapse_companies', JSON.stringify(companies));
  }, [companies]);

  useEffect(() => {
    localStorage.setItem('synapse_network', JSON.stringify(network));
  }, [network]);

  useEffect(() => {
    localStorage.setItem('synapse_user_location', userLocation);
  }, [userLocation]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const addCompany = (company: Company) => setCompanies(prev => [...prev, company]);
  const updateCompany = (updatedCompany: Company) => 
    setCompanies(prev => prev.map(c => c.id === updatedCompany.id ? updatedCompany : c));
  
  const addContact = (contact: Contact) => setNetwork(prev => [...prev, contact]);
  const updateContact = (updatedContact: Contact) => 
    setNetwork(prev => prev.map(c => c.id === updatedContact.id ? updatedContact : c));

  const selectCity = (city: string) => {
    setUserLocation(city);
    setIsDropdownOpen(false);
    setIsEditingLocation(false);
  };

  const handleCustomLocation = () => {
    setIsEditingLocation(true);
    setIsDropdownOpen(false);
  };

  return (
    <div className="min-h-screen px-4 py-8 md:px-8 lg:px-12 max-w-6xl mx-auto flex flex-col gap-8">
      {/* Header & Navigation */}
      <header className="flex flex-col md:flex-row items-center justify-between gap-6">
        <div className="flex flex-col md:flex-row items-center gap-6">
          <div className="flex items-center gap-3">
            <div className="relative group">
              <div className="absolute -inset-1 bg-indigo-500 rounded-full blur opacity-25 group-hover:opacity-50 transition duration-1000 group-hover:duration-200"></div>
              <div className="relative w-10 h-10 flex items-center justify-center">
                <svg 
                  viewBox="0 0 24 24" 
                  fill="none" 
                  className="w-full h-full text-indigo-600 drop-shadow-sm" 
                  xmlns="http://www.w3.org/2000/svg"
                >
                  <path 
                    d="M12 0L14.5 9.5L24 12L14.5 14.5L12 24L9.5 14.5L0 12L9.5 9.5L12 0Z" 
                    fill="currentColor" 
                  />
                </svg>
              </div>
            </div>
            <h1 className="text-2xl font-extrabold bg-clip-text text-transparent bg-gradient-to-r from-indigo-600 to-purple-600 tracking-tight">
              Synapse
            </h1>
          </div>

          {/* Home Base Selector Dropdown */}
          <div className="relative" ref={dropdownRef}>
            <div className="flex items-center gap-2 px-4 py-2 bg-white/40 border border-white/60 rounded-2xl backdrop-blur-md shadow-sm group/loc transition-all hover:bg-white/60">
              <svg className="w-4 h-4 text-gray-400 group-hover/loc:text-indigo-500 transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
              
              {isEditingLocation ? (
                <input
                  autoFocus
                  onBlur={() => {
                    if (userLocation) setIsEditingLocation(false);
                  }}
                  onKeyDown={(e) => e.key === 'Enter' && setIsEditingLocation(false)}
                  className="bg-transparent border-none outline-none text-xs font-bold text-gray-700 w-32"
                  placeholder="Type city..."
                  value={userLocation}
                  onChange={(e) => setUserLocation(e.target.value)}
                />
              ) : (
                <button 
                  onClick={() => setIsDropdownOpen(!isDropdownOpen)}
                  className="flex items-center gap-2 text-xs font-bold text-gray-500 hover:text-gray-900 transition-colors"
                >
                  {userLocation || 'Set Home Base'}
                  <svg className={`w-3 h-3 text-gray-400 transition-transform ${isDropdownOpen ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M19 9l-7 7-7-7" />
                  </svg>
                </button>
              )}
            </div>

            {/* Dropdown Menu */}
            {isDropdownOpen && (
              <div className="absolute top-full left-0 mt-2 w-48 glass-card border-white/60 p-2 z-[100] shadow-2xl animate-in fade-in zoom-in-95 duration-200">
                <div className="px-3 py-2 text-[10px] font-black text-gray-300 uppercase tracking-widest border-b border-white/20 mb-1">
                  Suggested Locations
                </div>
                {SUGGESTED_CITIES.map(city => (
                  <button
                    key={city}
                    onClick={() => selectCity(city)}
                    className={`w-full text-left px-3 py-2 rounded-xl text-xs font-bold transition-all ${
                      userLocation === city 
                        ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-100' 
                        : 'text-gray-600 hover:bg-white hover:text-indigo-600'
                    }`}
                  >
                    {city}
                  </button>
                ))}
                <div className="border-t border-white/20 mt-1 pt-1">
                  <button
                    onClick={handleCustomLocation}
                    className="w-full text-left px-3 py-2 rounded-xl text-xs font-bold text-indigo-500 hover:bg-white transition-all flex items-center justify-between"
                  >
                    Custom...
                    <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M12 4v16m8-8H4" />
                    </svg>
                  </button>
                </div>
              </div>
            )}
          </div>
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
            userLocation={userLocation}
          />
        )}
      </main>
    </div>
  );
};

export default App;
