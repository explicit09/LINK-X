-- Enable Required Extensions for LEARN-X
-- Run this first in Supabase SQL Editor

-- Enable UUID generation
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Enable cryptographic functions
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- Enable vector similarity search for AI features
CREATE EXTENSION IF NOT EXISTS "vector";

-- Enable text search
CREATE EXTENSION IF NOT EXISTS "pg_trgm";

-- Verify extensions are enabled
SELECT 
    extname as extension_name,
    extversion as version
FROM pg_extension
WHERE extname IN ('uuid-ossp', 'pgcrypto', 'vector', 'pg_trgm')
ORDER BY extname;