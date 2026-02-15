import React, { useState, useEffect } from 'react';
import { db } from '../db';
import { useNavigate, useParams } from 'react-router-dom';
import { BlockRecord } from '../types';
import { Save, X, Wallet, Tag } from 'lucide-react';

const AddExpense: React.FC = () => {
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const isEdit = !!id;

  const [blocks, setBlocks] = useState<BlockRecord[]>([]);
  const [formData, setFormData] = useState({
    category: '',
    blockNumber: '',
    date: new Date().toISOString().split('T')[0],
    amount: 0,
    notes: ''
  });

  const [loading, setLoading] = useState(isEdit);

  useEffect(() => {
    db.blocks.toArray().then(setBlocks);

    if (isEdit) {
      const fetchRecord = async () => {
        const record = await db.expenses.get(parseInt(id!));
        if (record) {
          setFormData({
            category: record.category,
            blockNumber: record.blockNumber || '',
            date: record.date,
            amount: record.amount,
            notes: record.notes
          });
        }
        setLoading(false);
      };
      fetchRecord();
    }
  }, [id, isEdit]);

  const categories = [
    'Maintenance',
    'Utilities',
    'Taxes',
    'Insurance',
    'Security',
    'Cleaning',
    'Repairs',
    'Other'
  ];

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.category || formData.amount <= 0) {
      alert('Please fill in category and amount');
      return;
    }

    try {
      const data = {
        ...formData,
        type: 'expense' as const
      };

      if (isEdit) {
        await db.expenses.update(parseInt(id!), data);
      } else {
        await db.expenses.add(data);
      }
      navigate('/records');
    } catch (error) {
      console.error('Failed to save expense:', error);
      alert('Error saving record.');
    }
  };

  if (loading) return <div className="text-center py-20 text-slate-500">Loading record...</div>;

  const inputClass = "w-full px-4 py-3 rounded-xl bg-slate-200 border border-slate-300 text-slate-900 placeholder:text-slate-500 focus:ring-2 focus:ring-rose-500 outline-none transition-all";
  const labelClass = "block text-sm font-semibold text-slate-400 mb-1.5";

  return (
    <div className="max-w-2xl mx-auto animate-in fade-in zoom-in duration-300">
      <div className="bg-slate-900 rounded-3xl shadow-2xl border border-slate-800 p-8">
        <h2 className="text-2xl font-bold text-slate-100 mb-6 flex items-center gap-3">
          <span className="p-3 bg-rose-500/10 rounded-xl text-rose-400"><Wallet size={24}/></span>
          {isEdit ? 'Edit Expense Record' : 'Record New Expense'}
        </h2>
        
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
            <div>
              <label className={labelClass}>Category *</label>
              <div className="relative">
                <select 
                    className={inputClass}
                    required
                    value={formData.category}
                    onChange={e => setFormData({...formData, category: e.target.value})}
                >
                    <option value="">Select Category</option>
                    {categories.map(c => <option key={c} value={c}>{c}</option>)}
                </select>
                <Tag className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" size={18} />
              </div>
            </div>
            <div>
              <label className={labelClass}>Block Number (Optional)</label>
              <select 
                className={inputClass}
                value={formData.blockNumber}
                onChange={e => setFormData({...formData, blockNumber: e.target.value})}
              >
                <option value="">Select Block ID</option>
                {blocks.map(b => <option key={b.id} value={b.blockId}>{b.blockId}</option>)}
                <option value="General">General / Not Block Specific</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
            <div>
              <label className={labelClass}>Expense Date *</label>
              <input 
                type="date" 
                required
                className={inputClass}
                value={formData.date}
                onChange={e => setFormData({...formData, date: e.target.value})}
              />
            </div>
            <div>
              <label className={labelClass}>Amount (₱) *</label>
              <input 
                type="number" 
                required
                className={inputClass}
                value={formData.amount || ''}
                onChange={e => setFormData({...formData, amount: parseFloat(e.target.value) || 0})}
              />
            </div>
          </div>

          <div>
            <label className={labelClass}>Notes</label>
            <textarea 
              className={`${inputClass} h-32 resize-none`}
              value={formData.notes}
              onChange={e => setFormData({...formData, notes: e.target.value})}
              placeholder="Details about the expense..."
            ></textarea>
          </div>

          <div className="flex gap-4 pt-4">
            <button 
              type="button"
              onClick={() => navigate('/records')}
              className="flex-1 bg-slate-800 hover:bg-slate-700 text-slate-400 font-bold py-4 rounded-xl transition-all flex items-center justify-center gap-2"
            >
              <X size={20} /> Cancel
            </button>
            <button 
              type="submit"
              className="flex-[2] bg-rose-600 hover:bg-rose-500 text-white font-bold py-4 rounded-xl transition-all shadow-lg shadow-rose-900/30 active:scale-95 flex items-center justify-center gap-2"
            >
              <Save size={20} /> {isEdit ? 'Update Expense' : 'Save Expense'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default AddExpense;
