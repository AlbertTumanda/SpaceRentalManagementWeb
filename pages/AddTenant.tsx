import React, { useState, useEffect } from 'react';
import { db } from '../db';
import { useNavigate, useParams } from 'react-router-dom';
import { BlockRecord } from '../types';
import { User, Home, Phone, Mail, Calendar, DollarSign, Save, X, AlertCircle } from 'lucide-react';

const AddTenant: React.FC = () => {
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const isEdit = !!id;

  const [blocks, setBlocks] = useState<BlockRecord[]>([]);
  const [formData, setFormData] = useState({
    name: '',
    blockNumber: '',
    phone: '',
    email: '',
    contractStart: new Date().toISOString().split('T')[0],
    contractEnd: '',
    leaseAmount: 0,
    dueDay: 1
  });

  const [loading, setLoading] = useState(isEdit);

  useEffect(() => {
    db.blocks.toArray().then(setBlocks);
    
    if (isEdit) {
      db.tenants.get(parseInt(id!)).then(t => {
        if (t) setFormData({
          name: t.name,
          blockNumber: t.blockNumber,
          phone: t.phone,
          email: t.email,
          contractStart: t.contractStart,
          contractEnd: t.contractEnd,
          leaseAmount: t.leaseAmount,
          dueDay: t.dueDay || 1
        });
        setLoading(false);
      });
    }
  }, [id, isEdit]);

  const handleBlockSelect = (blockId: string) => {
    const selected = blocks.find(b => b.blockId === blockId);
    if (selected) {
      setFormData({
        ...formData,
        blockNumber: selected.blockId,
        leaseAmount: selected.rate
      });
    } else {
      setFormData({ ...formData, blockNumber: blockId });
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name || !formData.blockNumber || formData.leaseAmount <= 0) {
      alert('Please fill in required fields');
      return;
    }

    try {
      if (isEdit) {
        await db.tenants.update(parseInt(id!), formData);
      } else {
        await db.tenants.add(formData);
      }
      navigate('/tenants');
    } catch (err) {
      alert('Error saving tenant');
    }
  };

  if (loading) return <div className="text-center py-20 text-slate-500">Loading...</div>;

  const inputClass = "w-full pl-10 pr-4 py-3 rounded-xl bg-slate-200 border border-slate-300 text-slate-900 placeholder:text-slate-500 focus:ring-2 focus:ring-indigo-500 outline-none transition-all";
  const labelClass = "block text-sm font-semibold text-slate-400 mb-1.5";

  return (
    <div className="max-w-2xl mx-auto animate-in fade-in zoom-in duration-300">
      <div className="bg-slate-900 rounded-3xl shadow-2xl border border-slate-800 p-8">
        <h2 className="text-2xl font-bold text-slate-100 mb-6 flex items-center gap-3">
          <span className="p-3 bg-indigo-500/10 rounded-xl text-indigo-400"><User size={24}/></span>
          {isEdit ? 'Edit Tenant Profile' : 'Register New Tenant'}
        </h2>
        
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
            <div>
              <label className={labelClass}>Full Name *</label>
              <div className="relative">
                <User className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" size={18} />
                <input type="text" required className={inputClass} value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} placeholder="Tenant Full Name" />
              </div>
            </div>
            <div>
              <label className={labelClass}>Block Number *</label>
              <div className="relative">
                 <Home className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" size={18} />
                 {blocks.length > 0 ? (
                    <select 
                        className={inputClass}
                        required
                        value={formData.blockNumber}
                        onChange={e => handleBlockSelect(e.target.value)}
                    >
                        <option value="">Select Block ID</option>
                        {blocks.map(b => <option key={b.id} value={b.blockId}>{b.blockId} (₱{b.rate.toLocaleString()})</option>)}
                        <option value="Manual">-- Manual Entry --</option>
                    </select>
                 ) : (
                     <input 
                        type="text" 
                        required 
                        className={inputClass} 
                        value={formData.blockNumber} 
                        onChange={e => setFormData({...formData, blockNumber: e.target.value})} 
                        placeholder="e.g. A-101"
                     />
                 )}
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
            <div>
              <label className={labelClass}>Phone Number</label>
              <div className="relative">
                <Phone className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" size={18} />
                <input type="tel" className={inputClass} value={formData.phone} onChange={e => setFormData({...formData, phone: e.target.value})} placeholder="09XX-XXX-XXXX" />
              </div>
            </div>
            <div>
              <label className={labelClass}>Email Address</label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" size={18} />
                <input type="email" className={inputClass} value={formData.email} onChange={e => setFormData({...formData, email: e.target.value})} placeholder="tenant@email.com" />
              </div>
            </div>
          </div>

          <div className="bg-slate-950/50 p-6 rounded-2xl border border-slate-800 space-y-4">
            <h4 className="text-xs font-bold text-slate-500 uppercase tracking-widest flex items-center gap-2">
                <Calendar size={14} /> Lease & Schedule
            </h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
              <div>
                <label className={labelClass}>Monthly Rent (₱) *</label>
                <div className="relative">
                    <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" size={18} />
                    <input type="number" required className={inputClass} value={formData.leaseAmount || ''} onChange={e => setFormData({...formData, leaseAmount: parseFloat(e.target.value) || 0})} />
                </div>
              </div>
              <div>
                <label className={labelClass}>Due Day (1-31) *</label>
                <div className="relative">
                    <AlertCircle className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" size={18} />
                    <input 
                    type="number" 
                    min="1" 
                    max="31" 
                    required 
                    className={inputClass} 
                    value={formData.dueDay} 
                    onChange={e => setFormData({...formData, dueDay: parseInt(e.target.value) || 1})} 
                    />
                </div>
              </div>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
              <div>
                <label className={labelClass}>Contract Start *</label>
                <input type="date" required className={`${inputClass} pl-4`} value={formData.contractStart} onChange={e => setFormData({...formData, contractStart: e.target.value})} />
              </div>
              <div>
                <label className={labelClass}>Contract End (Expiry) *</label>
                <input type="date" required className={`${inputClass} pl-4`} value={formData.contractEnd} onChange={e => setFormData({...formData, contractEnd: e.target.value})} />
              </div>
            </div>
            <div className="text-[10px] text-slate-500 italic">
              * System will notify tenant 3 days before the {formData.dueDay}{formData.dueDay === 1 ? 'st' : formData.dueDay === 2 ? 'nd' : formData.dueDay === 3 ? 'rd' : 'th'} of every month.
            </div>
          </div>

          <div className="flex gap-4 pt-4">
            <button type="button" onClick={() => navigate('/tenants')} className="flex-1 bg-slate-800 text-slate-400 font-bold py-4 rounded-xl hover:bg-slate-700 transition-all flex items-center justify-center gap-2">
                <X size={20} /> Cancel
            </button>
            <button type="submit" className="flex-[2] bg-indigo-600 text-white font-bold py-4 rounded-xl shadow-lg shadow-indigo-900/30 hover:bg-indigo-500 active:scale-95 transition-all flex items-center justify-center gap-2">
                <Save size={20} /> Save Tenant
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default AddTenant;