# Settings Module

This module contains the refactored settings components following a modular architecture pattern.

## Structure

```
settings/
├── components/          # Shared UI components
│   ├── SettingsLayout.tsx
│   ├── SettingsHeader.tsx
│   └── SettingsTabs.tsx
├── panels/             # Individual setting panels
│   ├── AccountPanel.tsx
│   ├── NotificationPanel.tsx
│   └── PrivacyPanel.tsx
├── hooks/              # Custom hooks
│   └── useSettings.ts
├── types/              # TypeScript type definitions
│   └── settings.types.ts
├── utils/              # Utility functions
│   └── validation.ts
├── index.ts            # Module exports
├── ProfessorSettings.tsx      # Main component (compatibility wrapper)
└── ProfessorSettings.tsx.backup  # Original file backup
```

## Key Features

1. **Modular Architecture**: Each settings panel is a separate component with its own logic
2. **Type Safety**: Full TypeScript support with proper type definitions
3. **Validation**: Centralized validation logic in utils
4. **State Management**: Custom hook (`useSettings`) for managing settings state
5. **Backward Compatibility**: Main component maintains the same interface

## Usage

### Basic Usage
```tsx
import ProfessorSettings from '@/components/settings/ProfessorSettings';

// Use as before - no changes needed
<ProfessorSettings />
```

### Using Individual Components
```tsx
import { AccountPanel, useSettings } from '@/components/settings';

const MyCustomSettings = () => {
  const { account, updateAccount } = useSettings();
  
  return (
    <AccountPanel 
      accountData={account}
      onAccountUpdate={updateAccount}
    />
  );
};
```

## Components

### AccountPanel
Handles email and password updates with validation.

### NotificationPanel
Manages notification preferences (push, email, digest).

### PrivacyPanel
Controls privacy settings and data usage preferences.

### SettingsLayout
Provides consistent layout with header and footer.

### SettingsTabs
Tabbed interface for organizing setting panels.

## Hooks

### useSettings
Central hook for managing all settings state and API interactions.

## Future Enhancements

1. Add API persistence for notification and privacy settings
2. Add form state management library (react-hook-form)
3. Add success/error toast notifications
4. Add settings export/import functionality
5. Add two-factor authentication settings