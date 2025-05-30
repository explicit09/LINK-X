/**
 * User management API facade
 * Backwards compatibility layer
 */

import { authAPI } from './endpoints';

export const userAPI = {
  getMe: authAPI.getMe,
  updateMe: authAPI.updateMe,
  deleteMe: authAPI.deleteMe,
};