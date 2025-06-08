/**
 * User management API facade
 * Backwards compatibility layer
 */


export const userAPI = {
  // Mocked for no-auth mode
  getMe: async () => ({ id: 'default-user', email: 'user@example.com', name: 'Default User', role: 'student' }),
  updateMe: async () => ({ success: true }),
  deleteMe: async () => ({ success: true }),
};
