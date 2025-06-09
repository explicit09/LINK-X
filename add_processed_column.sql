-- Add processed column to files table if it doesn't exist
ALTER TABLE files ADD COLUMN IF NOT EXISTS processed BOOLEAN DEFAULT FALSE;

-- Create index on processed column for faster queries
CREATE INDEX IF NOT EXISTS idx_files_processed ON files(processed);

-- Update existing files based on processing_queue status
UPDATE files f
SET processed = TRUE
FROM processing_queue pq
WHERE f.id = pq.file_id
AND pq.status = 'completed';

-- Show current status
SELECT 
    'Total files' as metric,
    COUNT(*) as count
FROM files
UNION ALL
SELECT 
    'Processed files' as metric,
    COUNT(*) as count
FROM files
WHERE processed = TRUE
UNION ALL
SELECT 
    'Unprocessed files' as metric,
    COUNT(*) as count
FROM files
WHERE processed = FALSE
UNION ALL
SELECT 
    'Files in queue' as metric,
    COUNT(*) as count
FROM processing_queue
UNION ALL
SELECT 
    'Completed in queue' as metric,
    COUNT(*) as count
FROM processing_queue
WHERE status = 'completed';