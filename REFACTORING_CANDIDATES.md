# 🔍 Refactoring Candidates Analysis

## Files Above 500 Lines Requiring Refactoring

Based on analysis of the codebase, here are the current files above 500 lines that need refactoring:

### 📊 Summary Statistics
- **Total Files Above 500 Lines**: 14
- **Frontend Files**: 9 files (TypeScript/React)
- **Backend Files**: 5 files (Python)
- **Largest File**: `frontend/lib/api.ts` (619 lines)
- **Average Size**: ~550 lines

---

## 🎯 High Priority Refactoring Targets

### 1. **frontend/lib/api.ts** (619 lines) 🔴 **CRITICAL**
**Issues:**
- Monolithic API client with mixed concerns
- Complex authentication logic intertwined with API calls
- Repetitive fetch logic with manual retry/timeout handling
- Mixed error handling patterns

**Refactoring Strategy:**
```
lib/api/
├── index.ts (main exports)
├── types.ts (API types)
├── client.ts (base HTTP client)
├── auth.ts (authentication utilities)
├── endpoints/
│   ├── courses.ts
│   ├── users.ts
│   ├── files.ts
│   └── ai.ts
└── utils/
    ├── retry.ts
    ├── timeout.ts
    └── error-handler.ts
```

### 2. **docker-image/src/services/ai_service.py** (611 lines) 🔴 **CRITICAL**
**Issues:**
- Single class handling multiple AI operations
- Mixed concerns (caching, circuit breaking, API calls)
- Long methods with complex logic
- No clear separation between different AI services

**Refactoring Strategy:**
```
services/ai/
├── __init__.py
├── base.py (abstract base class)
├── openai_client.py (OpenAI wrapper)
├── content_generator.py (outline, examples)
├── quiz_generator.py (quiz creation)
├── chat_service.py (chat completions)
└── utils/
    ├── cache.py
    ├── circuit_breaker.py
    └── prompts.py
```

### 3. **frontend/app/onboarding/page.tsx** (605 lines) 🟡 **HIGH**
**Issues:**
- Single large component handling entire onboarding flow
- Complex state management with multiple form steps
- Mixed UI logic and business logic
- Repetitive form handling code

**Refactoring Strategy:**
```
app/onboarding/
├── page.tsx (main page)
├── hooks/
│   ├── use-onboarding-form.ts
│   └── use-step-navigation.ts
├── components/
│   ├── StepIndicator.tsx
│   ├── PersonalInfoStep.tsx
│   ├── LearningStyleStep.tsx
│   ├── PreferencesStep.tsx
│   └── InterestsStep.tsx
└── constants.ts (form options)
```

### 4. **frontend/components/block.tsx** (564 lines) 🟡 **HIGH**
**Issues:**
- Complex component mixing document editing and UI state
- Multiple responsibilities (editing, versioning, messaging)
- Large useEffect blocks with complex dependencies
- Mixed concerns with SWR data fetching

**Refactoring Strategy:**
```
components/block/
├── index.tsx (main component)
├── hooks/
│   ├── use-document.ts
│   ├── use-block-state.ts
│   └── use-content-sync.ts
├── components/
│   ├── BlockEditor.tsx
│   ├── BlockMessages.tsx
│   ├── BlockActions.tsx
│   └── VersionControl.tsx
└── types.ts
```

---

## 🟡 Medium Priority Refactoring Targets

### 5. **frontend/components/toolbar.tsx** (543 lines)
- Multi-purpose toolbar component
- Mixed styling and business logic
- Refactor into modular toolbar system

### 6. **frontend/components/settings/ProfessorSettings.tsx** (542 lines)
- Large settings form component
- Extract individual setting panels
- Separate validation and submission logic

### 7. **frontend/app/(learn)/learn/components/ai-chatbot.tsx** (530 lines)
- Complex chat interface component
- Separate message handling from UI rendering
- Extract chat logic into custom hooks

### 8. **frontend/components/course/StatsSidePanel.tsx** (524 lines)
- Statistics dashboard component
- Break down into individual stat widgets
- Extract data fetching logic

---

## 🐍 Backend Python Files

### 9. **docker-image/src/api/metrics.py** (519 lines) 🟡 **HIGH**
**Issues:**
- Single file handling multiple metric types
- Complex database queries mixed with endpoint logic
- Repetitive metric collection patterns

**Refactoring Strategy:**
```
api/metrics/
├── __init__.py
├── endpoints.py (Flask blueprints)
├── collectors/
│   ├── prometheus.py
│   ├── business.py
│   └── system.py
└── queries/
    ├── user_metrics.py
    ├── course_metrics.py
    └── performance_metrics.py
```

### 10. **docker-image/src/monitoring/distributed_tracing.py** (518 lines)
**Issues:**
- Single class handling multiple tracing concerns
- Complex span management logic
- Mixed serialization and tracing logic

**Refactoring Strategy:**
```
monitoring/tracing/
├── __init__.py
├── tracer.py (main tracer)
├── span.py (span management)
├── context.py (trace context)
├── exporters/
│   ├── jaeger.py
│   └── prometheus.py
└── utils/
    ├── serializers.py
    └── sampling.py
```

### 11. **docker-image/src/services/streaming_personalization.py** (515 lines)
- Streaming personalization service
- Extract recommendation engine
- Separate data processing from API logic

---

## 🟢 Lower Priority Files

### 12. **frontend/components/course/StudentCourseUpload.tsx** (518 lines)
- File upload component
- Extract upload logic into service layer

### 13. **frontend/components/learn-x/LearnSidebar.tsx** (514 lines)
- Navigation sidebar component
- Break into smaller navigation components

---

## 🚀 Recommended Refactoring Order

### Phase 1: Critical Infrastructure (Week 1-2)
1. `frontend/lib/api.ts` - Core API client
2. `docker-image/src/services/ai_service.py` - AI service layer

### Phase 2: User Experience (Week 3-4)
3. `frontend/app/onboarding/page.tsx` - User onboarding flow
4. `frontend/components/block.tsx` - Document editing interface

### Phase 3: Monitoring & Metrics (Week 5)
5. `docker-image/src/api/metrics.py` - Metrics collection
6. `docker-image/src/monitoring/distributed_tracing.py` - Tracing system

### Phase 4: UI Components (Week 6-7)
7. Remaining frontend components in priority order

---

## 🎯 Refactoring Principles to Apply

### 1. **Single Responsibility Principle**
- Each module should have one reason to change
- Separate concerns (API, UI, business logic)

### 2. **Custom Hooks Pattern** (Frontend)
- Extract stateful logic into reusable hooks
- Separate data fetching from UI rendering

### 3. **Service Layer Pattern** (Backend)
- Create dedicated service classes
- Separate business logic from API endpoints

### 4. **Composition over Inheritance**
- Build complex components from simpler ones
- Use dependency injection for services

### 5. **Error Boundary Pattern**
- Implement proper error handling
- Create resilient component trees

---

## 📊 Expected Outcomes

### Size Reduction Targets
- **Average reduction**: 70-80% per file
- **New file count**: ~45-50 files (from 14 large files)
- **Average new file size**: 80-150 lines

### Quality Improvements
- ✅ Better testability
- ✅ Improved maintainability  
- ✅ Enhanced reusability
- ✅ Clearer separation of concerns
- ✅ Better TypeScript/Python typing

### Performance Benefits
- 🚀 Faster bundle loading (frontend)
- 🚀 Better code splitting
- 🚀 Improved development experience
- 🚀 Easier debugging and profiling

---

*Last Updated: Current Analysis*
*Priority: High - Start with Phase 1 files*
*Estimated Effort: 6-7 weeks for complete refactoring* 