
import React from 'react';
import { Company, Contact, ViewType } from '../types';

interface DashboardProps {
  companies: Company[];
  network: Contact[];
  onNavigate: (view: ViewType) => void;
}

const MONTHS_SHORT = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

const Dashboard: React.FC<DashboardProps> = ({ companies, network, onNavigate }) => {
  const openRoles = companies.reduce((acc, c) => acc + c.roles.filter(r => r.status === 'Open').length, 0);

  const formatDateShort = (c: Contact) => {
    if (!c.lastConversationYear && !c.lastConversationMonth && !c.lastConversationDay) return "Never";
    const parts = [];
    if (c.lastConversationMonth) parts.push(MONTHS_SHORT[c.lastConversationMonth - 1]);
    if (c.lastConversationYear) parts.push(c.lastConversationYear);
    return parts.length > 0 ? parts.join(" ") : "Date Unknown";
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <header>
        <h2 className="text-3xl font-extrabold text-gray-900 tracking-tight">Your Industrial Intelligence</h2>
        <p className="text-gray-500 mt-2">Welcome back. Here's what's happening in your Nexus.</p>
      </header>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div onClick={() => onNavigate('companies')} className="glass-card p-6 border-white/50 hover:shadow-md transition-shadow cursor-pointer group">
          <div className="p-3 bg-blue-50/50 text-blue-600 rounded-2xl group-hover:scale-110 transition-transform mb-4 w-fit">
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" /></svg>
          </div>
          <h3 className="text-4xl font-bold text-gray-900">{companies.length}</h3>
          <p className="text-gray-500 font-medium">Companies Tracked</p>
        </div>

        <div onClick={() => onNavigate('network')} className="glass-card p-6 border-white/50 hover:shadow-md transition-shadow cursor-pointer group">
          <div className="p-3 bg-purple-50/50 text-purple-600 rounded-2xl group-hover:scale-110 transition-transform mb-4 w-fit">
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" /></svg>
          </div>
          <h3 className="text-4xl font-bold text-gray-900">{network.length}</h3>
          <p className="text-gray-500 font-medium">Network Connections</p>
        </div>

        <div className="glass-card p-6 border-white/50 hover:shadow-md transition-shadow group">
          <div className="p-3 bg-green-50/50 text-green-600 rounded-2xl group-hover:scale-110 transition-transform mb-4 w-fit">
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" /></svg>
          </div>
          <h3 className="text-4xl font-bold text-gray-900">{openRoles}</h3>
          <p className="text-gray-500 font-medium">Open Opportunities</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mt-12">
        <section className="space-y-4">
          <h3 className="text-xl font-bold flex items-center gap-2"><span className="w-2 h-6 bg-indigo-600 rounded-full"></span>Recent Companies</h3>
          <div className="glass-card border-white/50 overflow-hidden divide-y divide-white/20">
            {companies.slice(-5).reverse().map(company => (
              <div key={company.id} className="p-4 flex items-center justify-between hover:bg-white/30 cursor-pointer transition-colors">
                <div><h4 className="font-semibold text-gray-900">{company.name}</h4><p className="text-xs text-indigo-600 font-medium">{company.industry}</p></div>
                <span className="text-sm font-medium px-2 py-1 bg-white/40 rounded-lg">{company.roles.length} roles</span>
              </div>
            ))}
          </div>
        </section>

        <section className="space-y-4">
          <h3 className="text-xl font-bold flex items-center gap-2"><span className="w-2 h-6 bg-purple-600 rounded-full"></span>Network Refresh</h3>
          <div className="glass-card border-white/50 overflow-hidden divide-y divide-white/20">
            {network.slice(-5).reverse().map(contact => (
              <div key={contact.id} className="p-4 flex items-center gap-4 hover:bg-white/30 cursor-pointer transition-colors">
                <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-purple-800 to-slate-900 flex items-center justify-center text-white font-bold uppercase">{contact.name.charAt(0)}</div>
                <div><h4 className="font-semibold text-gray-900">{contact.name}</h4><p className="text-xs text-gray-500">Last: {formatDateShort(contact)}</p></div>
              </div>
            ))}
          </div>
        </section>
      </div>
    </div>
  );
};

export default Dashboard;
