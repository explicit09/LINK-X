-- Drop the existing foreign key constraint
ALTER TABLE "Course" DROP CONSTRAINT IF EXISTS "Course_instructor_id_fkey";

-- Add a new foreign key constraint that allows NULL values
ALTER TABLE "Course" 
ADD CONSTRAINT "Course_instructor_id_fkey" 
FOREIGN KEY (instructor_id) 
REFERENCES "InstructorProfile"(user_id) 
ON DELETE SET NULL;
