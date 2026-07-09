import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';

// i18n
import { LanguageProvider } from './i18n/LanguageContext';
import LanguageSwitcher from './components/LanguageSwitcher';

// Guards
import ProtectedRoute  from './components/ProtectedRoute';
import AdminRoute      from './components/AdminRoute';
import CustomerRoute   from './components/CustomerRoute';

// Public pages
import MainInfoPage   from './pages/MainInfoPage';
import AdminLoginPage from './pages/AdminLoginPage';
import AdminForgotPasswordPage from './pages/AdminForgotPasswordPage';

// Customer pages
import CustomerHomePage            from './pages/CustomerHomePage';
import ChooseDatePage              from './pages/ChooseDatePage';
import ChooseTimePage              from './pages/ChooseTimePage';
import ConfirmBookingPage          from './pages/ConfirmBookingPage';
import MyAppointmentsPage          from './pages/MyAppointmentsPage';
import CustomerProfilePage         from './pages/CustomerProfilePage';
import CustomerGalleryPage         from './pages/CustomerGalleryPage';

// Admin pages
import AdminDashboardPage  from './pages/AdminDashboardPage';
import AdminSlotsPage      from './pages/AdminSlotsPage';
import AdminCreateSlotPage from './pages/AdminCreateSlotPage';
import AdminEditSlotPage   from './pages/AdminEditSlotPage';
import AdminBookingsPage   from './pages/AdminBookingsPage';
import AdminSettingsPage   from './pages/AdminSettingsPage';
import AdminStatsPage      from './pages/AdminStatsPage';

export default function App() {
  return (
    <LanguageProvider>
    <BrowserRouter>
      {/* Floating language switcher — visible on every page */}
      <LanguageSwitcher />
      <Routes>
        {/* Main app info / landing page – always shown at the root */}
        <Route path="/" element={<MainInfoPage />} />

        {/* Public admin login */}
        <Route path="/admin/login" element={<AdminLoginPage />} />
        <Route path="/admin/forgot-password" element={<AdminForgotPasswordPage />} />

        {/* Customer home – public; handles first-run registration itself */}
        <Route path="/home" element={<CustomerHomePage />} />

        {/* ─── Customer routes ─────────────────────────────────────── */}
        <Route element={<CustomerRoute />}>
          <Route path="/my-appointments" element={<MyAppointmentsPage />} />
          <Route path="/profile"         element={<CustomerProfilePage />} />
          <Route path="/gallery"         element={<CustomerGalleryPage />} />
        </Route>

        {/* Booking flow – needs auth but uses its own layout (no bottom nav during booking flow) */}
        <Route element={<ProtectedRoute />}>
          <Route path="/book/date"    element={<ChooseDatePage />} />
          <Route path="/book/time"    element={<ChooseTimePage />} />
          <Route path="/book/confirm" element={<ConfirmBookingPage />} />
        </Route>

        {/* ─── Admin routes ─────────────────────────────────────────── */}
        <Route element={<AdminRoute />}>
          <Route path="/admin/dashboard"     element={<AdminDashboardPage />} />
          <Route path="/admin/slots"         element={<AdminSlotsPage />} />
          <Route path="/admin/slots/create"  element={<AdminCreateSlotPage />} />
          <Route path="/admin/slots/edit/:id" element={<AdminEditSlotPage />} />
          <Route path="/admin/bookings"      element={<AdminBookingsPage />} />
          <Route path="/admin/settings"      element={<AdminSettingsPage />} />
          <Route path="/admin/stats"         element={<AdminStatsPage />} />
        </Route>

        {/* Catch-all */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
    </LanguageProvider>
  );
}
