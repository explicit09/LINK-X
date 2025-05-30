# StatsSidePanel Module

This module contains the refactored and modularized version of the StatsSidePanel component.

## Structure

```
stats/
├── types.ts                 # TypeScript interfaces and types
├── hooks/                   # Custom React hooks
│   ├── useTodos.ts         # Todo management hook
│   ├── useAchievements.ts  # Achievement badges calculation
│   └── index.ts            # Hooks exports
├── widgets/                 # Individual widget components
│   ├── CourseDescriptionWidget.tsx  # Course description editor
│   ├── TodosWidget.tsx              # Todo list display
│   ├── ProgressWidget.tsx           # Progress tracking and achievements
│   ├── AISuggestionsWidget.tsx      # AI recommendations
│   ├── LoadingPlaceholder.tsx       # Loading state component
│   └── index.ts                     # Widget exports
├── StatsSidePanel.tsx      # Main component
└── index.ts                # Module exports
```

## Features

### Modular Architecture
- **Separation of Concerns**: Each widget is a standalone component
- **Custom Hooks**: Data fetching and business logic extracted into reusable hooks
- **Type Safety**: Comprehensive TypeScript types in a dedicated file
- **Easy Testing**: Individual components can be tested in isolation

### Components

#### CourseDescriptionWidget
- Displays and allows editing of course description
- Inline editing with save/cancel functionality
- Toast notifications for user feedback

#### TodosWidget
- Displays todo items for students
- Supports marking todos as complete/incomplete
- Delete functionality with confirmation
- Priority and type indicators
- Loading and empty states

#### ProgressWidget
- Circular progress indicator
- Time tracking (today and weekly)
- Achievement badges system
- Next milestone indicator

#### AISuggestionsWidget
- Integrates with SmartRecommendations component
- Provides AI-powered course suggestions

### Hooks

#### useTodos
- Fetches todos from API
- Manages todo state
- Provides toggle and delete functions
- Handles error states with user-friendly messages

#### useAchievements
- Calculates achievement badges based on progress
- Memoized for performance
- Returns array of achievement objects

## Usage

```tsx
import { StatsSidePanel } from '@/components/course/stats';

// Use in your component
<StatsSidePanel
  course={course}
  courseProgress={courseProgress}
  onUpdateDescription={handleUpdateDescription}
  userRole={userRole}
/>
```

## Backward Compatibility

The original `StatsSidePanel.tsx` file has been replaced with a compatibility wrapper that re-exports the modular version. This ensures existing imports continue to work without modification.

## Migration Guide

If you want to use individual widgets:

```tsx
import { 
  CourseDescriptionWidget,
  TodosWidget,
  ProgressWidget 
} from '@/components/course/stats/widgets';

import { useTodos, useAchievements } from '@/components/course/stats/hooks';
```

## Benefits of Refactoring

1. **Better Code Organization**: Related functionality grouped together
2. **Reusability**: Widgets and hooks can be used independently
3. **Maintainability**: Easier to locate and modify specific features
4. **Performance**: Smaller component files, better code splitting
5. **Testing**: Individual components easier to unit test
6. **Type Safety**: Centralized type definitions