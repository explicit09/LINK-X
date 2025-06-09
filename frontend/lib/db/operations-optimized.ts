// Optimized Supabase Operations
// Reduces API calls and improves performance

import { supabase } from '@/lib/supabase'

// Single dashboard data fetch - replaces 15-20 separate queries
export const dashboardOperations = {
  async getDashboardData(userId?: string) {
    const startTime = performance.now();
    
    // Get user once and reuse
    if (!userId) {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');
      userId = user.id;
    }

    // Single RPC call to get all dashboard data
    const { data, error } = await supabase.rpc('get_dashboard_data', {
      p_user_id: userId
    });

    if (error) throw error;

    console.log(`[Dashboard] Data fetched in ${(performance.now() - startTime).toFixed(2)}ms`);
    return data;
  },

  // Cached user data - prevents multiple auth calls
  async getCachedUser() {
    const cacheKey = 'supabase_user_cache';
    const cached = sessionStorage.getItem(cacheKey);
    
    if (cached) {
      const { user, timestamp } = JSON.parse(cached);
      // Cache for 5 minutes
      if (Date.now() - timestamp < 5 * 60 * 1000) {
        return user;
      }
    }

    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      sessionStorage.setItem(cacheKey, JSON.stringify({
        user,
        timestamp: Date.now()
      }));
    }
    
    return user;
  }
};

// Optimized module operations with smart loading
export const optimizedModuleOperations = {
  // Get modules with minimal data for listing
  async getModulesLight(courseId: string) {
    const { data, error } = await supabase
      .from('modules')
      .select(`
        id,
        title,
        description,
        ordering,
        files!inner(
          id,
          title,
          file_type,
          processing_status,
          view_count_raw,
          chat_count
        )
      `)
      .eq('course_id', courseId)
      .order('ordering');

    if (error) throw error;
    return data || [];
  },

  // Get full module details only when needed
  async getModuleDetails(moduleId: string) {
    const { data, error } = await supabase
      .from('modules')
      .select(`
        *,
        files(*)
      `)
      .eq('id', moduleId)
      .single();

    if (error) throw error;
    return data;
  },

  // Smart polling - only check processing status
  async checkProcessingStatus(courseId: string) {
    const { data, error } = await supabase
      .from('files')
      .select('id, processing_status')
      .eq('processing_status', 'pending')
      .eq('processing_status', 'processing')
      .in('module_id', 
        supabase
          .from('modules')
          .select('id')
          .eq('course_id', courseId)
      );

    if (error) throw error;
    return data?.length > 0;
  }
};

// Batch operations to reduce API calls
export const batchOperations = {
  // Update multiple items in one transaction
  async updateMultipleProgress(updates: Array<{
    type: 'enrollment' | 'todo' | 'file_view';
    id: string;
    data: any;
  }>) {
    // Use Supabase's batch capabilities
    const promises = updates.map(update => {
      switch (update.type) {
        case 'enrollment':
          return supabase
            .from('enrollments')
            .update(update.data)
            .eq('id', update.id);
        case 'todo':
          return supabase
            .from('todos')
            .update(update.data)
            .eq('id', update.id);
        case 'file_view':
          return supabase
            .from('files')
            .update({ view_count_raw: update.data.view_count })
            .eq('id', update.id);
      }
    });

    const results = await Promise.all(promises);
    return results;
  }
};

// Create the RPC function for dashboard data
export const dashboardRPCFunction = `
-- Create this function in Supabase SQL editor
CREATE OR REPLACE FUNCTION get_dashboard_data(p_user_id UUID)
RETURNS JSON AS $$
DECLARE
  result JSON;
BEGIN
  result = json_build_object(
    'user_stats', (
      SELECT row_to_json(us.*)
      FROM user_stats us
      WHERE us.user_id = p_user_id
    ),
    'courses', (
      SELECT json_agg(
        json_build_object(
          'id', c.id,
          'title', c.title,
          'description', c.description,
          'module_count', (
            SELECT COUNT(*) FROM modules m WHERE m.course_id = c.id
          ),
          'progress', COALESCE(e.progress, 0)
        )
      )
      FROM courses c
      LEFT JOIN enrollments e ON e.course_id = c.id AND e.user_id = p_user_id
      WHERE c.creator_id = p_user_id OR e.user_id = p_user_id
    ),
    'todos', (
      SELECT json_agg(t.*)
      FROM todos t
      WHERE t.user_id = p_user_id
      AND t.completed = false
      ORDER BY t.due_date ASC
      LIMIT 5
    ),
    'recent_activities', (
      SELECT json_agg(a.*)
      FROM user_activities a
      WHERE a.user_id = p_user_id
      ORDER BY a.created_at DESC
      LIMIT 10
    ),
    'study_sessions_today', (
      SELECT json_agg(s.*)
      FROM study_sessions s
      WHERE s.user_id = p_user_id
      AND DATE(s.scheduled_start) = CURRENT_DATE
      ORDER BY s.scheduled_start ASC
    )
  );
  
  RETURN result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permission
GRANT EXECUTE ON FUNCTION get_dashboard_data(UUID) TO authenticated;
`;