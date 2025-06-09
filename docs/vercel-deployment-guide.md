# Vercel Deployment Guide for LINK-X Frontend

This guide will help you deploy your Next.js frontend to Vercel with proper integration to your Railway backend.

## 🚀 **Deployment Steps**

### **1. Prerequisites**

- ✅ Railway backend deployed and working
- ✅ Supabase project configured
- ✅ GitHub repository with latest changes
- ✅ Vercel account setup

### **2. Connect Repository to Vercel**

1. **Go to Vercel Dashboard**
2. **Click "New Project"**
3. **Import from GitHub**
4. **Select your LINK-X repository**
5. **Configure project settings:**
   - **Framework Preset**: Next.js
   - **Root Directory**: `frontend`
   - **Build Command**: `npm run build`
   - **Output Directory**: `.next`

### **3. Environment Variables Setup**

In Vercel Dashboard → Project Settings → Environment Variables, add:

#### **Required Variables:**
```bash
# Backend API (from Railway)
NEXT_PUBLIC_API_URL=https://your-railway-app.railway.app

# Supabase (from Supabase Dashboard)
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-supabase-anon-key

# Site URL (your Vercel domain)
NEXT_PUBLIC_SITE_URL=https://your-app.vercel.app

# API Version
NEXT_PUBLIC_API_VERSION=v2
```

#### **Feature Flags:**
```bash
NEXT_PUBLIC_ENABLE_GAMIFICATION=true
NEXT_PUBLIC_ENABLE_AI_FEATURES=true
NEXT_PUBLIC_ENABLE_COLLABORATION=true
```

#### **Build Configuration:**
```bash
NODE_ENV=production
```

### **4. Get Your URLs**

#### **Railway Backend URL:**
1. Go to Railway Dashboard
2. Click your main API service
3. Go to "Settings" → "Domains"
4. Copy the Railway domain (e.g., `https://linkx-production.up.railway.app`)

#### **Supabase Configuration:**
1. Go to Supabase Dashboard
2. Settings → API
3. Copy:
   - **Project URL** → `NEXT_PUBLIC_SUPABASE_URL`
   - **Anon/Public Key** → `NEXT_PUBLIC_SUPABASE_ANON_KEY`

### **5. Deploy**

1. **Click "Deploy"** in Vercel
2. **Wait for build** (should take 2-5 minutes)
3. **Check deployment logs** for any errors
4. **Visit your deployed site**

## 🔧 **Configuration Details**

### **Updated vercel.json Features:**

1. **API Proxying**: Routes `/api/*` to your Railway backend
2. **Environment Variables**: Uses Vercel environment variables
3. **CORS Headers**: Configured for cross-origin requests
4. **Next.js Optimization**: Proper build and output settings

### **Frontend Updates:**

Your frontend is configured to:
- ✅ Use Railway backend API
- ✅ Handle Supabase authentication
- ✅ Support all current features
- ✅ Work with environment-specific URLs

## 🧪 **Testing Your Deployment**

### **1. Basic Functionality:**
- [ ] Site loads properly
- [ ] Authentication works (login/signup)
- [ ] API calls to Railway backend succeed
- [ ] Supabase database connections work

### **2. API Integration:**
```bash
# Test API connectivity
curl https://your-vercel-app.vercel.app/api/v2/health

# Should proxy to Railway and return:
{"status": "healthy", "database": "connected"}
```

### **3. Feature Testing:**
- [ ] File uploads work
- [ ] Course creation/management
- [ ] User dashboard loads
- [ ] AI features respond
- [ ] Real-time features work

## 🐛 **Common Issues & Solutions**

### **Issue: "API_URL not defined" Error**
**Solution:**
```bash
# Make sure this is set in Vercel environment variables
NEXT_PUBLIC_API_URL=https://your-railway-app.railway.app
```

### **Issue: CORS Errors**
**Solution:**
1. Check Railway backend CORS configuration
2. Ensure your Vercel domain is in allowed origins
3. Verify API routes in `vercel.json`

### **Issue: Supabase Auth Redirect Issues**
**Solution:**
1. Add Vercel domain to Supabase Auth settings
2. Update `NEXT_PUBLIC_SITE_URL` in Vercel
3. Check Supabase redirect URLs configuration

### **Issue: Build Fails**
**Solution:**
1. Check build logs in Vercel dashboard
2. Ensure all dependencies are in `package.json`
3. Verify TypeScript/ESLint configurations

### **Issue: Environment Variables Not Working**
**Solution:**
1. Redeploy after adding environment variables
2. Check variable names match exactly (case-sensitive)
3. Use Vercel CLI to verify: `vercel env ls`

## 📊 **Monitoring & Performance**

### **Built-in Monitoring:**
- ✅ Vercel Analytics (automatically enabled)
- ✅ Web Vitals tracking
- ✅ Build/deployment logs
- ✅ Function execution logs

### **Performance Optimization:**
```bash
# Enable performance monitoring in your frontend
npm install @vercel/analytics

# Already configured in your package.json
```

### **Custom Domains:**
1. Vercel Dashboard → Project → Domains
2. Add your custom domain
3. Update `NEXT_PUBLIC_SITE_URL` environment variable
4. Update Supabase auth settings

## 🔄 **Continuous Deployment**

### **Auto-Deploy Setup:**
1. **Connected to GitHub**: ✅ (already configured)
2. **Auto-deploy on push**: ✅ (Vercel default)
3. **Preview deployments**: ✅ (for pull requests)

### **Manual Deployment:**
```bash
# Using Vercel CLI
npm install -g vercel
cd frontend
vercel --prod
```

## ⚡ **Performance Tips**

1. **Image Optimization**: Already configured in `next.config.ts`
2. **Bundle Analysis**: Run `npm run build:analyze`
3. **Caching**: Vercel handles this automatically
4. **Edge Functions**: Consider for API routes

## 🎯 **Post-Deployment Checklist**

- [ ] All environment variables set correctly
- [ ] Railway backend accessible from Vercel
- [ ] Supabase authentication working
- [ ] File uploads functional
- [ ] Real-time features working
- [ ] Custom domain configured (optional)
- [ ] Analytics tracking enabled
- [ ] Performance monitoring active

Your LINK-X frontend is now ready for production on Vercel! 🚀 