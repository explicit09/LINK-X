DO $$ BEGIN
  -- Make instructor_id nullable
  ALTER TABLE "Course" ALTER COLUMN instructor_id DROP NOT NULL;
EXCEPTION
  WHEN undefined_column THEN 
    RAISE NOTICE 'Column instructor_id does not exist. Skipping.';
  WHEN undefined_table THEN 
    RAISE NOTICE 'Table Course does not exist. Skipping.';
END $$;

DO $$ BEGIN
  -- Add creator_id column
  ALTER TABLE "Course" ADD COLUMN creator_id UUID REFERENCES "User"(id) ON DELETE SET NULL;
EXCEPTION
  WHEN duplicate_column THEN 
    RAISE NOTICE 'Column creator_id already exists. Skipping.';
  WHEN undefined_table THEN 
    RAISE NOTICE 'Table Course does not exist. Skipping.';
END $$;

DO $$ BEGIN
  -- For existing courses, set creator_id to be the same as instructor_id
  UPDATE "Course" SET creator_id = instructor_id WHERE creator_id IS NULL;
EXCEPTION
  WHEN undefined_column THEN 
    RAISE NOTICE 'Required columns do not exist. Skipping update.';
  WHEN undefined_table THEN 
    RAISE NOTICE 'Table Course does not exist. Skipping update.';
END $$;
