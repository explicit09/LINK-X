# OAuth Setup Guide - Google Authentication

## Overview

This guide walks you through setting up Google OAuth authentication with Supabase for the unified authentication system. After completing this setup, users will be able to sign in with their Google accounts.

## Prerequisites

- ✅ Phase 1: Database migrations completed
- ✅ Phase 2: Core auth system implemented  
- ✅ Phase 3: OAuth callback handler created
- 🔧 Google Cloud Console access
- 🔧 Supabase project admin access

## Step 1: Google Cloud Console Setup

### 1.1 Create a Google Cloud Project

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Click "Select a project" → "New Project"
3. Enter project name: `learn-x-auth` (or your preferred name)
4. Click "Create"

### 1.2 Enable Google+ API

1. In the Google Cloud Console, go to "APIs & Services" → "Library"
2. Search for "Google+ API"
3. Click on "Google+ API" and click "Enable"
4. **Note**: You can also use "Google Identity" API for newer implementations

### 1.3 Configure OAuth Consent Screen

1. Go to "APIs & Services" → "OAuth consent screen"
2. Choose "External" user type (unless you have a Google Workspace)
3. Fill in the required fields:
   - **App name**: `LEARN-X`
   - **User support email**: Your email
   - **App logo**: (Optional) Upload your app logo
   - **App domain**: Your domain (e.g., `learn-x.com`)
   - **Authorized domains**: Add your domains:
     - `localhost` (for development)
     - `your-domain.com` (for production)
     - `your-supabase-project.supabase.co`
   - **Developer contact email**: Your email
4. Click "Save and Continue"

### 1.4 Add Scopes

1. On the "Scopes" page, click "Add or Remove Scopes"
2. Add these scopes:
   - `../auth/userinfo.email`
   - `../auth/userinfo.profile`
   - `openid`
3. Click "Update" → "Save and Continue"

### 1.5 Add Test Users (Development Only)

1. On the "Test users" page, add your email addresses for testing
2. Click "Save and Continue"

### 1.6 Create OAuth Credentials

1. Go to "APIs & Services" → "Credentials"
2. Click "Create Credentials" → "OAuth client ID"
3. Choose "Web application"
4. Configure the OAuth client:
   - **Name**: `LEARN-X Web Client`
   - **Authorized JavaScript origins**:
     - `http://localhost:3000` (development)
     - `https://your-domain.com` (production)
   - **Authorized redirect URIs**:
     - `https://your-supabase-project.supabase.co/auth/v1/callback`
     - Example: `https://torsffahnivnzcnjnxgc.supabase.co/auth/v1/callback`
5. Click "Create"
6. **Important**: Copy the `Client ID` and `Client Secret` - you'll need these for Supabase

## Step 2: Supabase Configuration

### 2.1 Configure Google OAuth Provider

1. Open your Supabase project dashboard
2. Go to "Authentication" → "Providers"
3. Find "Google" in the providers list
4. Toggle "Enable sign in with Google" to ON
5. Enter your Google OAuth credentials:
   - **Client ID**: Paste from Google Cloud Console
   - **Client Secret**: Paste from Google Cloud Console
6. Configure the redirect URL (should auto-populate):
   - `https://your-project.supabase.co/auth/v1/callback`
7. Click "Save"

### 2.2 Configure Site URL

1. In Supabase, go to "Authentication" → "URL Configuration"
2. Set the **Site URL** to your application URL:
   - Development: `http://localhost:3000`
   - Production: `https://your-domain.com`
3. Add **Redirect URLs** (comma-separated):
   ```
   http://localhost:3000/auth/callback,
   https://your-domain.com/auth/callback
   ```
4. Click "Save"

### 2.3 Verify Configuration

1. Go to "Authentication" → "Providers"
2. Ensure Google provider shows "Enabled" status
3. Check that the callback URL matches your Google Console setup

## Step 3: Application Configuration

### 3.1 Environment Variables

Ensure your `.env.local` has the correct Supabase configuration:

```env
# Supabase Configuration
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key

# Site URL for OAuth redirects
NEXT_PUBLIC_SITE_URL=http://localhost:3000  # Development
# NEXT_PUBLIC_SITE_URL=https://your-domain.com  # Production
```

### 3.2 Verify OAuth Callback Route

Ensure the callback route exists at `app/auth/callback/route.ts`:

```typescript
// This should already be created in Phase 3
export async function GET(request: NextRequest) {
  // Handles OAuth callback processing
}
```

## Step 4: Testing OAuth Flow

### 4.1 Test in Development

1. Start your development server:
   ```bash
   npm run dev
   ```

2. Navigate to the demo page:
   ```
   http://localhost:3000/(auth)/demo
   ```

3. Click "Continue with Google" button

4. Expected flow:
   - Redirects to Google OAuth consent screen
   - User grants permissions
   - Redirects back to your app via Supabase
   - User is authenticated and profile is created

### 4.2 Verify in Supabase Dashboard

1. Go to "Authentication" → "Users"
2. After successful OAuth, you should see:
   - New user entry with Google provider
   - User metadata from Google (name, email, picture)
   - Associated auth method showing "google"

### 4.3 Test Account Linking

If a user with the same email already exists:
- OAuth should link to existing account
- User maintains existing data
- Both auth methods (email + Google) available

## Step 5: Production Deployment

### 5.1 Update Google Cloud Console

1. Add production URLs to OAuth client:
   - **Authorized origins**: `https://your-domain.com`
   - **Redirect URIs**: Keep the Supabase URL
2. Publish OAuth consent screen (if using external users)

### 5.2 Update Supabase Configuration

1. Update Site URL to production domain
2. Add production redirect URLs
3. Test OAuth flow in production

### 5.3 Environment Variables

Update production environment variables:

```env
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
NEXT_PUBLIC_SITE_URL=https://your-domain.com
```

## Troubleshooting

### Common Issues

#### 1. "redirect_uri_mismatch" Error

**Problem**: Google OAuth redirect URL doesn't match configured URIs

**Solution**:
- Check Google Console → Credentials → OAuth client → Authorized redirect URIs
- Ensure Supabase callback URL is exact: `https://your-project.supabase.co/auth/v1/callback`
- No trailing slashes or extra parameters

#### 2. "access_denied" Error

**Problem**: User denied OAuth consent or app not approved

**Solution**:
- Check OAuth consent screen configuration
- Ensure app is in "Testing" mode for development
- Add test users if in testing mode
- For production, publish the OAuth consent screen

#### 3. "invalid_client" Error

**Problem**: Client ID/Secret mismatch

**Solution**:
- Verify Client ID and Secret in Supabase match Google Console
- Check for extra spaces or hidden characters
- Regenerate credentials if needed

#### 4. OAuth Works but User Not Created

**Problem**: OAuth succeeds but no user in database

**Solution**:
- Check database triggers are working
- Verify RLS policies allow profile creation
- Check Supabase logs for errors
- Ensure callback route is processing correctly

#### 5. Callback Route Not Found

**Problem**: 404 error on `/auth/callback`

**Solution**:
- Verify file exists at `app/auth/callback/route.ts`
- Check Next.js app router configuration
- Ensure no conflicting routes

### Debugging Tools

#### 1. Check Network Tab

Monitor browser network requests during OAuth:
- Initial redirect to Google
- Google callback to Supabase
- Final redirect to your app

#### 2. Supabase Logs

Check "Logs" in Supabase dashboard for:
- Auth events
- Database errors
- RLS policy violations

#### 3. Console Logging

Our callback handler includes detailed logging:
```javascript
console.log('[OAuth Callback] Processing callback:', { ... })
```

## Security Considerations

### 1. Client Secret Security

- ⚠️ **Never expose Client Secret in frontend code**
- ✅ Client Secret is handled by Supabase (server-side)
- ✅ Only Client ID is used in frontend

### 2. HTTPS Requirements

- 🔒 Production OAuth requires HTTPS
- 🔒 Google requires secure redirect URIs in production
- ✅ Supabase provides HTTPS endpoints

### 3. Domain Validation

- ✅ Only add trusted domains to authorized origins
- ✅ Validate redirect URLs in production
- ⚠️ Remove localhost URLs from production config

## Success Checklist

- [ ] Google Cloud project created and configured
- [ ] OAuth consent screen configured
- [ ] OAuth client credentials created
- [ ] Supabase Google provider enabled
- [ ] Site URL and redirect URLs configured
- [ ] Environment variables set correctly
- [ ] OAuth callback route implemented
- [ ] Google OAuth works in development
- [ ] User profiles created automatically
- [ ] Account linking works for existing users
- [ ] Production URLs configured
- [ ] OAuth works in production

## Next Steps

After completing OAuth setup:

1. **Phase 4**: Advanced session management
2. **Phase 5**: Role-based access control
3. **Phase 6**: Security hardening and MFA

---

**Document Version**: v1.0  
**Phase**: 3 - Social OAuth Integration  
**Last Updated**: OAuth Setup Guide  
**Prerequisites**: Phases 1 & 2 complete