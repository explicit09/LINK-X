const fs = require('fs');
const path = require('path');

// Read the original icons.tsx file
const iconsContent = fs.readFileSync(
  path.join(__dirname, '..', 'icons.tsx'),
  'utf-8',
);

// Regular expression to match icon components
const iconRegex =
  /export const (\w+) = \((?:{[^}]*}|[^)]*)\) => {?\s*(?:return\s+)?\(?[\s\S]*?(?:^};\s*$|^\);\s*$)/gm;

// Categories for icons
const iconCategories = {
  'ui-icons': [
    'MenuIcon',
    'LoaderIcon',
    'ChevronIcon',
    'ArrowIcon',
    'CheckIcon',
    'CloseIcon',
    'PlusIcon',
    'MinusIcon',
    'ExpandIcon',
    'CollapseIcon',
  ],
  'logo-icons': [
    'LogoOpenAI',
    'LogoGoogle',
    'LogoAnthropic',
    'VercelIcon',
    'GitIcon',
  ],
  'file-icons': [
    'FileIcon',
    'FolderIcon',
    'DocumentIcon',
    'ImageIcon',
    'VideoIcon',
    'AudioIcon',
  ],
  'form-icons': ['CheckedSquare', 'UncheckedSquare', 'RadioIcon', 'InputIcon'],
  'navigation-icons': [
    'HomeIcon',
    'RouteIcon',
    'GPSIcon',
    'BackIcon',
    'ForwardIcon',
  ],
  'media-icons': ['PlayIcon', 'PauseIcon', 'FullscreenIcon', 'VolumeIcon'],
  'action-icons': [
    'PencilEditIcon',
    'TrashIcon',
    'CopyIcon',
    'DownloadIcon',
    'UploadIcon',
    'ShareIcon',
  ],
  'status-icons': ['SuccessIcon', 'ErrorIcon', 'WarningIcon', 'InfoIcon'],
  'misc-icons': [], // For uncategorized icons
};

// Function to determine category
function getIconCategory(iconName) {
  for (const [category, icons] of Object.entries(iconCategories)) {
    if (icons.includes(iconName)) {
      return category;
    }
  }

  // Try to guess category from name
  if (iconName.toLowerCase().includes('logo')) return 'logo-icons';
  if (
    iconName.toLowerCase().includes('file') ||
    iconName.toLowerCase().includes('folder')
  )
    return 'file-icons';
  if (
    iconName.toLowerCase().includes('check') ||
    iconName.toLowerCase().includes('radio')
  )
    return 'form-icons';
  if (
    iconName.toLowerCase().includes('home') ||
    iconName.toLowerCase().includes('route')
  )
    return 'navigation-icons';
  if (
    iconName.toLowerCase().includes('play') ||
    iconName.toLowerCase().includes('pause')
  )
    return 'media-icons';

  return 'misc-icons';
}

// Function to convert icon name to file name
function iconNameToFileName(iconName) {
  return (
    iconName
      .replace(/Icon$/, '')
      .replace(/([A-Z])/g, '-$1')
      .toLowerCase()
      .replace(/^-/, '') + '-icon'
  );
}

// Create directories
const categories = Object.keys(iconCategories);
categories.forEach((category) => {
  const dir = path.join(__dirname, category);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
});

// Extract icons
let match;
const extractedIcons = [];

while ((match = iconRegex.exec(iconsContent)) !== null) {
  const iconName = match[1];
  const iconCode = match[0];

  extractedIcons.push({
    name: iconName,
    code: iconCode,
    category: getIconCategory(iconName),
    fileName: iconNameToFileName(iconName),
  });
}

console.log(`Found ${extractedIcons.length} icons to extract`);

// Group by category
const iconsByCategory = {};
extractedIcons.forEach((icon) => {
  if (!iconsByCategory[icon.category]) {
    iconsByCategory[icon.category] = [];
  }
  iconsByCategory[icon.category].push(icon);
});

// Log summary
console.log('\nIcons by category:');
Object.entries(iconsByCategory).forEach(([category, icons]) => {
  console.log(`${category}: ${icons.length} icons`);
  icons.forEach((icon) => console.log(`  - ${icon.name}`));
});

// Create a migration mapping file
const migrationMap = {};
extractedIcons.forEach((icon) => {
  migrationMap[icon.name] = {
    oldImport: '@/components/icons',
    newImport:
      icon.category === 'misc-icons'
        ? `@/components/icons/${icon.fileName}`
        : `@/components/icons/${icon.category}`,
  };
});

fs.writeFileSync(
  path.join(__dirname, 'migration-map.json'),
  JSON.stringify(migrationMap, null, 2),
);

console.log('\nMigration map created at migration-map.json');
console.log('\nTo complete the refactoring:');
console.log('1. Review the categorization');
console.log('2. Run the script with --execute flag to create individual files');
console.log('3. Update imports in consuming components');
console.log('4. Delete the old icons.tsx file');
