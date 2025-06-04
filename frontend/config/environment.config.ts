/**
 * Environment configuration and validation utilities
 * EXTRACTED to centralize environment variable management
 */

export interface EnvironmentConfig {
  // API Configuration
  API_URL: string;
  
  // Firebase Configuration
  FIREBASE_API_KEY: string;
  FIREBASE_AUTH_DOMAIN: string;
  FIREBASE_PROJECT_ID: string;
  FIREBASE_STORAGE_BUCKET: string;
  FIREBASE_MESSAGING_SENDER_ID: string;
  FIREBASE_APP_ID: string;
  FIREBASE_MEASUREMENT_ID?: string;
  
  // Feature Flags
  ENABLE_ANALYTICS: boolean;
  ENABLE_ERROR_REPORTING: boolean;
  ENABLE_PERFORMANCE_MONITORING: boolean;
  
  // Development
  NODE_ENV: 'development' | 'production' | 'test';
  ANALYZE_BUNDLE?: boolean;
}

/**
 * Get and validate environment configuration
 */
export const getEnvironmentConfig = (): EnvironmentConfig => {
  const config: EnvironmentConfig = {
    // API Configuration
    API_URL: process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8080',
    
    // Firebase Configuration
    FIREBASE_API_KEY: process.env.NEXT_PUBLIC_FIREBASE_API_KEY || '',
    FIREBASE_AUTH_DOMAIN: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN || '',
    FIREBASE_PROJECT_ID: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || '',
    FIREBASE_STORAGE_BUCKET: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET || '',
    FIREBASE_MESSAGING_SENDER_ID: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID || '',
    FIREBASE_APP_ID: process.env.NEXT_PUBLIC_FIREBASE_APP_ID || '',
    FIREBASE_MEASUREMENT_ID: process.env.NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID,
    
    // Feature Flags
    ENABLE_ANALYTICS: process.env.NEXT_PUBLIC_ENABLE_ANALYTICS === 'true',
    ENABLE_ERROR_REPORTING: process.env.NEXT_PUBLIC_ENABLE_ERROR_REPORTING === 'true',
    ENABLE_PERFORMANCE_MONITORING: process.env.NEXT_PUBLIC_ENABLE_PERFORMANCE_MONITORING === 'true',
    
    // Development
    NODE_ENV: (process.env.NODE_ENV as any) || 'development',
    ANALYZE_BUNDLE: process.env.ANALYZE === 'true',
  };

  // Validate required environment variables
  validateEnvironmentConfig(config);
  
  return config;
};

/**
 * Validate environment configuration
 */
export const validateEnvironmentConfig = (config: EnvironmentConfig): void => {
  const requiredFields: (keyof EnvironmentConfig)[] = [
    'API_URL',
    'FIREBASE_API_KEY',
    'FIREBASE_AUTH_DOMAIN',
    'FIREBASE_PROJECT_ID',
  ];

  const missingFields = requiredFields.filter(
    (field) => !config[field] || config[field] === ''
  );

  if (missingFields.length > 0) {
    const message = `Missing required environment variables: ${missingFields.join(', ')}`;
    
    if (config.NODE_ENV === 'production') {
      throw new Error(message);
    } else {
      console.warn(`⚠️  ${message}`);
    }
  }

  // Validate Firebase configuration
  if (config.FIREBASE_API_KEY && !config.FIREBASE_PROJECT_ID) {
    throw new Error('Firebase API key provided but project ID is missing');
  }

  // Validate API URL format
  if (config.API_URL && !isValidUrl(config.API_URL)) {
    throw new Error(`Invalid API URL format: ${config.API_URL}`);
  }
};

/**
 * Check if a string is a valid URL
 */
const isValidUrl = (string: string): boolean => {
  try {
    new URL(string);
    return true;
  } catch {
    return false;
  }
};

/**
 * Get environment-specific configuration
 */
export const getEnvironmentSpecificConfig = () => {
  const config = getEnvironmentConfig();
  
  return {
    isDevelopment: config.NODE_ENV === 'development',
    isProduction: config.NODE_ENV === 'production',
    isTest: config.NODE_ENV === 'test',
    
    // API endpoints
    apiEndpoints: {
      base: config.API_URL,
      auth: `${config.API_URL}/api/auth`,
      courses: `${config.API_URL}/api/v2/courses`,
      files: `${config.API_URL}/api/v2/files`,
      streaming: `${config.API_URL}/api/v2/streaming`,
      health: `${config.API_URL}/api/health`,
    },
    
    // Firebase config object
    firebaseConfig: {
      apiKey: config.FIREBASE_API_KEY,
      authDomain: config.FIREBASE_AUTH_DOMAIN,
      projectId: config.FIREBASE_PROJECT_ID,
      storageBucket: config.FIREBASE_STORAGE_BUCKET,
      messagingSenderId: config.FIREBASE_MESSAGING_SENDER_ID,
      appId: config.FIREBASE_APP_ID,
      measurementId: config.FIREBASE_MEASUREMENT_ID,
    },
    
    // Feature flags
    features: {
      analytics: config.ENABLE_ANALYTICS,
      errorReporting: config.ENABLE_ERROR_REPORTING,
      performanceMonitoring: config.ENABLE_PERFORMANCE_MONITORING,
      bundleAnalysis: config.ANALYZE_BUNDLE,
    },
  };
};