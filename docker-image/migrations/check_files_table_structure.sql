-- Check the structure of the files table to see what columns it has
SELECT 
    column_name, 
    data_type, 
    is_nullable,
    column_default
FROM information_schema.columns
WHERE table_name = 'files'
ORDER BY ordinal_position;