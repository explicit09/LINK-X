-- Add description column to Module table
ALTER TABLE "Module" ADD COLUMN IF NOT EXISTS description TEXT;
