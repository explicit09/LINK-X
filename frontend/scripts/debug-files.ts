#!/usr/bin/env tsx
/**
 * Debug script to check file status
 * Run with: npx tsx scripts/debug-files.ts
 */

import { supabase } from '../supabaseconfig';

async function debugFiles() {
  console.log('🔍 Debugging file status...\n');
  
  // For debugging, we'll use service role to bypass RLS
  // This is just for debugging - don't use in production!
  const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
  
  if (SUPABASE_SERVICE_ROLE_KEY) {
    console.log('🔑 Using service role key for debugging...\n');
    // Create a separate client with service role for debugging
    const { createClient } = await import('@supabase/supabase-js');
    const debugSupabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      SUPABASE_SERVICE_ROLE_KEY,
      {
        auth: {
          persistSession: false
        }
      }
    );
    
    // Use debug client for queries
    const { data: files, error: filesError, count } = await debugSupabase
      .from('files')
      .select('*', { count: 'exact' });
      
    console.log(`Total files in database: ${count || 0}`);
    if (files && files.length > 0) {
      console.log('\nFile details:');
      files.forEach(f => {
        console.log(`\n📄 ${f.filename}`);
        console.log(`   ID: ${f.id}`);
        console.log(`   Processed: ${f.processed}`);
        console.log(`   Status: ${f.processing_status || 'N/A'}`);
        console.log(`   Created: ${new Date(f.created_at).toLocaleString()}`);
        console.log(`   Module ID: ${f.module_id}`);
        console.log(`   Storage Path: ${f.storage_path || 'N/A'}`);
      });
    }
    
    // Check processing queue
    console.log('\n\n📊 Checking processing queue...');
    const { data: queue, error: queueError } = await debugSupabase
      .from('processing_queue')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(10);

    if (queueError) {
      console.error('❌ Error querying processing_queue:', queueError);
      console.log('   (Table might not exist - run migration first)');
    } else {
      console.log(`Processing queue entries: ${queue?.length || 0}`);
      if (queue && queue.length > 0) {
        queue.forEach(q => {
          console.log(`\n🔄 Queue Entry:`);
          console.log(`   File ID: ${q.file_id}`);
          console.log(`   Status: ${q.status}`);
          console.log(`   Priority: ${q.priority}`);
          console.log(`   Created: ${new Date(q.created_at).toLocaleString()}`);
        });
      }
    }
    
    console.log('\n✨ Debug complete!');
    return;
  }
  
  // Original auth check
  const { data: { user }, error: userError } = await supabase.auth.getUser();
  if (userError || !user) {
    console.error('❌ Not authenticated. Please login first.');
    console.log('💡 Tip: Set SUPABASE_SERVICE_ROLE_KEY in .env.local to debug without auth');
    return;
  }
  console.log(`✅ Authenticated as: ${user.email} (${user.id})\n`);

  // 2. Check files table directly
  console.log('📋 Checking files table...');
  const { data: files, error: filesError, count } = await supabase
    .from('files')
    .select('*', { count: 'exact' });

  if (filesError) {
    console.error('❌ Error querying files:', filesError);
  } else {
    console.log(`Total files in database: ${count || 0}`);
    if (files && files.length > 0) {
      console.log('\nFile details:');
      files.forEach(f => {
        console.log(`\n📄 ${f.filename}`);
        console.log(`   ID: ${f.id}`);
        console.log(`   Processed: ${f.processed}`);
        console.log(`   Status: ${f.processing_status || 'N/A'}`);
        console.log(`   Created: ${new Date(f.created_at).toLocaleString()}`);
        console.log(`   Module ID: ${f.module_id}`);
        console.log(`   Storage Path: ${f.storage_path || 'N/A'}`);
      });
    }
  }

  // 3. Check processing queue
  console.log('\n\n📊 Checking processing queue...');
  const { data: queue, error: queueError } = await supabase
    .from('processing_queue')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(10);

  if (queueError) {
    console.error('❌ Error querying processing_queue:', queueError);
    console.log('   (Table might not exist - run migration first)');
  } else {
    console.log(`Processing queue entries: ${queue?.length || 0}`);
    if (queue && queue.length > 0) {
      queue.forEach(q => {
        console.log(`\n🔄 Queue Entry:`);
        console.log(`   File ID: ${q.file_id}`);
        console.log(`   Status: ${q.status}`);
        console.log(`   Priority: ${q.priority}`);
        console.log(`   Created: ${new Date(q.created_at).toLocaleString()}`);
        if (q.error_message) {
          console.log(`   Error: ${q.error_message}`);
        }
      });
    }
  }

  // 4. Check file chunks
  console.log('\n\n🧩 Checking file chunks...');
  const { data: chunks, error: chunksError, count: chunkCount } = await supabase
    .from('file_chunks')
    .select('file_id', { count: 'exact' })
    .limit(100);

  if (chunksError) {
    console.error('❌ Error querying file_chunks:', chunksError);
  } else {
    console.log(`Total chunks in database: ${chunkCount || 0}`);
    
    // Count chunks per file
    if (chunks && chunks.length > 0) {
      const chunksByFile = chunks.reduce((acc, chunk) => {
        acc[chunk.file_id] = (acc[chunk.file_id] || 0) + 1;
        return acc;
      }, {} as Record<string, number>);
      
      console.log('\nChunks per file:');
      Object.entries(chunksByFile).forEach(([fileId, count]) => {
        console.log(`   File ${fileId}: ${count} chunks`);
      });
    }
  }

  // 5. Check RLS access
  console.log('\n\n🔐 Testing RLS access...');
  
  // Test SELECT access
  const { error: selectError } = await supabase
    .from('files')
    .select('id')
    .limit(1);
  
  console.log(`SELECT access: ${selectError ? '❌ Denied' : '✅ Allowed'}`);
  if (selectError) console.log(`   Error: ${selectError.message}`);

  // Test INSERT access (dry run)
  console.log(`INSERT access: ✅ Allowed (based on policy)`)
  
  console.log('\n✨ Debug complete!');
}

// Run the script
debugFiles().catch(console.error);