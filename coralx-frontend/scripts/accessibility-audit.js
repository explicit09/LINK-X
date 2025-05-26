#!/usr/bin/env node

/**
 * Basic Accessibility Audit Script
 * Checks color contrast ratios and basic accessibility patterns
 */

const fs = require('fs');
const path = require('path');

// WCAG AA color contrast requirements
const WCAG_AA_NORMAL = 4.5;
const WCAG_AA_LARGE = 3.0;

// Color palette from the design system
const colors = {
  // Text colors
  'text-gray-900': '#111827',
  'text-gray-600': '#4B5563',
  'text-gray-500': '#6B7280',
  'text-gray-400': '#9CA3AF',
  
  // Background colors
  'bg-white': '#FFFFFF',
  'bg-gray-50': '#F9FAFB',
  'bg-gray-100': '#F3F4F6',
  
  // Brand colors
  'text-blue-600': '#2563EB',
  'text-red-600': '#DC2626',
  'text-green-600': '#059669',
  'text-green-700': '#15803D',
  'text-purple-600': '#9333EA',
  
  // Status colors
  'bg-green-50': '#F0FDF4',
  'text-green-700': '#15803D',
  'bg-red-50': '#FEF2F2',
  'text-red-700': '#B91C1C',
  'bg-yellow-50': '#FFFBEB',
  'text-yellow-700': '#A16207',
  'bg-blue-50': '#EFF6FF',
  'text-blue-700': '#1D4ED8',
};

// Convert hex to RGB
function hexToRgb(hex) {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  return result ? {
    r: parseInt(result[1], 16),
    g: parseInt(result[2], 16),
    b: parseInt(result[3], 16)
  } : null;
}

// Calculate relative luminance
function getLuminance(rgb) {
  const { r, g, b } = rgb;
  const [rs, gs, bs] = [r, g, b].map(c => {
    c = c / 255;
    return c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
  });
  return 0.2126 * rs + 0.7152 * gs + 0.0722 * bs;
}

// Calculate contrast ratio
function getContrastRatio(color1, color2) {
  const rgb1 = hexToRgb(color1);
  const rgb2 = hexToRgb(color2);
  
  if (!rgb1 || !rgb2) return 0;
  
  const lum1 = getLuminance(rgb1);
  const lum2 = getLuminance(rgb2);
  
  const brightest = Math.max(lum1, lum2);
  const darkest = Math.min(lum1, lum2);
  
  return (brightest + 0.05) / (darkest + 0.05);
}

// Check if contrast ratio meets WCAG standards
function meetsWCAG(ratio, isLargeText = false) {
  const threshold = isLargeText ? WCAG_AA_LARGE : WCAG_AA_NORMAL;
  return ratio >= threshold;
}

// Color combinations to test
const testCombinations = [
  // Primary text combinations
  { fg: 'text-gray-900', bg: 'bg-white', context: 'Primary text on white', size: 'normal' },
  { fg: 'text-gray-600', bg: 'bg-white', context: 'Secondary text on white', size: 'normal' },
  { fg: 'text-gray-500', bg: 'bg-white', context: 'Tertiary text on white', size: 'normal' },
  { fg: 'text-gray-400', bg: 'bg-white', context: 'Placeholder text on white', size: 'normal' },
  
  // Text on gray backgrounds
  { fg: 'text-gray-900', bg: 'bg-gray-50', context: 'Primary text on gray-50', size: 'normal' },
  { fg: 'text-gray-600', bg: 'bg-gray-50', context: 'Secondary text on gray-50', size: 'normal' },
  
  // Brand colors
  { fg: 'text-blue-600', bg: 'bg-white', context: 'Blue links on white', size: 'normal' },
  { fg: 'text-red-600', bg: 'bg-white', context: 'Red text on white', size: 'normal' },
  { fg: 'text-green-700', bg: 'bg-white', context: 'Green text on white', size: 'normal' },
  
  // Status badges
  { fg: 'text-green-700', bg: 'bg-green-50', context: 'Success badge text', size: 'small' },
  { fg: 'text-red-700', bg: 'bg-red-50', context: 'Error badge text', size: 'small' },
  { fg: 'text-yellow-700', bg: 'bg-yellow-50', context: 'Warning badge text', size: 'small' },
  { fg: 'text-blue-700', bg: 'bg-blue-50', context: 'Info badge text', size: 'small' },
];

console.log('🔍 LINK-X Accessibility Audit\n');
console.log('Checking color contrast ratios against WCAG AA standards...\n');

let passCount = 0;
let failCount = 0;

testCombinations.forEach(({ fg, bg, context, size }) => {
  const fgColor = colors[fg];
  const bgColor = colors[bg];
  
  if (!fgColor || !bgColor) {
    console.log(`❌ ${context}: Missing color definition`);
    failCount++;
    return;
  }
  
  const ratio = getContrastRatio(fgColor, bgColor);
  const isLargeText = size === 'large';
  const passes = meetsWCAG(ratio, isLargeText);
  
  const status = passes ? '✅' : '❌';
  const threshold = isLargeText ? WCAG_AA_LARGE : WCAG_AA_NORMAL;
  
  console.log(`${status} ${context}`);
  console.log(`   Ratio: ${ratio.toFixed(2)}:1 (Required: ${threshold}:1)`);
  console.log(`   Colors: ${fgColor} on ${bgColor}\n`);
  
  if (passes) {
    passCount++;
  } else {
    failCount++;
  }
});

// Summary
console.log('📊 SUMMARY');
console.log(`✅ Passed: ${passCount}`);
console.log(`❌ Failed: ${failCount}`);
console.log(`📈 Success Rate: ${((passCount / (passCount + failCount)) * 100).toFixed(1)}%\n`);

// Recommendations
if (failCount > 0) {
  console.log('🔧 RECOMMENDATIONS');
  console.log('• Consider darkening text colors that fail contrast requirements');
  console.log('• Use text-gray-900 for primary content instead of lighter grays');
  console.log('• Ensure interactive elements meet contrast requirements');
  console.log('• Test with actual users who have visual impairments\n');
}

// Additional checks
console.log('🎯 ADDITIONAL ACCESSIBILITY CHECKLIST');
console.log('□ All interactive elements have focus indicators');
console.log('□ All images have alt text');
console.log('□ Form inputs have proper labels');
console.log('□ Headings follow logical hierarchy (h1 → h2 → h3)');
console.log('□ Color is not the only way to convey information');
console.log('□ Text can be zoomed to 200% without horizontal scrolling');
console.log('□ All functionality is keyboard accessible');
console.log('□ Screen reader testing completed');

process.exit(failCount > 0 ? 1 : 0); 