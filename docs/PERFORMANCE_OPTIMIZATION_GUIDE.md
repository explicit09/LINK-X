# Performance Optimization Guide for LINK-X

## Current Performance Issues

### 1. Database Query Overload
- **Problem**: 15-20+ separate queries on dashboard load
- **Impact**: 2-5 second initial load time
- **Solution**: Implement single RPC function for dashboard data

### 2. Aggressive Polling
- **Problem**: Polling every 5 seconds for file processing
- **Impact**: 12 queries/minute per user
- **Solution**: Implement exponential backoff and smart polling

### 3. React Performance Issues
- **Problem**: No memoization, expensive calculations on every render
- **Impact**: UI feels sluggish, especially on slower devices
- **Solution**: Implement React.memo, useMemo, and useCallback properly

## Immediate Fixes (High Priority)

### 1. Add Database Indexes
```bash
# Run the provided SQL script in Supabase
psql -h your-supabase-host -U postgres -d postgres < add_performance_indexes.sql
```

### 2. Replace Dashboard Data Fetching
```typescript
// OLD: Multiple hooks with separate queries
const { data: courses } = useCourses();
const { data: stats } = useUserStats();
const { data: todos } = useTodos();

// NEW: Single optimized call
const { data } = useDashboardData();
```

### 3. Fix Polling Strategy
```typescript
// Change polling interval from 5s to exponential backoff
const POLL_INTERVALS = [5000, 10000, 20000, 30000, 60000]; // 5s, 10s, 20s, 30s, 1m

let pollCount = 0;
const pollInterval = POLL_INTERVALS[Math.min(pollCount++, POLL_INTERVALS.length - 1)];
```

### 4. Remove Console Logs in Production
```typescript
// Add to your build process
if (process.env.NODE_ENV === 'production') {
  console.log = () => {};
  console.debug = () => {};
}
```

## React Optimizations

### 1. Memoize Expensive Calculations
```typescript
// Before
const transformedModules = transformModulesData(backendModules);

// After
const transformedModules = useMemo(
  () => transformModulesData(backendModules),
  [backendModules]
);
```

### 2. Fix useCallback Dependencies
```typescript
// Before - recreates function every render
const fetchData = useCallback(async () => {
  // ...
}, []); // Empty deps but uses external values

// After - stable reference
const fetchData = useCallback(async () => {
  // ...
}, [/* actual dependencies */]);
```

### 3. Implement Component Memoization
```typescript
// Memoize child components
export const ModuleCard = React.memo(({ module, onExpand }) => {
  // Component code
}, (prevProps, nextProps) => {
  return prevProps.module.id === nextProps.module.id &&
         prevProps.module.progress === nextProps.module.progress;
});
```

## Network Optimizations

### 1. Implement Request Deduplication
```typescript
const requestCache = new Map();

async function deduplicatedFetch(key: string, fetcher: () => Promise<any>) {
  if (requestCache.has(key)) {
    return requestCache.get(key);
  }
  
  const promise = fetcher();
  requestCache.set(key, promise);
  
  try {
    const result = await promise;
    requestCache.delete(key);
    return result;
  } catch (error) {
    requestCache.delete(key);
    throw error;
  }
}
```

### 2. Add Response Caching
```typescript
// Use React Query or SWR for automatic caching
import { useQuery } from '@tanstack/react-query';

function useDashboardData() {
  return useQuery({
    queryKey: ['dashboard'],
    queryFn: dashboardOperations.getDashboardData,
    staleTime: 5 * 60 * 1000, // 5 minutes
    cacheTime: 10 * 60 * 1000, // 10 minutes
  });
}
```

## Supabase Optimizations

### 1. Use Partial Selects
```typescript
// Don't fetch everything
.select('*') // BAD

// Only fetch what you need
.select('id, title, progress') // GOOD
```

### 2. Implement Pagination
```typescript
const PAGE_SIZE = 20;

const { data, count } = await supabase
  .from('files')
  .select('*', { count: 'exact' })
  .range((page - 1) * PAGE_SIZE, page * PAGE_SIZE - 1);
```

### 3. Use RLS Wisely
- Ensure RLS policies use indexed columns
- Avoid complex joins in RLS policies
- Consider using security definer functions for complex queries

## Monitoring Performance

### 1. Add Performance Metrics
```typescript
// Track query performance
const startTime = performance.now();
const data = await fetchData();
const duration = performance.now() - startTime;

if (duration > 1000) {
  console.warn(`Slow query detected: ${duration}ms`);
}
```

### 2. Use React DevTools Profiler
- Enable "Highlight updates when components render"
- Use Profiler tab to identify slow components
- Look for unnecessary re-renders

### 3. Monitor Supabase Dashboard
- Check slow query logs
- Monitor database connections
- Review RLS policy performance

## Implementation Priority

1. **Week 1**: 
   - Add database indexes
   - Fix polling strategy
   - Remove console logs

2. **Week 2**:
   - Implement dashboard RPC function
   - Add React memoization
   - Fix useCallback dependencies

3. **Week 3**:
   - Add React Query/SWR
   - Implement request deduplication
   - Optimize component structure

## Expected Results

- Initial load time: 5s → 1.5s (70% improvement)
- Time to interactive: 3s → 1s (66% improvement)
- Database queries: 20 → 3-5 (75% reduction)
- Network bandwidth: 50% reduction

## Testing Performance

```bash
# Run Lighthouse CI
npm install -g @lhci/cli
lhci autorun

# Use Chrome DevTools Performance tab
# Look for:
# - Long tasks (>50ms)
# - Layout thrashing
# - Excessive re-renders
```

Remember: Performance is a feature. Users expect fast, responsive applications, especially in educational contexts where focus and flow are crucial.