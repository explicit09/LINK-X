# Database Reset Guide

This guide explains how to reset the database content while preserving the table structure.

## 🛠️ Available Scripts

### 1. Interactive Reset (Recommended)
```bash
./reset_db.sh
```
- Prompts for confirmation before proceeding
- Shows detailed warnings about what will be deleted
- Safe for manual operations

### 2. Force Reset (Automated)
```bash
./reset_db.sh --force
# or
./reset_db.sh -f
```
- No confirmation prompts
- Suitable for automated scripts or CI/CD
- Use with caution

### 3. Direct Python Scripts
```bash
# Interactive version
cd docker-image/src && python reset_db_content.py

# Force version
cd docker-image/src && python reset_db_content_force.py
```

## ⚠️ What Gets Deleted

The reset operation will **permanently delete ALL data** from the following tables:

### User Data
- All user accounts and profiles (students, instructors, admins)
- User roles and permissions
- Authentication data

### Course Content
- All courses and modules
- All uploaded files and content
- Course access codes
- Course reports

### Student Data
- Student enrollments
- Personalized files and content
- Chat histories and messages
- Onboarding data

### Additional Data
- Market data
- News data
- Migration history (for fresh start)

## ✅ What Gets Preserved

- **Database structure** (all tables, columns, constraints)
- **Indexes and relationships**
- **Data types and constraints**
- **Stored procedures/functions** (if any)

## 🔄 After Reset

After running the reset:

1. **All tables are empty** but structure is intact
2. **Sequences are reset** to start from 1
3. **You can immediately start using the application** 
4. **New user registrations will work normally**
5. **Firebase authentication will create new user records**

## 🚀 Typical Workflow

```bash
# 1. Reset the database
./reset_db.sh --force

# 2. Test Google authentication
# Your new Firebase config is already in place!

# 3. Register a new user via the frontend
# Navigate to /register and test Google signup

# 4. Create some test courses/content
```

## 📋 Environment Requirements

- Python 3.x with required packages:
  - `psycopg2` (for PostgreSQL connection)
  - `python-dotenv` (for environment variables)
- Access to the PostgreSQL database (Neon in your case)
- Proper `.env` file with `POSTGRES_URL`

## 🛡️ Safety Notes

1. **Always backup important data** before running reset
2. **Use interactive mode** for manual operations
3. **Force mode should only be used** when you're absolutely certain
4. **Test the reset process** in development before using in staging/production
5. **Verify your Firebase configuration** is updated before testing auth

## 🔧 Troubleshooting

### Permission Errors
If you get permission errors:
```bash
chmod +x reset_db.sh
chmod +x docker-image/src/*.py
```

### Database Connection Issues
1. Check your `.env` file has the correct `POSTGRES_URL`
2. Verify network connectivity to Neon PostgreSQL
3. Ensure the database user has DELETE permissions

### Missing Dependencies
```bash
pip install psycopg2-binary python-dotenv
```

## ✨ Success Indicators

You'll know the reset was successful when you see:
```
✅ Database content reset completed successfully!
All tables are now empty but structure is preserved.
```

All tables should show `✓ Cleared table: [table_name]` in the output. 