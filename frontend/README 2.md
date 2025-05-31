# LINK-X1 Frontend - Next.js Application

## 🎨 Overview

The LINK-X1 frontend is a modern Next.js 14 application that provides an intuitive, responsive interface for the AI-powered learning management system. Built with TypeScript and Tailwind CSS, it offers a seamless learning experience across all devices.

## 🏗️ Architecture

The frontend follows Next.js 14 App Router architecture with a component-based structure:

```
frontend/
├── app/                   # Next.js App Router pages
├── components/           # Reusable React components
├── lib/                  # Utilities and services
├── hooks/               # Custom React hooks
├── types/               # TypeScript type definitions
└── public/              # Static assets
```

## 📁 Directory Structure

### App Directory (`/app`)

The app directory uses Next.js 14's file-based routing with route groups:

```
app/
├── (auth)/              # Authentication routes
│   ├── login/          # Login page
│   ├── register/       # Registration page
│   └── forgot-password/# Password reset
├── (dash)/             # Dashboard routes
│   └── dashboard/      # Main dashboard
├── (learn)/            # Learning interface
│   └── learn/
│       ├── [id]/       # Dynamic learning page
│       └── components/ # Learn-specific components
├── (settings)/         # User settings
│   └── settings/       # Settings page
├── courses/            # Course management
│   ├── page.tsx       # Course listing
│   └── [courseId]/    # Course details
│       ├── page.tsx   # Course page
│       ├── components/# Course components
│       ├── hooks/     # Course hooks
│       └── handlers/  # Event handlers
├── onboarding/        # User onboarding flow
│   ├── components/    # Onboarding steps
│   ├── hooks/        # Form management
│   └── types/        # Type definitions
├── layout.tsx         # Root layout
└── page.tsx          # Landing page
```

### Components Directory (`/components`)

Organized by feature with shared UI components:

```
components/
├── ui/                  # Base UI components (shadcn/ui)
│   ├── button.tsx      # Button component
│   ├── card.tsx        # Card component
│   ├── dialog.tsx      # Dialog/Modal
│   ├── form.tsx        # Form components
│   ├── sidebar/        # Sidebar system
│   └── ...            # Other UI components
├── course/             # Course-related components
│   ├── student-upload/ # File upload system
│   ├── stats/         # Statistics panels
│   ├── enhanced-file-upload/
│   └── ModuleStream.tsx
├── dashboard/          # Dashboard components
│   ├── professor/     # Instructor views
│   ├── student/       # Student views
│   ├── sections/      # Dashboard sections
│   └── hooks/         # Dashboard hooks
├── streaming/          # Real-time features
│   ├── StreamingContent.tsx
│   └── PerformanceMetrics.tsx
├── ai/                 # AI-powered components
│   ├── FloatingAIAssistant.tsx
│   └── SmartRecommendations.tsx
├── auth/               # Authentication components
│   ├── FirebaseAuthProvider.tsx
│   └── GoogleAuthButton.tsx
├── settings/           # Settings components
│   ├── components/    # Setting panels
│   ├── hooks/        # Setting hooks
│   └── types/        # Setting types
├── toolbar/           # Modular toolbar
│   ├── components/   # Toolbar parts
│   └── hooks/       # Toolbar state
├── block/            # Document editing
│   ├── components/  # Editor parts
│   └── hooks/      # Editor state
└── icons/           # Icon components
    ├── index.ts     # Icon exports
    └── ...         # Individual icons
```

### Library Directory (`/lib`)

Core utilities and services:

```
lib/
├── api/                # API client
│   ├── client.ts      # HTTP client
│   ├── endpoints/     # API endpoints
│   │   ├── auth.ts   # Auth APIs
│   │   ├── courses.ts # Course APIs
│   │   ├── files.ts  # File APIs
│   │   └── ...      # Other endpoints
│   ├── utils/        # API utilities
│   │   ├── error-handler.ts
│   │   ├── retry.ts
│   │   └── timeout.ts
│   └── index.ts      # Main exports
├── auth-service.ts    # Auth utilities
├── utils.ts          # General utilities
└── design-system.ts  # Theme constants
```

### Hooks Directory (`/hooks`)

Custom React hooks for shared logic:

```
hooks/
├── use-mobile.tsx     # Mobile detection
├── use-toast.ts      # Toast notifications
├── useApi.ts         # API hook wrapper
├── useAuthService.ts # Auth state hook
└── usePerformance.ts # Performance monitoring
```

## 🎯 Key Features

### 1. **Modern UI/UX**
- Responsive design with Tailwind CSS
- Dark/light theme support
- Smooth animations and transitions
- Accessible components (WCAG compliant)
- Mobile-first approach

### 2. **Authentication**
- Firebase Authentication integration
- Social login (Google)
- Protected routes with middleware
- Session management
- Role-based UI rendering

### 3. **Course Management**
- Course creation and editing
- Module organization
- File upload with drag-and-drop
- Progress tracking
- Real-time updates

### 4. **AI Integration**
- AI-powered chat assistant
- Smart content recommendations
- Personalized learning paths
- Quiz generation
- Learning analytics

### 5. **Performance**
- Server-side rendering (SSR)
- Static site generation (SSG)
- Image optimization
- Code splitting
- Progressive Web App (PWA) features

## 🚀 Getting Started

### Prerequisites
- Node.js 18+ and npm/yarn
- Git

### Installation

1. **Clone and navigate to frontend**
   ```bash
   cd frontend
   ```

2. **Install dependencies**
   ```bash
   npm install
   # or
   yarn install
   ```

3. **Set up environment variables**
   ```bash
   cp .env.local.example .env.local
   # Edit .env.local with your configuration
   ```

4. **Run development server**
   ```bash
   npm run dev
   # or
   yarn dev
   ```

5. **Open in browser**
   Navigate to [http://localhost:3000](http://localhost:3000)

## 🔧 Configuration

### Environment Variables

Create a `.env.local` file:

```env
# API Configuration
NEXT_PUBLIC_API_URL=http://localhost:8080
NEXT_PUBLIC_API_VERSION=v2

# Firebase Configuration
NEXT_PUBLIC_FIREBASE_API_KEY=your-api-key
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=your-auth-domain
NEXT_PUBLIC_FIREBASE_PROJECT_ID=your-project-id
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=your-storage-bucket
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=your-sender-id
NEXT_PUBLIC_FIREBASE_APP_ID=your-app-id

# Feature Flags
NEXT_PUBLIC_ENABLE_AI_CHAT=true
NEXT_PUBLIC_ENABLE_STREAMING=true

# Analytics (Optional)
NEXT_PUBLIC_GA_MEASUREMENT_ID=your-ga-id
```

## 📱 Pages & Routes

### Public Routes
- `/` - Landing page
- `/login` - User login
- `/register` - User registration
- `/forgot-password` - Password reset

### Protected Routes
- `/dashboard` - User dashboard
- `/courses` - Course listing
- `/courses/[id]` - Course details
- `/learn/[id]` - Learning interface
- `/settings` - User settings
- `/onboarding` - New user onboarding

### Dynamic Routes
- Course pages: `/courses/[courseId]`
- Learning pages: `/learn/[fileId]`
- Streaming: `/learn/streaming/[id]`

## 🎨 Styling & Design System

### Tailwind CSS Configuration
- Custom color palette
- Responsive breakpoints
- Animation utilities
- Component variants

### UI Components (shadcn/ui)
- Fully customizable
- Accessible by default
- TypeScript support
- Tailwind styling

### Design Tokens
```typescript
// Theme colors
primary: blue-600
secondary: purple-600
accent: indigo-600
success: green-600
warning: yellow-600
error: red-600

// Spacing scale
spacing: 4px base unit

// Typography
font-sans: System font stack
font-mono: Monospace stack
```

## 🧪 Testing

### Run Tests
```bash
# Unit tests
npm run test

# Integration tests
npm run test:integration

# E2E tests
npm run test:e2e

# Test coverage
npm run test:coverage
```

### Test Structure
```
__tests__/
├── components/     # Component tests
├── hooks/         # Hook tests
├── integration/   # Integration tests
└── e2e/          # End-to-end tests
```

## 📊 State Management

### Local State
- React useState for component state
- useReducer for complex state logic
- Context API for shared state

### Server State
- SWR for data fetching
- Optimistic updates
- Cache invalidation
- Real-time subscriptions

### Global State
- AuthContext for authentication
- ThemeContext for theming
- Feature flags context

## 🔄 Data Fetching

### Patterns Used
1. **Server Components** - Initial data loading
2. **Client Components** - Interactive features
3. **SWR** - Client-side data fetching
4. **Server Actions** - Form submissions

### API Client
```typescript
// Example usage
import { api } from '@/lib/api';

// Fetch courses
const courses = await api.courses.list();

// Create course
const newCourse = await api.courses.create({
  title: 'New Course',
  description: 'Course description'
});
```

## 🚀 Deployment

### Build for Production
```bash
# Create production build
npm run build

# Run production server
npm start
```

### Deployment Platforms
- Vercel (recommended)
- Netlify
- AWS Amplify
- Docker container

### Performance Optimization
- Enable ISR (Incremental Static Regeneration)
- Configure CDN caching
- Optimize images with next/image
- Enable compression
- Minimize JavaScript bundles

## 🐛 Debugging

### Development Tools
- React Developer Tools
- Redux DevTools (if using Redux)
- Network tab for API calls
- Console for error logs

### Common Issues
1. **Authentication errors** - Check Firebase config
2. **API connection** - Verify backend URL
3. **Build errors** - Check TypeScript types
4. **Style issues** - Clear Tailwind cache

## 🤝 Contributing

### Code Style
- ESLint configuration
- Prettier formatting
- TypeScript strict mode
- Conventional commits

### Component Guidelines
1. Use TypeScript interfaces
2. Document with JSDoc
3. Write unit tests
4. Follow accessibility standards
5. Optimize for performance

### Pull Request Process
1. Create feature branch
2. Write/update tests
3. Update documentation
4. Submit PR with description
5. Address review feedback

---

For more information, see the [main documentation](../docs) or visit the [Next.js docs](https://nextjs.org/docs).