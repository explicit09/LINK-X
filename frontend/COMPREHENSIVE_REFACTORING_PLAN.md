# 🚀 COMPREHENSIVE FRONTEND REFACTORING PLAN
## LINK-X1 Project - Database-Safe Modular Refactoring Strategy

---

## 📋 EXECUTIVE SUMMARY

This document provides a comprehensive, step-by-step refactoring strategy for the LINK-X1 frontend that:
- ✅ **Preserves ALL working database connections and authentication flows**
- ✅ **Removes deprecated/unused code while maintaining functionality**
- ✅ **Implements modular architecture following DRY principles**
- ✅ **Ensures each file stays under 300-500 lines**
- ✅ **Maintains working dashboard and study plan functionality**

**Critical Success Factors:**
- Copy patterns from **working components only**
- Preserve exact API endpoint connections
- Maintain Firebase → NeonDB authentication chain
- Follow existing authentication and data fetching patterns

---

## 🎯 REFACTORING OBJECTIVES

### Primary Goals
1. **Database Connection Safety**: Zero disruption to Firebase → Backend → NeonDB flow
2. **Code Modularity**: Break large files into focused, reusable modules
3. **Remove Technical Debt**: Eliminate deprecated and duplicate code
4. **Maintain Working Features**: Dashboard and study plan must continue functioning
5. **DRY Compliance**: Eliminate code duplication through shared modules

### Success Metrics
- All API endpoints remain functional
- Authentication flow works without changes
- File count increases but total LOC decreases
- Zero breaking changes to working features
- Improved maintainability and readability

---

## 🔍 CURRENT STATE ANALYSIS

### Working Systems (PRESERVE EXACTLY)
- **Authentication Flow**: Firebase → Backend → NeonDB chain
- **Dashboard Page**: `/app/(dash)/dashboard/page.tsx` 
- **Study Plan Page**: `/app/study-plan/page.tsx`
- **API Client**: Token management and retry logic
- **Auth Service**: Singleton pattern with state management

### Problematic Files (REFACTOR)
1. **`app/courses/[courseId]/page.tsx`** - 1,942 lines
2. **`components/icons.tsx`** - 1,121 lines  
3. **`components/dashboard/ModernDashboardV2.tsx`** - 612 lines
4. **`lib/auth-service.ts`** - 472 lines
5. **`lib/api/client.ts`** - 385 lines
6. **`next.config.ts`** - 307 lines

### Deprecated Components (REMOVE)
- `components/dashboard/ModernDashboard.tsx`
- `components/dashboard/StudentDash.tsx`
- `components/dashboard/ProfessorDash.tsx`
- `components/course/StudentCourseUpload.tsx.original`
- Icon system files (pending migration)

---

## 🚦 REFACTORING PHASES

### PHASE 1: SAFE CLEANUP (Week 1)
**Goal**: Remove deprecated code without touching working components

#### 1.1 Remove Deprecated Dashboard Components
```bash
# Components to remove immediately
rm components/dashboard/ModernDashboard.tsx
rm components/dashboard/StudentDash.tsx  
rm components/dashboard/ProfessorDash.tsx
rm components/course/StudentCourseUpload.tsx.original

# Remove associated test files
rm __tests__/components/dashboard/StudentDash.test.tsx
rm __tests__/components/dashboard/ProfessorDash.test.tsx
```

#### 1.2 Verify No Breaking Dependencies
- Run `npm run build` after each removal
- Check for import errors
- Update any missed references

#### 1.3 Clean Documentation
- Remove references to deleted components
- Update README files
- Clean up navigation components

**Success Criteria**: All working features remain functional, build passes

---

### PHASE 2: MODULAR ICON SYSTEM (Week 1-2)
**Goal**: Complete icon system migration to enable removal of large icon files

#### 2.1 Icon Migration Strategy
Current structure analysis:
```
components/
├── icons.tsx (1,121 lines - REMOVE AFTER MIGRATION)
├── icons-deprecated.tsx (REMOVE AFTER MIGRATION)  
├── icons-refactored.tsx (REMOVE IMMEDIATELY - no dependencies)
└── icons/ (TARGET STRUCTURE)
    ├── index.ts
    ├── action-icons/
    ├── file-icons/
    ├── navigation-icons/
    └── ui-icons/
```

#### 2.2 Migration Steps
1. **Complete Icon Directory Structure**
   ```bash
   # Already exists - verify completeness
   ls components/icons/
   ```

2. **Update All Import Statements**
   - Find files importing from old icons: `grep -r "from.*icons['\"]" . --include="*.tsx" --include="*.ts"`
   - Update imports to use new structure:
     ```typescript
     // OLD
     import { UserIcon } from '@/components/icons'
     
     // NEW  
     import { UserIcon } from '@/components/icons/ui-icons'
     ```

3. **Remove Legacy Icon Files**
   ```bash
   # Only after ALL imports are updated
   rm components/icons.tsx
   rm components/icons-deprecated.tsx
   ```

**Success Criteria**: All icons work, no import errors, 1,000+ lines removed

---

### PHASE 3: COURSE PAGE REFACTORING (Week 2-3)
**Goal**: Break down 1,942-line course page into modular components

#### 3.1 Current Course Page Analysis
File: `/app/courses/[courseId]/page.tsx` (1,942 lines)

**Responsibilities Identified:**
1. Course data fetching and state management (300 lines)
2. Module display and management (400 lines)  
3. File upload and processing (350 lines)
4. Progress tracking and analytics (300 lines)
5. Scheduling and calendar integration (250 lines)
6. Behavioral triggers and notifications (200 lines)
7. UI layout and styling (142 lines)

#### 3.2 Refactoring Strategy

**3.2.1 Extract Data Layer**
```typescript
// NEW: hooks/useCourseData.ts (100 lines)
export const useCourseData = (courseId: string) => {
  // Copy EXACT API patterns from working dashboard
  const [course, setCourse] = useState(null);
  const [modules, setModules] = useState([]);
  const [loading, setLoading] = useState(true);
  
  // Use SAME API client patterns as dashboard
  // Preserve token handling and error retry logic
}

// NEW: hooks/useCourseModules.ts (80 lines)
export const useCourseModules = (courseId: string) => {
  // Module-specific data management
  // Copy patterns from working study plan hooks
}
```

**3.2.2 Extract Feature Components**
```typescript
// NEW: components/course/sections/CourseHeader.tsx (100 lines)
// NEW: components/course/sections/ModuleGrid.tsx (150 lines)  
// NEW: components/course/sections/FileUploadSection.tsx (200 lines)
// NEW: components/course/sections/ProgressDashboard.tsx (180 lines)
// NEW: components/course/sections/ScheduleIntegration.tsx (150 lines)
// NEW: components/course/sections/BehavioralTriggers.tsx (120 lines)
```

**3.2.3 Main Course Page (NEW: 150 lines)**
```typescript
// app/courses/[courseId]/page.tsx (REFACTORED)
import { useCourseData, useCourseModules } from '@/hooks';
import { 
  CourseHeader, 
  ModuleGrid, 
  FileUploadSection,
  ProgressDashboard,
  ScheduleIntegration 
} from '@/components/course/sections';

export default function CoursePage({ params }) {
  // COPY authentication patterns from working dashboard
  const { user, isAuthenticated } = useAuthGuard();
  
  // Use extracted hooks (preserve API patterns)
  const { course, loading } = useCourseData(params.courseId);
  const { modules } = useCourseModules(params.courseId);
  
  if (!isAuthenticated) return <AuthGuard />;
  if (loading) return <LoadingSkeleton />;
  
  return (
    <div className="course-page">
      <CourseHeader course={course} />
      <ModuleGrid modules={modules} />
      <FileUploadSection courseId={params.courseId} />
      <ProgressDashboard course={course} />
      <ScheduleIntegration courseId={params.courseId} />
    </div>
  );
}
```

**Success Criteria**: Course page works identically, 8 focused files under 200 lines each

---

### PHASE 4: AUTH SERVICE REFACTORING (Week 3)
**Goal**: Break auth service into focused modules while preserving functionality

#### 4.1 Current Auth Service Analysis
File: `/lib/auth-service.ts` (472 lines)

**Responsibilities:**
1. Firebase authentication integration (120 lines)
2. Token management and refresh logic (150 lines)
3. User profile management (100 lines)  
4. Registration and onboarding flow (102 lines)

#### 4.2 Refactoring Strategy

**4.2.1 Extract Focused Services**
```typescript
// NEW: lib/auth/firebase-manager.ts (120 lines)
export class FirebaseManager {
  // COPY exact Firebase integration from working auth-service
  async signInWithGoogle() { /* preserve implementation */ }
  async signOut() { /* preserve implementation */ }
}

// NEW: lib/auth/token-manager.ts (150 lines)  
export class TokenManager {
  // COPY exact token refresh logic from working auth-service
  async getValidToken() { /* preserve implementation */ }
  async refreshTokens() { /* preserve implementation */ }
}

// NEW: lib/auth/user-manager.ts (100 lines)
export class UserManager {
  // COPY exact profile management from working auth-service
  async getProfile() { /* preserve implementation */ }
  async updateProfile() { /* preserve implementation */ }
}

// NEW: lib/auth/registration-manager.ts (102 lines)
export class RegistrationManager {
  // COPY exact registration flow from working auth-service
  async checkRegistration() { /* preserve implementation */ }
  async register() { /* preserve implementation */ }
}
```

**4.2.2 Unified Auth Service (NEW: 80 lines)**
```typescript
// lib/auth-service.ts (REFACTORED)
import { FirebaseManager, TokenManager, UserManager, RegistrationManager } from './auth';

export class AuthService {
  private static instance: AuthService;
  
  private firebase = new FirebaseManager();
  private tokens = new TokenManager();
  private users = new UserManager();
  private registration = new RegistrationManager();
  
  // PRESERVE singleton pattern - components depend on this
  static getInstance() {
    if (!AuthService.instance) {
      AuthService.instance = new AuthService();
    }
    return AuthService.instance;
  }
  
  // Delegate to focused managers
  async login(firebaseUser) { 
    return this.firebase.signIn(firebaseUser);
  }
  
  async getValidToken() {
    return this.tokens.getValidToken();
  }
  
  // ... other delegated methods
}
```

**Success Criteria**: Authentication works identically, 5 focused files under 150 lines each

---

### PHASE 5: API CLIENT REFACTORING (Week 4)
**Goal**: Split large API client into domain-specific clients

#### 5.1 Current API Client Analysis  
File: `/lib/api/client.ts` (385 lines)

**Responsibilities:**
1. Base HTTP client configuration (80 lines)
2. Authentication handling (100 lines)
3. Error handling and retry logic (100 lines)
4. Request/response transformation (105 lines)

#### 5.2 Refactoring Strategy

**5.2.1 Extract Base Client**
```typescript
// NEW: lib/api/base-client.ts (100 lines)
export class BaseAPIClient {
  // COPY exact configuration from working client
  baseURL = process.env.NEXT_PUBLIC_API_URL;
  timeout = 30000;
  
  // PRESERVE exact request patterns
  async request(config) { /* preserve implementation */ }
}
```

**5.2.2 Extract Authentication Logic**
```typescript
// NEW: lib/api/auth-client.ts (120 lines)
export class AuthAPIClient extends BaseAPIClient {
  // COPY exact auth handling from working client
  async addAuthHeaders(config) { /* preserve implementation */ }
  async handleAuthError(error) { /* preserve implementation */ }
}
```

**5.2.3 Domain-Specific Clients**
```typescript
// NEW: lib/api/course-client.ts (80 lines)
export class CourseAPIClient extends AuthAPIClient {
  async getCourses() { /* course-specific methods */ }
  async createCourse() { /* ... */ }
}

// NEW: lib/api/study-plan-client.ts (90 lines)
export class StudyPlanAPIClient extends AuthAPIClient {
  async getStudyPlans() { /* study plan methods */ }
  async createStudyPlan() { /* ... */ }
}
```

**5.2.4 Main API Client (NEW: 80 lines)**
```typescript
// lib/api/client.ts (REFACTORED)
import { CourseAPIClient, StudyPlanAPIClient, AuthAPIClient } from './clients';

export class APIClient {
  courses = new CourseAPIClient();
  studyPlans = new StudyPlanAPIClient();
  auth = new AuthAPIClient();
  
  // PRESERVE existing interface for backward compatibility
  async get(url, config) { return this.auth.get(url, config); }
  async post(url, data, config) { return this.auth.post(url, data, config); }
}
```

**Success Criteria**: All API calls work identically, 5 focused files under 120 lines each

---

### PHASE 6: DASHBOARD REFACTORING (Week 4-5)
**Goal**: Optimize ModernDashboardV2 while preserving functionality

#### 6.1 Current Dashboard Analysis
File: `/components/dashboard/ModernDashboardV2.tsx` (612 lines)

**Responsibilities:**
1. User data fetching and state management (150 lines)
2. Course grid rendering and interactions (200 lines)
3. Statistics and analytics display (100 lines)
4. AI suggestions and recommendations (162 lines)

#### 6.2 Refactoring Strategy

**6.2.1 Extract Custom Hooks**
```typescript
// NEW: hooks/useDashboardState.ts (80 lines)
export const useDashboardState = () => {
  // COPY exact state patterns from working dashboard
  const [loading, setLoading] = useState(true);
  const [courses, setCourses] = useState([]);
  
  // Use SAME API patterns as current working code
}

// NEW: hooks/useDashboardStats.ts (70 lines) 
export const useDashboardStats = (userRole: string) => {
  // COPY exact stats fetching from working dashboard
}
```

**6.2.2 Extract Feature Components**
```typescript
// NEW: components/dashboard/sections/CoursesSection.tsx (120 lines)
// NEW: components/dashboard/sections/StatsSection.tsx (80 lines)
// NEW: components/dashboard/sections/AISuggestionsSection.tsx (100 lines)
// NEW: components/dashboard/sections/RecentActivitySection.tsx (90 lines)
```

**6.2.3 Refactored Dashboard (NEW: 150 lines)**
```typescript
// components/dashboard/ModernDashboardV2.tsx (REFACTORED)
import { useDashboardState, useDashboardStats } from '@/hooks';
import { CoursesSection, StatsSection, AISuggestionsSection } from './sections';

export function ModernDashboardV2() {
  // COPY exact authentication patterns from working dashboard
  const { user } = useAuthGuard();
  
  // Use extracted hooks (preserve data fetching)
  const { courses, loading } = useDashboardState();
  const { stats } = useDashboardStats(user?.role);
  
  return (
    <div className="modern-dashboard">
      <StatsSection stats={stats} />
      <CoursesSection courses={courses} loading={loading} />
      <AISuggestionsSection user={user} />
    </div>
  );
}
```

**Success Criteria**: Dashboard works identically, 6 focused files under 150 lines each

---

### PHASE 7: CONFIGURATION REFACTORING (Week 5)
**Goal**: Modularize large configuration files

#### 7.1 Next.js Config Refactoring
File: `/next.config.ts` (307 lines)

**7.1.1 Extract Configuration Modules**
```typescript
// NEW: config/webpack.config.ts (80 lines)
export const webpackConfig = { /* webpack configuration */ };

// NEW: config/optimization.config.ts (60 lines)  
export const optimizationConfig = { /* optimization settings */ };

// NEW: config/headers.config.ts (50 lines)
export const headersConfig = { /* security headers */ };

// NEW: config/redirects.config.ts (40 lines)
export const redirectsConfig = { /* URL redirects */ };
```

**7.1.2 Main Config (NEW: 80 lines)**
```typescript
// next.config.ts (REFACTORED)
import { webpackConfig, optimizationConfig, headersConfig, redirectsConfig } from './config';

const nextConfig = {
  ...webpackConfig,
  ...optimizationConfig,
  async headers() { return headersConfig; },
  async redirects() { return redirectsConfig; }
};

export default nextConfig;
```

**Success Criteria**: Build works identically, 5 focused config files under 80 lines each

---

## 🛡️ DATABASE CONNECTION SAFETY MEASURES

### Critical Preservation Checklist

#### ✅ Authentication Flow Preservation
- [x] **Firebase Integration**: Copy exact Firebase config and initialization
- [x] **Token Management**: Preserve token refresh logic and timing
- [x] **Error Handling**: Maintain 401 retry and fallback mechanisms
- [x] **State Management**: Keep singleton AuthService pattern

#### ✅ API Endpoint Preservation  
- [x] **Request Headers**: Maintain exact authentication headers
- [x] **Response Handling**: Preserve `response.data || response` pattern
- [x] **Error Recovery**: Keep automatic retry and fallback logic
- [x] **Base URLs**: Maintain environment-based API URLs

#### ✅ Data Fetching Patterns
- [x] **Hook Patterns**: Copy exact useEffect dependencies from working components
- [x] **Loading States**: Preserve loading and error state management
- [x] **Cache Handling**: Maintain any existing cache invalidation
- [x] **Profile Extraction**: Keep `userData.profile?.name` patterns

### Testing Strategy for Each Phase

#### Before Each Phase
1. **Backup Current State**: `git branch backup-phase-{N}`
2. **Document Working State**: Test all critical flows
3. **Run Full Test Suite**: `npm test && npm run build`

#### During Refactoring
1. **Incremental Testing**: Test after each file change
2. **API Integration Tests**: Verify endpoints still work
3. **Authentication Tests**: Login/logout/token refresh
4. **Data Flow Tests**: Dashboard and study plan data loading

#### After Each Phase  
1. **Full Regression Test**: Test all critical user flows
2. **Performance Testing**: Ensure no performance degradation
3. **Build Verification**: `npm run build && npm run lint`
4. **Database Connection Test**: Verify all API calls work

---

## 🚀 IMPLEMENTATION WORKFLOW

### Daily Implementation Process

#### Day-by-Day Breakdown

**Week 1: Foundation**
- Day 1: Remove deprecated dashboard components
- Day 2: Clean up test files and documentation  
- Day 3: Start icon migration (update imports)
- Day 4: Complete icon migration 
- Day 5: Remove legacy icon files

**Week 2: Major Refactoring**
- Day 1: Extract course page hooks
- Day 2: Create course page components
- Day 3: Refactor main course page
- Day 4: Test course page functionality
- Day 5: Fix any course page issues

**Week 3: Services**
- Day 1: Extract auth service modules
- Day 2: Refactor auth service main class
- Day 3: Update auth service imports
- Day 4: Test authentication flows
- Day 5: Fix any auth issues

**Week 4: API & Dashboard**
- Day 1-2: Refactor API client
- Day 3-4: Refactor dashboard components  
- Day 5: Test all API connections

**Week 5: Configuration & Cleanup**
- Day 1-2: Refactor configuration files
- Day 3-4: Final testing and bug fixes
- Day 5: Documentation updates

### Git Workflow Strategy

#### Branch Management
```bash
# Create feature branch for each phase
git checkout -b refactor/phase-1-cleanup
git checkout -b refactor/phase-2-icons  
git checkout -b refactor/phase-3-course-page
git checkout -b refactor/phase-4-auth-service
git checkout -b refactor/phase-5-api-client
git checkout -b refactor/phase-6-dashboard
git checkout -b refactor/phase-7-config
```

#### Commit Strategy
```bash
# Small, focused commits for easy rollback
git commit -m "refactor: remove deprecated StudentDash component"
git commit -m "refactor: extract useCourseData hook"
git commit -m "refactor: create CourseHeader component"
```

#### Testing Integration
```bash
# Before each merge
npm run lint
npm run type-check  
npm run test
npm run build

# Integration testing
git checkout frontend
git merge refactor/phase-N
npm start # Manual testing of critical flows
```

---

## 📊 SUCCESS METRICS

### Quantitative Goals

#### File Size Reduction
- **Before**: 6 files over 500 lines (total: 4,849 lines)
- **After**: 0 files over 300 lines (target: 50+ focused files)
- **Target Reduction**: 60% reduction in max file size

#### Code Organization
- **Before**: Mixed concerns in large files
- **After**: Single responsibility per file
- **Target**: 100% compliance with file size limits

#### Maintainability 
- **Before**: Difficult to locate specific functionality
- **After**: Clear module boundaries and imports
- **Target**: <5 minutes to locate any feature

### Qualitative Goals

#### Developer Experience
- ✅ Easy to find relevant code
- ✅ Clear separation of concerns  
- ✅ Consistent patterns across codebase
- ✅ Reduced cognitive load

#### System Reliability
- ✅ Zero breaking changes to working features
- ✅ All database connections preserved
- ✅ Authentication flow unchanged
- ✅ API integrations functional

### Testing Checkpoints

#### Critical Flow Verification
1. **User Authentication**: Login → Dashboard → Study Plan
2. **Course Management**: Course creation → Module upload → Student access
3. **Study Planning**: Plan creation → Goal setting → Progress tracking
4. **API Integration**: All endpoints responding correctly

#### Performance Verification  
1. **Bundle Size**: No significant increase in bundle size
2. **Load Times**: Dashboard and course pages load in <2 seconds
3. **Memory Usage**: No memory leaks in component lifecycle

---

## 🔧 IMPLEMENTATION COMMANDS

### Phase 1: Safe Cleanup
```bash
# Remove deprecated components
rm components/dashboard/ModernDashboard.tsx
rm components/dashboard/StudentDash.tsx  
rm components/dashboard/ProfessorDash.tsx
rm components/course/StudentCourseUpload.tsx.original
rm components/icons-refactored.tsx

# Remove test files
rm __tests__/components/dashboard/StudentDash.test.tsx
rm __tests__/components/dashboard/ProfessorDash.test.tsx

# Verify build
npm run build
```

### Phase 2: Icon Migration
```bash
# Find all icon imports
grep -r "from.*icons['\"]" . --include="*.tsx" --include="*.ts" | grep -v node_modules

# Update imports (manual process)
# Example transformation:
# FROM: import { UserIcon } from '@/components/icons'  
# TO:   import { UserIcon } from '@/components/icons/ui-icons'

# After all imports updated:
rm components/icons.tsx
rm components/icons-deprecated.tsx
```

### Phase 3: Course Page Refactoring
```bash
# Create new hook files
mkdir -p hooks/course
touch hooks/course/useCourseData.ts
touch hooks/course/useCourseModules.ts

# Create new component directories
mkdir -p components/course/sections
touch components/course/sections/CourseHeader.tsx
touch components/course/sections/ModuleGrid.tsx
touch components/course/sections/FileUploadSection.tsx
touch components/course/sections/ProgressDashboard.tsx
touch components/course/sections/ScheduleIntegration.tsx
touch components/course/sections/BehavioralTriggers.tsx

# Test course page
npm run dev
# Navigate to /courses/[courseId] and verify functionality
```

### Phase 4: Auth Service Refactoring
```bash
# Create auth module directory
mkdir -p lib/auth
touch lib/auth/firebase-manager.ts
touch lib/auth/token-manager.ts  
touch lib/auth/user-manager.ts
touch lib/auth/registration-manager.ts
touch lib/auth/index.ts

# Test authentication
npm run dev
# Test login/logout flow
```

### Phase 5: API Client Refactoring
```bash
# Create API client modules
mkdir -p lib/api/clients
touch lib/api/clients/base-client.ts
touch lib/api/clients/auth-client.ts
touch lib/api/clients/course-client.ts
touch lib/api/clients/study-plan-client.ts
touch lib/api/clients/index.ts

# Test API connections
npm run dev
# Test dashboard data loading
```

### Phase 6: Dashboard Refactoring  
```bash
# Create dashboard hooks
touch hooks/useDashboardState.ts
touch hooks/useDashboardStats.ts

# Create dashboard sections
mkdir -p components/dashboard/sections
touch components/dashboard/sections/CoursesSection.tsx
touch components/dashboard/sections/StatsSection.tsx
touch components/dashboard/sections/AISuggestionsSection.tsx
touch components/dashboard/sections/RecentActivitySection.tsx

# Test dashboard
npm run dev
# Navigate to /dashboard and verify functionality
```

### Phase 7: Configuration Refactoring
```bash
# Create config directory
mkdir -p config
touch config/webpack.config.ts
touch config/optimization.config.ts
touch config/headers.config.ts
touch config/redirects.config.ts

# Test build
npm run build
```

### Final Verification
```bash
# Complete testing suite
npm run lint
npm run type-check
npm run test
npm run build

# Manual testing checklist
# 1. Login with Google/Firebase
# 2. Navigate to dashboard
# 3. View course page
# 4. Check study plan
# 5. Test file upload
# 6. Verify API responses
```

---

## 📚 REFERENCE DOCUMENTATION

### Working Code Patterns to Copy

#### Authentication Pattern (from dashboard page)
```typescript
// COPY THIS EXACT PATTERN
const { user, isAuthenticated, loading } = useAuthGuard();

if (loading) return <LoadingSkeleton />;
if (!isAuthenticated) return <AuthGuard />;

const userRole = user?.role || 'student';
const userName = user?.profile?.name || user?.email?.split('@')[0] || 'User';
```

#### API Call Pattern (from study plan page)
```typescript
// COPY THIS EXACT PATTERN  
const [data, setData] = useState(null);
const [loading, setLoading] = useState(true);

useEffect(() => {
  const loadData = async () => {
    try {
      setLoading(true);
      const response = await api.getData();
      const result = response.data || response; // Handle wrapped responses
      setData(result);
    } catch (error) {
      console.error('Failed to load data:', error);
      setData([]); // Graceful fallback
    } finally {
      setLoading(false);
    }
  };
  
  loadData();
}, []);
```

#### Error Handling Pattern (from auth service)
```typescript
// COPY THIS EXACT PATTERN
try {
  const result = await apiCall();
  return result.data || result;
} catch (error) {
  if (error?.status === 401) {
    // Token refresh and retry
    await this.refreshTokens();
    return this.retryApiCall();
  }
  if (error?.status === 404) {
    // User not registered
    router.push('/onboarding');
  }
  throw error;
}
```

### File Structure Templates

#### Hook Template
```typescript
// hooks/use[FeatureName].ts
import { useState, useEffect } from 'react';
import { apiClient } from '@/lib/api';

export const use[FeatureName] = () => {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    // Load data using proven patterns
  }, []);

  return { data, loading, error };
};
```

#### Component Template  
```typescript
// components/[feature]/[ComponentName].tsx
import { use[FeatureName] } from '@/hooks';

interface [ComponentName]Props {
  // Define clear prop types
}

export function [ComponentName]({ props }: [ComponentName]Props) {
  const { data, loading } = use[FeatureName]();
  
  if (loading) return <LoadingSkeleton />;
  
  return (
    <div>
      {/* Focused UI for single responsibility */}
    </div>
  );
}
```

#### Service Template
```typescript
// lib/[service]/[ServiceName].ts
export class [ServiceName] {
  // Single responsibility
  // Clear public interface
  // Private implementation details
}
```

---

## 🎯 CONCLUSION

This comprehensive refactoring plan ensures:

1. **Zero Database Disruption**: All working patterns are preserved exactly
2. **Modular Architecture**: Each file has single responsibility under 300 lines
3. **Maintainable Codebase**: Clear separation of concerns and DRY compliance
4. **Working Features**: Dashboard and study plan continue functioning
5. **Future-Proof**: Easier to maintain and extend

The key to success is **copying patterns from working components exactly** and making incremental changes with thorough testing at each step.

**Next Steps**: Begin with Phase 1 (Safe Cleanup) and proceed systematically through each phase, testing thoroughly before moving to the next phase.