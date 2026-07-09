import React from 'react';
import { Navigate, Outlet } from 'react-router-dom';
import { isAuthenticated, getStoredUser } from '../api/auth';
import BottomNav from './BottomNav';

export default function CustomerRoute() {
  if (!isAuthenticated()) {
    return <Navigate to="/home" replace />;
  }

  const user = getStoredUser();
  if (!user || user.role !== 'customer') {
    return <Navigate to="/admin/dashboard" replace />;
  }

  return (
    <div className="app-wrapper">
      <Outlet />
      <BottomNav />
    </div>
  );
}
