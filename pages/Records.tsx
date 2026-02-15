import React, { useState, useEffect } from 'react';
import { db } from '../db';
import { Transaction, PaymentRecord, ExpenseRecord, OwnerRecord } from '../types';
import { formatPHP, formatDate, PAYMENT_METHOD_ICONS } from '../utils';
import { useNavigate } from 'react-router-dom';
import { jsPDF } from 'jspdf';
import 'jspdf-autotable';
import { FileText, Search, Download, Trash2, Edit2, Filter, X } from 'lucide-react';

const Records: React.FC = () => {
  const navigate = useNavigate();
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [owner, setOwner] = useState<OwnerRecord | null>(null);
  const [filterType, setFilterType] = useState<'all' | 'income' | 'expense'>('all');
  const [searchTerm, setSearchTerm] = useState('');
  
  // Date Filters
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  const fetchRecords = async () => {
    const payments = await db.payments.toArray();
    const expenses = await db.expenses.toArray();
    const ownerInfo = await db.owner.toCollection().first();
    setOwner(ownerInfo || null);

    const all = [
      ...payments.map(p => ({ ...p, type: 'income' as const })),
      ...expenses.map(e => ({ ...e, type: 'expense' as const }))
    ].sort((a, b) => {
      const dateA = 'paymentDate' in a ? a.paymentDate : a.date;
      const dateB = 'paymentDate' in b ? b.paymentDate : b.date;
      return new Date(dateB).getTime() - new Date(dateA).getTime();
    });

    setTransactions(all);
  };

  useEffect(() => {
    fetchRecords();
  }, []);

  const handleDelete = async (tx: Transaction) => {
    if (!window.confirm('Are you sure you want to delete this record permanently?')) return;
    
    try {
      if (tx.type === 'income' && tx.id) {
        await db.payments.delete(tx.id);
      } else if (tx.type === 'expense' && tx.id) {
        await db.expenses.delete(tx.id);
      }
      fetchRecords();
    } catch (err) {
      console.error("Delete failed", err);
      alert("Failed to delete record.");
    }
  };

  const handleEdit = (tx: Transaction) => {
    if (tx.type === 'income') {
      navigate(`/add-payment/${tx.id}`);
    } else {
      navigate(`/add-expense/${tx.id}`);
    }
  };

  const filtered = transactions.filter(tx => {
    const txDate = new Date(tx.type === 'income' ? (tx as PaymentRecord).paymentDate : (tx as ExpenseRecord).date);
    const typeMatch = filterType === 'all' || tx.type === filterType;
    const name = tx.type === 'income' ? (tx as PaymentRecord).tenantName : (tx as ExpenseRecord).category;
    const searchMatch = name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                       tx.notes.toLowerCase().includes(searchTerm.toLowerCase()) ||
                       (tx.blockNumber || '').toLowerCase().includes(searchTerm.toLowerCase());
    const startMatch = !startDate || txDate >= new Date(startDate);
    const endMatch = !endDate || txDate <= new Date(endDate);
    return typeMatch && searchMatch && startMatch && endMatch;
  });

  const exportSummaryPDF = () => {
    const doc = new jsPDF();
    const businessName = owner?.businessName || 'SpaceRent Management';
    
    doc.setFontSize(20);
    doc.setTextColor(40);
    doc.text(businessName, 14, 22);
    
    doc.setFontSize(10);
    doc.setTextColor(100);
    doc.text(`Financial Report: ${filterType.toUpperCase()}`, 14, 30);
    doc.text(`Date Range: ${startDate || 'All Time'} to ${endDate || 'Present'}`, 14, 35);
    doc.text(`Generated on: ${new Date().toLocaleString()}`, 14, 40);

    const tableData = filtered.map(tx => [
      formatDate(tx.type === 'income' ? (tx as PaymentRecord).paymentDate : (tx as ExpenseRecord).date),
      tx.type === 'income' ? (tx as PaymentRecord).tenantName : (tx as ExpenseRecord).category,
      tx.blockNumber ? `B-${tx.blockNumber}` : '-',
      tx.type === 'income' ? `${(tx as PaymentRecord).paymentMethod} ${PAYMENT_METHOD_ICONS[(tx as PaymentRecord).paymentMethod] || ''}` : 'EXPENSE',
      formatPHP(tx.type === 'income' ? (tx as PaymentRecord).totalAmount : (tx as ExpenseRecord).amount)
    ]);

    (doc as any).autoTable({
      startY: 50,
      head: [['Date', 'Entity / Category', 'Block', 'Method', 'Amount']],
      body: tableData,
      theme: 'striped',
      headStyles: { fillColor: [79, 70, 229] },
      footStyles: { fillColor: [241, 245, 249], textColor: [40, 40, 40], fontStyle: 'bold' },
    });

    const totalIncome = filtered.filter(t => t.type === 'income').reduce((sum, t) => sum + (t as PaymentRecord).totalAmount, 0);
    const totalExpense = filtered.filter(t => t.type === 'expense').reduce((sum, t) => sum + (t as ExpenseRecord).amount, 0);
    
    const finalY = (doc as any).lastAutoTable.finalY + 10;
    doc.text(`Total Income: ${formatPHP(totalIncome)}`, 14, finalY);
    doc.text(`Total Expenses: ${formatPHP(totalExpense)}`, 14, finalY + 5);
    doc.text(`Net Surplus: ${formatPHP(totalIncome - totalExpense)}`, 14, finalY + 12);

    doc.save(`SpaceRent_Report_${new Date().getTime()}.pdf`);
  };

  const exportReceiptPDF = (tx: PaymentRecord) => {
    const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a5' });
    const businessName = owner?.businessName || 'SpaceRent Manager';
    const address = owner?.address || '';
    const proprietor = owner?.proprietor || '';

    doc.setDrawColor(200);
    doc.rect(5, 5, 200, 138);

    doc.setFontSize(18);
    doc.setTextColor(40);
    doc.text('ACKNOWLEDGEMENT RECEIPT', 105, 20, { align: 'center' });
    
    doc.setFontSize(12);
    doc.setFont('helvetica', 'bold');
    doc.text(businessName, 105, 28, { align: 'center' });
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    doc.text(address, 105, 33, { align: 'center' });
    doc.setLineWidth(0.5);
    doc.line(15, 38, 195, 38);

    doc.setFontSize(10);
    doc.text(`Receipt No: PAY-${tx.id?.toString().padStart(5, '0')}`, 155, 48);
    doc.text(`Date: ${formatDate(tx.paymentDate)}`, 155, 53);

    doc.setFontSize(11);
    doc.text('RECEIVED FROM:', 15, 55);
    doc.setFont('helvetica', 'bold');
    doc.text(tx.tenantName, 50, 55);
    doc.line(50, 56, 140, 56);

    doc.setFont('helvetica', 'normal');
    doc.text('THE SUM OF:', 15, 65);
    doc.setFont('helvetica', 'bold');
    doc.text(formatPHP(tx.totalAmount), 50, 65);
    doc.line(50, 66, 140, 66);

    doc.setFont('helvetica', 'normal');
    doc.text('FOR PAYMENT OF:', 15, 75);
    doc.text(`Rental for Block ${tx.blockNumber}`, 50, 75);
    doc.text(`Coverage: ${formatDate(tx.coverageStart)} to ${formatDate(tx.coverageEnd)}`, 50, 80);

    doc.text('PAYMENT METHOD:', 15, 90);
    doc.text(`${tx.paymentMethod} ${PAYMENT_METHOD_ICONS[tx.paymentMethod] || ''}`, 50, 90);

    if (tx.notes) {
      doc.text('REMARKS:', 15, 100);
      doc.setFontSize(9);
      doc.text(tx.notes, 50, 100, { maxWidth: 100 });
    }

    doc.line(140, 120, 190, 120);
    doc.setFontSize(9);
    doc.text(proprietor || 'Authorized Representative', 165, 125, { align: 'center' });
    doc.text('Authorized Signature', 165, 130, { align: 'center' });

    doc.save(`Receipt_${tx.tenantName.replace(/\s/g, '_')}_${tx.paymentDate}.pdf`);
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <h1 className="text-3xl font-bold text-slate-100">Records History</h1>
        
        <div className="flex flex-wrap gap-2">
           <button
            onClick={exportSummaryPDF}
            className="px-4 py-2 bg-indigo-600 text-white rounded-xl text-sm font-bold shadow-lg hover:bg-indigo-500 transition-all flex items-center gap-2"
          >
            <Download size={16} /> Export PDF Report
          </button>
          <div className="flex gap-1 bg-slate-900 p-1 rounded-xl border border-slate-800">
            {(['all', 'income', 'expense'] as const).map(t => (
              <button
                key={t}
                onClick={() => setFilterType(t)}
                className={`px-4 py-1.5 rounded-lg text-xs font-bold uppercase transition-all ${
                  filterType === t 
                    ? 'bg-indigo-500 text-white shadow-md' 
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                {t}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="relative md:col-span-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" size={18} />
          <input 
            type="text"
            placeholder="Search records..."
            className="w-full pl-10 pr-4 py-3 rounded-xl bg-slate-900 border border-slate-800 text-slate-100 shadow-sm outline-none focus:ring-2 focus:ring-indigo-500 transition-all placeholder:text-slate-600"
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
          />
        </div>
        <div className="flex items-center gap-2 md:col-span-2">
          <div className="flex items-center gap-2 bg-slate-900 border border-slate-800 rounded-xl px-2 py-1 w-full">
              <span className="text-xs font-bold text-slate-500 uppercase px-2">From</span>
              <input 
                type="date" 
                className="flex-1 px-2 py-2 bg-transparent text-slate-300 text-sm outline-none"
                value={startDate}
                onChange={e => setStartDate(e.target.value)}
              />
              <span className="text-slate-600">|</span>
              <span className="text-xs font-bold text-slate-500 uppercase px-2">To</span>
              <input 
                type="date" 
                className="flex-1 px-2 py-2 bg-transparent text-slate-300 text-sm outline-none"
                value={endDate}
                onChange={e => setEndDate(e.target.value)}
              />
          </div>
          <button 
            onClick={() => {setStartDate(''); setEndDate(''); setSearchTerm('');}}
            className="p-3 bg-slate-900 border border-slate-800 rounded-xl text-slate-500 hover:text-rose-400 transition-colors"
            title="Clear Filters"
          >
            <X size={18} />
          </button>
        </div>
      </div>

      <div className="bg-slate-900 rounded-2xl shadow-xl border border-slate-800 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="bg-slate-950/50 border-b border-slate-800 text-slate-500 uppercase text-[10px] font-black tracking-widest">
                <th className="px-6 py-4">Date</th>
                <th className="px-6 py-4">Entity / Category</th>
                <th className="px-6 py-4 text-center">Method</th>
                <th className="px-6 py-4">Type</th>
                <th className="px-6 py-4">Amount</th>
                <th className="px-6 py-4 text-center">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800">
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-6 py-20 text-center text-slate-500 italic flex flex-col items-center justify-center gap-2">
                    <Filter size={32} className="opacity-20" />
                    No matching records found.
                  </td>
                </tr>
              ) : (
                filtered.map((tx) => (
                  <tr key={`${tx.type}-${tx.id}`} className="hover:bg-slate-800/30 transition-colors group">
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-400 font-mono">
                      {formatDate(tx.type === 'income' ? (tx as PaymentRecord).paymentDate : (tx as ExpenseRecord).date)}
                    </td>
                    <td className="px-6 py-4">
                      <div className="text-sm font-bold text-slate-100">
                        {tx.type === 'income' ? (tx as PaymentRecord).tenantName : (tx as ExpenseRecord).category}
                      </div>
                      <div className="text-xs text-slate-500 flex items-center gap-1">
                        {tx.blockNumber ? <span className="font-mono bg-slate-800 px-1 rounded text-slate-400">B-{tx.blockNumber}</span> : ''}
                        {tx.notes && <span className="truncate max-w-[150px] text-slate-600 ml-1 italic">{tx.notes}</span>}
                      </div>
                    </td>
                    <td className="px-6 py-4 text-center">
                       {tx.type === 'income' ? (
                         <div className="flex flex-col items-center gap-0.5" title={(tx as PaymentRecord).paymentMethod}>
                           <span className="text-lg grayscale group-hover:grayscale-0 transition-all">{PAYMENT_METHOD_ICONS[(tx as PaymentRecord).paymentMethod] || '❓'}</span>
                         </div>
                       ) : (
                         <span className="text-slate-700 font-mono text-xs">--</span>
                       )}
                    </td>
                    <td className="px-6 py-4">
                      <span className={`px-2 py-0.5 rounded text-[9px] font-black uppercase tracking-tighter ${
                        tx.type === 'income' ? 'bg-emerald-500/10 text-emerald-500 border border-emerald-500/20' : 'bg-rose-500/10 text-rose-500 border border-rose-500/20'
                      }`}>
                        {tx.type}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <span className={`text-sm font-bold font-mono ${tx.type === 'income' ? 'text-emerald-400' : 'text-rose-400'}`}>
                        {formatPHP(tx.type === 'income' ? (tx as PaymentRecord).totalAmount : (tx as ExpenseRecord).amount)}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-center">
                      <div className="flex justify-center items-center gap-1 opacity-40 group-hover:opacity-100 transition-opacity">
                        {tx.type === 'income' && (
                          <button 
                            onClick={() => exportReceiptPDF(tx as PaymentRecord)}
                            className="p-1.5 hover:bg-indigo-500/10 rounded-lg text-slate-400 hover:text-indigo-400 transition-all"
                            title="Download Receipt"
                          >
                            <FileText size={16} />
                          </button>
                        )}
                        <button 
                          onClick={() => handleEdit(tx)}
                          className="p-1.5 hover:bg-slate-700 rounded-lg text-slate-400 hover:text-white transition-all"
                          title="Edit"
                        >
                          <Edit2 size={16} />
                        </button>
                        <button 
                          onClick={() => handleDelete(tx)}
                          className="p-1.5 hover:bg-rose-500/10 rounded-lg text-slate-400 hover:text-rose-500 transition-all"
                          title="Delete"
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default Records;
