import React, { useState, useEffect } from 'react';
import { db } from '../db';
import { TenantRecord } from '../types';
import { formatPHP, formatDate } from '../utils';
import { useNavigate, Link } from 'react-router-dom';
import { Search, Plus, Phone, Mail, Trash2, Edit2, User, Home, AlertCircle, Clock, CheckCircle } from 'lucide-react';

const Tenants: React.FC = () => {
  const navigate = useNavigate();
  const [tenants, setTenants] = useState<TenantRecord[]>([]);
  const [searchTerm, setSearchTerm] = useState('');

  const fetchTenants = async () => {
    const data = await db.tenants.toArray();
    setTenants(data);
  };

  useEffect(() => {
    fetchTenants();
  }, []);

  const handleDelete = async (id: number) => {
    if (!window.confirm('Delete this tenant record? This will not affect existing payment records.')) return;
    await db.tenants.delete(id);
    fetchTenants();
  };

  const getDueStatus = (dueDay: number) => {
    const today = new Date();
    const currentDay = today.getDate();
    
    if (dueDay === currentDay) return 'due-today';
    
    // Check next 3 days
    for (let i = 1; i <= 3; i++) {
        const future = new Date(today);
        future.setDate(today.getDate() + i);
        if (future.getDate() === dueDay) return 'due-soon';
    }
    
    return 'on-time';
  };

  const filtered = tenants.filter(t => 
    t.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    t.blockNumber.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <h1 className="text-3xl font-bold text-slate-100">Tenant Management</h1>
        <Link 
          to="/add-tenant" 
          className="bg-indigo-600 text-white px-5 py-2.5 rounded-xl font-bold hover:bg-indigo-500 transition-all shadow-lg shadow-indigo-900/20 flex items-center gap-2"
        >
          <Plus size={20} /> New Tenant
        </Link>
      </div>

      <div className="relative group">
        <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500 group-focus-within:text-indigo-400 transition-colors">
            <Search size={20} />
        </span>
        <input 
          type="text"
          placeholder="Search tenants by name or block..."
          className="w-full pl-12 pr-4 py-4 rounded-xl bg-slate-900 border border-slate-800 text-slate-100 shadow-sm outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all placeholder:text-slate-600"
          value={searchTerm}
          onChange={e => setSearchTerm(e.target.value)}
        />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filtered.length === 0 ? (
          <div className="col-span-full py-24 text-center text-slate-500 bg-slate-900/30 rounded-2xl border border-dashed border-slate-800 flex flex-col items-center gap-4">
            <User size={48} className="opacity-20" />
            <p>No tenants found. Start by adding a new tenant!</p>
          </div>
        ) : (
          filtered.map(t => {
            const status = getDueStatus(t.dueDay);
            return (
              <div key={t.id} className="bg-slate-900 p-6 rounded-2xl shadow-lg border border-slate-800 flex flex-col justify-between group hover:border-indigo-500/30 transition-all relative overflow-hidden">
                <div className="absolute top-0 right-0 p-2 opacity-5 pointer-events-none">
                    <User size={120} />
                </div>
                
                <div>
                  <div className="flex justify-between items-start mb-4 relative z-10">
                    <div className="flex-1">
                      <div className="flex flex-wrap items-center gap-2 mb-1">
                        <h3 className="text-xl font-bold text-slate-100">{t.name}</h3>
                        {status === 'due-today' && (
                          <span className="flex items-center gap-1 bg-rose-500/20 text-rose-400 text-[10px] font-black px-2 py-0.5 rounded uppercase border border-rose-500/30">
                            <AlertCircle size={10} /> Due Today
                          </span>
                        )}
                        {status === 'due-soon' && (
                          <span className="flex items-center gap-1 bg-amber-500/20 text-amber-400 text-[10px] font-black px-2 py-0.5 rounded uppercase border border-amber-500/30">
                            <Clock size={10} /> Due Soon
                          </span>
                        )}
                        {status === 'on-time' && (
                          <span className="flex items-center gap-1 bg-emerald-500/20 text-emerald-400 text-[10px] font-black px-2 py-0.5 rounded uppercase border border-emerald-500/30">
                            <CheckCircle size={10} /> On Time
                          </span>
                        )}
                      </div>
                      <p className="text-indigo-400 font-semibold flex items-center gap-1.5 text-sm">
                        <Home size={14} /> Block {t.blockNumber}
                      </p>
                    </div>
                    <div className="flex gap-1">
                      <button onClick={() => navigate(`/add-tenant/${t.id}`)} className="p-2 hover:bg-slate-800 rounded-lg text-slate-500 hover:text-indigo-400 transition-colors" title="Edit">
                        <Edit2 size={16} />
                      </button>
                      <button onClick={() => handleDelete(t.id!)} className="p-2 hover:bg-rose-500/10 rounded-lg text-slate-500 hover:text-rose-500 transition-colors" title="Delete">
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </div>
                  
                  <div className="grid grid-cols-2 gap-4 mt-4 relative z-10">
                    <div className="space-y-3 text-sm text-slate-400">
                      <div className="flex items-center gap-2 overflow-hidden">
                        <Phone size={14} className="shrink-0" /> <span className="truncate">{t.phone || 'N/A'}</span>
                      </div>
                      <div className="flex items-center gap-2 overflow-hidden">
                        <Mail size={14} className="shrink-0" /> <span className="truncate">{t.email || 'N/A'}</span>
                      </div>
                    </div>
                    <div className="bg-slate-950/80 p-3 rounded-xl border border-slate-800 flex flex-col justify-center items-center text-center">
                       <p className="text-[10px] text-slate-500 uppercase font-bold tracking-tighter">Rent</p>
                       <p className="text-lg font-black text-emerald-400">{formatPHP(t.leaseAmount)}</p>
                       <p className="text-[10px] text-slate-400 font-bold mt-1">Due: {t.dueDay}{t.dueDay === 1 ? 'st' : t.dueDay === 2 ? 'nd' : t.dueDay === 3 ? 'rd' : 'th'}</p>
                    </div>
                  </div>
                </div>
                
                <div className="mt-6 pt-4 border-t border-slate-800 flex justify-between text-[10px] font-bold text-slate-500 uppercase tracking-wider relative z-10">
                  <span>Start: {formatDate(t.contractStart)}</span>
                  <span>End: {formatDate(t.contractEnd)}</span>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};

export default Tenants;