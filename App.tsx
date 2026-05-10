
import React, { useState, useEffect, useRef, useMemo } from 'react';
import CompaniesList from './components/CompaniesList';
import NetworkList from './components/NetworkList';
import Login from './components/Login';
import FeedbackModal from './components/FeedbackModal';
import { Company, Contact } from './types';
import { auth, db, logout, handleFirestoreError, OperationType } from './firebase';
import { onAuthStateChanged, User } from 'firebase/auth';
import { collection, onSnapshot, doc, setDoc, deleteDoc, query, orderBy } from 'firebase/firestore';

const SUGGESTED_CITIES = ['London', 'New York'];

const App: React.FC = () => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'companies' | 'network'>('companies');
  const [selectedContactId, setSelectedContactId] = useState<string | null>(null);
  const [showReminders, setShowReminders] = useState(false);
  const [showFeedbackModal, setShowFeedbackModal] = useState(false);
  const [companies, setCompanies] = useState<Company[]>([]);
  const [network, setNetwork] = useState<Contact[]>([]);
  const [userLocation, setUserLocation] = useState<string>('');
  const [isEditingLocation, setIsEditingLocation] = useState(false);
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  
  const dropdownRef = useRef<HTMLDivElement>(null);
  const reminderRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
      setLoading(false);
    });
    return () => unsubscribe();
  }, []);

  // Sync Location from localStorage (keep it local or move to user profile)
  useEffect(() => {
    const savedLocation = localStorage.getItem('synapse_user_location');
    if (savedLocation) setUserLocation(savedLocation);
  }, []);

  useEffect(() => {
    localStorage.setItem('synapse_user_location', userLocation);
  }, [userLocation]);

  // Sync Companies from Firestore
  useEffect(() => {
    if (!user) {
      setCompanies([]);
      return;
    }

    const path = `users/${user.uid}/companies`;
    const q = query(collection(db, path), orderBy('name', 'asc'));
    
    const unsubscribe = onSnapshot(q, 
      (snapshot) => {
        const loadedCompanies = snapshot.docs.map(doc => doc.data() as Company);
        setCompanies(loadedCompanies);
      },
      (error) => handleFirestoreError(error, OperationType.GET, path)
    );

    return () => unsubscribe();
  }, [user]);

  // Sync Network from Firestore
  useEffect(() => {
    if (!user) {
      setNetwork([]);
      return;
    }

    const path = `users/${user.uid}/network`;
    const q = query(collection(db, path));
    
    const unsubscribe = onSnapshot(q, 
      (snapshot) => {
        const loadedNetwork = snapshot.docs.map(doc => doc.data() as Contact);
        setNetwork(loadedNetwork);
      },
      (error) => handleFirestoreError(error, OperationType.GET, path)
    );

    return () => unsubscribe();
  }, [user]);

  const overdueContacts = useMemo(() => {
    return network.filter(contact => {
      if (!contact.cadence || contact.cadence === 0) return false;
      
      const lastDate = contact.lastConversationYear && contact.lastConversationMonth && contact.lastConversationDay
        ? new Date(contact.lastConversationYear, contact.lastConversationMonth - 1, contact.lastConversationDay)
        : new Date(0);
      
      const diffTime = Math.abs(new Date().getTime() - lastDate.getTime());
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
      
      return diffDays >= contact.cadence;
    });
  }, [network]);

  const handleReminderClick = (contactId: string) => {
    setSelectedContactId(contactId);
    setActiveTab('network');
    setShowReminders(false);
  };

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsDropdownOpen(false);
      }
      if (reminderRef.current && !reminderRef.current.contains(event.target as Node)) {
        setShowReminders(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const addCompany = async (company: Company) => {
    if (!user) return;
    const path = `users/${user.uid}/companies`;
    try {
      await setDoc(doc(db, path, company.id), { ...company, ownerId: user.uid, createdAt: new Date().toISOString() });
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, path);
    }
  };

  const updateCompany = async (updatedCompany: Company) => {
    if (!user) return;
    const path = `users/${user.uid}/companies`;
    try {
      await setDoc(doc(db, path, updatedCompany.id), { ...updatedCompany, ownerId: user.uid, updatedAt: new Date().toISOString() }, { merge: true });
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, path);
    }
  };
  
  const addContact = async (contact: Contact) => {
    if (!user) return;
    const path = `users/${user.uid}/network`;
    try {
      await setDoc(doc(db, path, contact.id), { ...contact, ownerId: user.uid, createdAt: new Date().toISOString() });
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, path);
    }
  };

  const updateContact = async (updatedContact: Contact) => {
    if (!user) return;
    const path = `users/${user.uid}/network`;
    try {
      await setDoc(doc(db, path, updatedContact.id), { ...updatedContact, ownerId: user.uid, updatedAt: new Date().toISOString() }, { merge: true });
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, path);
    }
  };

  const selectCity = (city: string) => {
    setUserLocation(city);
    setIsDropdownOpen(false);
    setIsEditingLocation(false);
  };

  const handleCustomLocation = () => {
    setIsEditingLocation(true);
    setIsDropdownOpen(false);
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-white">
        <div className="w-12 h-12 border-4 border-indigo-200 border-t-indigo-600 rounded-full animate-spin"></div>
      </div>
    );
  }

  if (!user) {
    return <Login />;
  }

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

        <div className="flex items-center gap-4">
          <div className="relative" ref={reminderRef}>
            <button 
              onClick={() => setShowReminders(!showReminders)}
              className={`p-2.5 rounded-full transition-all relative ${
                overdueContacts.length > 0 
                  ? 'bg-rose-50 text-rose-600 hover:bg-rose-100' 
                  : 'bg-gray-50 text-gray-400 hover:bg-gray-100'
              }`}
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
              </svg>
              {overdueContacts.length > 0 && (
                <span className="absolute top-0 right-0 w-4 h-4 bg-rose-500 text-white text-[10px] font-black flex items-center justify-center rounded-full border-2 border-white">
                  {overdueContacts.length}
                </span>
              )}
            </button>

            {showReminders && (
              <div className="absolute top-full right-0 mt-3 w-80 glass-card p-4 z-[100] shadow-2xl animate-in fade-in slide-in-from-top-2">
                <h4 className="text-xs font-black text-gray-400 uppercase tracking-[0.2em] mb-4">Follow-up Needed</h4>
                <div className="space-y-3 max-h-[400px] overflow-y-auto no-scrollbar">
                  {overdueContacts.length > 0 ? (
                    overdueContacts.map(contact => (
                      <button
                        key={contact.id}
                        onClick={() => handleReminderClick(contact.id)}
                        className="w-full text-left p-3 rounded-2xl bg-white/60 hover:bg-white border border-white transition-all group"
                      >
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-lg bg-gray-900 text-white flex items-center justify-center text-xs font-black uppercase">
                            {contact.name.charAt(0)}
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-bold text-gray-900 truncate group-hover:text-rose-600 transition-colors">{contact.name}</p>
                            <p className="text-[10px] font-medium text-rose-500">Reach out now</p>
                          </div>
                          <svg className="w-4 h-4 text-gray-300 group-hover:text-rose-500 transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                          </svg>
                        </div>
                      </button>
                    ))
                  ) : (
                    <div className="text-center py-8 text-gray-400">
                      <p className="text-xs font-bold uppercase tracking-widest">All caught up!</p>
                    </div>
                  )}
                </div>
              </div>
            )}
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

          <button
            onClick={logout}
            className="p-2.5 rounded-full bg-white border text-gray-400 hover:text-gray-900 transition-all shadow-sm"
            title="Logout"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-6 0v-1m6-10V7a3 3 0 00-6 0v1" />
            </svg>
          </button>
        </div>
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
            initialSelectedContactId={selectedContactId}
            onContactHandled={() => setSelectedContactId(null)}
          />
        )}
      </main>

      {/* Feedback Floating Button */}
      <button
        onClick={() => setShowFeedbackModal(true)}
        className="fixed bottom-8 right-8 bg-white border border-gray-100 p-4 rounded-2xl shadow-xl hover:shadow-2xl transition-all duration-300 group flex items-center gap-3 active:scale-95 z-50 overflow-hidden"
      >
        <div className="absolute inset-0 bg-gradient-to-br from-indigo-50 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
        <span className="relative flex h-3 w-3">
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-indigo-400 opacity-75"></span>
          <span className="relative inline-flex rounded-full h-3 w-3 bg-indigo-500"></span>
        </span>
        <span className="relative text-xs font-black uppercase tracking-widest text-gray-500 group-hover:text-indigo-600 transition-colors">Feedback</span>
      </button>

      <FeedbackModal 
        isOpen={showFeedbackModal} 
        onClose={() => setShowFeedbackModal(false)} 
      />
    </div>
  );
};

export default App;

