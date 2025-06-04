export const validateEmail = (email: string): boolean => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
};

export const validatePassword = (password: string): string | null => {
  if (!password) return null; // Empty password is okay (keeping current)
  if (password.length < 6) {
    return 'Password must be at least 6 characters long.';
  }
  return null;
};

export const validateOnboardingData = (data: any): boolean => {
  return !!(data.name && data.job && data.learningStyle);
};
