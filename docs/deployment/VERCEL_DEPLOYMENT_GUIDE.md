# Vercel Deployment Guide for LEARN-X

## Prerequisites

1. **Vercel Account**: Sign up at [vercel.com](https://vercel.com) if you don't have an account
2. **Vercel CLI** (optional): Install with `npm i -g vercel`
3. **Environment Variables**: Have all your API keys and configuration ready

## Deployment Steps

### Option 1: Deploy via Vercel Dashboard (Recommended)

1. **Connect GitHub Repository**
   - Go to [vercel.com/new](https://vercel.com/new)
   - Click "Import Project"
   - Select "Import Git Repository"
   - Choose your `LINK-X1` repository

2. **Configure Project**
   - **Framework Preset**: Next.js (should auto-detect)
   - **Root Directory**: `frontend`
   - **Build Command**: `npm run build`
   - **Output Directory**: `.next`
   - **Install Command**: `npm install`

3. **Set Environment Variables**
   
   Add these environment variables in Vercel dashboard:

   ```env
   # API Configuration
   NEXT_PUBLIC_API_URL=https://your-backend-url.com
   
   # Firebase Configuration
   NEXT_PUBLIC_FIREBASE_API_KEY=your_firebase_api_key
   NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=your_project.firebaseapp.com
   NEXT_PUBLIC_FIREBASE_PROJECT_ID=your_project_id
   NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=your_project.appspot.com
   NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=your_sender_id
   NEXT_PUBLIC_FIREBASE_APP_ID=your_app_id
   
   # Supabase Configuration (if using)
   NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
   NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key
   
   # Optional: Analytics
   NEXT_PUBLIC_GA_MEASUREMENT_ID=G-XXXXXXXXXX
   ```

4. **Deploy**
   - Click "Deploy"
   - Wait for the build to complete
   - Your app will be live at `https://your-project.vercel.app`

### Option 2: Deploy via CLI

1. **Install Vercel CLI**
   ```bash
   npm i -g vercel
   ```

2. **Login to Vercel**
   ```bash
   vercel login
   ```

3. **Deploy from Frontend Directory**
   ```bash
   cd frontend
   vercel
   ```

4. **Follow the prompts**
   - Set up and deploy: `Y`
   - Which scope: Select your account
   - Link to existing project?: `N` (for first time)
   - Project name: `learn-x` (or your preferred name)
   - Root directory: `./`
   - Override settings?: `N`

5. **Set Environment Variables**
   ```bash
   # Set each variable
   vercel env add NEXT_PUBLIC_API_URL
   vercel env add NEXT_PUBLIC_FIREBASE_API_KEY
   # ... add all other variables
   ```

### Option 3: Deploy with GitHub Integration

1. **Push to GitHub**
   ```bash
   git add .
   git commit -m "feat: Add Vercel deployment configuration"
   git push origin main
   ```

2. **Auto-Deploy on Push**
   - Vercel will automatically deploy when you push to `main`
   - Preview deployments created for pull requests

## Post-Deployment Configuration

### 1. Custom Domain

1. Go to your project settings in Vercel
2. Navigate to "Domains"
3. Add your custom domain
4. Follow DNS configuration instructions

### 2. Environment Variables for Production

Make sure to set different values for production:

```env
# Production API
NEXT_PUBLIC_API_URL=https://api.learn-x.com

# Production Firebase (if different)
NEXT_PUBLIC_FIREBASE_API_KEY=prod_firebase_key
```

### 3. Backend API Configuration

Your backend needs to be deployed separately. Options:

1. **Docker on Cloud Provider**
   - AWS ECS, Google Cloud Run, DigitalOcean App Platform
   - Use the existing `docker-compose.yml` as reference

2. **Railway/Render**
   - Easy deployment for Docker containers
   - Good for PostgreSQL + Redis + Flask app

3. **Separate Services**
   - Database: Neon, Supabase, or AWS RDS
   - Redis: Upstash or Redis Cloud
   - Backend: Heroku, Railway, or Render

### 4. CORS Configuration

Update your backend CORS settings to allow your Vercel domain:

```python
# In docker-image/src/core/cors.py
ALLOWED_ORIGINS = [
    "https://your-project.vercel.app",
    "https://your-custom-domain.com",
    "http://localhost:3000"  # Keep for local development
]
```

## Monitoring & Optimization

### 1. Vercel Analytics
- Enable Web Analytics in project settings
- Monitor Core Web Vitals

### 2. Error Tracking
- Vercel integrates with Sentry
- Set up error tracking for production

### 3. Performance Optimization
- Enable ISR (Incremental Static Regeneration) for dynamic pages
- Use `next/image` for optimized images
- Implement proper caching headers

## Troubleshooting

### Build Failures

1. **Module not found errors**
   ```bash
   # Clear cache and reinstall
   rm -rf node_modules package-lock.json
   npm install
   ```

2. **Environment variable issues**
   - Ensure all `NEXT_PUBLIC_` variables are set
   - Check for typos in variable names

3. **Memory issues**
   ```json
   // In vercel.json
   {
     "functions": {
       "app/api/**/*": {
         "maxDuration": 30,
         "memory": 1024
       }
     }
   }
   ```

### API Connection Issues

1. **CORS errors**
   - Update backend CORS configuration
   - Check API URL includes protocol (https://)

2. **Authentication failures**
   - Verify Firebase configuration
   - Check API keys are correctly set

### Performance Issues

1. **Slow initial load**
   - Implement code splitting
   - Lazy load heavy components
   - Optimize bundle size

2. **Large bundle size**
   ```bash
   # Analyze bundle
   npm run analyze
   ```

## Security Best Practices

1. **Environment Variables**
   - Never commit `.env` files
   - Use Vercel's environment variable UI
   - Different keys for production

2. **API Security**
   - Implement rate limiting
   - Use proper authentication
   - Validate all inputs

3. **Headers**
   - Set security headers in `vercel.json`
   - Enable HSTS
   - Set CSP headers

## Deployment Checklist

- [ ] All environment variables configured
- [ ] Backend API deployed and accessible
- [ ] CORS configured for production domain
- [ ] Firebase project set to production
- [ ] Database migrations run
- [ ] Redis cache configured
- [ ] S3/Storage bucket accessible
- [ ] Custom domain configured (optional)
- [ ] SSL certificate active
- [ ] Monitoring/Analytics enabled
- [ ] Error tracking configured
- [ ] Performance benchmarks met

## Useful Commands

```bash
# View deployment logs
vercel logs

# List all deployments
vercel list

# Promote to production
vercel --prod

# Rollback deployment
vercel rollback

# View environment variables
vercel env ls
```

## Support Resources

- [Vercel Documentation](https://vercel.com/docs)
- [Next.js on Vercel](https://vercel.com/docs/frameworks/nextjs)
- [Vercel Support](https://vercel.com/support)
- [Status Page](https://www.vercel-status.com/)