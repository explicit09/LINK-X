# CDN Setup Guide for LEARN-X

This guide covers setting up a Content Delivery Network (CDN) for LEARN-X static assets using Cloudflare.

## Overview

The CDN setup provides:
- 🚀 Fast global content delivery
- 🔒 DDoS protection
- 📊 Analytics and insights
- 💰 Reduced bandwidth costs
- 🎯 Automatic image optimization

## Prerequisites

1. Cloudflare account (free tier is sufficient)
2. Domain name configured in Cloudflare
3. AWS account with S3 access
4. Terraform installed (optional for automated setup)

## Quick Setup

### 1. Manual Setup via Cloudflare Dashboard

#### Step 1: Create S3 Bucket
```bash
aws s3 mb s3://learnx-production --region us-east-1
aws s3 website s3://learnx-production --index-document index.html
```

#### Step 2: Configure S3 CORS
```bash
aws s3api put-bucket-cors --bucket learnx-production \
  --cors-configuration file://docker-image/config/s3_cors_config.json
```

#### Step 3: Create Cloudflare DNS Records
1. Log in to Cloudflare Dashboard
2. Select your domain
3. Go to DNS settings
4. Add CNAME records:
   - `cdn` → `learnx-production.s3.amazonaws.com`
   - `static` → `learnx-production.s3.amazonaws.com`
5. Enable "Proxied" (orange cloud) for both

#### Step 4: Configure Page Rules
1. Go to Rules → Page Rules
2. Create rule for `cdn.yourdomain.com/*`:
   - Cache Level: Cache Everything
   - Edge Cache TTL: 1 month
   - Browser Cache TTL: 1 week

### 2. Automated Setup with Terraform

```bash
cd infrastructure

# Initialize Terraform
terraform init

# Review plan
terraform plan \
  -var="cloudflare_api_token=$CLOUDFLARE_API_TOKEN" \
  -var="cloudflare_zone_id=$CLOUDFLARE_ZONE_ID" \
  -var="domain_name=yourdomain.com"

# Apply configuration
terraform apply
```

## Integration with Application

### Backend Configuration

Update your `.env.production` file:
```env
# CDN Configuration
CDN_ENABLED=true
CDN_URL=https://cdn.yourdomain.com
STATIC_URL=https://static.yourdomain.com
AWS_S3_CUSTOM_DOMAIN=cdn.yourdomain.com
```

### Frontend Configuration

Update `frontend/next.config.ts`:
```typescript
const nextConfig = {
  images: {
    domains: ['cdn.yourdomain.com', 'static.yourdomain.com'],
    loader: 'custom',
    loaderFile: './lib/cdn-loader.ts',
  },
  assetPrefix: process.env.NODE_ENV === 'production' 
    ? 'https://cdn.yourdomain.com' 
    : '',
};
```

Create `frontend/lib/cdn-loader.ts`:
```typescript
export default function cdnLoader({ src, width, quality }) {
  const params = [`w=${width}`];
  if (quality) {
    params.push(`q=${quality}`);
  }
  return `${process.env.NEXT_PUBLIC_CDN_URL}${src}?${params.join('&')}`;
}
```

## Uploading Static Assets

### Manual Upload
```bash
# Upload all static files
aws s3 sync ./frontend/public s3://learnx-production/static/ \
  --cache-control "public, max-age=31536000" \
  --exclude "*.html"

# Upload with specific cache headers
aws s3 cp ./frontend/public/images/ s3://learnx-production/static/images/ \
  --recursive \
  --cache-control "public, max-age=86400" \
  --content-type "image/jpeg"
```

### Automated Upload in CI/CD

Add to `.github/workflows/ci-cd.yml`:
```yaml
- name: Deploy static assets to CDN
  if: github.ref == 'refs/heads/main'
  run: |
    # Build frontend
    cd frontend
    npm run build
    
    # Upload to S3
    aws s3 sync .next/static s3://learnx-production/_next/static/ \
      --cache-control "public, max-age=31536000, immutable"
    
    # Purge Cloudflare cache
    curl -X POST "https://api.cloudflare.com/client/v4/zones/${{ secrets.CLOUDFLARE_ZONE_ID }}/purge_cache" \
      -H "Authorization: Bearer ${{ secrets.CLOUDFLARE_API_TOKEN }}" \
      -H "Content-Type: application/json" \
      --data '{"purge_everything":true}'
```

## Performance Optimization

### 1. Enable Cloudflare Features
- ✅ Auto Minify (JS, CSS, HTML)
- ✅ Brotli compression
- ✅ HTTP/2
- ✅ HTTP/3 (QUIC)
- ✅ 0-RTT Connection Resumption
- ✅ Image optimization (Polish)
- ✅ Mirage (lazy loading)

### 2. Optimize Cache Headers

Add to your S3 upload script:
```bash
# Long cache for versioned assets
--cache-control "public, max-age=31536000, immutable"

# Short cache for HTML
--cache-control "public, max-age=3600, must-revalidate"

# Medium cache for images
--cache-control "public, max-age=86400, stale-while-revalidate=86400"
```

### 3. Use Cache Tags

Tag your content for granular purging:
```javascript
// In your backend
response.headers['Cache-Tag'] = 'course-123,user-456';

// Purge specific tags
await fetch(`https://api.cloudflare.com/client/v4/zones/${ZONE_ID}/purge_cache`, {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${API_TOKEN}`,
    'Content-Type': 'application/json',
  },
  body: JSON.stringify({
    tags: ['course-123']
  })
});
```

## Monitoring

### Cloudflare Analytics
1. Go to Analytics & Logs
2. Monitor:
   - Cache hit ratio (target: >90%)
   - Bandwidth saved
   - Response times by geography
   - Top requested files

### Custom Monitoring
```javascript
// Add to your application
const cdnMetrics = {
  async checkCacheStatus(url) {
    const response = await fetch(url, { method: 'HEAD' });
    return response.headers.get('cf-cache-status');
  },
  
  async measureLatency(url) {
    const start = performance.now();
    await fetch(url);
    return performance.now() - start;
  }
};
```

## Security Best Practices

### 1. Restrict S3 Access
Update bucket policy to only allow Cloudflare IPs:
```json
{
  "Version": "2012-10-17",
  "Statement": [{
    "Effect": "Allow",
    "Principal": "*",
    "Action": "s3:GetObject",
    "Resource": "arn:aws:s3:::learnx-production/*",
    "Condition": {
      "IpAddress": {
        "aws:SourceIp": [
          "173.245.48.0/20",
          "103.21.244.0/22",
          // ... other Cloudflare IPs
        ]
      }
    }
  }]
}
```

### 2. Enable Cloudflare Security Features
- ✅ WAF (Web Application Firewall)
- ✅ Bot Management
- ✅ DDoS Protection
- ✅ Rate Limiting
- ✅ IP Access Rules

### 3. Implement Signed URLs for Private Content
```python
# In your backend
import boto3
from datetime import datetime, timedelta

def generate_signed_url(file_key, expiration_hours=1):
    s3_client = boto3.client('s3')
    return s3_client.generate_presigned_url(
        'get_object',
        Params={'Bucket': 'learnx-production', 'Key': file_key},
        ExpiresIn=expiration_hours * 3600
    )
```

## Troubleshooting

### Cache Not Working
1. Check DNS is proxied (orange cloud)
2. Verify Page Rules are active
3. Check response headers:
   ```bash
   curl -I https://cdn.yourdomain.com/static/image.jpg
   # Look for: cf-cache-status: HIT
   ```

### CORS Issues
1. Update S3 CORS configuration
2. Add headers in Cloudflare Worker:
   ```javascript
   headers.set('Access-Control-Allow-Origin', '*');
   ```

### Slow Performance
1. Check cache hit ratio in Analytics
2. Verify correct cache headers
3. Enable Argo Smart Routing (paid feature)

## Cost Optimization

1. **Use Cloudflare's free tier effectively**
   - 10GB bandwidth included
   - Unlimited requests
   - Basic DDoS protection

2. **Optimize S3 costs**
   - Use S3 Intelligent-Tiering
   - Set lifecycle policies
   - Enable S3 Transfer Acceleration

3. **Monitor usage**
   ```bash
   # Check S3 usage
   aws s3api list-buckets --query 'Buckets[].Name' | \
   xargs -I {} aws cloudwatch get-metric-statistics \
     --namespace AWS/S3 \
     --metric-name BucketSizeBytes \
     --dimensions Name=BucketName,Value={} \
     --start-time 2024-01-01T00:00:00Z \
     --end-time 2024-01-31T23:59:59Z \
     --period 86400 \
     --statistics Average
   ```

## Next Steps

1. Set up image optimization pipeline
2. Implement progressive web app (PWA) features
3. Configure edge computing with Workers
4. Set up real-time analytics
5. Implement A/B testing at the edge