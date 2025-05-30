# ProfessorSettings Migration Guide

## Overview

The `ProfessorSettings` component has been refactored from a single 542-line file into a modular architecture with separated concerns. This guide helps developers understand the changes and how to work with the new structure.

## Key Changes

### Before (Original Structure)
- Single monolithic component (`ProfessorSettings.tsx`)
- All state management inline
- Mixed validation logic
- Repeated UI patterns
- No type exports

### After (Modular Structure)
- Separated into multiple focused components
- Custom hooks for state management
- Centralized validation
- Reusable UI components
- Full TypeScript support with exported types

## File Mapping

| Original Code Section | New Location |
|--------------------|--------------|
| Account form logic | `panels/AccountPanel.tsx` |
| Notification settings | `panels/NotificationPanel.tsx` |
| Privacy settings | `panels/PrivacyPanel.tsx` |
| State management | `hooks/useSettings.ts` |
| Validation functions | `utils/validation.ts` |
| Type definitions | `types/settings.types.ts` |
| Layout wrapper | `components/SettingsLayout.tsx` |
| Tabs component | `components/SettingsTabs.tsx` |

## Usage Examples

### 1. Using the Complete Settings Component (No Changes)
```tsx
import ProfessorSettings from '@/components/settings/ProfessorSettings';

function SettingsPage() {
  return <ProfessorSettings />;
}
```

### 2. Using Individual Panels
```tsx
import { AccountPanel, useSettings } from '@/components/settings';

function CustomAccountSettings() {
  const { account, updateAccount } = useSettings();
  
  return (
    <div className="custom-wrapper">
      <AccountPanel 
        accountData={account}
        onAccountUpdate={updateAccount}
      />
    </div>
  );
}
```

### 3. Custom Settings Implementation
```tsx
import { 
  useSettings,
  SettingsLayout,
  AccountPanel,
  NotificationPanel 
} from '@/components/settings';

function CustomSettings() {
  const {
    account,
    notifications,
    updateAccount,
    updateNotifications,
  } = useSettings();

  return (
    <SettingsLayout>
      <div className="space-y-6">
        <AccountPanel 
          accountData={account}
          onAccountUpdate={updateAccount}
        />
        <NotificationPanel
          settings={notifications}
          onSettingsUpdate={updateNotifications}
        />
      </div>
    </SettingsLayout>
  );
}
```

### 4. Using Validation Utilities
```tsx
import { validateEmail, validatePassword } from '@/components/settings';

function MyForm() {
  const handleSubmit = (email: string, password: string) => {
    if (!validateEmail(email)) {
      alert('Invalid email');
      return;
    }
    
    const passwordError = validatePassword(password);
    if (passwordError) {
      alert(passwordError);
      return;
    }
    
    // Proceed with submission
  };
}
```

## API Compatibility

The refactored components maintain full backward compatibility:

- Same props interface
- Same behavior
- Same API endpoints
- Same styling classes

## Benefits of the New Architecture

1. **Maintainability**: Each component has a single responsibility
2. **Reusability**: Panels and hooks can be used independently
3. **Testability**: Smaller units are easier to test
4. **Type Safety**: Full TypeScript support with exported types
5. **Performance**: Better code splitting potential
6. **Flexibility**: Easy to add new settings panels

## Adding New Settings Panels

1. Create a new panel component in `panels/`:
```tsx
// panels/NewSettingsPanel.tsx
export const NewSettingsPanel = ({ settings, onSettingsUpdate }) => {
  // Panel implementation
};
```

2. Add types to `types/settings.types.ts`:
```tsx
export interface NewSettings {
  // Settings properties
}
```

3. Update the `useSettings` hook to include new settings
4. Add the panel to the main component

## Testing

Run tests with:
```bash
npm test ProfessorSettings
```

The refactored structure makes it easier to test individual components:
```tsx
import { AccountPanel } from '@/components/settings';
import { render, fireEvent } from '@testing-library/react';

test('AccountPanel validates email', () => {
  const { getByPlaceholderText, getByText } = render(
    <AccountPanel 
      accountData={{ email: '', password: '' }}
      onAccountUpdate={jest.fn()}
    />
  );
  
  fireEvent.change(getByPlaceholderText('Enter your email'), {
    target: { value: 'invalid' }
  });
  
  expect(getByText('Please enter a valid email address')).toBeInTheDocument();
});
```

## Rollback Instructions

If you need to rollback to the original implementation:

1. The original file is backed up at: `ProfessorSettings.tsx.backup`
2. Simply rename it back: `mv ProfessorSettings.tsx.backup ProfessorSettings.tsx`
3. Delete the new modular structure files

## Future Enhancements

The modular structure enables easier implementation of:
- Form state management with libraries like react-hook-form
- Advanced validation with libraries like zod or yup
- State persistence with localStorage
- Undo/redo functionality
- Settings profiles/presets