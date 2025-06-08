/**
 * Mock Auth API for no-auth mode
 * Provides compatibility for components expecting authAPI
 */

export const authAPI = {
  // Profile endpoints
  v2: {
    getProfile: async () => ({
      success: true,
      data: {
        id: 'default-user',
        email: 'user@example.com',
        name: 'Default User',
        role: 'student',
        has_completed_onboarding: true
      }
    }),
    updateProfile: async () => ({ success: true }),
    createProfile: async () => ({ success: true }),
    deleteProfile: async () => ({ success: true })
  },
  
  // Auth endpoints (all mocked)
  getMe: async () => ({
    id: 'default-user',
    email: 'user@example.com',
    name: 'Default User',
    role: 'student'
  }),
  updateMe: async () => ({ success: true }),
  deleteMe: async () => ({ success: true }),
  
  // Session endpoints
  sessionLogin: async () => ({ success: true, token: 'mock-token' }),
  sessionLogout: async () => ({ success: true })
};