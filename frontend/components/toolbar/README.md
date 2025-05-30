# Toolbar Component

A modular toolbar system for code and text editing with AI-powered tools.

## Architecture

The toolbar has been refactored into a modular system with clear separation of concerns:

### Directory Structure

```
toolbar/
├── components/          # React components
│   ├── Tool.tsx        # Individual tool button
│   ├── Tools.tsx       # Tool collection
│   ├── ReadingLevelSelector.tsx
│   ├── ToolbarContainer.tsx
│   └── StopButton.tsx
├── hooks/              # Custom React hooks
│   ├── useToolbarTimer.ts
│   ├── useToolSelection.ts
│   └── useReadingLevel.ts
├── types/              # TypeScript definitions
│   └── index.ts
├── constants/          # Configuration and constants
│   └── index.ts
├── Toolbar.tsx         # Main component
└── index.ts           # Module exports
```

## Key Features

- **Modular Design**: Each component has a single responsibility
- **Type Safety**: Full TypeScript support with proper interfaces
- **Custom Hooks**: Business logic separated into reusable hooks
- **Animation Support**: Framer Motion animations with configurable constants
- **Accessibility**: Keyboard navigation and ARIA attributes

## Usage

```tsx
import { Toolbar } from '@/components/toolbar';

<Toolbar
  isToolbarVisible={isVisible}
  setIsToolbarVisible={setIsVisible}
  isLoading={loading}
  append={appendMessage}
  stop={stopGeneration}
  setMessages={setMessages}
  blockKind="text" // or "code"
/>
```

## Components

### Tool
Individual tool button with hover states and animations.

### Tools
Collection of tools based on block type (text/code).

### ReadingLevelSelector
Draggable selector for adjusting reading levels.

### ToolbarContainer
Wrapper providing animation and positioning logic.

### StopButton
Button to stop ongoing operations.

## Hooks

### useToolbarTimer
Manages auto-hide functionality with configurable delay.

### useToolSelection
Handles tool selection logic and message generation.

### useReadingLevel
Manages reading level selection with drag interactions.

## Available Tools

### Text Tools
- **Final Polish**: Grammar and structure improvements
- **Adjust Reading Level**: Change text complexity
- **Request Suggestions**: Get improvement suggestions

### Code Tools
- **Add Comments**: Add explanatory comments
- **Add Logs**: Add debugging logs

## Migration Guide

The original `toolbar.tsx` file has been replaced with a compatibility wrapper. Update imports to use the new modular structure:

```tsx
// Old
import { Toolbar } from '@/components/toolbar.tsx';

// New (recommended)
import { Toolbar } from '@/components/toolbar';
```

## Customization

All constants are centralized in `constants/index.ts`:
- Animation configurations
- Tool definitions
- Reading levels
- Timing delays