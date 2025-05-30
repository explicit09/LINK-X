# Icons Refactoring Plan

## Current Issues
- Single file with 1121 lines containing ~50+ icon components
- No consistent prop interface
- Difficult to find specific icons
- No tree-shaking benefits
- Hard to maintain and add new icons

## Refactoring Strategy

### 1. File Structure
```
components/icons/
├── index.ts              # Re-exports all icons
├── types.ts              # Shared types and interfaces
├── bot-icon.tsx          # Individual icon files
├── user-icon.tsx
├── attachment-icon.tsx
├── ui-icons/             # Group related icons
│   ├── index.ts
│   ├── menu-icon.tsx
│   ├── loader-icon.tsx
│   └── ...
├── logo-icons/
│   ├── index.ts
│   ├── logo-openai.tsx
│   ├── logo-google.tsx
│   └── ...
├── file-icons/
│   ├── index.ts
│   ├── file-icon.tsx
│   ├── folder-icon.tsx
│   └── ...
└── ...
```

### 2. Consistent Interface
```typescript
export interface IconProps {
  size?: number;
  className?: string;
  style?: React.CSSProperties;
  "aria-label"?: string;
}
```

### 3. Icon Categories
Based on analysis, icons can be grouped into:
- **UI Icons**: Menu, Loader, Chevron, Arrow, etc.
- **Logo Icons**: OpenAI, Google, Anthropic, Vercel
- **File Icons**: File, Folder, Document, Image
- **Form Icons**: Checkbox, Radio, Input
- **Navigation Icons**: Home, Route, GPS
- **Media Icons**: Play, Pause, Fullscreen
- **Action Icons**: Edit, Delete, Copy, Download
- **Status Icons**: Success, Error, Warning, Info

### 4. Benefits
1. **Tree-shaking**: Only import used icons
2. **Maintainability**: Easy to find and modify icons
3. **Scalability**: Easy to add new icons
4. **Type Safety**: Consistent props across all icons
5. **Organization**: Logical grouping of related icons

### 5. Migration Steps
1. Create directory structure
2. Define shared types
3. Extract icons into categories
4. Update imports in consuming components
5. Delete old icons.tsx file

### 6. Usage After Refactoring
```typescript
// Before
import { BotIcon, UserIcon } from '@/components/icons';

// After - Option 1: Direct import
import { BotIcon } from '@/components/icons/bot-icon';
import { UserIcon } from '@/components/icons/user-icon';

// After - Option 2: Named imports (still works)
import { BotIcon, UserIcon } from '@/components/icons';

// After - Option 3: Group imports
import { MenuIcon, LoaderIcon } from '@/components/icons/ui-icons';
```

### 7. Icon Template
```typescript
import { IconProps, defaultIconProps } from '../types';

export const IconName = ({ 
  size = defaultIconProps.size, 
  className, 
  style = defaultIconProps.style,
  "aria-label": ariaLabel = "Icon description"
}: IconProps) => {
  return (
    <svg
      height={size}
      width={size}
      viewBox="0 0 16 16"
      className={className}
      style={style}
      aria-label={ariaLabel}
      role="img"
    >
      {/* SVG paths */}
    </svg>
  );
};
```