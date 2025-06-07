-- Supabase Native AI Embeddings Setup
-- This replaces the custom Edge Function approach with native Supabase AI

-- Step 1: Enable Supabase AI extension
CREATE EXTENSION IF NOT EXISTS ai CASCADE;

-- Step 2: Configure AI settings for OpenAI
-- Note: OpenAI API key should be set in Supabase dashboard under AI settings

-- Step 3: Create function to generate embeddings using native Supabase AI
CREATE OR REPLACE FUNCTION generate_embedding_for_chunk()
RETURNS TRIGGER AS $$
BEGIN
  -- Only generate embeddings for new content or when content changes
  IF (TG_OP = 'INSERT' AND NEW.content IS NOT NULL) OR 
     (TG_OP = 'UPDATE' AND OLD.content IS DISTINCT FROM NEW.content AND NEW.content IS NOT NULL) THEN
    
    -- Generate embedding using Supabase native AI
    -- Using text-embedding-3-small as requested
    NEW.embedding := ai.embed(
      'text-embedding-3-small',
      NEW.content,
      user_id => auth.uid()::text
    );
    
    -- Set timestamp when embedding was generated
    NEW.embedding_generated_at := NOW();
    
    -- Log for debugging (optional)
    RAISE NOTICE 'Generated embedding for file_chunk % using Supabase native AI', NEW.id;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Step 4: Create trigger for automatic embedding generation
DROP TRIGGER IF EXISTS generate_embeddings_trigger ON file_chunks;
CREATE TRIGGER generate_embeddings_trigger
  BEFORE INSERT OR UPDATE ON file_chunks
  FOR EACH ROW
  EXECUTE FUNCTION generate_embedding_for_chunk();

-- Step 5: Function to manually regenerate embeddings for existing chunks
CREATE OR REPLACE FUNCTION regenerate_embeddings_for_file(file_id_param UUID)
RETURNS INTEGER AS $$
DECLARE
  chunk_record RECORD;
  updated_count INTEGER := 0;
BEGIN
  -- Update all chunks for the specified file to trigger embedding regeneration
  FOR chunk_record IN 
    SELECT id, content FROM file_chunks 
    WHERE file_id = file_id_param AND content IS NOT NULL
  LOOP
    -- Update the content to itself to trigger the embedding generation
    UPDATE file_chunks 
    SET content = chunk_record.content
    WHERE id = chunk_record.id;
    
    updated_count := updated_count + 1;
  END LOOP;
  
  RETURN updated_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Step 6: Function to regenerate embeddings for all chunks
CREATE OR REPLACE FUNCTION regenerate_all_embeddings()
RETURNS INTEGER AS $$
DECLARE
  chunk_record RECORD;
  updated_count INTEGER := 0;
BEGIN
  -- Update all chunks to trigger embedding regeneration
  FOR chunk_record IN 
    SELECT id, content FROM file_chunks 
    WHERE content IS NOT NULL
  LOOP
    -- Update the content to itself to trigger the embedding generation
    UPDATE file_chunks 
    SET content = chunk_record.content
    WHERE id = chunk_record.id;
    
    updated_count := updated_count + 1;
    
    -- Add small delay to avoid overwhelming the API
    PERFORM pg_sleep(0.1);
  END LOOP;
  
  RETURN updated_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Step 7: Create view to monitor embedding status
CREATE OR REPLACE VIEW embedding_status AS
SELECT 
  f.id as file_id,
  f.filename,
  f.processing_status,
  COUNT(fc.id) as total_chunks,
  COUNT(fc.embedding) as chunks_with_embeddings,
  CASE 
    WHEN COUNT(fc.id) = 0 THEN 0
    ELSE ROUND((COUNT(fc.embedding)::NUMERIC / COUNT(fc.id)::NUMERIC) * 100, 2)
  END as embedding_completion_percent,
  MAX(fc.embedding_generated_at) as last_embedding_generated
FROM files f
LEFT JOIN file_chunks fc ON f.id = fc.file_id
GROUP BY f.id, f.filename, f.processing_status
ORDER BY f.created_at DESC;

-- Step 8: Helper function to check if AI extension is working
CREATE OR REPLACE FUNCTION test_ai_embedding()
RETURNS JSONB AS $$
DECLARE
  test_embedding VECTOR;
BEGIN
  -- Test the AI embedding with a simple string
  test_embedding := ai.embed('text-embedding-3-small', 'This is a test string for embedding generation.');
  
  RETURN jsonb_build_object(
    'success', true,
    'message', 'AI embeddings are working correctly',
    'embedding_dimensions', array_length(test_embedding::numeric[], 1),
    'model', 'text-embedding-3-small'
  );
EXCEPTION
  WHEN OTHERS THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', SQLERRM,
      'message', 'AI embeddings are not working. Check OpenAI API key configuration.'
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Step 9: Grant necessary permissions
GRANT EXECUTE ON FUNCTION generate_embedding_for_chunk() TO service_role;
GRANT EXECUTE ON FUNCTION regenerate_embeddings_for_file(UUID) TO service_role;
GRANT EXECUTE ON FUNCTION regenerate_all_embeddings() TO service_role;
GRANT EXECUTE ON FUNCTION test_ai_embedding() TO service_role;
GRANT SELECT ON embedding_status TO service_role;

-- Step 10: Add comment for documentation
COMMENT ON FUNCTION generate_embedding_for_chunk() IS 'Automatic embedding generation using Supabase native AI with text-embedding-3-small model';
COMMENT ON VIEW embedding_status IS 'Monitor embedding generation progress for all files';

-- Completion message
DO $$
BEGIN
  RAISE NOTICE 'Supabase native embeddings setup complete!';
  RAISE NOTICE 'Run: SELECT test_ai_embedding(); to test the setup';
  RAISE NOTICE 'Model: text-embedding-3-small';
  RAISE NOTICE 'Embeddings will be generated automatically when file_chunks are created/updated';
END $$;