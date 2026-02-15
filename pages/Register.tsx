import React, { useState } from 'react';
import { db } from '../db';
import { useNavigate, Link } from 'react-router-dom';
import { UserPlus, Lock, User } from 'lucide-react';

const Register: React.FC = () => {
  const navigate = useNavigate();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');

  const hashPassword = async (text: string) => {
    const msgBuffer = new TextEncoder().encode(text);
    const hashBuffer = await crypto.subtle.digest('SHA-256', msgBuffer);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    if (password !== confirmPassword) {
      setError("Passwords don't match");
      return;
    }
    if (password.length < 4) {
      setError("Password must be at least 4 characters");
      return;
    }

    try {
      const existing = await db.users.where('username').equals(username).first();
      if (existing) {
          setError("Username already exists");
          return;
      }

      const hashed = await hashPassword(password);
      await db.users.add({
        username,
        password: hashed
      });
      // Also init default owner record if empty
      const ownerCount = await db.owner.count();
      if (ownerCount === 0) {
        await db.owner.add({
          businessName: 'My Rental Business',
          address: '',
          proprietor: username,
          themeColor: '#818cf8'
        });
      }
      alert("Account created! Please login.");
      navigate('/login');
    } catch (err) {
      setError("Error creating account");
    }
  };

  const inputClass = "w-full pl-10 pr-4 py-3 rounded-xl bg-slate-900 border border-slate-700 text-slate-100 placeholder:text-slate-500 focus:ring-2 focus:ring-emerald-500 outline-none transition-all";

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-950 p-4 selection:bg-emerald-500/30">
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_bottom,_var(--tw-gradient-stops))] from-emerald-900/20 via-slate-950 to-slate-950 z-0"></div>

      <div className="w-full max-w-md bg-slate-950/80 p-8 rounded-3xl border border-slate-800 shadow-2xl backdrop-blur-xl relative z-10">
        <div className="text-center mb-8">
          <div className="inline-flex p-4 rounded-2xl bg-emerald-500/10 mb-4 border border-emerald-500/20">
            <UserPlus size={32} className="text-emerald-400" />
          </div>
          <h1 className="text-3xl font-bold text-slate-100 tracking-tight">Admin Setup</h1>
          <p className="text-slate-400 mt-2">Create local account for SpaceRent</p>
        </div>

        <form onSubmit={handleRegister} className="space-y-4">
          {error && (
            <div className="bg-rose-500/10 border border-rose-500/20 text-rose-400 px-4 py-3 rounded-lg text-sm text-center">
              {error}
            </div>
          )}

          <div>
            <label className="block text-sm font-bold text-slate-400 mb-2">Username</label>
            <div className="relative">
                <User className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" size={18} />
                <input 
                type="text" 
                required
                className={inputClass}
                value={username} 
                onChange={e => setUsername(e.target.value)}
                placeholder="Choose a username"
                />
            </div>
          </div>

          <div>
            <label className="block text-sm font-bold text-slate-400 mb-2">Password</label>
            <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" size={18} />
                <input 
                type="password" 
                required
                className={inputClass}
                value={password} 
                onChange={e => setPassword(e.target.value)}
                placeholder="••••••••"
                />
            </div>
          </div>

          <div>
            <label className="block text-sm font-bold text-slate-400 mb-2">Confirm Password</label>
            <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" size={18} />
                <input 
                type="password" 
                required
                className={inputClass}
                value={confirmPassword} 
                onChange={e => setConfirmPassword(e.target.value)}
                placeholder="••••••••"
                />
            </div>
          </div>

          <button 
            type="submit"
            className="w-full bg-emerald-600 hover:bg-emerald-500 text-white font-bold py-3.5 rounded-xl transition-all shadow-lg shadow-emerald-900/40 active:scale-[0.98] mt-4"
          >
            Create Account
          </button>

          <div className="text-center mt-4">
            <Link to="/login" className="text-sm text-emerald-400 hover:underline">
                Back to Login
            </Link>
          </div>
        </form>
      </div>
    </div>
  );
};

export default Register;
