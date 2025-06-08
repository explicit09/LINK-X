import { supabase } from '@/lib/supabase';

/**
 * Ensures the course-files storage bucket exists
 * This is a one-time setup that should be run when the app initializes
 */
export async function ensureStorageBucket() {
  try {
    // Check if bucket exists by trying to list files
    const { error } = await supabase.storage
      .from('course-files')
      .list('', { limit: 1 });

    if (error && error.message.includes('Bucket not found')) {
      console.log('📦 Course-files bucket not found. Please create it manually in Supabase Dashboard.');
      console.log('Instructions:');
      console.log('1. Go to Storage section in Supabase Dashboard');
      console.log('2. Click "New bucket"');
      console.log('3. Name: course-files');
      console.log('4. Public: Yes (enabled)');
      console.log('5. File size limit: 50 MB');
      
      // Show a user-friendly error
      if (typeof window !== 'undefined') {
        alert(
          'Storage setup required!\n\n' +
          'The file upload bucket needs to be created in Supabase.\n' +
          'Please ask your administrator to create the "course-files" bucket.\n\n' +
          'See console for detailed instructions.'
        );
      }
      
      return false;
    }

    // Bucket exists
    return true;
  } catch (err) {
    console.error('Error checking storage bucket:', err);
    return false;
  }
}

/**
 * Get storage bucket status
 */
export async function getStorageBucketStatus() {
  try {
    const { data, error } = await supabase.storage
      .from('course-files')
      .list('', { limit: 1 });

    if (error) {
      return {
        exists: false,
        error: error.message,
        instructions: 'Create "course-files" bucket in Supabase Dashboard (Storage section)'
      };
    }

    return {
      exists: true,
      error: null,
      instructions: null
    };
  } catch (err) {
    return {
      exists: false,
      error: 'Failed to check bucket status',
      instructions: 'Check Supabase connection'
    };
  }
}