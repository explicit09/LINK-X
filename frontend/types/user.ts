/**
 * User types for components
 * Replaces the old auth.ts types
 */

export interface ComponentUser {
  id: string
  email: string
  name?: string
  role: 'student' | 'instructor' | 'admin'
}

/**
 * Convert user data to ComponentUser format
 * Used by dashboard and other components
 */
export function toComponentUser(
  profile: any,
  user: any
): ComponentUser {
  // If we have profile data, use it
  if (profile) {
    return {
      id: profile.id || 'default-user',
      email: profile.email || 'user@example.com',
      name: profile.name || profile.display_name || 'Default User',
      role: profile.role || 'student'
    }
  }
  
  // Fall back to user data
  if (user) {
    return {
      id: user.id || 'default-user',
      email: user.email || 'user@example.com',
      name: user.name || user.email?.split('@')[0] || 'Default User',
      role: 'student'
    }
  }
  
  // Default user
  return {
    id: 'default-user',
    email: 'user@example.com',
    name: 'Default User',
    role: 'student'
  }
}