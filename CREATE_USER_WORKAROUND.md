# Create User Workaround

## Option 1: Fix the Trigger (Recommended)

1. Go to SQL Editor: https://app.supabase.com/project/torsffahnivnzcnjnxgc/sql/new
2. Run the contents of: `/migration/supabase/fix_user_creation.sql`
3. Try creating user again in dashboard

## Option 2: Create User Without Trigger

1. First, disable the trigger temporarily:
```sql
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
```

2. Create user in dashboard:
- Email: test@example.com
- Password: testpass123
- Metadata: `{"role": "student", "full_name": "Test Student"}`

3. Manually create profile:
```sql
-- Get the user ID first
SELECT id, email FROM auth.users WHERE email = 'test@example.com';

-- Copy the ID and insert profile (replace YOUR_USER_ID)
INSERT INTO user_profiles (id, email, role, full_name)
VALUES (
    'YOUR_USER_ID'::uuid,
    'test@example.com',
    'student',
    'Test Student'
);
```

## Option 3: Use Supabase Client (Easiest)

Create a test script `create_test_user.js`:
```javascript
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  'https://torsffahnivnzcnjnxgc.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InRvcnNmZmFobml2bnpjbmpueGdjIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc0OTEzNzczNywiZXhwIjoyMDY0NzEzNzM3fQ.bORW1lciqmqC8Q4RPtn3UI4MnW-HnKAibsbiSFHZf5Y'
);

async function createTestUser() {
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
    console.error('Error:', error);
  } else {
    console.log('✅ User created:', data.user.email);
    
    // Create profile
    const { error: profileError } = await supabase
      .from('user_profiles')
      .insert({
        id: data.user.id,
        email: data.user.email,
        role: 'student',
        full_name: 'Test Student'
      });
      
    if (profileError) {
      console.log('Profile error (might already exist):', profileError.message);
    } else {
      console.log('✅ Profile created');
    }
  }
}

createTestUser();
```

Run it:
```bash
cd migration/supabase
node create_test_user.js
```

## Quick SQL Check

To verify your setup:
```sql
-- Check if tables exist
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public' 
AND table_name IN ('user_profiles');

-- Check existing users
SELECT id, email FROM auth.users;

-- Check existing profiles
SELECT * FROM user_profiles;
```