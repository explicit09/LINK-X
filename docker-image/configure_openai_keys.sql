-- Configure OpenAI API Keys in Supabase
-- Replace 'your-openai-key-here' with your actual API keys

-- Update system configuration with your OpenAI API keys
-- Format: [{"key": "sk-...", "tier": "tier1"}, {"key": "sk-...", "tier": "tier2"}]
UPDATE system_config 
SET value = '[
    {
        "key": "your-openai-key-here", 
        "tier": "tier1",
        "requests_per_minute": 3500,
        "tokens_per_minute": 200000
    }
]'
WHERE key = 'OPENAI_API_KEYS';

-- Configure other embedding settings
UPDATE system_config SET value = '100' WHERE key = 'MAX_BATCH_SIZE';
UPDATE system_config SET value = 'text-embedding-3-small' WHERE key = 'EMBEDDING_MODEL';

-- Verify configuration
SELECT key, value FROM system_config 
WHERE key IN ('OPENAI_API_KEYS', 'EMBEDDINGS_ENABLED', 'MAX_BATCH_SIZE');