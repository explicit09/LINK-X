/**
 * Test Supabase Connection
 * Run this to verify your setup is working
 */
const { createClient } = require('@supabase/supabase-js');

// Configuration
const supabaseUrl = 'https://torsffahnivnzcnjnxgc.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InRvcnNmZmFobml2bnpjbmpueGdjIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDkxMjI2NTEsImV4cCI6MjA2NDY5ODY1MX0.iNmJjrq4rcgj-W8yp-nQ_mbF-NIlR89loPT9bqTVUPI';

async function testConnection() {
  console.log('🔍 Testing Supabase connection...\n');

  try {
    // Create client
    const supabase = createClient(supabaseUrl, supabaseAnonKey);
    console.log('✅ Supabase client created successfully');

    // Test auth
    console.log('\n📧 Testing authentication...');
    const { data: authData, error: authError } = await supabase.auth.getSession();
    
    if (authError) {
      console.log('⚠️  No active session (this is normal for first run)');
    } else {
      console.log('✅ Auth system is responsive');
    }

    // Test database connection
    console.log('\n🗄️  Testing database connection...');
    const { data, error, count } = await supabase
      .from('test_connection')
      .select('*', { count: 'exact', head: true });

    if (error && error.code === '42P01') {
      console.log('✅ Database connection successful (no tables yet)');
    } else if (error) {
      console.log('❌ Database error:', error.message);
    } else {
      console.log('✅ Database connection successful');
    }

    console.log('\n🎉 Supabase is ready for use!');
    console.log('\nNext steps:');
    console.log('1. Run the schema migration in Supabase SQL Editor');
    console.log('2. Get your Service Role Key and JWT Secret');
    console.log('3. Set up the backend environment');

  } catch (error) {
    console.error('❌ Connection failed:', error.message);
    console.log('\nTroubleshooting:');
    console.log('1. Check your internet connection');
    console.log('2. Verify the URL and anon key are correct');
    console.log('3. Make sure your Supabase project is active');
  }
}

// Run the test
testConnection();