CREATE TABLE IF NOT EXISTS "Professor" (
    "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    "email" VARCHAR(64) NOT NULL UNIQUE,
    "password" VARCHAR(255) NOT NULL,
    "firebase_uid" VARCHAR(128)
);

CREATE TABLE IF NOT EXISTS "Student" (
    "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    "email" VARCHAR(64) NOT NULL UNIQUE,
    "password" VARCHAR(255) NOT NULL,
    "firebase_uid" VARCHAR(128)
);

CREATE TABLE IF NOT EXISTS "Onboarding" (
    "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    "student_id" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "answers" JSONB NOT NULL,
    "quizzes" BOOLEAN NOT NULL DEFAULT FALSE,
    "created_at" TIMESTAMP NOT NULL DEFAULT now(),
    CONSTRAINT fk_onboarding_student FOREIGN KEY("student_id") REFERENCES "Student"("id") ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS "Course" (
    "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    "title" VARCHAR(128) NOT NULL,
    "description" TEXT,
    "created_at" TIMESTAMP NOT NULL DEFAULT now(),
    "index_pkl" BYTEA,
    "professor_id" UUID NOT NULL,
    CONSTRAINT fk_course_professor FOREIGN KEY("professor_id") REFERENCES "Professor"("id") ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS "AccessCode" (
    "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    "code" VARCHAR(32) NOT NULL UNIQUE,
    "course_id" UUID NOT NULL,
    "created_at" TIMESTAMP NOT NULL DEFAULT now(),
    CONSTRAINT fk_accesscode_course FOREIGN KEY("course_id") REFERENCES "Course"("id") ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS "Enrollment" (
    "student_id" UUID NOT NULL,
    "course_id" UUID NOT NULL,
    "enrolled_at" TIMESTAMP NOT NULL DEFAULT now(),
    PRIMARY KEY ("student_id", "course_id"),
    CONSTRAINT fk_enroll_student FOREIGN KEY("student_id") REFERENCES "Student"("id") ON DELETE CASCADE,
    CONSTRAINT fk_enroll_course FOREIGN KEY("course_id") REFERENCES "Course"("id") ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS "File" (
    "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    "filename" VARCHAR NOT NULL,
    "file_type" VARCHAR NOT NULL,
    "file_size" INTEGER NOT NULL,
    "file_data" BYTEA NOT NULL,
    "created_at" TIMESTAMP NOT NULL DEFAULT now(),
    "course_id" UUID NOT NULL,
    CONSTRAINT fk_file_course FOREIGN KEY("course_id") REFERENCES "Course"("id") ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS "PersonalizedFile" (
    "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    "student_id" UUID NOT NULL,
    "original_file_id" UUID,
    "content" JSONB NOT NULL,
    "created_at" TIMESTAMP NOT NULL DEFAULT now(),
    CONSTRAINT fk_pfile_student FOREIGN KEY("student_id") REFERENCES "Student"("id") ON DELETE CASCADE,
    CONSTRAINT fk_pfile_original FOREIGN KEY("original_file_id") REFERENCES "File"("id") ON DELETE SET NULL
);

CREATE TABLE IF NOT EXISTS "Chat" (
    "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    "student_id" UUID NOT NULL,
    "file_id" UUID,
    "created_at" TIMESTAMP NOT NULL DEFAULT now(),
    "title" TEXT NOT NULL,
    CONSTRAINT fk_chat_student FOREIGN KEY("student_id") REFERENCES "Student"("id") ON DELETE CASCADE,
    CONSTRAINT fk_chat_file FOREIGN KEY("file_id") REFERENCES "File"("id") ON DELETE SET NULL
);

CREATE TABLE IF NOT EXISTS "Message" (
    "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    "chat_id" UUID NOT NULL,
    "role" VARCHAR NOT NULL,
    "content" TEXT NOT NULL,
    "created_at" TIMESTAMP NOT NULL DEFAULT now(),
    CONSTRAINT fk_message_chat FOREIGN KEY("chat_id") REFERENCES "Chat"("id") ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS "Report" (
    "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    "course_id" UUID NOT NULL,
    "file_id" UUID,
    "summary" JSONB NOT NULL,
    "created_at" TIMESTAMP NOT NULL DEFAULT now(),
    CONSTRAINT fk_report_course FOREIGN KEY("course_id") REFERENCES "Course"("id") ON DELETE CASCADE,
    CONSTRAINT fk_report_file FOREIGN KEY("file_id") REFERENCES "File"("id") ON DELETE SET NULL
);