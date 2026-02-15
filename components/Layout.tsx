import React, { useEffect, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { LayoutDashboard, Users, Receipt, FilePlus, Settings, LogOut, Wallet, FileText } from 'lucide-react';
import { db } from '../db';

interface LayoutProps {
  children: React.ReactNode;
}

const Layout: React.FC<LayoutProps> = ({ children }) => {
  const location = useLocation();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState(location.pathname);
  const [username, setUsername] = useState<string>('');

  useEffect(() => {
    setActiveTab(location.pathname);
    // Check auth
    const user = localStorage.getItem('spaceRentUser');
    if (!user) {
      navigate('/login');
    } else {
      setUsername(user);
    }
  }, [location, navigate]);

  const handleLogout = () => {
    localStorage.removeItem('spaceRentUser');
    navigate('/login');
  };

  const navItems = [
    { path: '/', label: 'Dashboard', icon: <LayoutDashboard size={20} /> },
    { path: '/tenants', label: 'Tenants', icon: <Users size={20} /> },
    { path: '/records', label: 'Records', icon: <FileText size={20} /> },
    { path: '/settings', label: 'Settings', icon: <Settings size={20} /> },
  ];

  const fabItems = [
    { path: '/add-payment', label: 'Payment', icon: <Receipt size={18} /> },
    { path: '/add-expense', label: 'Expense', icon: <Wallet size={18} /> },
  ];

  return (
    <div className="flex min-h-screen bg-slate-950 text-slate-200 font-sans selection:bg-indigo-500/30">
      {/* Desktop Sidebar */}
      <aside className="hidden md:flex flex-col w-64 border-r border-slate-800 bg-slate-950/95 fixed inset-y-0 z-50">
        <div className="p-6 border-b border-slate-800 flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-indigo-500 flex items-center justify-center text-white font-bold">
            SR
          </div>
          <span className="text-xl font-bold bg-gradient-to-r from-indigo-400 to-emerald-400 bg-clip-text text-transparent">SpaceRent</span>
        </div>

        <nav className="flex-1 p-4 space-y-2">
          {navItems.map((item) => (
            <Link
              key={item.path}
              to={item.path}
              className={`flex items-center gap-3 px-4 py-3 rounded-xl transition-all ${
                activeTab === item.path
                  ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-900/50'
                  : 'text-slate-400 hover:bg-slate-900 hover:text-slate-100'
              }`}
            >
              {item.icon}
              <span className="font-medium">{item.label}</span>
            </Link>
          ))}
          
          <div className="pt-6 mt-6 border-t border-slate-800">
             <p className="px-4 text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Quick Actions</p>
             <Link to="/add-payment" className="flex items-center gap-3 px-4 py-3 text-emerald-400 hover:bg-slate-900 rounded-xl transition-all">
                <Receipt size={20} />
                <span>New Payment</span>
             </Link>
             <Link to="/add-expense" className="flex items-center gap-3 px-4 py-3 text-rose-400 hover:bg-slate-900 rounded-xl transition-all">
                <Wallet size={20} />
                <span>New Expense</span>
             </Link>
          </div>
        </nav>

        <div className="p-4 border-t border-slate-800">
          <button
            onClick={handleLogout}
            className="flex w-full items-center gap-3 px-4 py-3 text-slate-500 hover:text-rose-500 hover:bg-rose-500/10 rounded-xl transition-all"
          >
            <LogOut size={20} />
            <span>Logout ({username})</span>
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 md:ml-64 pb-24 md:pb-8">
        <div className="max-w-7xl mx-auto p-4 md:p-8">
          {children}
        </div>
      </main>

      {/* Mobile Bottom Tab Bar */}
      <div className="md:hidden fixed bottom-0 left-0 right-0 bg-slate-900/90 backdrop-blur-md border-t border-slate-800 z-50">
        <div className="flex justify-around items-center p-2">
          {navItems.map((item) => (
            <Link
              key={item.path}
              to={item.path}
              className={`flex flex-col items-center gap-1 p-2 rounded-lg transition-all ${
                activeTab === item.path ? 'text-indigo-400' : 'text-slate-500'
              }`}
            >
              {item.icon}
              <span className="text-[10px] font-medium">{item.label}</span>
            </Link>
          ))}
          <button onClick={handleLogout} className="flex flex-col items-center gap-1 p-2 text-slate-500">
             <LogOut size={20} />
             <span className="text-[10px]">Exit</span>
          </button>
        </div>
      </div>
    </div>
  );
};

export default Layout;
