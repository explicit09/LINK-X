DO $$ BEGIN
  CREATE TABLE IF NOT EXISTS "Suggestion" (
    "id" uuid DEFAULT gen_random_uuid() NOT NULL,
    "document_id" uuid NOT NULL,
    "document_created_at" timestamp NOT NULL,
    "original_text" text NOT NULL,
    "suggested_text" text NOT NULL,
    "description" text,
    "is_resolved" boolean DEFAULT false NOT NULL,
    "user_id" uuid NOT NULL,
    "created_at" timestamp NOT NULL,
    CONSTRAINT "Suggestion_id_pk" PRIMARY KEY("id")
  );
EXCEPTION
  WHEN duplicate_table THEN null;
END $$;

DO $$ BEGIN
  CREATE TABLE IF NOT EXISTS "Document" (
    "id" uuid DEFAULT gen_random_uuid() NOT NULL,
    "created_at" timestamp NOT NULL,
    "title" text NOT NULL,
    "content" text,
    "user_id" uuid NOT NULL,
    CONSTRAINT "Document_id_created_at_pk" PRIMARY KEY("id","created_at")
  );
EXCEPTION
  WHEN duplicate_table THEN null;
END $$;

DO $$ BEGIN
  ALTER TABLE "Suggestion" ADD CONSTRAINT "Suggestion_user_id_User_id_fk" 
    FOREIGN KEY ("user_id") REFERENCES "User"("id") ON DELETE CASCADE;
EXCEPTION
  WHEN duplicate_object THEN null;
  WHEN undefined_table THEN 
    RAISE NOTICE 'Table Suggestion does not exist. Skipping constraint.';
  WHEN undefined_column THEN 
    RAISE NOTICE 'Column user_id does not exist. Skipping constraint.';
END $$;

DO $$ BEGIN
  ALTER TABLE "Suggestion" ADD CONSTRAINT "Suggestion_document_id_document_created_at_Document_id_created_at_fk" 
    FOREIGN KEY ("document_id","document_created_at") REFERENCES "Document"("id","created_at") ON DELETE CASCADE;
EXCEPTION
  WHEN duplicate_object THEN null;
  WHEN undefined_table THEN 
    RAISE NOTICE 'Table Suggestion or Document does not exist. Skipping constraint.';
  WHEN undefined_column THEN 
    RAISE NOTICE 'Required columns do not exist. Skipping constraint.';
END $$;

DO $$ BEGIN
  ALTER TABLE "Document" ADD CONSTRAINT "Document_user_id_User_id_fk" 
    FOREIGN KEY ("user_id") REFERENCES "User"("id") ON DELETE CASCADE;
EXCEPTION
  WHEN duplicate_object THEN null;
  WHEN undefined_table THEN 
    RAISE NOTICE 'Table Document does not exist. Skipping constraint.';
  WHEN undefined_column THEN 
    RAISE NOTICE 'Column user_id does not exist. Skipping constraint.';
END $$;
