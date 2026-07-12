import React from 'react';
import { Navigate, Outlet } from 'react-router-dom';
import { isAuthenticated, getStoredUser } from '../api/auth';
import Navbar from './Navbar';
import AdminBottomNav from './AdminBottomNav';

export default function AdminRoute() {
  if (!isAuthenticated()) {
    return <Navigate to="/admin/login" replace />;
  }

  const user = getStoredUser();
  if (!user || user.role !== 'admin') {
    return <Navigate to="/home" replace />;
  }

  return (
    <div className="app-wrapper">
      <Navbar />
      {/* extra bottom padding so content never hides behind the tab bar */}
      <main style={{ flex: 1, padding: '16px 16px 110px', overflowY: 'auto' }}>
        <Outlet />
      </main>
      <AdminBottomNav />
    </div>
  );
}
