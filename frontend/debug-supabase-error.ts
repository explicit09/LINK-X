// Debug script to get detailed error information
import { supabase } from '@/lib/supabase';

export async function debugSupabaseError() {
  console.log('🔍 Debugging Supabase study_sessions error...\n');
  
  try {
    // Check authentication first
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    if (authError) {
      console.error('❌ Auth error:', authError);
      return;
    }
    
    if (!user) {
      console.error('❌ No authenticated user');
      return;
    }
    
    console.log('✅ Authenticated as:', user.email, '(ID:', user.id, ')\n');
    
    // Try a simple query first
    console.log('📊 Testing basic study_sessions query...');
    const { data, error, status, statusText } = await supabase
      .from('study_sessions')
      .select('id')
      .limit(1);
    
    console.log('Response status:', status);
    console.log('Response statusText:', statusText);
    
    if (error) {
      console.error('\n❌ Error details:');
      console.error('Code:', error.code);
      console.error('Message:', error.message);
      console.error('Details:', error.details);
      console.error('Hint:', error.hint);
      console.error('Full error object:', JSON.stringify(error, null, 2));
    } else {
      console.log('✅ Query successful!');
      console.log('Data:', data);
    }
    
    // Check if table exists
    console.log('\n🔍 Checking if study_sessions table exists...');
    const { data: tables, error: tablesError } = await supabase
      .from('information_schema.tables')
      .select('table_name')
      .eq('table_schema', 'public')
      .like('table_name', '%study%');
    
    if (tablesError) {
      console.error('❌ Error checking tables:', tablesError);
    } else {
      console.log('📋 Tables with "study" in name:', tables?.map(t => t.table_name));
    }
    
  } catch (err) {
    console.error('❌ Unexpected error:', err);
  }
}

// Auto-run when imported
debugSupabaseError();