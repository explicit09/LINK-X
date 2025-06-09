#!/usr/bin/env tsx
/**
 * Script to clean mock chunks and reprocess files
 * Run with: npx tsx scripts/reprocess-files.ts
 */

import { supabase } from '../supabaseconfig';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

async function reprocessFiles() {
  console.log('🧹 Cleaning up mock chunks and reprocessing files...\n');
  
  // Get auth session
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) {
    console.error('❌ Not authenticated. Please login first.');
    return;
  }

  // 1. Find files with mock chunks
  console.log('🔍 Finding files with mock chunks...');
  const { data: mockChunks, error: chunkError } = await supabase
    .from('file_chunks')
    .select('file_id, content')
    .like('content', 'Mock content%')
    .limit(100);

  if (chunkError) {
    console.error('❌ Error finding mock chunks:', chunkError);
    return;
  }

  // Get unique file IDs
  const fileIds = [...new Set(mockChunks?.map(c => c.file_id) || [])];
  console.log(`📋 Found ${fileIds.length} files with mock chunks`);

  if (fileIds.length === 0) {
    console.log('✅ No mock chunks found!');
    return;
  }

  // 2. Delete mock chunks
  console.log('\n🗑️  Deleting mock chunks...');
  const { error: deleteError } = await supabase
    .from('file_chunks')
    .delete()
    .in('file_id', fileIds);

  if (deleteError) {
    console.error('❌ Error deleting chunks:', deleteError);
    return;
  }
  console.log('✅ Mock chunks deleted');

  // 3. Reset file status
  console.log('\n🔄 Resetting file status...');
  const { error: resetError } = await supabase
    .from('files')
    .update({ 
      processed: false, 
      processing_status: 'pending' 
    })
    .in('id', fileIds);

  if (resetError) {
    console.error('❌ Error resetting files:', resetError);
    return;
  }

  // 4. Clear processing queue for these files
  console.log('\n🧹 Clearing old processing queue entries...');
  const { error: queueError } = await supabase
    .from('processing_queue')
    .delete()
    .in('file_id', fileIds);

  if (queueError) {
    console.log('⚠️  Could not clear queue (might not exist)');
  }

  // 5. Reprocess each file
  console.log('\n🚀 Reprocessing files...');
  const token = session.access_token;
  
  for (const fileId of fileIds) {
    console.log(`\n📄 Processing file: ${fileId}`);
    
    try {
      const response = await fetch(`${API_URL}/api/v2/files/${fileId}/process`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          priority: 'high',
          processing_type: 'full'
        })
      });

      if (response.ok) {
        const result = await response.json();
        console.log(`✅ Queued for processing:`, result.message || 'Success');
      } else {
        const error = await response.text();
        console.error(`❌ Failed to queue:`, error);
      }
    } catch (error) {
      console.error(`❌ Error processing ${fileId}:`, error);
    }

    // Small delay between requests
    await new Promise(resolve => setTimeout(resolve, 500));
  }

  console.log('\n✨ Reprocessing complete!');
  console.log('\n📊 Check processing status in a few moments...');
  
  // Wait a bit then check status
  setTimeout(async () => {
    const { data: queue } = await supabase
      .from('processing_queue')
      .select('*')
      .in('file_id', fileIds)
      .order('created_at', { ascending: false });

    if (queue && queue.length > 0) {
      console.log('\nProcessing Queue Status:');
      queue.forEach(item => {
        console.log(`- File ${item.file_id}: ${item.status} (Priority: ${item.priority})`);
      });
    }
  }, 5000);
}

// Run the script
reprocessFiles().catch(console.error);