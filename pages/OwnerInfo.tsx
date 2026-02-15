import React, { useState, useEffect } from 'react';
import { db } from '../db';
import { OwnerRecord, BlockRecord } from '../types';
import { Upload, Download, Save, Trash2, Home, Building } from 'lucide-react';

const THEME_PRESETS = [
  { name: 'Indigo', color: '#818cf8' },
  { name: 'Emerald', color: '#34d399' },
  { name: 'Rose', color: '#fb7185' },
  { name: 'Amber', color: '#fbbf24' },
  { name: 'Cyan', color: '#22d3ee' },
  { name: 'Violet', color: '#a78bfa' },
  { name: 'Slate', color: '#94a3b8' },
];

const DEFAULT_TEMPLATE = "Hi {tenant}, this is a friendly reminder that your rent for Block {block} (₱{amount}) is due on {date}. Thank you!";

const OwnerInfo: React.FC = () => {
  const [formData, setFormData] = useState<OwnerRecord>({
    businessName: '',
    address: '',
    proprietor: '',
    proprietorPhone: '',
    proprietorEmail: '',
    logo: '',
    themeColor: '#818cf8',
    reminderDaysBefore: 3,
    reminderTemplate: DEFAULT_TEMPLATE
  });
  
  const [blocks, setBlocks] = useState<BlockRecord[]>([]);
  const [newBlock, setNewBlock] = useState<BlockRecord>({ blockId: '', description: '', rate: 0 });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const fetchData = async () => {
      const owner = await db.owner.toCollection().first();
      if (owner) {
        setFormData({ 
          ...owner, 
          themeColor: owner.themeColor || '#818cf8',
          reminderDaysBefore: owner.reminderDaysBefore ?? 3,
          reminderTemplate: owner.reminderTemplate || DEFAULT_TEMPLATE,
          proprietorPhone: owner.proprietorPhone || '',
          proprietorEmail: owner.proprietorEmail || ''
        });
      }
      const blockList = await db.blocks.toArray();
      setBlocks(blockList);
      setLoading(false);
    };
    fetchData();
  }, []);

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setFormData(prev => ({ ...prev, logo: reader.result as string }));
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      const existing = await db.owner.toCollection().first();
      if (existing) {
        await db.owner.update(existing.id!, formData);
      } else {
        await db.owner.add(formData);
      }
      alert('Business information and settings saved!');
    } catch (err) {
      alert('Error saving information');
    } finally {
      setSaving(false);
    }
  };

  const handleAddBlock = async () => {
    if (!newBlock.blockId || newBlock.rate <= 0) {
      alert("Block ID and Rate are required.");
      return;
    }
    const id = await db.blocks.add(newBlock);
    setBlocks([...blocks, { ...newBlock, id }]);
    setNewBlock({ blockId: '', description: '', rate: 0 });
  };

  const handleDeleteBlock = async (id: number) => {
    await db.blocks.delete(id);
    setBlocks(blocks.filter(b => b.id !== id));
  };

  // Data Export
  const exportData = async () => {
    const data = {
      owner: await db.owner.toArray(),
      blocks: await db.blocks.toArray(),
      tenants: await db.tenants.toArray(),
      payments: await db.payments.toArray(),
      expenses: await db.expenses.toArray(),
    };
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `spacerent_backup_${new Date().toISOString().split('T')[0]}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  // Data Import
  const importData = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!window.confirm("WARNING: This will overwrite your current data. Continue?")) return;

    const reader = new FileReader();
    reader.onload = async (event) => {
      try {
        const json = JSON.parse(event.target?.result as string);
        await (db as any).transaction('rw', db.owner, db.blocks, db.tenants, db.payments, db.expenses, async () => {
          await db.owner.clear();
          await db.blocks.clear();
          await db.tenants.clear();
          await db.payments.clear();
          await db.expenses.clear();

          if (json.owner) await db.owner.bulkAdd(json.owner);
          if (json.blocks) await db.blocks.bulkAdd(json.blocks);
          if (json.tenants) await db.tenants.bulkAdd(json.tenants);
          if (json.payments) await db.payments.bulkAdd(json.payments);
          if (json.expenses) await db.expenses.bulkAdd(json.expenses);
        });
        alert('Data imported successfully! Reloading...');
        window.location.reload();
      } catch (err) {
        console.error(err);
        alert('Failed to import data. Invalid JSON format.');
      }
    };
    reader.readAsText(file);
  };

  if (loading) return <div className="text-center py-20 text-slate-500">Loading information...</div>;

  const inputClass = "w-full px-4 py-2 rounded-lg bg-slate-200 border border-slate-300 text-slate-900 placeholder:text-slate-500 focus:ring-2 focus:ring-indigo-500 outline-none transition-all";
  const labelClass = "block text-sm font-semibold text-slate-400 mb-1";

  return (
    <div className="max-w-4xl mx-auto space-y-8 pb-10 animate-in fade-in duration-500">
      
      {/* Data Management Section */}
      <div className="bg-slate-900 rounded-2xl shadow-xl border border-slate-800 p-8">
        <h2 className="text-xl font-bold text-slate-100 mb-4 flex items-center gap-2">
            <Save size={20} /> Data Management
        </h2>
        <div className="flex flex-col sm:flex-row gap-4">
            <button onClick={exportData} className="flex-1 bg-indigo-600 hover:bg-indigo-500 text-white py-3 rounded-xl font-bold flex items-center justify-center gap-2 transition-all">
                <Download size={18} /> Backup Data (JSON)
            </button>
            <label className="flex-1 bg-slate-800 hover:bg-slate-700 text-slate-300 py-3 rounded-xl font-bold flex items-center justify-center gap-2 transition-all cursor-pointer border border-slate-700">
                <Upload size={18} /> Import Data
                <input type="file" accept=".json" onChange={importData} className="hidden" />
            </label>
        </div>
      </div>

      <div className="bg-slate-900 rounded-2xl shadow-2xl border border-slate-800 p-8">
        <h2 className="text-2xl font-bold text-slate-100 mb-6 flex items-center gap-2">
          <Building size={24} /> Business & Theme Settings
        </h2>
        
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="flex flex-col items-center gap-4 p-6 bg-slate-950/50 rounded-xl border border-dashed border-slate-700">
            {formData.logo ? (
              <img src={formData.logo} alt="Logo Preview" className="w-32 h-32 object-contain rounded-lg bg-slate-900 p-2 shadow-inner" />
            ) : (
              <div className="w-32 h-32 rounded-lg bg-slate-800 flex items-center justify-center text-slate-500 border border-slate-700">
                Logo
              </div>
            )}
            <label className="bg-slate-800 border border-slate-700 px-4 py-2 rounded-lg text-sm font-semibold text-indigo-400 cursor-pointer hover:bg-slate-700 transition-all">
              Change Logo
              <input type="file" accept="image/*" className="hidden" onChange={handleImageUpload} />
            </label>
          </div>

          <div className="p-5 bg-slate-950/30 rounded-xl border border-slate-800">
            <label className={labelClass}>Environment Theme Color</label>
            <div className="flex flex-wrap gap-3 mt-3">
              {THEME_PRESETS.map(preset => (
                <button
                  key={preset.color}
                  type="button"
                  onClick={() => setFormData({...formData, themeColor: preset.color})}
                  className={`w-10 h-10 rounded-full border-2 transition-all ${formData.themeColor === preset.color ? 'border-white scale-110 shadow-[0_0_15px_rgba(255,255,255,0.3)]' : 'border-transparent opacity-60 hover:opacity-100'}`}
                  style={{ backgroundColor: preset.color }}
                  title={preset.name}
                />
              ))}
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className={labelClass}>Business Name</label>
              <input type="text" className={inputClass} value={formData.businessName} onChange={e => setFormData({...formData, businessName: e.target.value})} placeholder="e.g. SpaceRent Properties Inc." />
            </div>
            <div>
              <label className={labelClass}>Proprietor / Owner Name</label>
              <input type="text" className={inputClass} value={formData.proprietor} onChange={e => setFormData({...formData, proprietor: e.target.value})} placeholder="Full name of the owner" />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className={labelClass}>Proprietor Contact Number</label>
              <input type="tel" className={inputClass} value={formData.proprietorPhone} onChange={e => setFormData({...formData, proprietorPhone: e.target.value})} placeholder="09XX XXX XXXX" />
            </div>
            <div>
              <label className={labelClass}>Business Email Address</label>
              <input type="email" className={inputClass} value={formData.proprietorEmail} onChange={e => setFormData({...formData, proprietorEmail: e.target.value})} placeholder="owner@email.com" />
            </div>
          </div>

          <div>
            <label className={labelClass}>Business Address</label>
            <textarea className={`${inputClass} h-24 resize-none`} value={formData.address} onChange={e => setFormData({...formData, address: e.target.value})} placeholder="Street, City, Zip Code..."></textarea>
          </div>

          <div className="bg-slate-950/30 p-6 rounded-xl border border-slate-800 space-y-6">
            <h3 className="text-lg font-bold text-slate-100 flex items-center gap-2">
              <span>🔔</span> Automated Reminder Settings
            </h3>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className={labelClass}>Send Reminder X Days Before</label>
                <input type="number" min="1" max="30" className={inputClass} value={formData.reminderDaysBefore} onChange={e => setFormData({...formData, reminderDaysBefore: parseInt(e.target.value) || 0})} />
                <p className="text-[10px] text-slate-500 mt-1 italic">* How many days before the due day the tenant appears in reminders list.</p>
              </div>
            </div>

            <div>
              <label className={labelClass}>Message Template</label>
              <textarea className={`${inputClass} h-32 font-mono text-xs`} value={formData.reminderTemplate} onChange={e => setFormData({...formData, reminderTemplate: e.target.value})} placeholder="Message template..."></textarea>
              <div className="mt-2 flex flex-wrap gap-2">
                {['{tenant}', '{block}', '{amount}', '{date}'].map(tag => (
                  <span key={tag} className="text-[10px] bg-slate-800 px-2 py-1 rounded text-slate-400 border border-slate-700 font-mono">{tag}</span>
                ))}
              </div>
            </div>
          </div>

          <button type="submit" disabled={saving} style={{ backgroundColor: formData.themeColor }} className={`w-full py-3 rounded-xl font-bold text-slate-950 transition-all shadow-lg hover:brightness-110 active:scale-[0.98] disabled:opacity-50`}>
            {saving ? 'Saving...' : 'Save Brand Settings'}
          </button>
        </form>
      </div>

      {/* Block Management */}
      <div className="bg-slate-900 rounded-2xl shadow-2xl border border-slate-800 p-8">
        <h2 className="text-2xl font-bold text-slate-100 mb-6 flex items-center gap-2">
          <Home size={24} /> Setup Blocks / Units
        </h2>
        
        <div className="bg-slate-950/30 p-6 rounded-xl border border-slate-800 mb-8">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
            <div>
              <label className={labelClass}>Block ID *</label>
              <input type="text" className={inputClass} value={newBlock.blockId} onChange={e => setNewBlock({...newBlock, blockId: e.target.value})} placeholder="e.g. A-101" />
            </div>
            <div>
              <label className={labelClass}>Monthly Rate (₱) *</label>
              <input type="number" className={inputClass} value={newBlock.rate || ''} onChange={e => setNewBlock({...newBlock, rate: parseFloat(e.target.value) || 0})} placeholder="0.00" />
            </div>
            <div>
              <label className={labelClass}>Description</label>
              <input type="text" className={inputClass} value={newBlock.description} onChange={e => setNewBlock({...newBlock, description: e.target.value})} placeholder="e.g. Corner Unit" />
            </div>
          </div>
          <button onClick={handleAddBlock} className="w-full bg-slate-800 border border-slate-700 text-indigo-400 font-bold py-2 rounded-lg hover:bg-slate-700 transition-all">
            + Add New Block
          </button>
        </div>

        <div className="space-y-3">
          {blocks.length === 0 ? (
            <div className="text-center py-6 text-slate-500 italic border border-dashed border-slate-800 rounded-xl">No blocks configured yet.</div>
          ) : (
            blocks.map(block => (
              <div key={block.id} className="flex justify-between items-center p-4 bg-slate-950/20 border border-slate-800 rounded-xl hover:border-slate-700 transition-all">
                <div>
                  <h4 className="font-bold text-slate-100 text-lg">{block.blockId}</h4>
                  <p className="text-slate-400 text-sm">{block.description || 'No description'}</p>
                </div>
                <div className="flex items-center gap-6">
                  <span className="font-mono font-bold text-emerald-400">₱{block.rate.toLocaleString()}</span>
                  <button onClick={() => handleDeleteBlock(block.id!)} className="text-slate-600 hover:text-rose-500 transition-colors">
                    <Trash2 size={18} />
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
};

export default OwnerInfo;