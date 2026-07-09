import api from './api';

export const adminApi = {
  // Dashboard
  getDashboard: () =>
    api.get('/admin/dashboard'),

  // Slots
  getSlots: (date) =>
    api.get(date ? `/admin/slots?date=${date}` : '/admin/slots'),

  createSlot: (data) =>
    api.post('/admin/slots', data),

  updateSlot: (slotId, data, force = false) =>
    api.put(`/admin/slots/${slotId}?force=${force}`, data),

  deleteSlot: (slotId, force = false) =>
    api.delete(`/admin/slots/${slotId}?force=${force}`),

  // Bookings
  getBookings: (filters = {}) => {
    const params = new URLSearchParams();
    if (filters.date)             params.set('date', filters.date);
    if (filters.appointment_type) params.set('appointment_type', filters.appointment_type);
    if (filters.status)           params.set('status', filters.status);
    if (filters.search)           params.set('search', filters.search);
    const qs = params.toString();
    return api.get(`/admin/bookings${qs ? `?${qs}` : ''}`);
  },

  cancelBooking: (bookingId) =>
    api.put(`/admin/bookings/${bookingId}/cancel`, {}),

  // Settings
  getSettings: () =>
    api.get('/admin/settings'),

  updateSettings: (data) =>
    api.put('/admin/settings', data),

  // Weekly (bulk) slot creation
  createSlotsBulk: (data) =>
    api.post('/admin/slots/bulk', data),

  // No-show tracking
  setNoShow: (bookingId, noShow) =>
    api.put(`/admin/bookings/${bookingId}/no-show`, { no_show: noShow }),

  // Customer history (visits / no-shows / last visit)
  getCustomerStats: () =>
    api.get('/admin/customer-stats'),

  // Statistics page
  getStats: () =>
    api.get('/admin/stats'),

  // Gallery
  uploadGalleryImage: (file) => {
    const fd = new FormData();
    fd.append('file', file);
    return api.upload('/admin/gallery', fd);
  },
  deleteGalleryImage: (id) =>
    api.delete(`/admin/gallery/${id}`),
};

export default adminApi;
