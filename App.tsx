import React from 'react';
import { HashRouter, Routes, Route, Navigate } from 'react-router-dom';
import Layout from './components/Layout';
import Dashboard from './pages/Dashboard';
import Tenants from './pages/Tenants';
import AddTenant from './pages/AddTenant';
import Records from './pages/Records';
import AddPayment from './pages/AddPayment';
import AddExpense from './pages/AddExpense';
import OwnerInfo from './pages/OwnerInfo';
import Login from './pages/Login';
import Register from './pages/Register';

const App: React.FC = () => {
  return (
    <HashRouter>
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />
        
        {/* Protected Routes */}
        <Route path="/" element={<Layout><Dashboard /></Layout>} />
        <Route path="/tenants" element={<Layout><Tenants /></Layout>} />
        <Route path="/add-tenant" element={<Layout><AddTenant /></Layout>} />
        <Route path="/add-tenant/:id" element={<Layout><AddTenant /></Layout>} />
        <Route path="/records" element={<Layout><Records /></Layout>} />
        <Route path="/add-payment" element={<Layout><AddPayment /></Layout>} />
        <Route path="/add-payment/:id" element={<Layout><AddPayment /></Layout>} />
        <Route path="/add-expense" element={<Layout><AddExpense /></Layout>} />
        <Route path="/add-expense/:id" element={<Layout><AddExpense /></Layout>} />
        <Route path="/settings" element={<Layout><OwnerInfo /></Layout>} />
        
        <Route path="*" element={<Navigate to="/" />} />
      </Routes>
    </HashRouter>
  );
};

export default App;