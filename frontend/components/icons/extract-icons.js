const fs = require('fs');
const path = require('path');

// Read the original icons.tsx file
const iconsContent = fs.readFileSync(path.join(__dirname, '..', 'icons.tsx'), 'utf-8');

// Function to extract a single icon component
function extractIcon(content, iconName) {
  // Find the export const line
  const startRegex = new RegExp(`export const ${iconName} = \\(`);
  const startMatch = content.match(startRegex);
  
  if (!startMatch) {
    console.warn(`Could not find start of ${iconName}`);
    return null;
  }
  
  const startIndex = content.indexOf(startMatch[0]);
  
  // Find the end of the component (look for }; at start of line)
  let braceCount = 0;
  let inComponent = false;
  let endIndex = startIndex;
  
  for (let i = startIndex; i < content.length; i++) {
    const char = content[i];
    
    if (char === '{') {
      braceCount++;
      inComponent = true;
    } else if (char === '}') {
      braceCount--;
      if (braceCount === 0 && inComponent) {
        // Check if next char is ;
        if (content[i + 1] === ';') {
          endIndex = i + 2;
          break;
        }
      }
    }
  }
  
  return content.substring(startIndex, endIndex);
}

// Function to convert icon component to new format
function transformIconComponent(iconCode, iconName, fileName) {
  // Check if icon has props
  const hasSize = iconCode.includes('size =');
  const hasProps = iconCode.includes('{') && iconCode.includes('}') && iconCode.includes('const ' + iconName);
  
  let transformed = `import { IconProps, defaultIconProps } from '../types';\n\n`;
  
  // Replace the function signature
  if (hasProps) {
    transformed += iconCode
      .replace(/export const \w+ = \([^)]+\) =>/, `export const ${iconName} = ({ size = defaultIconProps.size, className, style = defaultIconProps.style }: IconProps) =>`)
      .replace(/height="?\{?size\}?"?/, 'height={size}')
      .replace(/width="?\{?size\}?"?/, 'width={size}')
      .replace(/height="?16"?/, 'height={size}')
      .replace(/width="?16"?/, 'width={size}')
      .replace(/style=\{\{ color: ['"]currentcolor['"] \}\}/, 'style={style}')
      .replace(/viewBox/, 'className={className}\n      viewBox');
  } else {
    transformed += iconCode
      .replace(/export const \w+ = \(\) =>/, `export const ${iconName} = ({ size = defaultIconProps.size, className, style = defaultIconProps.style }: IconProps) =>`)
      .replace(/height="?16"?/, 'height={size}')
      .replace(/width="?16"?/, 'width={size}')
      .replace(/style=\{\{ color: ['"]currentcolor['"] \}\}/, 'style={style}')
      .replace(/viewBox/, 'className={className}\n      viewBox');
  }
  
  return transformed;
}

// Function to convert icon name to file name
function iconNameToFileName(iconName) {
  return iconName
    .replace(/([A-Z])/g, '-$1')
    .toLowerCase()
    .replace(/^-/, '');
}

// Get all icon names
const iconNames = [];
const iconMatches = iconsContent.matchAll(/export const (\w+) = \(/g);
for (const match of iconMatches) {
  iconNames.push(match[1]);
}

console.log(`Found ${iconNames.length} icons to extract\n`);

// Extract and save each icon
const savedIcons = [];
const failedIcons = [];

iconNames.forEach(iconName => {
  try {
    const iconCode = extractIcon(iconsContent, iconName);
    if (!iconCode) {
      failedIcons.push(iconName);
      return;
    }
    
    const fileName = iconNameToFileName(iconName);
    const filePath = path.join(__dirname, `${fileName}.tsx`);
    const transformedCode = transformIconComponent(iconCode, iconName, fileName);
    
    fs.writeFileSync(filePath, transformedCode);
    savedIcons.push({ name: iconName, file: `${fileName}.tsx` });
    console.log(`✓ Extracted ${iconName} to ${fileName}.tsx`);
  } catch (error) {
    console.error(`✗ Failed to extract ${iconName}: ${error.message}`);
    failedIcons.push(iconName);
  }
});

// Create index file
const indexContent = `// Auto-generated index file
import { IconProps } from './types';

${savedIcons.map(icon => `export { ${icon.name} } from './${icon.file.replace('.tsx', '')}';`).join('\n')}

// Type exports
export type { IconProps } from './types';
`;

fs.writeFileSync(path.join(__dirname, 'all-icons.ts'), indexContent);

console.log(`\n✓ Extracted ${savedIcons.length} icons successfully`);
if (failedIcons.length > 0) {
  console.log(`✗ Failed to extract ${failedIcons.length} icons: ${failedIcons.join(', ')}`);
}

console.log('\nNext steps:');
console.log('1. Review the generated files');
console.log('2. Organize into category folders');
console.log('3. Update imports in components');
console.log('4. Delete the old icons.tsx file');