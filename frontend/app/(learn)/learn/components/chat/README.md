# AI Chat Component - Modular Architecture

This directory contains the refactored AI chat implementation, breaking down the original 530-line component into a modular, maintainable structure.

## Directory Structure

```
chat/
├── ChatContainer.tsx       # Main container component orchestrating the chat
├── components/            # UI components
│   ├── ChatHeader.tsx     # Header with minimize/maximize functionality
│   ├── ChatInput.tsx      # Input field with send button and status indicators
│   ├── MessageBubble.tsx  # Individual message rendering
│   ├── MessageList.tsx    # Scrollable list of messages
│   ├── StreamingProgress.tsx # Progress indicator for streaming responses
│   └── SuggestionList.tsx # Quick action suggestions
├── hooks/                 # Custom React hooks
│   ├── useChatState.ts    # Chat state management
│   └── useChatApi.ts      # API communication logic
├── types.ts               # TypeScript type definitions
└── index.ts               # Public exports

## Key Features

### 1. Separation of Concerns
- **UI Components**: Pure presentational components in `components/`
- **Business Logic**: Extracted into custom hooks in `hooks/`
- **Type Safety**: All types defined in `types.ts`

### 2. Custom Hooks

#### `useChatState`
- Manages chat state (messages, loading, streaming)
- Handles localStorage persistence
- Firebase authentication integration

#### `useChatApi`
- Handles streaming and regular API calls
- Error handling with fallback mechanisms
- Token-by-token streaming support

### 3. Component Architecture

#### `ChatContainer`
- Main orchestrator component
- Combines all sub-components
- Handles user interactions

#### UI Components
- `ChatHeader`: Displays AI status and minimize/maximize controls
- `MessageBubble`: Renders individual messages with proper styling
- `MessageList`: Manages scrolling and message display
- `ChatInput`: Handles user input and submission
- `StreamingProgress`: Shows real-time streaming progress
- `SuggestionList`: Quick action buttons for common queries

## Usage

### Basic Usage
```tsx
import AIChatbot from './ai-chatbot';

<AIChatbot fileId="file-123" />
```

### Advanced Usage
```tsx
import { ChatContainer } from './chat';

<ChatContainer 
  fileId="file-123" 
  className="custom-styles"
/>
```

### Using Individual Components
```tsx
import { 
  MessageBubble, 
  ChatInput,
  useChatState 
} from './chat';

// Use components individually for custom implementations
```

## Migration from Original

The original `ai-chatbot.tsx` (530 lines) has been:
1. Backed up to `ai-chatbot.tsx.backup`
2. Replaced with a compatibility wrapper
3. Refactored into this modular structure

### Benefits of Refactoring
- **Maintainability**: Smaller, focused components
- **Reusability**: Components can be used independently
- **Testability**: Easier to unit test individual pieces
- **Performance**: Better React rendering optimization
- **Type Safety**: Improved TypeScript coverage

## API Integration

The chat supports two modes:
1. **Streaming Mode** (`/ai-chat-stream`): Real-time token streaming
2. **Regular Mode** (`/ai-chat`): Fallback for compatibility

Both modes are handled transparently by the `useChatApi` hook.

## Backward Compatibility

The original component interface is maintained through the compatibility wrapper in `ai-chatbot.tsx`, ensuring no breaking changes for existing code.