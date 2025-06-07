# Supabase Embeddings Migration Guide

## Overview

Since Supabase doesn't support the `ai` extension (pgAI), we use their recommended approach combining:
- **pgvector** - For vector storage
- **pgmq** - For job queuing
- **pg_net** - For HTTP calls to OpenAI
- **pg_cron** - For scheduled processing

## Migration Files

1. **supabase_automatic_embeddings.sql** - Sets up automatic embedding generation using Supabase's toolkit
2. **cleanup_custom_embeddings.sql** - Removes old custom embedding infrastructure

## Setup Steps

### 1. Store OpenAI API Key in Vault

First, add your OpenAI API key to Supabase Vault:

```sql
-- In Supabase SQL Editor
INSERT INTO vault.secrets (name, secret)
VALUES ('OPENAI_API_KEY', 'your-openai-api-key-here')
ON CONFLICT (name) DO UPDATE
SET secret = EXCLUDED.secret;
```

### 2. Run Migrations

Run in order:
1. `cleanup_custom_embeddings.sql` - Clean up old system
2. `supabase_automatic_embeddings.sql` - Set up new system

### 3. Alternative: Edge Function Approach

If you prefer not to use pg_net/pgmq, create an Edge Function:

```typescript
// supabase/functions/generate-embeddings/index.ts
import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import OpenAI from 'https://esm.sh/openai@4'

serve(async (req) => {
  const openai = new OpenAI({
    apiKey: Deno.env.get('OPENAI_API_KEY'),
  })

  const supabase = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
  )

  // Get chunks needing embeddings
  const { data: chunks } = await supabase
    .from('file_chunks')
    .select('id, content')
    .is('embedding', null)
    .limit(25)

  for (const chunk of chunks || []) {
    const response = await openai.embeddings.create({
      model: 'text-embedding-3-small',
      input: chunk.content,
    })

    const embedding = response.data[0].embedding

    await supabase
      .from('file_chunks')
      .update({ 
        embedding,
        embedding_generated_at: new Date().toISOString()
      })
      .eq('id', chunk.id)
  }

  return new Response('OK')
})
```

Then schedule it with a cron job.

## Monitoring

Check embedding progress:
```sql
SELECT * FROM embedding_progress;
```

Retry failed embeddings:
```sql
SELECT retry_failed_embeddings();
```

## Key Differences from Native AI Extension

| Feature | Native AI Extension | Supabase Approach |
|---------|-------------------|-------------------|
| Embedding Generation | `ai.embed()` in SQL | External API via pg_net |
| Processing | Synchronous | Async with queue |
| API Key Storage | Extension config | Vault secrets |
| Retry Logic | Built-in | Custom with pg_cron |

## Performance Considerations

- Batch process embeddings to reduce API calls
- Monitor rate limits (OpenAI: 3,000 RPM for text-embedding-3-small)
- Use cron scheduling to control processing rate
- Consider costs: ~$0.02 per 1M tokens with text-embedding-3-small

## References

- [Supabase OpenAI Integration](https://supabase.com/docs/guides/ai/examples/openai)
- [Automatic Embeddings Guide](https://supabase.com/docs/guides/ai/automatic-embeddings)
- [pgvector Documentation](https://supabase.com/docs/guides/database/extensions/pgvector)