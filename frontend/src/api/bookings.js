import api from './api';

export const bookingsApi = {
  getAppointmentTypes: () =>
    api.get('/appointment-types'),

  getAvailableSlots: (date) =>
    api.get(`/slots/available?date=${date}`),

  createBooking: (data) =>
    api.post('/bookings', data),

  getMyBookings: () =>
    api.get('/bookings/my'),

  cancelBooking: (bookingId) =>
    api.put(`/bookings/${bookingId}/cancel`, {}),

  // Kids profiles
  getChildren: () => api.get('/children'),
  addChild:    (name) => api.post('/children', { name }),
  deleteChild: (id) => api.delete(`/children/${id}`),

  // Waiting list
  joinWaitlist: (date) => api.post('/waitlist', { date }),
  getMyWaitlist: () => api.get('/waitlist/my'),

  // Gallery
  getGallery: () => api.get('/gallery'),
};

export default bookingsApi;
