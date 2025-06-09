// Test script to verify the frontend fixes
// Run this in the browser console to check if the errors are resolved

async function testSupabaseQueries() {
  console.log('Testing Supabase queries...');
  
  try {
    // Import Supabase from the frontend
    const { supabase } = await import('/lib/supabase.js');
    
    // Get current user
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      console.log('❌ No authenticated user');
      return;
    }
    
    console.log('✅ User authenticated:', user.id);
    
    // Test study_sessions query
    console.log('\nTesting study_sessions table...');
    const { data: sessions, error: sessionsError } = await supabase
      .from('study_sessions')
      .select('id, title, scheduled_start, scheduled_end, actual_duration_minutes, status')
      .eq('user_id', user.id)
      .limit(5);
      
    if (sessionsError) {
      console.error('❌ study_sessions error:', sessionsError);
    } else {
      console.log('✅ study_sessions query successful:', sessions?.length || 0, 'records');
    }
    
    // Test user_stats query
    console.log('\nTesting user_stats table...');
    const { data: stats, error: statsError } = await supabase
      .from('user_stats')
      .select('total_xp, weekly_xp, daily_streak')
      .eq('user_id', user.id)
      .single();
      
    if (statsError) {
      console.error('❌ user_stats error:', statsError);
    } else {
      console.log('✅ user_stats query successful:', stats);
    }
    
    // Test user_activities query
    console.log('\nTesting user_activities table...');
    const { data: activities, error: activitiesError } = await supabase
      .from('user_activities')
      .select('id, activity_type, xp_earned, created_at')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .limit(5);
      
    if (activitiesError) {
      console.error('❌ user_activities error:', activitiesError);
    } else {
      console.log('✅ user_activities query successful:', activities?.length || 0, 'records');
    }
    
    console.log('\n✅ All tests completed!');
    
  } catch (error) {
    console.error('❌ Test failed:', error);
  }
}

// Run the test
testSupabaseQueries();