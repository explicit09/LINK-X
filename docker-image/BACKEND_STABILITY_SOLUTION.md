# Backend Stability Solution

## Problem
The main backend (`app.py`) has dependencies on Redis, Celery, and WebSockets that cause instability when these services aren't available.

## Solution
We've made the backend more resilient by:

1. **Fixed dependency imports to handle missing modules gracefully:**
   - `tasks/__init__.py` - Made Celery optional with fallback sync tasks
   - `core/cache.py` - Made Redis optional
   - `core/websocket_manager.py` - Made SocketIO and Redis optional
   - `api/health.py` - Made Redis health check optional
   - `services/collaboration_service.py` - Made websocket_manager import optional

2. **Fixed database connection to use Supabase:**
   - `db/connection.py` - Added fallback to DATABASE_URL and placeholder
   - `core/supabase_config.py` - Fixed to use DATABASE_URL environment variable

3. **Disabled problematic modules:**
   - Commented out `personalization_v2` import (requires dependency_injector)
   - Fixed double initialization of SQLAlchemy

## Running the Backend

### Option 1: Stable Backend (Recommended)
```bash
cd /Users/tadies/Documents/GitHub/LINK-X/docker-image
./run_stable_backend.sh
```

This runs `app_stable.py` with all Supabase credentials configured.

### Option 2: Minimal Backend (For Testing)
```bash
cd /Users/tadies/Documents/GitHub/LINK-X/docker-image
python test_backend_minimal.py
```

This runs a minimal Flask server with just health check and auth endpoints.

### Option 3: Main Backend (When everything is fixed)
```bash
cd /Users/tadies/Documents/GitHub/LINK-X/docker-image
./run_stable_backend.sh
# Then edit run_stable_backend.sh to use app.py instead of app_stable.py
```

## Environment Variables Required

```bash
export SUPABASE_URL="https://torsffahnivnzcnjnxgc.supabase.co"
export SUPABASE_ANON_KEY="your-anon-key"
export SUPABASE_SERVICE_ROLE_KEY="your-service-role-key"
export SUPABASE_JWT_SECRET="your-jwt-secret"
export DATABASE_URL="postgresql://..."
```

## What Works Now

✅ Backend starts without Redis/Celery
✅ Basic API endpoints
✅ Health checks
✅ CORS configuration
✅ Supabase database connection

## What Needs Additional Work

- Fix Supabase API key authentication (getting 401 errors)
- Install missing Python dependencies if needed:
  ```bash
  pip install dependency-injector  # If you want personalization_v2
  pip install redis flask-socketio  # If you want WebSocket features
  ```

## Testing the Backend

```bash
# Test health endpoint
curl http://localhost:8080/health

# Test auth endpoint
curl http://localhost:8080/api/v2/auth/test
```

## Next Steps

1. Fix the Supabase API key issue (the service role key might be incorrect)
2. Test frontend authentication with the stable backend
3. Gradually enable more features as needed