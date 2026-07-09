import React from 'react';
import { Navigate, Outlet } from 'react-router-dom';
import { isAuthenticated, getStoredUser } from '../api/auth';
import Navbar from './Navbar';

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
      <main style={{ flex: 1, padding: '16px', overflowY: 'auto' }}>
        <Outlet />
      </main>
    </div>
  );
}
