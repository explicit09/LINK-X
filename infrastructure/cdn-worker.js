/**
 * Cloudflare Worker for LEARN-X CDN
 * Provides advanced caching, optimization, and security features
 */

// Cache configuration by file type
const CACHE_CONFIG = {
  // Long-lived assets
  'js': { ttl: 31536000, browser: 604800 },
  'css': { ttl: 31536000, browser: 604800 },
  'woff': { ttl: 31536000, browser: 2592000 },
  'woff2': { ttl: 31536000, browser: 2592000 },
  'ttf': { ttl: 31536000, browser: 2592000 },
  'eot': { ttl: 31536000, browser: 2592000 },
  
  // Images
  'jpg': { ttl: 86400, browser: 3600 },
  'jpeg': { ttl: 86400, browser: 3600 },
  'png': { ttl: 86400, browser: 3600 },
  'gif': { ttl: 86400, browser: 3600 },
  'webp': { ttl: 86400, browser: 3600 },
  'svg': { ttl: 86400, browser: 3600 },
  'ico': { ttl: 604800, browser: 86400 },
  
  // Documents
  'pdf': { ttl: 3600, browser: 1800 },
  'doc': { ttl: 3600, browser: 1800 },
  'docx': { ttl: 3600, browser: 1800 },
  
  // Default
  'default': { ttl: 3600, browser: 600 }
};

// S3 bucket configuration
const S3_BUCKET = 'learnx-production';
const S3_REGION = 'us-east-1';

addEventListener('fetch', event => {
  event.respondWith(handleRequest(event.request));
});

async function handleRequest(request) {
  const url = new URL(request.url);
  
  // Security checks
  if (isBlockedPath(url.pathname)) {
    return new Response('Forbidden', { status: 403 });
  }
  
  // Get cache key
  const cacheKey = new Request(url.toString(), request);
  const cache = caches.default;
  
  // Check cache first
  let response = await cache.match(cacheKey);
  
  if (!response) {
    // Cache miss - fetch from origin
    response = await fetchFromOrigin(request, url);
    
    // Store in cache if successful
    if (response.status === 200) {
      const headers = new Headers(response.headers);
      
      // Set cache headers based on file type
      const fileExt = getFileExtension(url.pathname);
      const cacheConfig = CACHE_CONFIG[fileExt] || CACHE_CONFIG.default;
      
      headers.set('Cache-Control', `public, max-age=${cacheConfig.browser}`);
      headers.set('CF-Cache-Status', 'MISS');
      headers.set('X-Content-Type-Options', 'nosniff');
      headers.set('X-Frame-Options', 'DENY');
      headers.set('X-XSS-Protection', '1; mode=block');
      
      // Add CORS headers for fonts
      if (['woff', 'woff2', 'ttf', 'eot'].includes(fileExt)) {
        headers.set('Access-Control-Allow-Origin', '*');
      }
      
      // Create new response with updated headers
      response = new Response(response.body, {
        status: response.status,
        statusText: response.statusText,
        headers: headers
      });
      
      // Cache the response
      event.waitUntil(
        cache.put(cacheKey, response.clone())
      );
    }
  } else {
    // Cache hit - add cache status header
    const headers = new Headers(response.headers);
    headers.set('CF-Cache-Status', 'HIT');
    
    response = new Response(response.body, {
      status: response.status,
      statusText: response.statusText,
      headers: headers
    });
  }
  
  return response;
}

async function fetchFromOrigin(request, url) {
  // Construct S3 URL
  const s3Path = url.pathname.replace(/^\/static/, '');
  const s3Url = `https://${S3_BUCKET}.s3.${S3_REGION}.amazonaws.com${s3Path}`;
  
  try {
    const response = await fetch(s3Url, {
      method: request.method,
      headers: {
        'User-Agent': 'LEARN-X-CDN/1.0'
      }
    });
    
    if (!response.ok && response.status === 404) {
      // Try alternative paths
      const altPaths = getAlternativePaths(s3Path);
      for (const altPath of altPaths) {
        const altUrl = `https://${S3_BUCKET}.s3.${S3_REGION}.amazonaws.com${altPath}`;
        const altResponse = await fetch(altUrl, {
          method: request.method,
          headers: {
            'User-Agent': 'LEARN-X-CDN/1.0'
          }
        });
        
        if (altResponse.ok) {
          return altResponse;
        }
      }
    }
    
    return response;
  } catch (error) {
    return new Response('Gateway Error', { status: 502 });
  }
}

function getFileExtension(pathname) {
  const match = pathname.match(/\.([^.]+)$/);
  return match ? match[1].toLowerCase() : 'default';
}

function isBlockedPath(pathname) {
  const blockedPatterns = [
    /\.(env|git|htaccess|htpasswd)$/i,
    /\/(api|admin|wp-admin|phpmyadmin)\//i,
    /\.(php|asp|aspx|jsp)$/i
  ];
  
  return blockedPatterns.some(pattern => pattern.test(pathname));
}

function getAlternativePaths(path) {
  const alternatives = [];
  
  // Try with index.html for directories
  if (!path.includes('.')) {
    alternatives.push(`${path}/index.html`);
    alternatives.push(`${path.replace(/\/$/, '')}/index.html`);
  }
  
  // Try without leading slash
  if (path.startsWith('/')) {
    alternatives.push(path.substring(1));
  }
  
  // Try with /static prefix
  if (!path.startsWith('/static')) {
    alternatives.push(`/static${path}`);
  }
  
  return alternatives;
}

// Optional: Image optimization on-the-fly
async function optimizeImage(response, format) {
  // This would require Cloudflare Image Resizing subscription
  // Example implementation:
  /*
  const imageURL = new URL(response.url);
  imageURL.searchParams.set('format', format);
  imageURL.searchParams.set('quality', '85');
  
  return fetch(imageURL, {
    cf: {
      image: {
        format: format,
        quality: 85,
        
      }
    }
  });
  */
  return response;
}