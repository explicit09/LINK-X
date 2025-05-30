# Course Page Refactoring Migration Guide

## Overview
This guide explains how to migrate from the monolithic 2600+ line course page to the new modular architecture.

## What Changed

### Before (Monolithic)
- Single `page.tsx` file with 2600+ lines
- 30+ useState hooks for state management
- All logic mixed together (UI, data fetching, business logic)
- Difficult to test and maintain

### After (Modular)
- **Main page**: ~300 lines (`page-refactored.tsx`)
- **Context**: Centralized state management
- **Custom hooks**: Separated business logic
- **Components**: Focused, single-purpose components
- **TypeScript**: Fully typed interfaces

## Migration Steps

### Step 1: Test Current Functionality
Before starting migration, ensure all features work:
```bash
# Run the app with current page
npm run dev
# Test all tabs, upload, delete, etc.
```

### Step 2: Install Dependencies
The refactored version uses React Query (optional, for future):
```bash
npm install @tanstack/react-query
```

### Step 3: Backup Current Page
```bash
cp page.tsx page-backup.tsx
```

### Step 4: Replace with Refactored Version
```bash
# Remove old page
rm page.tsx
# Rename refactored version
mv page-refactored.tsx page.tsx
```

### Step 5: Test Everything
Go through each feature systematically:

#### Home Tab
- [ ] View modules and materials
- [ ] Create new module
- [ ] Edit module
- [ ] Delete module (empty only)
- [ ] Upload files
- [ ] View files
- [ ] Delete files
- [ ] Bulk delete files
- [ ] Search and filter
- [ ] Module accordion state persistence

#### AI Tab
- [ ] Start new conversation
- [ ] View conversation history
- [ ] Send messages

#### Quizzes Tab
- [ ] View quiz list
- [ ] Start quiz
- [ ] Generate quiz (placeholder)

#### People Tab
- [ ] View instructor
- [ ] View classmates placeholder

#### General Features
- [ ] Focus mode toggle
- [ ] Course deletion (instructor)
- [ ] Material viewer dialog
- [ ] Download files
- [ ] AI features (Ask AI, Smart Selection)
- [ ] Progress tracking

## Key Differences

### State Management
**Old way:**
```typescript
const [course, setCourse] = useState<Course | null>(null);
const [modules, setModules] = useState<Module[]>([]);
const [loading, setLoading] = useState(true);
// ... 30+ more useState calls
```

**New way:**
```typescript
const { state, dispatch } = useCourseContext();
const { course, modules, loading } = state;
```

### Data Fetching
**Old way:**
```typescript
useEffect(() => {
  // 500+ lines of data fetching logic
}, [courseId]);
```

**New way:**
```typescript
const { course, modules, loading } = useCourseData(courseId);
```

### Module Management
**Old way:**
```typescript
const confirmCreateModule = async () => {
  // 50+ lines of module creation logic
};
```

**New way:**
```typescript
const { createModule } = useModuleManager(courseId);
await createModule(title, description);
```

## File Structure
```
app/courses/[courseId]/
├── page.tsx                    # Main page (was 2600+ lines, now ~300)
├── context/
│   └── CourseContext.tsx       # Centralized state management
├── hooks/
│   ├── useCourseData.ts        # Data fetching logic
│   ├── useModuleManager.ts     # Module CRUD operations
│   └── useMaterialUpload.ts    # File management
├── components/
│   ├── CourseHeader.tsx        # Header component
│   ├── CourseNavigation.tsx    # Tab navigation
│   ├── home/
│   │   └── HomeTab.tsx         # Home tab content
│   ├── ai/
│   │   └── AITab.tsx           # AI tutor tab
│   ├── quizzes/
│   │   └── QuizzesTab.tsx      # Quizzes tab
│   └── people/
│       └── PeopleTab.tsx       # People tab
├── types/
│   └── course.types.ts         # TypeScript types
└── utils/
    ├── courseHelpers.ts        # Helper functions
    └── moduleStructure.ts      # Module organization logic
```

## Benefits

1. **Maintainability**: Each file has a single responsibility
2. **Testability**: Components and hooks can be tested in isolation
3. **Performance**: Reduced re-renders, better memoization opportunities
4. **Developer Experience**: Easy to find and modify specific features
5. **Type Safety**: Full TypeScript coverage

## Troubleshooting

### Module state not persisting
Check localStorage for `course-${courseId}-accordion` key.

### Files not showing after upload
Ensure the upload handler calls `handleUploadComplete` with proper file data.

### Course not loading
Check browser console for API errors. Ensure backend is running.

### TypeScript errors
Run `npm run type-check` to see all type errors.

## Next Steps

1. **Add React Query** for better data fetching:
```typescript
const { data: course, isLoading } = useQuery({
  queryKey: ['course', courseId],
  queryFn: () => fetchCourse(courseId)
});
```

2. **Add Error Boundaries** for better error handling
3. **Add Unit Tests** for hooks and components
4. **Optimize Bundle Size** with dynamic imports

## Rollback Plan
If issues arise:
```bash
# Restore backup
cp page-backup.tsx page.tsx
# Remove new files
rm -rf context hooks components types utils
```