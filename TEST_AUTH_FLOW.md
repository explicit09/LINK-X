# Test Authentication Flow

## ✅ Users Created Successfully!
- Student: test@example.com / testpass123
- Instructor: instructor@example.com / testpass123

## 🚀 Let's Test Everything!

### 1. Start the Backend (if not already running)
```bash
cd /Users/tadies/Documents/GitHub/LINK-X/docker-image
python src/app.py
```

You should see:
```
Supabase initialized successfully
* Running on http://127.0.0.1:8080
```

### 2. Start the Frontend
In a new terminal:
```bash
cd /Users/tadies/Documents/GitHub/LINK-X/frontend
npm run dev
```

Should start on http://localhost:3000

### 3. Test Login Flow

#### Test Student Login:
1. Go to: http://localhost:3000/login
2. Enter:
   - Email: test@example.com
   - Password: testpass123
3. Should redirect to: `/my-courses`

#### Test Instructor Login:
1. Logout first (if logged in)
2. Login with:
   - Email: instructor@example.com
   - Password: testpass123
3. Should redirect to: `/dashboard`

### 4. Verify Auth is Working

Check these indicators:
- ✅ No Firebase errors in console
- ✅ Login redirects to correct page based on role
- ✅ Auth persists on page refresh
- ✅ Can access protected routes
- ✅ Logout works correctly

### 5. Check API Authentication

After logging in, open browser DevTools:
1. Go to Network tab
2. Make any action that calls the API
3. Look for requests to `localhost:8080`
4. Check headers - should have `Authorization: Bearer <token>`

## 🎉 Success Checklist

- [ ] Backend shows "Supabase initialized successfully"
- [ ] Frontend login page loads
- [ ] Can login as student
- [ ] Can login as instructor
- [ ] Redirects work based on role
- [ ] No Firebase errors
- [ ] API calls include Supabase tokens
- [ ] Logout works

## Common Issues & Fixes

### CORS Error
Make sure backend is running on port 8080

### "Network Error" on login
- Check backend is running
- Check console for specific errors
- Verify NEXT_PUBLIC_API_URL=http://localhost:8080

### Login succeeds but immediately logs out
- Check browser console for token errors
- Make sure localStorage is not blocked

### "User not found" after login
The user profile might not have been created. Check:
```sql
-- In Supabase SQL Editor
SELECT * FROM user_profiles WHERE email = 'test@example.com';
```

## Next Steps

Once authentication is working:
1. Test creating a course (as instructor)
2. Test enrolling in a course (as student)
3. Test file uploads
4. Test AI chat features

You've successfully migrated from Firebase to Supabase! 🎉