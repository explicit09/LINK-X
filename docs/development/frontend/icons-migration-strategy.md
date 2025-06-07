# Icons Migration Strategy

## Problem
- Single `icons.tsx` file with 1121 lines and 56 icon components
- File is too large to refactor all at once
- Components throughout the app depend on these icons

## Phased Migration Approach

### Phase 1: Create New Structure (Without Breaking Existing Code)
1. Create `icons/` directory with proper structure
2. Start with most commonly used icons
3. Keep old `icons.tsx` file temporarily

### Phase 2: Gradual Migration
1. Extract icons in small batches (5-10 at a time)
2. Update imports in components as we go
3. Use both old and new imports during transition

### Phase 3: Cleanup
1. Once all icons are migrated, delete old file
2. Update any remaining imports
3. Add deprecation notice to old file first

## Implementation Plan

### Step 1: Create Base Structure
```
components/
├── icons.tsx (existing - mark as deprecated)
├── icons/
│   ├── index.ts (re-exports for backward compatibility)
│   ├── types.ts (shared types)
│   └── README.md (migration guide)
```

### Step 2: Priority Icons to Migrate First
Based on common usage:
1. UI Icons: `ChevronDownIcon`, `CloseIcon`, `MenuIcon`, `LoaderIcon`
2. User Icons: `UserIcon`, `BotIcon`
3. File Icons: `FileIcon`, `FolderIcon`
4. Action Icons: `EditIcon`, `DeleteIcon`, `CopyIcon`

### Step 3: Migration Pattern
```typescript
// Old (icons.tsx)
export const IconName = () => { ... }

// New (icons/icon-name.tsx)
import { IconProps } from './types';

export const IconName = ({ size = 16, className, style }: IconProps) => {
  // Consistent implementation
}

// Temporary backward compatibility (icons/index.ts)
export { IconName } from './icon-name';
```

### Step 4: Update Import Statements
```typescript
// Phase 1: Both work
import { UserIcon } from '@/components/icons'; // old
import { UserIcon } from '@/components/icons/user-icon'; // new

// Phase 2: Encourage new pattern
import { UserIcon } from '@/components/icons'; // still works via index.ts

// Phase 3: Only new pattern
import { UserIcon } from '@/components/icons/user-icon';
```

## Benefits of This Approach
1. **No Breaking Changes**: App continues to work during migration
2. **Incremental**: Can be done over time
3. **Reviewable**: Small PRs for each batch
4. **Testable**: Can test each migration step
5. **Reversible**: Can rollback if issues arise

## Tracking Progress
Create a checklist of all 56 icons and mark them as migrated:

- [ ] BotIcon
- [ ] UserIcon
- [ ] AttachmentIcon
- [ ] VercelIcon
- [x] ... (and 52 more)

## Next Steps
1. Start with Phase 1 structure
2. Migrate 5-10 most used icons
3. Test thoroughly
4. Continue with remaining icons
5. Clean up once complete