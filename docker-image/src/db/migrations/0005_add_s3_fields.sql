-- Add S3 storage fields to File table
ALTER TABLE "File" 
ADD COLUMN s3_key VARCHAR(512),
ADD COLUMN s3_bucket VARCHAR(255);

-- Make file_data nullable since we'll store in S3
ALTER TABLE "File" 
ALTER COLUMN file_data DROP NOT NULL;

-- Add index for faster S3 key lookups
CREATE INDEX idx_file_s3_key ON "File"(s3_key) WHERE s3_key IS NOT NULL;

-- Add storage type to track where file is stored
ALTER TABLE "File"
ADD COLUMN storage_type VARCHAR(20) DEFAULT 'database' CHECK (storage_type IN ('database', 's3'));

-- Update existing files to have storage_type = 'database'
UPDATE "File" SET storage_type = 'database' WHERE file_data IS NOT NULL;