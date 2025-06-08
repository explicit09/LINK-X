/**
 * Environment configuration and validation utilities
 * EXTRACTED to centralize environment variable management
 */

export interface EnvironmentConfig {
  // API Configuration
  API_URL: string;
  
  // Supabase Configuration
  SUPABASE_URL: string;
  SUPABASE_ANON_KEY: string;
  
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
    API_URL: process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000',
    
    // Supabase Configuration
    SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL || '',
    SUPABASE_ANON_KEY: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '',
    
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

  // Validate Supabase configuration only if provided
  if (config.SUPABASE_URL && !config.SUPABASE_ANON_KEY) {
    console.warn('⚠️  Supabase URL provided but anon key is missing - Supabase features will be disabled');
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
    
    // Supabase config object
    supabaseConfig: {
      url: config.SUPABASE_URL,
      anonKey: config.SUPABASE_ANON_KEY,
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