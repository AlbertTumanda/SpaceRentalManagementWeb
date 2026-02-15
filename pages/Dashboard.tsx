import React, { useState, useEffect } from 'react';
import { db } from '../db';
import { PaymentRecord, ExpenseRecord, MonthlyStats, OwnerRecord, TenantRecord } from '../types';
import { formatPHP, getMonthYear, getReminderMessage, formatDate } from '../utils';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import { generateFinancialInsights } from '../services/geminiService';
import { Bell, TrendingUp, TrendingDown, DollarSign, ArrowRight, BrainCircuit, AlertTriangle } from 'lucide-react';
import { Link } from 'react-router-dom';

const SummaryCard: React.FC<{ title: string; value: number; color: string; icon: React.ReactNode }> = ({ title, value, color, icon }) => (
  <div className={`bg-slate-900 rounded-2xl p-6 shadow-xl border border-slate-800 relative overflow-hidden group`}>
    <div className={`absolute top-0 left-0 w-1 h-full ${color}`}></div>
    <div className="flex justify-between items-start relative z-10">
      <div>
        <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">{title}</p>
        <h3 className="text-3xl font-black text-slate-100 mt-2">{formatPHP(value)}</h3>
      </div>
      <div className="p-3 bg-slate-950 rounded-xl text-slate-300 border border-slate-800 group-hover:scale-110 transition-transform duration-300">
        {icon}
      </div>
    </div>
    <div className="absolute -bottom-4 -right-4 text-9xl opacity-5 pointer-events-none select-none text-white">
      {icon}
    </div>
  </div>
);

const Dashboard: React.FC = () => {
  const [totalIncome, setTotalIncome] = useState(0);
  const [totalExpenses, setTotalExpenses] = useState(0);
  const [monthlyStats, setMonthlyStats] = useState<MonthlyStats[]>([]);
  const [owner, setOwner] = useState<OwnerRecord | null>(null);
  const [dueToday, setDueToday] = useState<TenantRecord[]>([]);
  const [upcomingReminders, setUpcomingReminders] = useState<TenantRecord[]>([]);
  const [expiringContracts, setExpiringContracts] = useState<TenantRecord[]>([]);
  const [aiInsights, setAiInsights] = useState<string>('');
  const [isGenerating, setIsGenerating] = useState(false);

  useEffect(() => {
    const fetchData = async () => {
      const [payments, expenses, tenants, ownerData] = await Promise.all([
        db.payments.toArray(),
        db.expenses.toArray(),
        db.tenants.toArray(),
        db.owner.toCollection().first()
      ]);

      setOwner(ownerData || null);
      checkSchedules(tenants, ownerData || undefined);

      const income = payments.reduce((sum, p) => sum + p.totalAmount, 0);
      const expense = expenses.reduce((sum, e) => sum + e.amount, 0);
      setTotalIncome(income);
      setTotalExpenses(expense);

      processMonthlyStats(payments, expenses);

      if (payments.length > 0 || expenses.length > 0) {
        const today = new Date();
        const expiring = tenants.filter(t => {
           const end = new Date(t.contractEnd);
           return end <= new Date(today.getTime() + 30 * 24 * 60 * 60 * 1000);
        });
        const expiringList = expiring.map(t => `${t.name} (Exp: ${t.contractEnd})`).join(', ');
        
        setIsGenerating(true);
        generateFinancialInsights(income, expense, expiringList).then(text => {
            setAiInsights(text);
            setIsGenerating(false);
        });
      }
    };

    fetchData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const checkSchedules = (tenants: TenantRecord[], settings?: OwnerRecord) => {
    const today = new Date();
    const currentDay = today.getDate();
    const currentYear = today.getFullYear();
    const currentMonth = today.getMonth();
    const lastDayOfMonth = new Date(currentYear, currentMonth + 1, 0).getDate();

    const reminderDaysBefore = settings?.reminderDaysBefore ?? 3;
    
    // Logic for "due soon" based on a cyclical monthly due date
    const tenantsWithReminders = tenants.filter(t => {
       const due = t.dueDay;
       const reminderDate = due - reminderDaysBefore;
       // Handle edge case where reminder date is previous month (simple check for now: just checks day number)
       return currentDay === reminderDate || (reminderDate <= 0 && currentDay === (lastDayOfMonth + reminderDate));
    });

    const dueNow = tenants.filter(t => Math.min(t.dueDay, lastDayOfMonth) === currentDay);
    
    const thirtyDaysLater = new Date();
    thirtyDaysLater.setDate(today.getDate() + 30);
    const expiring = tenants.filter(t => {
      const end = new Date(t.contractEnd);
      return end >= today && end <= thirtyDaysLater;
    });

    setDueToday(dueNow);
    setUpcomingReminders(tenantsWithReminders);
    setExpiringContracts(expiring);
  };

  const processMonthlyStats = (payments: PaymentRecord[], expenses: ExpenseRecord[]) => {
    const monthMap: Record<string, { income: number; expenses: number }> = {};
    
    payments.forEach(p => {
      const my = getMonthYear(p.paymentDate);
      if (!monthMap[my]) monthMap[my] = { income: 0, expenses: 0 };
      monthMap[my].income += p.totalAmount;
    });
    
    expenses.forEach(e => {
      const my = getMonthYear(e.date);
      if (!monthMap[my]) monthMap[my] = { income: 0, expenses: 0 };
      monthMap[my].expenses += e.amount;
    });
    
    const sortedMonths = Object.entries(monthMap)
      .sort((a, b) => a[0].localeCompare(b[0]))
      .slice(-6) // Last 6 months
      .map(([month, data]) => ({
        month, income: data.income, expenses: data.expenses, net: data.income - data.expenses
      }));
    setMonthlyStats(sortedMonths);
  };

  const sendReminder = (tenant: TenantRecord, type: 'sms' | 'email') => {
    const dueDaySuffix = tenant.dueDay === 1 ? 'st' : tenant.dueDay === 2 ? 'nd' : tenant.dueDay === 3 ? 'rd' : 'th';
    const message = getReminderMessage(
      tenant.name, 
      tenant.blockNumber, 
      tenant.leaseAmount, 
      `the ${tenant.dueDay}${dueDaySuffix}`,
      owner?.reminderTemplate
    );

    if (type === 'sms' && tenant.phone) {
      window.open(`sms:${tenant.phone}?body=${encodeURIComponent(message)}`);
    } else if (type === 'email' && tenant.email) {
      window.open(`mailto:${tenant.email}?subject=Rent Reminder&body=${encodeURIComponent(message)}`);
    }
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-700">
      <header className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-6">
        <div className="flex items-center gap-4">
          {owner?.logo && <img src={owner.logo} className="w-16 h-16 rounded-xl object-contain bg-slate-800 p-2 shadow-lg border border-slate-700" alt="Logo" />}
          <div>
            <h1 className="text-3xl font-bold text-slate-100 tracking-tight">
              {owner?.businessName || 'Financial Dashboard'}
            </h1>
            <p className="text-slate-400 mt-1 flex items-center gap-2">
              <span className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse"></span>
              {owner?.proprietor ? `Proprietor: ${owner.proprietor}` : 'Real-time property overview'}
            </p>
          </div>
        </div>
        <div className="bg-slate-900 border border-slate-800 px-6 py-4 rounded-2xl shadow-lg relative overflow-hidden">
          <div className="absolute right-0 top-0 p-2 opacity-10"><DollarSign size={64} /></div>
          <p className="text-xs font-bold text-indigo-400 uppercase tracking-[0.2em] relative z-10">Net Surplus</p>
          <p className="text-3xl font-black text-indigo-100 relative z-10">{formatPHP(totalIncome - totalExpenses)}</p>
        </div>
      </header>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        <SummaryCard title="Total Income" value={totalIncome} color="bg-emerald-500" icon={<TrendingUp size={24} className="text-emerald-400" />} />
        <SummaryCard title="Total Expenses" value={totalExpenses} color="bg-rose-500" icon={<TrendingDown size={24} className="text-rose-400" />} />
        <SummaryCard title="Avg Monthly Income" value={monthlyStats.length > 0 ? totalIncome / monthlyStats.length : 0} color="bg-indigo-500" icon={<DollarSign size={24} className="text-indigo-400" />} />
      </div>

      {/* Alerts Section */}
      {(dueToday.length > 0 || upcomingReminders.length > 0 || expiringContracts.length > 0) && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-3">
             <h3 className="text-sm font-bold text-slate-500 uppercase tracking-widest flex items-center gap-2 mb-4">
                <Bell size={16} /> Action Items
             </h3>
             <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {/* Due Today */}
                {dueToday.map(t => (
                  <div key={`due-${t.id}`} className="bg-slate-900 border-l-4 border-l-emerald-500 border border-slate-800 p-4 rounded-r-xl flex justify-between items-center shadow-lg">
                    <div>
                      <p className="font-bold text-slate-100">{t.name}</p>
                      <p className="text-[10px] text-emerald-400 font-bold uppercase tracking-wider">Due Today • Block {t.blockNumber}</p>
                    </div>
                    <Link to={`/add-payment?tenant=${t.name}&block=${t.blockNumber}`} className="bg-emerald-500 text-slate-950 p-2 rounded-lg hover:bg-emerald-400 transition-colors">
                      <ArrowRight size={16} />
                    </Link>
                  </div>
                ))}
                
                {/* Due Soon */}
                {upcomingReminders.map(t => (
                  <div key={`remind-${t.id}`} className="bg-slate-900 border-l-4 border-l-amber-500 border border-slate-800 p-4 rounded-r-xl flex justify-between items-center shadow-lg">
                    <div>
                      <p className="font-bold text-slate-100">{t.name}</p>
                      <p className="text-[10px] text-amber-500 font-bold uppercase tracking-wider">Due Soon • Block {t.blockNumber}</p>
                    </div>
                    <div className="flex gap-2">
                       <button onClick={() => sendReminder(t, 'sms')} className="p-2 bg-slate-800 rounded-lg hover:bg-slate-700 text-slate-300">📱</button>
                       <button onClick={() => sendReminder(t, 'email')} className="p-2 bg-slate-800 rounded-lg hover:bg-slate-700 text-slate-300">📧</button>
                    </div>
                  </div>
                ))}

                {/* Expiring */}
                {expiringContracts.map(t => (
                  <div key={`exp-${t.id}`} className="bg-slate-900 border-l-4 border-l-rose-500 border border-slate-800 p-4 rounded-r-xl flex justify-between items-center shadow-lg">
                    <div>
                      <p className="font-bold text-slate-100">{t.name}</p>
                      <p className="text-[10px] text-rose-500 font-bold uppercase tracking-wider">Expires {formatDate(t.contractEnd)}</p>
                    </div>
                    <Link to={`/add-tenant/${t.id}`} className="text-rose-400 hover:text-rose-300 text-xs font-bold underline">Renew</Link>
                  </div>
                ))}
             </div>
          </div>
        </div>
      )}

      {/* Main Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 h-auto lg:h-[400px]">
        {/* Chart */}
        <div className="lg:col-span-2 bg-slate-900 p-6 rounded-2xl border border-slate-800 shadow-xl flex flex-col">
          <h3 className="text-lg font-bold text-slate-100 mb-6 flex items-center gap-2">
            <TrendingUp size={20} className="text-indigo-400"/> Cash Flow Trends
          </h3>
          <div className="flex-1 w-full min-h-[250px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={monthlyStats} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" vertical={false} />
                <XAxis dataKey="month" stroke="#64748b" fontSize={12} tickLine={false} axisLine={false} />
                <YAxis stroke="#64748b" fontSize={10} tickFormatter={(val) => `₱${val/1000}k`} tickLine={false} axisLine={false} />
                <Tooltip 
                  contentStyle={{ backgroundColor: '#0f172a', border: '1px solid #1e293b', borderRadius: '8px', color: '#f1f5f9' }}
                  itemStyle={{ fontSize: '12px' }}
                  cursor={{fill: '#1e293b', opacity: 0.4}}
                  formatter={(value: number) => [formatPHP(value), '']}
                />
                <Legend iconType="circle" wrapperStyle={{ paddingTop: '20px' }} />
                <Bar dataKey="income" fill="#10b981" radius={[4, 4, 0, 0]} name="Income" barSize={30} />
                <Bar dataKey="expenses" fill="#f43f5e" radius={[4, 4, 0, 0]} name="Expenses" barSize={30} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* AI Advisor */}
        <div className="bg-gradient-to-br from-indigo-900/40 to-slate-900 rounded-2xl p-6 border border-indigo-500/30 shadow-xl flex flex-col relative overflow-hidden">
          <div className="absolute top-0 right-0 p-4 opacity-10 text-indigo-300"><BrainCircuit size={100} /></div>
          <div className="flex items-center gap-2 mb-4 relative z-10">
            <BrainCircuit className="text-indigo-400" size={24} />
            <h3 className="text-lg font-bold text-indigo-100">AI Financial Advisor</h3>
          </div>
          
          <div className="flex-1 overflow-y-auto pr-2 custom-scrollbar relative z-10">
            {isGenerating ? (
              <div className="space-y-4 animate-pulse mt-4">
                <div className="h-2 bg-indigo-500/20 rounded w-3/4"></div>
                <div className="h-2 bg-indigo-500/20 rounded w-full"></div>
                <div className="h-2 bg-indigo-500/20 rounded w-5/6"></div>
                <div className="h-2 bg-indigo-500/20 rounded w-4/5"></div>
              </div>
            ) : aiInsights ? (
              <div className="text-sm text-indigo-200/90 leading-relaxed whitespace-pre-line font-medium">
                {aiInsights}
              </div>
            ) : (
              <div className="h-full flex flex-col items-center justify-center text-center text-slate-500 space-y-2">
                 <AlertTriangle size={32} />
                 <p className="text-xs">Record more data to generate insights.</p>
              </div>
            )}
          </div>
          <div className="mt-4 pt-4 border-t border-indigo-500/20 text-[10px] text-indigo-400/60 font-mono text-center">
            Powered by Gemini
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
