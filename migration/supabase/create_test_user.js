const { createClient } = require('@supabase/supabase-js');

// Use service role key for admin operations
const supabase = createClient(
  'https://torsffahnivnzcnjnxgc.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InRvcnNmZmFobml2bnpjbmpueGdjIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc0OTEzNzczNywiZXhwIjoyMDY0NzEzNzM3fQ.bORW1lciqmqC8Q4RPtn3UI4MnW-HnKAibsbiSFHZf5Y'
);

async function createTestUser() {
  console.log('Creating test user...\n');

  try {
    // First, check if user already exists
    const { data: existingUsers } = await supabase.auth.admin.listUsers();
    const exists = existingUsers?.users?.some(u => u.email === 'test@example.com');
    
    if (exists) {
      console.log('⚠️  User test@example.com already exists');
      return;
    }

    // Create auth user
    const { data, error } = await supabase.auth.admin.createUser({
      email: 'test@example.com',
      password: 'testpass123',
      email_confirm: true,
      user_metadata: {
        role: 'student',
        full_name: 'Test Student'
      }
    });

    if (error) {
      console.error('❌ Error creating user:', error.message);
      return;
    }

    console.log('✅ User created successfully!');
    console.log('   Email:', data.user.email);
    console.log('   ID:', data.user.id);
    
    // Try to create profile (might be created by trigger)
    const { error: profileError } = await supabase
      .from('user_profiles')
      .insert({
        id: data.user.id,
        email: data.user.email,
        role: 'student',
        full_name: 'Test Student'
      });
      
    if (profileError && !profileError.message.includes('duplicate')) {
      console.log('⚠️  Profile creation issue:', profileError.message);
    } else {
      console.log('✅ User profile created');
    }

    console.log('\n🎉 Test user ready!');
    console.log('   Email: test@example.com');
    console.log('   Password: testpass123');
    console.log('   Role: student');

  } catch (err) {
    console.error('❌ Unexpected error:', err);
  }
}

// Create instructor too
async function createInstructorUser() {
  console.log('\nCreating instructor user...\n');

  const { data, error } = await supabase.auth.admin.createUser({
    email: 'instructor@example.com',
    password: 'testpass123',
    email_confirm: true,
    user_metadata: {
      role: 'instructor',
      full_name: 'Test Instructor'
    }
  });

  if (error && !error.message.includes('already been registered')) {
    console.error('❌ Error:', error.message);
  } else if (data) {
    console.log('✅ Instructor created');
    
    // Create profile
    await supabase.from('user_profiles').insert({
      id: data.user.id,
      email: data.user.email,
      role: 'instructor',
      full_name: 'Test Instructor'
    });
  }
}

// Run both
async function main() {
  await createTestUser();
  await createInstructorUser();
  
  console.log('\n📝 You can now login with either:');
  console.log('   Student: test@example.com / testpass123');
  console.log('   Instructor: instructor@example.com / testpass123');
}

main();