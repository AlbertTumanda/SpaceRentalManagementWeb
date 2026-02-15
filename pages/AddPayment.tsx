import React, { useState, useEffect } from 'react';
import { db } from '../db';
import { PaymentMethod, TenantRecord, BlockRecord } from '../types';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { formatDate, PAYMENT_METHOD_ICONS } from '../utils';
import { Save, X, Receipt, Calculator } from 'lucide-react';

const AddPayment: React.FC = () => {
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const [searchParams] = useSearchParams();
  const isEdit = !!id;

  // Pre-fill from URL params (e.g., coming from dashboard action item)
  const prefillTenant = searchParams.get('tenant') || '';
  const prefillBlock = searchParams.get('block') || '';

  const [tenants, setTenants] = useState<TenantRecord[]>([]);
  const [blocks, setBlocks] = useState<BlockRecord[]>([]);
  const [formData, setFormData] = useState({
    tenantName: prefillTenant,
    tenantPhone: '',
    tenantEmail: '',
    blockNumber: prefillBlock,
    paymentDate: new Date().toISOString().split('T')[0],
    coverageStart: new Date().toISOString().split('T')[0],
    coverageEnd: new Date(new Date().setMonth(new Date().getMonth() + 1)).toISOString().split('T')[0],
    baseRent: 0,
    additionalCharges: 0,
    deductions: 0,
    paymentMethod: 'Cash' as PaymentMethod,
    notes: ''
  });

  const [loading, setLoading] = useState(isEdit);

  useEffect(() => {
    const init = async () => {
      const [tData, bData] = await Promise.all([
        db.tenants.toArray(),
        db.blocks.toArray()
      ]);
      setTenants(tData);
      setBlocks(bData);

      // If prefill exists, try to find tenant details
      if (!isEdit && prefillTenant) {
        const t = tData.find(x => x.name === prefillTenant);
        if (t) {
            setFormData(prev => ({
                ...prev,
                tenantPhone: t.phone,
                tenantEmail: t.email,
                baseRent: t.leaseAmount,
                blockNumber: t.blockNumber
            }));
        }
      }
    
      if (isEdit) {
        const record = await db.payments.get(parseInt(id!));
        if (record) {
          setFormData({
            tenantName: record.tenantName,
            tenantPhone: record.tenantPhone || '',
            tenantEmail: record.tenantEmail || '',
            blockNumber: record.blockNumber,
            paymentDate: record.paymentDate,
            coverageStart: record.coverageStart || record.paymentDate,
            coverageEnd: record.coverageEnd || record.paymentDate,
            baseRent: record.baseRent,
            additionalCharges: record.additionalCharges,
            deductions: record.deductions,
            paymentMethod: record.paymentMethod,
            notes: record.notes
          });
        }
        setLoading(false);
      }
    };
    init();
  }, [id, isEdit, prefillTenant]);

  const handleTenantSelect = (name: string) => {
    const selected = tenants.find(t => t.name === name);
    if (selected) {
      setFormData({
        ...formData,
        tenantName: selected.name,
        tenantPhone: selected.phone,
        tenantEmail: selected.email,
        blockNumber: selected.blockNumber,
        baseRent: selected.leaseAmount
      });
    } else {
      setFormData({ ...formData, tenantName: name });
    }
  };

  const handleBlockSelect = (blockId: string) => {
    const selected = blocks.find(b => b.blockId === blockId);
    if (selected) {
      setFormData({
        ...formData,
        blockNumber: selected.blockId,
        baseRent: selected.rate
      });
    } else {
      setFormData({ ...formData, blockNumber: blockId });
    }
  };

  const handleCoverageStartChange = (val: string) => {
    const startDate = new Date(val);
    const endDate = new Date(startDate);
    endDate.setMonth(startDate.getMonth() + 1);
    
    setFormData({
      ...formData,
      coverageStart: val,
      coverageEnd: endDate.toISOString().split('T')[0]
    });
  };

  const total = formData.baseRent + formData.additionalCharges - formData.deductions;

  const formatNotificationMessage = () => {
    return `Block Number: ${formData.blockNumber}
Tenant Name: ${formData.tenantName}
Payment Date: ${formatDate(formData.paymentDate)}
Coverage: ${formatDate(formData.coverageStart)} to ${formatDate(formData.coverageEnd)}
Method: ${formData.paymentMethod} ${PAYMENT_METHOD_ICONS[formData.paymentMethod]}
Remarks: ${formData.notes || 'Received'}`;
  };

  const triggerNotification = (type: 'sms' | 'email') => {
    const message = formatNotificationMessage();
    if (type === 'sms' && formData.tenantPhone) {
      window.open(`sms:${formData.tenantPhone}?body=${encodeURIComponent(message)}`);
    } else if (type === 'email' && formData.tenantEmail) {
      window.open(`mailto:${formData.tenantEmail}?subject=Rent Payment Receipt&body=${encodeURIComponent(message)}`);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.tenantName || !formData.blockNumber || formData.baseRent < 0) {
      alert('Please fill in all required fields');
      return;
    }

    try {
      const data = {
        ...formData,
        totalAmount: total,
        type: 'income' as const
      };

      if (isEdit) {
        await db.payments.update(parseInt(id!), data);
      } else {
        await db.payments.add(data);
      }
      
      const options = [];
      if (formData.tenantPhone) options.push('SMS');
      if (formData.tenantEmail) options.push('Email');

      if (options.length > 0) {
        const choice = window.confirm(`Record saved! Send digital receipt via ${options.join(' or ')}?`);
        if (choice) {
          if (formData.tenantPhone && formData.tenantEmail) {
            const secondChoice = window.confirm("Click OK for SMS, Cancel for Email");
            triggerNotification(secondChoice ? 'sms' : 'email');
          } else if (formData.tenantPhone) {
            triggerNotification('sms');
          } else {
            triggerNotification('email');
          }
        }
      }
      
      navigate('/records');
    } catch (error) {
      console.error('Failed to save payment:', error);
      alert('Error saving record.');
    }
  };

  if (loading) return <div className="text-center py-20 text-slate-500">Loading record...</div>;

  const inputClass = "w-full px-4 py-3 rounded-xl bg-slate-200 border border-slate-300 text-slate-900 placeholder:text-slate-500 focus:ring-2 focus:ring-indigo-500 outline-none transition-all";
  const labelClass = "block text-sm font-semibold text-slate-400 mb-1.5";

  return (
    <div className="max-w-2xl mx-auto animate-in fade-in zoom-in duration-300">
      <div className="bg-slate-900 rounded-3xl shadow-2xl border border-slate-800 p-8">
        <h2 className="text-2xl font-bold text-slate-100 mb-6 flex items-center gap-3">
          <span className="p-3 bg-emerald-500/10 rounded-xl text-emerald-400"><Receipt size={24}/></span> 
          {isEdit ? 'Edit Rental Payment' : 'Record Rental Payment'}
        </h2>
        
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
            <div>
              <label className={labelClass}>Tenant Name *</label>
              <select 
                className={inputClass}
                required
                value={formData.tenantName}
                onChange={e => handleTenantSelect(e.target.value)}
              >
                <option value="">Select Registered Tenant</option>
                {tenants.map(t => <option key={t.id} value={t.name}>{t.name} (Block {t.blockNumber})</option>)}
                <option value="Manual">-- Manual Entry --</option>
              </select>
            </div>
            <div>
              <label className={labelClass}>Block Number *</label>
              {blocks.length > 0 ? (
                <select 
                  className={inputClass}
                  required
                  value={formData.blockNumber}
                  onChange={e => handleBlockSelect(e.target.value)}
                >
                  <option value="">Select Block ID</option>
                  {blocks.map(b => <option key={b.id} value={b.blockId}>{b.blockId} (₱{b.rate.toLocaleString()})</option>)}
                  <option value="Other">-- Manual / Other --</option>
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

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
            <div>
              <label className={labelClass}>Phone Number</label>
              <input type="tel" className={inputClass} value={formData.tenantPhone} onChange={e => setFormData({...formData, tenantPhone: e.target.value})} placeholder="09XX-XXX-XXXX" />
            </div>
            <div>
              <label className={labelClass}>Email Address</label>
              <input type="email" className={inputClass} value={formData.tenantEmail} onChange={e => setFormData({...formData, tenantEmail: e.target.value})} placeholder="tenant@email.com" />
            </div>
          </div>

          <div className="p-5 bg-slate-950/50 rounded-2xl border border-slate-800">
             <label className="block text-xs font-bold text-slate-500 uppercase tracking-widest mb-4">Coverage Period</label>
             <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
               <div>
                 <label className={labelClass}>Start Date</label>
                 <input type="date" className={inputClass} value={formData.coverageStart} onChange={e => handleCoverageStartChange(e.target.value)} />
               </div>
               <div>
                 <label className={labelClass}>End Date</label>
                 <input type="date" className={inputClass} value={formData.coverageEnd} onChange={e => setFormData({...formData, coverageEnd: e.target.value})} />
               </div>
             </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
            <div>
              <label className={labelClass}>Payment Date *</label>
              <input type="date" required className={inputClass} value={formData.paymentDate} onChange={e => setFormData({...formData, paymentDate: e.target.value})} />
            </div>
            <div>
              <label className={labelClass}>Payment Method</label>
              <select className={inputClass} value={formData.paymentMethod} onChange={e => setFormData({...formData, paymentMethod: e.target.value as any})}>
                <option value="Cash">{PAYMENT_METHOD_ICONS['Cash']} Cash</option>
                <option value="GCash">{PAYMENT_METHOD_ICONS['GCash']} GCash</option>
                <option value="Bank Transfer">{PAYMENT_METHOD_ICONS['Bank Transfer']} Bank Transfer</option>
                <option value="Cheque">{PAYMENT_METHOD_ICONS['Cheque']} Cheque</option>
                <option value="Other">{PAYMENT_METHOD_ICONS['Other']} Other</option>
              </select>
            </div>
          </div>

          <div className="bg-slate-950/50 p-6 rounded-2xl space-y-4 border border-slate-800">
             <div className="flex items-center gap-2 text-indigo-400 mb-2">
                <Calculator size={18} />
                <span className="text-xs font-bold uppercase tracking-widest">Calculations</span>
             </div>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <label className={labelClass}>Base Rent (₱)</label>
                <input type="number" className={inputClass} value={formData.baseRent || ''} onChange={e => setFormData({...formData, baseRent: parseFloat(e.target.value) || 0})} />
              </div>
              <div>
                <label className={labelClass}>Charges (₱)</label>
                <input type="number" className={inputClass} value={formData.additionalCharges || ''} onChange={e => setFormData({...formData, additionalCharges: parseFloat(e.target.value) || 0})} />
              </div>
              <div>
                <label className={labelClass}>Deductions (₱)</label>
                <input type="number" className={inputClass} value={formData.deductions || ''} onChange={e => setFormData({...formData, deductions: parseFloat(e.target.value) || 0})} />
              </div>
            </div>
            <div className="pt-2">
              <label className={labelClass}>Remarks / Notes</label>
              <textarea 
                className={`${inputClass} h-20 resize-none`} 
                value={formData.notes} 
                onChange={e => setFormData({...formData, notes: e.target.value})} 
                placeholder="Specific details about this payment..."
              />
            </div>
          </div>

          <div className="flex justify-between items-center bg-indigo-500/10 p-5 rounded-2xl border border-indigo-500/20">
            <div className="flex flex-col">
              <span className="font-bold text-slate-300">Total Amount</span>
              <span className="text-[10px] text-slate-500 font-mono uppercase tracking-tighter">via {formData.paymentMethod} {PAYMENT_METHOD_ICONS[formData.paymentMethod]}</span>
            </div>
            <span className="text-3xl font-black text-emerald-400">₱ {total.toLocaleString('en-PH', { minimumFractionDigits: 2 })}</span>
          </div>

          <div className="flex gap-4">
            <button type="button" onClick={() => navigate('/records')} className="flex-1 bg-slate-800 text-slate-400 font-bold py-4 rounded-xl hover:bg-slate-700 transition-all flex justify-center items-center gap-2">
                <X size={20} /> Cancel
            </button>
            <button type="submit" className="flex-[2] bg-indigo-600 text-white font-bold py-4 rounded-xl shadow-lg shadow-indigo-900/30 hover:bg-indigo-500 active:scale-95 transition-all flex justify-center items-center gap-2">
                <Save size={20} /> Save & Notify
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default AddPayment;
