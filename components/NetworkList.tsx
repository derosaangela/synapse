
import React, { useState, useEffect, useRef, useMemo } from 'react';
import { Contact, Company } from '../types';
import { getConversationStarters } from '../services/geminiService';

interface NetworkListProps {
  network: Contact[];
  companies: Company[];
  onAddContact: (contact: Contact) => void;
  onUpdateContact: (contact: Contact) => void;
}

const NOTE_TEMPLATE = `Location: 
Company: 
University: 
Common Ground: 
Notes: `;

const MONTHS = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December"
];

const YEARS = Array.from({ length: 26 }, (_, i) => 2025 - i);
const DAYS = Array.from({ length: 31 }, (_, i) => i + 1);

// --- Custom Liquid Glass Dropdown ---
const GlassDropdown: React.FC<{
  label: string;
  value?: number;
  options: { label: string; value: number }[];
  onChange: (val?: number) => void;
  placeholder?: string;
}> = ({ label, value, options, onChange, placeholder = "None" }) => {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const selectedOption = options.find(o => o.value === value);

  return (
    <div className="relative flex-1 min-w-[100px]" ref={containerRef}>
      <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1.5 ml-1">{label}</label>
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="w-full flex items-center justify-between px-4 py-3 bg-white/50 backdrop-blur-md border border-white rounded-xl text-sm font-bold text-gray-700 hover:bg-white transition-all shadow-sm"
      >
        <span className={!selectedOption ? "text-gray-400" : ""}>
          {selectedOption ? selectedOption.label : placeholder}
        </span>
        <svg className={`w-4 h-4 transition-transform ${isOpen ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {isOpen && (
        <div className="absolute z-[60] mt-2 w-full max-h-48 overflow-y-auto no-scrollbar glass-card p-1 shadow-2xl animate-in fade-in zoom-in-95 duration-200">
          <button
            type="button"
            onClick={() => { onChange(undefined); setIsOpen(false); }}
            className="w-full text-left px-4 py-2.5 text-xs font-black text-gray-400 uppercase tracking-widest hover:bg-white/60 rounded-lg transition-colors"
          >
            Clear
          </button>
          {options.map(opt => (
            <button
              key={opt.value}
              type="button"
              onClick={() => { onChange(opt.value); setIsOpen(false); }}
              className={`w-full text-left px-4 py-2.5 text-sm font-bold rounded-lg transition-colors ${value === opt.value ? 'bg-purple-600 text-white' : 'text-gray-600 hover:bg-white/60'}`}
            >
              {opt.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
};

// --- Graph Types ---
type NodeType = 'person' | 'tag';

interface GraphNode {
  id: string; label: string; type: NodeType; x: number; y: number; vx: number; vy: number; scale: number; originalId: string;
}

interface GraphEdge {
  source: string; target: string;
}

const NetworkList: React.FC<NetworkListProps> = ({ network, companies, onAddContact, onUpdateContact }) => {
  const [viewMode, setViewMode] = useState<'list' | 'brain'>('list');
  const [isAdding, setIsAdding] = useState(false);
  const [selectedContact, setSelectedContact] = useState<Contact | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [starters, setStarters] = useState<string[]>([]);
  const [isGenerating, setIsGenerating] = useState(false);
  
  const [formData, setFormData] = useState({ 
    name: '', context: NOTE_TEMPLATE, 
    year: undefined as number | undefined, 
    month: undefined as number | undefined, 
    day: undefined as number | undefined 
  });

  const [filterMonth, setFilterMonth] = useState<number | undefined>(undefined);
  const [filterYear, setFilterYear] = useState<number | undefined>(undefined);
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [tagFilter, setTagFilter] = useState('');

  const [zoom, setZoom] = useState(1);
  const [offset, setOffset] = useState({ x: 0, y: 0 });
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [graphNodes, setGraphNodes] = useState<GraphNode[]>([]);
  const [hoveredNodeId, setHoveredNodeId] = useState<string | null>(null);
  const requestRef = useRef<number>(undefined);

  const allUniqueTags = useMemo(() => {
    const tags = new Set<string>();
    network.forEach(c => c.tags.forEach(t => tags.add(t)));
    return Array.from(tags).sort();
  }, [network]);

  const formatDate = (c: Contact) => {
    if (!c.lastConversationYear && !c.lastConversationMonth && !c.lastConversationDay) return "Unspecified Date";
    const parts = [];
    if (c.lastConversationDay) parts.push(c.lastConversationDay);
    if (c.lastConversationMonth) parts.push(MONTHS[c.lastConversationMonth - 1]);
    if (c.lastConversationYear) parts.push(c.lastConversationYear);
    return parts.join(" ");
  };

  const filteredNetwork = useMemo(() => {
    return network.filter(contact => {
      const matchesSearch = contact.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
                           contact.notes.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesTags = selectedTags.length === 0 || 
                         selectedTags.every(tag => contact.tags.includes(tag));
      
      const matchesMonth = filterMonth === undefined || contact.lastConversationMonth === filterMonth;
      const matchesYear = filterYear === undefined || contact.lastConversationYear === filterYear;

      return matchesSearch && matchesTags && matchesMonth && matchesYear;
    });
  }, [network, searchQuery, selectedTags, filterMonth, filterYear]);

  const extractTags = (text: string): string[] => {
    const labels = ['location', 'company', 'university', 'common', 'ground', 'notes'];
    const stopWords = new Set(['this', 'that', 'with', 'from', 'they', 'have', 'about', 'just', 'there', 'when', 'the', 'and', 'for', 'are', 'was', 'you', 'your', 'but', 'not', 'did', 'had']);
    const words = text.toLowerCase()
      .replace(/[.,\/#!$%\^&\*;:{}=\-_`~()]/g, " ")
      .split(/\s+/)
      .filter(w => w.length > 2 && !stopWords.has(w) && !labels.includes(w));
    return Array.from(new Set(words));
  };

  const handleAddContact = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name) return;
    const allTags = extractTags(formData.context);
    const newContact: Contact = {
      id: Math.random().toString(36).substr(2, 9),
      name: formData.name,
      location: '', companyId: '', howMet: '', commonalities: '',
      notes: formData.context,
      lastConversationYear: formData.year,
      lastConversationMonth: formData.month,
      lastConversationDay: formData.day,
      lastConversation: `${formData.year || ''}-${formData.month || ''}-${formData.day || ''}`,
      tags: allTags
    };
    onAddContact(newContact);
    setIsAdding(false);
    setFormData({ name: '', context: NOTE_TEMPLATE, year: undefined, month: undefined, day: undefined });
  };

  const handleUpdateContact = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedContact) return;
    const updatedTags = extractTags(formData.context);
    const updated: Contact = {
      ...selectedContact,
      name: formData.name,
      notes: formData.context,
      lastConversationYear: formData.year,
      lastConversationMonth: formData.month,
      lastConversationDay: formData.day,
      lastConversation: `${formData.year || ''}-${formData.month || ''}-${formData.day || ''}`,
      tags: updatedTags
    };
    onUpdateContact(updated);
    setSelectedContact(updated);
    setIsEditing(false);
  };

  const generateStarters = async (contact: Contact) => {
    setIsGenerating(true);
    const result = await getConversationStarters(contact.name, contact.notes);
    setStarters(result);
    setIsGenerating(false);
  };

  // --- Graph Animation Logic ---
  const { nodes: initialNodes, edges: graphEdges } = useMemo(() => {
    const nodes: GraphNode[] = [];
    const edges: GraphEdge[] = [];
    const tagMap = new Map<string, string>();
    network.forEach(contact => {
      const personNodeId = `p-${contact.id}`;
      nodes.push({ id: personNodeId, label: contact.name, type: 'person', originalId: contact.id, x: Math.random() * 800 + 200, y: Math.random() * 400 + 100, vx: 0, vy: 0, scale: 1 });
      contact.tags.forEach(tag => {
        let tagNodeId = tagMap.get(tag);
        if (!tagNodeId) {
          tagNodeId = `t-${tag}`; tagMap.set(tag, tagNodeId);
          nodes.push({ id: tagNodeId, label: tag, type: 'tag', originalId: tag, x: Math.random() * 800 + 200, y: Math.random() * 400 + 100, vx: 0, vy: 0, scale: 1 });
        }
        edges.push({ source: personNodeId, target: tagNodeId });
      });
    });
    return { nodes, edges };
  }, [network]);

  useEffect(() => { if (viewMode === 'brain') setGraphNodes(initialNodes); }, [viewMode, initialNodes]);

  const animate = () => {
    setGraphNodes(prevNodes => {
      if (prevNodes.length === 0) return prevNodes;
      const highlightIds = new Set<string>();
      if (hoveredNodeId) {
        highlightIds.add(hoveredNodeId);
        graphEdges.forEach(edge => {
          if (edge.source === hoveredNodeId) highlightIds.add(edge.target);
          if (edge.target === hoveredNodeId) highlightIds.add(edge.source);
        });
      }
      const newNodes = prevNodes.map(n => ({ ...n }));
      const width = canvasRef.current?.width || 1200;
      const height = canvasRef.current?.height || 650;
      for (let i = 0; i < newNodes.length; i++) {
        const nodeA = newNodes[i];
        const isHighlighted = highlightIds.has(nodeA.id);
        const targetScale = isHighlighted ? (hoveredNodeId === nodeA.id ? 2.0 : 1.4) : 1;
        nodeA.scale += (targetScale - nodeA.scale) * 0.15;
        for (let j = 0; j < newNodes.length; j++) {
          if (i === j) continue;
          const nodeB = newNodes[j];
          const dx = nodeA.x - nodeB.x; const dy = nodeA.y - nodeB.y;
          const distSq = dx * dx + dy * dy + 1; const force = 1800 / distSq;
          nodeA.vx += (dx / Math.sqrt(distSq)) * force; nodeA.vy += (dy / Math.sqrt(distSq)) * force;
        }
        graphEdges.forEach(edge => {
          if (edge.source === nodeA.id || edge.target === nodeA.id) {
            const otherId = edge.source === nodeA.id ? edge.target : edge.source;
            const other = newNodes.find(n => n.id === otherId);
            if (other) {
              nodeA.vx += (other.x - nodeA.x) * 0.05; nodeA.vy += (other.y - nodeA.y) * 0.05;
            }
          }
        });
        nodeA.vx += (width / 2 - nodeA.x) * 0.005; nodeA.vy += (height / 2 - nodeA.y) * 0.005;
        nodeA.x += nodeA.vx; nodeA.y += nodeA.vy;
        nodeA.vx *= 0.8; nodeA.vy *= 0.8;
      }
      return newNodes;
    });

    const canvas = canvasRef.current;
    if (canvas) {
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        ctx.save();
        ctx.translate(canvas.width / 2 + offset.x, canvas.height / 2 + offset.y);
        ctx.scale(zoom, zoom);
        ctx.translate(-canvas.width / 2, -canvas.height / 2);
        const highlightIds = new Set<string>();
        if (hoveredNodeId) {
          highlightIds.add(hoveredNodeId);
          graphEdges.forEach(edge => {
            if (edge.source === hoveredNodeId) highlightIds.add(edge.target);
            if (edge.target === hoveredNodeId) highlightIds.add(edge.source);
          });
        }
        graphEdges.forEach(edge => {
          const s = graphNodes.find(n => n.id === edge.source);
          const t = graphNodes.find(n => n.id === edge.target);
          if (s && t) {
            const rel = hoveredNodeId === s.id || hoveredNodeId === t.id;
            ctx.beginPath(); ctx.moveTo(s.x, s.y); ctx.lineTo(t.x, t.y);
            ctx.strokeStyle = rel ? 'rgba(79, 70, 229, 0.4)' : 'rgba(79, 70, 229, 0.06)';
            ctx.lineWidth = rel ? 1.5 / zoom : 1 / zoom; ctx.stroke();
          }
        });
        graphNodes.forEach(node => {
          const isTag = node.type === 'tag';
          const isDirectlyHovered = hoveredNodeId === node.id;
          const isHighlighted = highlightIds.has(node.id);
          const isFilterMatch = tagFilter && node.label.toLowerCase().includes(tagFilter.toLowerCase());
          ctx.save(); ctx.translate(node.x, node.y);
          if (isTag) {
            const gs = (isDirectlyHovered ? 20 : (isHighlighted ? 15 : 12)) * node.scale;
            const grad = ctx.createRadialGradient(0, 0, 0, 0, 0, gs);
            grad.addColorStop(0, isHighlighted ? 'rgba(79, 70, 229, 0.3)' : 'rgba(79, 70, 229, 0.15)');
            grad.addColorStop(1, 'transparent'); ctx.fillStyle = grad;
            ctx.beginPath(); ctx.arc(0, 0, gs, 0, Math.PI * 2); ctx.fill();
            ctx.fillStyle = isFilterMatch || isHighlighted ? '#4f46e5' : '#1e293b';
            ctx.beginPath(); ctx.arc(0, 0, (isHighlighted ? 7 : 6) * node.scale, 0, Math.PI * 2); ctx.fill();
            ctx.fillStyle = isFilterMatch || isHighlighted ? '#4f46e5' : '#475569';
            ctx.font = `${isHighlighted ? 'bold' : '600'} ${isDirectlyHovered ? 14 : (isHighlighted ? 12 : 10)}px Plus Jakarta Sans`;
            ctx.textAlign = 'center'; ctx.fillText(`#${node.label}`, 0, -(14 * node.scale));
          } else {
            ctx.fillStyle = isHighlighted ? '#4f46e5' : '#0f172a';
            ctx.beginPath(); ctx.ellipse(0, 0, (isHighlighted ? 5 : 4) * node.scale, (isHighlighted ? 4 : 3) * node.scale, 0, 0, Math.PI * 2); ctx.fill();
            ctx.fillStyle = isDirectlyHovered || isHighlighted ? '#1e293b' : '#94a3b8';
            ctx.font = `${isHighlighted ? '600' : '500'} ${isDirectlyHovered ? 12 : (isHighlighted ? 10 : 9)}px Plus Jakarta Sans`;
            ctx.textAlign = 'center'; ctx.fillText(node.label, 0, 18 * node.scale);
          }
          ctx.restore();
        });
        ctx.restore();
      }
    }
    requestRef.current = requestAnimationFrame(animate);
  };

  useEffect(() => {
    if (viewMode === 'brain') requestRef.current = requestAnimationFrame(animate);
    else if (requestRef.current) cancelAnimationFrame(requestRef.current);
    return () => { if (requestRef.current) cancelAnimationFrame(requestRef.current); };
  }, [viewMode, graphNodes, graphEdges, hoveredNodeId, tagFilter, zoom, offset]);

  const handleWheel = (e: React.WheelEvent<HTMLCanvasElement>) => {
    if (viewMode !== 'brain') return;
    setZoom(prev => Math.max(0.2, Math.min(5, prev * (e.deltaY > 0 ? 0.9 : 1.1))));
  };

  const handleMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const rect = canvasRef.current?.getBoundingClientRect(); if (!rect) return;
    const canvas = canvasRef.current!;
    const canvasX = (e.clientX - rect.left) * (canvas.width / rect.width);
    const canvasY = (e.clientY - rect.top) * (canvas.height / rect.height);
    const mx = (canvasX - canvas.width / 2 - offset.x) / zoom + canvas.width / 2;
    const my = (canvasY - canvas.height / 2 - offset.y) / zoom + canvas.height / 2;
    const found = graphNodes.find(n => Math.sqrt((n.x - mx) ** 2 + (n.y - my) ** 2) < (n.type === 'tag' ? 30 : 20) / zoom);
    setHoveredNodeId(found ? found.id : null);
    if (e.buttons === 1 && !found) {
      setOffset(prev => ({ x: prev.x + e.movementX * (canvas.width / rect.width), y: prev.y + e.movementY * (canvas.height / rect.height) }));
    }
  };

  const openEditModal = (contact: Contact) => {
    setFormData({ 
      name: contact.name, 
      context: contact.notes, 
      year: contact.lastConversationYear,
      month: contact.lastConversationMonth,
      day: contact.lastConversationDay
    });
    setIsEditing(true);
  };

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-2 duration-500">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-6">
        <div>
          <h2 className="text-4xl font-extrabold text-gray-900 tracking-tight">Network</h2>
          <p className="text-gray-500 mt-1 font-medium italic">Mapping human industry synapses.</p>
        </div>
        
        <div className="flex items-center gap-3 w-full md:w-auto">
          {viewMode === 'brain' && (
            <div className="relative flex-1 md:flex-none md:w-48">
              <input type="text" placeholder="Search graph..." value={tagFilter} onChange={(e) => setTagFilter(e.target.value)} className="w-full px-4 py-2.5 rounded-xl bg-white/60 border border-white text-xs font-bold outline-none focus:ring-2 focus:ring-purple-200 transition-all" />
            </div>
          )}

          <div className="glass-nav p-1 flex items-center gap-1">
            <button onClick={() => setViewMode('list')} className={`p-2.5 rounded-full transition-all ${viewMode === 'list' ? 'bg-white shadow-sm text-purple-600' : 'text-gray-400 hover:text-gray-600'}`} title="List View"><svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" /></svg></button>
            <button onClick={() => setViewMode('brain')} className={`p-2.5 rounded-full transition-all ${viewMode === 'brain' ? 'bg-white shadow-sm text-purple-600' : 'text-gray-400 hover:text-gray-600'}`} title="Synapse View"><svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" /></svg></button>
          </div>

          <button onClick={() => { setFormData({ name: '', context: NOTE_TEMPLATE, year: undefined, month: undefined, day: undefined }); setIsAdding(true); }} className="bg-purple-600 hover:bg-purple-700 text-white px-8 py-3 rounded-2xl font-bold shadow-xl shadow-purple-100 transition-all hover:-translate-y-0.5">Add Person</button>
        </div>
      </div>

      {viewMode === 'list' && (
        <div className="glass-card p-6 space-y-6 animate-in fade-in duration-300">
          <div className="flex flex-col md:flex-row gap-6 items-start md:items-end">
            <div className="flex-1 w-full">
              <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2 ml-1">Search Keywords</label>
              <input type="text" placeholder="Names, notes, companies..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="w-full px-5 py-3 rounded-xl bg-white/60 border border-white text-sm font-medium outline-none focus:ring-2 focus:ring-purple-200 transition-all" />
            </div>
            
            {/* Filter Dropdowns */}
            <div className="flex gap-4 w-full md:w-auto">
              <GlassDropdown 
                label="Filter Month" 
                value={filterMonth} 
                options={MONTHS.map((m, i) => ({ label: m, value: i + 1 }))} 
                onChange={setFilterMonth} 
                placeholder="All Months" 
              />
              <GlassDropdown 
                label="Filter Year" 
                value={filterYear} 
                options={YEARS.map(y => ({ label: y.toString(), value: y }))} 
                onChange={setFilterYear} 
                placeholder="All Years" 
              />
            </div>
            
            <button onClick={() => {setSearchQuery(''); setSelectedTags([]); setFilterMonth(undefined); setFilterYear(undefined);}} className="mb-1 px-4 py-3 text-xs font-black text-gray-400 hover:text-purple-600 uppercase tracking-widest transition-colors">Reset All</button>
          </div>
          
          <div className="flex flex-wrap gap-2 pt-2 border-t border-white/40">
            {allUniqueTags.map(tag => (
              <button key={tag} onClick={() => setSelectedTags(prev => prev.includes(tag) ? prev.filter(t => t !== tag) : [...prev, tag])} className={`px-3 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all border ${selectedTags.includes(tag) ? 'bg-purple-600 border-purple-600 text-white shadow-md' : 'bg-white/40 border-white text-gray-400 hover:border-purple-200 hover:text-purple-600'}`}>#{tag}</button>
            ))}
          </div>
        </div>
      )}

      {isAdding && (
        <div className="fixed inset-0 bg-white/20 backdrop-blur-md z-50 flex items-center justify-center p-4">
          <div className="glass-card p-10 max-w-2xl w-full animate-in zoom-in-95 duration-300 max-h-[90vh] overflow-y-auto no-scrollbar shadow-2xl border-white/40">
            <div className="flex justify-between items-center mb-8">
              <h3 className="text-3xl font-black text-gray-900 tracking-tight">Quick Connect</h3>
              <button onClick={() => setIsAdding(false)} className="text-gray-400 hover:text-gray-900"><svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M6 18L18 6M6 6l12 12" /></svg></button>
            </div>
            <form onSubmit={handleAddContact} className="space-y-6">
              <div>
                <label className="block text-xs font-black text-gray-400 uppercase tracking-widest mb-2">Name (Mandatory)</label>
                <input required autoFocus value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} className="w-full px-6 py-4 rounded-2xl bg-white/50 border border-white focus:ring-4 focus:ring-purple-100 outline-none transition-all font-bold text-lg" placeholder="e.g. Jane Doe" />
              </div>
              
              {/* Custom Liquid Date Selector */}
              <div className="flex gap-4">
                <GlassDropdown label="Day" value={formData.day} options={DAYS.map(d => ({ label: d.toString(), value: d }))} onChange={val => setFormData({...formData, day: val})} />
                <GlassDropdown label="Month" value={formData.month} options={MONTHS.map((m, i) => ({ label: m, value: i + 1 }))} onChange={val => setFormData({...formData, month: val})} />
                <GlassDropdown label="Year" value={formData.year} options={YEARS.map(y => ({ label: y.toString(), value: y }))} onChange={val => setFormData({...formData, year: val})} />
              </div>

              <div>
                <label className="block text-xs font-black text-gray-400 uppercase tracking-widest mb-2">Memory Details</label>
                <textarea rows={8} value={formData.context} onChange={e => setFormData({...formData, context: e.target.value})} className="w-full px-6 py-6 rounded-2xl bg-white/50 border border-white focus:ring-4 focus:ring-purple-100 outline-none transition-all font-medium text-gray-700 leading-relaxed font-mono text-sm" placeholder="Location: &#10;Company: &#10;University: &#10;Common Ground: &#10;Notes: " />
              </div>
              <div className="flex gap-4 pt-4">
                <button type="button" onClick={() => setIsAdding(false)} className="flex-1 py-4 text-gray-500 font-bold hover:text-gray-900">Cancel</button>
                <button type="submit" className="flex-[2] py-4 bg-purple-600 text-white font-black uppercase tracking-widest rounded-2xl hover:bg-purple-700 shadow-lg shadow-purple-100 transition-all">Save to Nexus</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {viewMode === 'list' ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 animate-in fade-in duration-500">
          {filteredNetwork.map(contact => (
            <div key={contact.id} onClick={() => { setSelectedContact(contact); setStarters([]); setIsEditing(false); }} className="glass-card p-7 hover:-translate-y-1 transition-all duration-300 cursor-pointer group border-transparent hover:border-purple-100/50">
              <div className="flex items-center gap-5 mb-6">
                <div className="w-14 h-14 bg-gradient-to-tr from-slate-800 to-slate-950 rounded-2xl flex items-center justify-center text-white font-black text-2xl shadow-md border border-white/10 uppercase shrink-0">{contact.name.charAt(0)}</div>
                <div className="overflow-hidden">
                  <h3 className="text-lg font-black text-gray-900 leading-tight group-hover:text-purple-600 transition-colors truncate">{contact.name}</h3>
                  <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mt-1">{formatDate(contact)}</p>
                </div>
              </div>
              <div className="text-sm font-medium text-gray-500 line-clamp-3 italic mb-6 leading-relaxed bg-white/30 p-3 rounded-xl border border-white/50">
                {contact.notes.split('\n').filter(line => line.includes(':') && line.split(':')[1].trim().length > 0).slice(0, 2).map((line, i) => (<div key={i} className="truncate">{line}</div>)) || 'View memory log...'}
              </div>
              <div className="flex flex-wrap gap-2 pt-6 border-t border-white/50">
                {contact.tags.slice(0, 5).map(tag => (<span key={tag} className="px-3 py-1 bg-white/60 border border-white text-gray-400 text-[9px] font-black uppercase tracking-widest rounded-lg">#{tag}</span>))}
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="glass-card w-full h-[650px] relative overflow-hidden animate-in fade-in duration-700 border-indigo-100/50 shadow-inner bg-white/10 group/canvas">
          <canvas ref={canvasRef} width={1200} height={650} onWheel={handleWheel} onMouseMove={handleMouseMove} onClick={() => { if (hoveredNodeId) { const node = graphNodes.find(n => n.id === hoveredNodeId); if (node?.type === 'person') { setSelectedContact(network.find(c => c.id === node.originalId) || null); setStarters([]); setIsEditing(false); } } }} className="w-full h-full cursor-grab active:cursor-grabbing opacity-90 hover:opacity-100 transition-opacity" />
        </div>
      )}

      {selectedContact && (
        <div className="fixed inset-0 bg-black/10 backdrop-blur-xl z-50 flex items-center justify-center p-4">
          <div className="glass-card p-10 max-w-4xl w-full max-h-[90vh] overflow-y-auto no-scrollbar animate-in zoom-in-95 duration-300 relative shadow-2xl">
            <button onClick={() => setSelectedContact(null)} className="absolute top-6 right-6 text-gray-400 hover:text-gray-900 transition-colors"><svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M6 18L18 6M6 6l12 12" /></svg></button>
            {isEditing ? (
              <form onSubmit={handleUpdateContact} className="space-y-6 animate-in slide-in-from-top-2">
                <h3 className="text-3xl font-black text-gray-900 tracking-tight">Update Memory</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-xs font-black text-gray-400 uppercase tracking-widest mb-2">Name</label>
                    <input required autoFocus value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} className="w-full px-6 py-4 rounded-2xl bg-white/50 border border-white focus:ring-4 focus:ring-indigo-100 outline-none transition-all font-bold text-lg" />
                  </div>
                  <div className="flex gap-2">
                    <GlassDropdown label="Day" value={formData.day} options={DAYS.map(d => ({ label: d.toString(), value: d }))} onChange={val => setFormData({...formData, day: val})} />
                    <GlassDropdown label="Month" value={formData.month} options={MONTHS.map((m, i) => ({ label: m, value: i + 1 }))} onChange={val => setFormData({...formData, month: val})} />
                    <GlassDropdown label="Year" value={formData.year} options={YEARS.map(y => ({ label: y.toString(), value: y }))} onChange={val => setFormData({...formData, year: val})} />
                  </div>
                </div>
                <textarea rows={10} value={formData.context} onChange={e => setFormData({...formData, context: e.target.value})} className="w-full px-6 py-6 rounded-2xl bg-white/50 border border-white focus:ring-4 focus:ring-indigo-100 outline-none transition-all font-medium text-gray-700 leading-relaxed font-mono text-sm" />
                <div className="flex gap-4 pt-4">
                  <button type="button" onClick={() => setIsEditing(false)} className="flex-1 py-4 text-gray-500 font-bold hover:text-gray-900">Cancel</button>
                  <button type="submit" className="flex-[2] py-4 bg-indigo-600 text-white font-black uppercase tracking-widest rounded-2xl hover:bg-indigo-700 shadow-lg shadow-indigo-100">Save Changes</button>
                </div>
              </form>
            ) : (
              <div className="flex flex-col md:flex-row gap-12">
                <div className="flex-1 space-y-8">
                  <div className="flex items-center gap-8">
                    <div className="w-24 h-24 bg-gradient-to-br from-slate-800 to-slate-950 text-white flex items-center justify-center font-black text-5xl uppercase rounded-[32px] shadow-2xl border border-white/10 shrink-0">{selectedContact.name.charAt(0)}</div>
                    <div className="min-w-0">
                      <h3 className="text-4xl font-black text-gray-900 tracking-tight truncate">{selectedContact.name}</h3>
                      <p className="text-gray-400 text-xs font-bold uppercase tracking-widest mt-1">Logged on: {formatDate(selectedContact)}</p>
                      <button onClick={() => openEditModal(selectedContact)} className="text-indigo-500 text-[10px] font-black uppercase tracking-[0.2em] hover:underline flex items-center gap-1 mt-4"><svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" /></svg>Edit Memory & Date</button>
                    </div>
                  </div>
                  <section className="bg-white/50 p-8 rounded-[32px] border border-white shadow-sm italic text-lg leading-relaxed text-gray-700"><pre className="whitespace-pre-wrap font-sans">{selectedContact.notes}</pre></section>
                </div>
                <div className="flex-1 space-y-8 md:border-l md:border-white/50 md:pl-12">
                  <div className="flex items-center justify-between mb-8"><h4 className="text-[10px] font-black text-gray-400 uppercase tracking-[0.4em]">AI Follow-up</h4><button onClick={() => generateStarters(selectedContact)} disabled={isGenerating} className="text-indigo-600 text-[10px] font-black uppercase tracking-widest hover:underline disabled:opacity-50 px-4 py-2 bg-white/40 rounded-full border border-white">{isGenerating ? 'Analyzing...' : 'Refresh'}</button></div>
                  <div className="space-y-6">{starters.map((starter, i) => (<div key={i} className="bg-indigo-600 text-white p-6 rounded-[28px] text-lg font-bold shadow-xl shadow-indigo-100/50 animate-in slide-in-from-right-4">"{starter}"</div>))}</div>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default NetworkList;
