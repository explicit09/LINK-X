-- Add description column to Module table if it doesn't exist
ALTER TABLE "Module" ADD COLUMN IF NOT EXISTS description TEXT;
