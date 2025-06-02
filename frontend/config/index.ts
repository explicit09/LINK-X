/**
 * Configuration module index - brings together all configuration modules
 * CREATED to provide clean, organized access to all configuration settings
 */

// Import all configuration modules
import { performanceConfig } from './performance.config';
import { webpackConfig } from './webpack.config';
import { securityConfig } from './security.config';
import { redirectsConfig } from './redirects.config';
import { 
  getEnvironmentConfig, 
  getEnvironmentSpecificConfig, 
  validateEnvironmentConfig,
  type EnvironmentConfig 
} from './environment.config';

// Export individual configurations
export { 
  performanceConfig,
  webpackConfig,
  securityConfig,
  redirectsConfig,
  getEnvironmentConfig, 
  getEnvironmentSpecificConfig, 
  validateEnvironmentConfig,
  type EnvironmentConfig 
};

// Re-export for convenience
export const config = {
  performance: performanceConfig,
  security: securityConfig,
  redirects: redirectsConfig,
};