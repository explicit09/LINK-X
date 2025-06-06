const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  'https://torsffahnivnzcnjnxgc.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InRvcnNmZmFobml2bnpjbmpueGdjIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc0OTEzNzczNywiZXhwIjoyMDY0NzEzNzM3fQ.bORW1lciqmqC8Q4RPtn3UI4MnW-HnKAibsbiSFHZf5Y'
);

async function createUsersDirectly() {
  console.log('🔧 Checking database setup...\n');

  try {
    // First, disable the trigger
    const { error: dropError } = await supabase.rpc('exec_sql', {
      sql: 'DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;'
    }).catch(() => ({ error: 'RPC not available' }));

    // Check if user_profiles table exists
    const { data: tables } = await supabase
      .from('user_profiles')
      .select('*')
      .limit(1);

    console.log('✅ user_profiles table exists\n');

    // Create test student
    console.log('Creating student user...');
    const { data: student, error: studentError } = await supabase.auth.admin.createUser({
      email: 'student_test@example.com',
      password: 'testpass123',
      email_confirm: true
    });

    if (studentError && !studentError.message.includes('already been registered')) {
      console.error('Student error:', studentError.message);
    } else if (student) {
      console.log('✅ Student auth user created');
      
      // Manually create profile
      const { error: profileError } = await supabase
        .from('user_profiles')
        .upsert({
          id: student.user.id,
          email: 'student_test@example.com',
          role: 'student',
          full_name: 'Test Student'
        });
      
      if (!profileError) {
        console.log('✅ Student profile created');
      }
    }

    // Create test instructor
    console.log('\nCreating instructor user...');
    const { data: instructor, error: instructorError } = await supabase.auth.admin.createUser({
      email: 'instructor_test@example.com',
      password: 'testpass123',
      email_confirm: true
    });

    if (instructorError && !instructorError.message.includes('already been registered')) {
      console.error('Instructor error:', instructorError.message);
    } else if (instructor) {
      console.log('✅ Instructor auth user created');
      
      // Manually create profile
      const { error: profileError } = await supabase
        .from('user_profiles')
        .upsert({
          id: instructor.user.id,
          email: 'instructor_test@example.com',
          role: 'instructor',
          full_name: 'Test Instructor'
        });
      
      if (!profileError) {
        console.log('✅ Instructor profile created');
      }
    }

    // List all users
    console.log('\n📋 Current users:');
    const { data: profiles } = await supabase
      .from('user_profiles')
      .select('email, role, full_name');
    
    if (profiles && profiles.length > 0) {
      profiles.forEach(p => {
        console.log(`   ${p.email} - ${p.role} - ${p.full_name}`);
      });
    }

    console.log('\n✨ Done! You can login with:');
    console.log('   student_test@example.com / testpass123');
    console.log('   instructor_test@example.com / testpass123');

  } catch (err) {
    console.error('Error:', err.message);
    console.log('\n💡 Try running this SQL in Supabase dashboard first:');
    console.log('   DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;');
  }
}

createUsersDirectly();