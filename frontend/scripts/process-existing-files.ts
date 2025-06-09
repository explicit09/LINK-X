#!/usr/bin/env tsx
/**
 * Script to trigger processing for existing uploaded files
 * Run with: npx tsx scripts/process-existing-files.ts
 */

import { supabase } from '../supabaseconfig';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

async function processExistingFiles() {
  console.log('🔍 Fetching unprocessed files...');
  
  // First, let's see ALL files
  const { data: allFiles, error: allError } = await supabase
    .from('files')
    .select('*')
    .order('created_at', { ascending: false });
    
  console.log(`📊 Total files in database: ${allFiles?.length || 0}`);
  if (allFiles && allFiles.length > 0) {
    console.log('Files overview:');
    allFiles.forEach(f => {
      console.log(`  - ${f.filename}: processed=${f.processed}, status=${f.processing_status}`);
    });
  }
  
  // Get all files that haven't been processed
  // Check both 'processed' field and 'processing_status' field
  const { data: files, error } = await supabase
    .from('files')
    .select('*')
    .or('processed.eq.false,processing_status.neq.completed')
    .order('created_at', { ascending: false });

  if (error) {
    console.error('❌ Error fetching files:', error);
    return;
  }

  console.log(`📋 Found ${files?.length || 0} unprocessed files`);

  if (!files || files.length === 0) {
    console.log('✅ No unprocessed files found');
    return;
  }

  // Get auth token
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) {
    console.error('❌ No auth session found. Please login first.');
    return;
  }

  // Process each file
  for (const file of files) {
    console.log(`\n📄 Processing: ${file.filename} (${file.id})`);
    
    try {
      const response = await fetch(`${API_URL}/api/v2/files/${file.id}/process`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          priority: 'high',
          processing_type: 'full'
        })
      });

      if (response.ok) {
        const result = await response.json();
        console.log(`✅ Queued for processing:`, result.message);
      } else {
        const error = await response.text();
        console.error(`❌ Failed to queue:`, error);
      }
    } catch (error) {
      console.error(`❌ Error processing ${file.filename}:`, error);
    }

    // Small delay between requests
    await new Promise(resolve => setTimeout(resolve, 500));
  }

  console.log('\n✨ Processing requests completed');
  
  // Check processing queue status
  console.log('\n📊 Checking processing queue...');
  const { data: queue, error: queueError } = await supabase
    .from('processing_queue')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(10);

  if (queue && queue.length > 0) {
    console.log('\nProcessing Queue Status:');
    queue.forEach(item => {
      console.log(`- File ${item.file_id}: ${item.status} (Priority: ${item.priority})`);
    });
  }
}

// Run the script
processExistingFiles().catch(console.error);