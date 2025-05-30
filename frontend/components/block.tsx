/**
 * Refactored Block Component - Backward Compatibility Wrapper
 */

// Re-export everything from the modular implementation
export * from './block';

// Maintain backward compatibility
export { Block as default } from './block';