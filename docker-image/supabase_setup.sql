-- Supabase Setup: Enable required extensions and run migrations
-- Run this in your Supabase SQL Editor

-- 1. Enable required extensions
CREATE EXTENSION IF NOT EXISTS vector;
CREATE EXTENSION IF NOT EXISTS pgcrypto;
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 2. Enable pgmq extension (for message queuing)
-- Note: Check if pgmq is available in your Supabase instance
-- If not available, you'll need to implement alternative queuing
CREATE EXTENSION IF NOT EXISTS pgmq;

-- 3. Enable pg_net for HTTP requests (if available)
-- Note: This may require enabling in Supabase dashboard
CREATE EXTENSION IF NOT EXISTS pg_net;

-- 4. Enable pg_cron for scheduled jobs
-- Note: This requires enabling in Supabase dashboard under "Extensions"
CREATE EXTENSION IF NOT EXISTS pg_cron;

-- 5. Check which extensions are enabled
SELECT * FROM pg_extension WHERE extname IN ('vector', 'pgcrypto', 'uuid-ossp', 'pgmq', 'pg_net', 'pg_cron');