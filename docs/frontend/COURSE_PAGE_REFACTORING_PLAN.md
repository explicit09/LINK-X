# Course Page Refactoring Plan

## Overview
The course page component (`app/courses/[courseId]/page.tsx`) is currently 2600+ lines and handles too many responsibilities. This refactoring plan will break it down into a modular, maintainable architecture.

## Current Issues
1. **Monolithic Component**: Single file handling all course-related functionality
2. **Mixed Concerns**: Data fetching, state management, UI logic all in one place
3. **Performance Issues**: Large re-renders, no code splitting
4. **Testing Difficulty**: Hard to unit test individual features
5. **State Management**: Complex local state with 30+ useState hooks

## Proposed Architecture

### 1. File Structure
```
app/courses/[courseId]/
├── page.tsx                    # Main page component (thin controller)
├── loading.tsx                 # Loading state
├── error.tsx                   # Error boundary
├── layout.tsx                  # Course layout wrapper
├── components/
│   ├── CourseHeader.tsx        # Course header with navigation
│   ├── CourseTabs.tsx          # Tab navigation component
│   ├── CourseProgress.tsx      # Progress tracking display
│   ├── home/
│   │   ├── HomeTab.tsx         # Home tab container
│   │   ├── ModuleList.tsx      # Module list container
│   │   └── MaterialsEmpty.tsx  # Empty state
│   ├── ai/
│   │   ├── AITab.tsx           # AI tutor tab
│   │   ├── AIChat.tsx          # Chat interface
│   │   └── ConversationList.tsx
│   ├── quizzes/
│   │   ├── QuizzesTab.tsx      # Quiz tab
│   │   ├── QuizCard.tsx        # Individual quiz card
│   │   └── QuizDialog.tsx      # Quiz taking interface
│   └── people/
│       └── PeopleTab.tsx       # People tab
├── hooks/
│   ├── useCourseData.ts        # Course data fetching
│   ├── useModuleManager.ts     # Module CRUD operations
│   ├── useMaterialUpload.ts    # File upload logic
│   ├── useAIFeatures.ts        # AI-related functionality
│   ├── useQuizzes.ts           # Quiz management
│   └── useCourseProgress.ts    # Progress tracking
├── utils/
│   ├── courseHelpers.ts        # Helper functions
│   ├── fileHelpers.ts          # File-related utilities
│   └── moduleStructure.ts      # Module organization logic
├── types/
│   ├── course.types.ts         # TypeScript interfaces
│   └── api.types.ts            # API response types
└── context/
    └── CourseContext.tsx       # Course-wide state context
```

### 2. State Management Strategy

#### A. Use React Context for Shared State
```typescript
// context/CourseContext.tsx
interface CourseContextType {
  course: Course | null;
  modules: Module[];
  courseProgress: CourseProgress;
  currentUser: User | null;
  // Actions
  updateModule: (moduleId: string, data: Partial<Module>) => void;
  deleteModule: (moduleId: string) => void;
  uploadFile: (file: File, moduleId: string) => Promise<void>;
}
```

#### B. useReducer for Complex State
```typescript
// hooks/useCourseReducer.ts
const courseReducer = (state: CourseState, action: CourseAction) => {
  switch (action.type) {
    case 'SET_MODULES':
      return { ...state, modules: action.payload };
    case 'ADD_MATERIAL':
      return { ...state, modules: addMaterialToModule(state.modules, action.payload) };
    case 'UPDATE_PROGRESS':
      return { ...state, progress: action.payload };
    // ... other actions
  }
};
```

### 3. Custom Hooks Implementation

#### A. Data Fetching Hook
```typescript
// hooks/useCourseData.ts
export const useCourseData = (courseId: string) => {
  const { data: course, error, isLoading } = useQuery({
    queryKey: ['course', courseId],
    queryFn: () => fetchCourseData(courseId),
    staleTime: 5 * 60 * 1000, // 5 minutes
  });

  const { data: modules } = useQuery({
    queryKey: ['modules', courseId],
    queryFn: () => fetchModules(courseId),
    enabled: !!course,
  });

  return { course, modules, error, isLoading };
};
```

#### B. Module Management Hook
```typescript
// hooks/useModuleManager.ts
export const useModuleManager = (courseId: string) => {
  const queryClient = useQueryClient();
  
  const createModule = useMutation({
    mutationFn: (data: CreateModuleData) => api.createModule(courseId, data),
    onSuccess: () => {
      queryClient.invalidateQueries(['modules', courseId]);
      toast.success('Module created successfully');
    },
  });

  const updateModule = useMutation({
    mutationFn: ({ moduleId, data }) => api.updateModule(courseId, moduleId, data),
    onSuccess: () => {
      queryClient.invalidateQueries(['modules', courseId]);
    },
  });

  return { createModule, updateModule, /* ... */ };
};
```

### 4. Component Breakdown

#### A. Main Page Component (Slim Controller)
```typescript
// page.tsx (~200 lines)
export default function CoursePage() {
  const { courseId } = useParams();
  const { course, modules, isLoading, error } = useCourseData(courseId);
  const [activeTab, setActiveTab] = useState('home');

  if (isLoading) return <CoursePageSkeleton />;
  if (error) return <CourseError error={error} />;
  if (!course) return <CourseNotFound />;

  return (
    <CourseProvider value={{ course, modules }}>
      <CourseLayout>
        <CourseHeader course={course} />
        <CourseTabs activeTab={activeTab} onTabChange={setActiveTab}>
          <TabPanel value="home">
            <HomeTab />
          </TabPanel>
          <TabPanel value="ai">
            <AITab />
          </TabPanel>
          <TabPanel value="quizzes">
            <QuizzesTab />
          </TabPanel>
          <TabPanel value="people">
            <PeopleTab />
          </TabPanel>
        </CourseTabs>
      </CourseLayout>
    </CourseProvider>
  );
}
```

#### B. Module List Component
```typescript
// components/home/ModuleList.tsx
export const ModuleList = () => {
  const { modules } = useCourseContext();
  const { searchQuery, filters } = useModuleFilters();
  const filteredModules = useFilteredModules(modules, searchQuery, filters);

  return (
    <div className="space-y-6">
      <SearchAndFilter onSearch={setSearchQuery} onFilterChange={setFilters} />
      {filteredModules.map(module => (
        <ModuleCard key={module.id} module={module} />
      ))}
    </div>
  );
};
```

### 5. Performance Optimizations

#### A. Code Splitting
```typescript
// Lazy load heavy components
const MaterialViewer = lazy(() => import('@/components/course/MaterialViewer'));
const EnhancedFileUpload = lazy(() => import('@/components/course/EnhancedFileUpload'));
const AIChat = lazy(() => import('@/components/ai/AIChat'));
```

#### B. Memoization
```typescript
// Memoize expensive computations
const filteredModules = useMemo(
  () => filterModules(modules, searchQuery, filters),
  [modules, searchQuery, filters]
);

// Memoize components
const ModuleCard = memo(({ module }) => {
  // Component implementation
}, (prevProps, nextProps) => prevProps.module.id === nextProps.module.id);
```

#### C. Virtual Scrolling for Large Lists
```typescript
// Use react-window for large file lists
import { FixedSizeList } from 'react-window';

const VirtualizedFileList = ({ files }) => (
  <FixedSizeList
    height={600}
    itemCount={files.length}
    itemSize={80}
    width="100%"
  >
    {({ index, style }) => (
      <FileCard key={files[index].id} file={files[index]} style={style} />
    )}
  </FixedSizeList>
);
```

### 6. Data Flow Architecture

```
┌─────────────┐     ┌──────────────┐     ┌─────────────┐
│   Page.tsx  │────▶│ CourseContext│────▶│ Components  │
└─────────────┘     └──────────────┘     └─────────────┘
       │                    │                     │
       ▼                    ▼                     ▼
┌─────────────┐     ┌──────────────┐     ┌─────────────┐
│ React Query │     │  useReducer  │     │Local States │
└─────────────┘     └──────────────┘     └─────────────┘
       │                    │                     │
       ▼                    ▼                     ▼
┌─────────────┐     ┌──────────────┐     ┌─────────────┐
│   API Calls │     │    Actions   │     │   UI Logic  │
└─────────────┘     └──────────────┘     └─────────────┘
```

### 7. Migration Strategy

#### Phase 1: Setup Infrastructure (Week 1)
1. Create new directory structure
2. Set up TypeScript types
3. Create context and reducer
4. Set up React Query

#### Phase 2: Extract Components (Week 2)
1. Extract CourseHeader
2. Extract tab components
3. Extract dialogs and modals
4. Extract utility functions

#### Phase 3: Implement Hooks (Week 3)
1. Create data fetching hooks
2. Create action hooks
3. Migrate state logic
4. Add error handling

#### Phase 4: Optimize & Test (Week 4)
1. Add memoization
2. Implement code splitting
3. Add unit tests
4. Performance testing

### 8. Testing Strategy

```typescript
// __tests__/hooks/useCourseData.test.ts
describe('useCourseData', () => {
  it('fetches course data successfully', async () => {
    const { result } = renderHook(() => useCourseData('course-123'));
    
    await waitFor(() => {
      expect(result.current.course).toBeDefined();
      expect(result.current.isLoading).toBe(false);
    });
  });
});

// __tests__/components/ModuleCard.test.tsx
describe('ModuleCard', () => {
  it('renders module information correctly', () => {
    render(<ModuleCard module={mockModule} />);
    expect(screen.getByText(mockModule.title)).toBeInTheDocument();
  });
});
```

### 9. Benefits of Refactoring

1. **Maintainability**: Each component has a single responsibility
2. **Performance**: Reduced re-renders, lazy loading, better caching
3. **Testability**: Easy to unit test individual components
4. **Reusability**: Components can be used elsewhere
5. **Developer Experience**: Easier to understand and modify
6. **Type Safety**: Better TypeScript coverage
7. **Scalability**: Easy to add new features

### 10. Example Refactored Component

```typescript
// components/home/HomeTab.tsx
export const HomeTab = () => {
  const { modules } = useCourseContext();
  const { createModule, isCreating } = useModuleManager();
  const [isUploadOpen, setIsUploadOpen] = useState(false);

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Course Materials</CardTitle>
          <div className="flex gap-2">
            <Button onClick={() => createModule.open()}>
              <Plus className="w-4 h-4 mr-2" />
              Add Module
            </Button>
            <Button onClick={() => setIsUploadOpen(true)}>
              <Upload className="w-4 h-4 mr-2" />
              Upload Files
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <ModuleList />
        </CardContent>
      </Card>

      <UploadDialog 
        open={isUploadOpen} 
        onOpenChange={setIsUploadOpen}
      />
    </div>
  );
};
```

This refactoring will transform the monolithic 2600+ line component into a modular, maintainable architecture with components typically under 200 lines each.