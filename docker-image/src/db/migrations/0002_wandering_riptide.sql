DO $$ BEGIN
  CREATE TABLE IF NOT EXISTS "Message" (
    "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
    "chatId" uuid NOT NULL,
    "role" varchar NOT NULL,
    "content" json NOT NULL,
    "createdAt" timestamp NOT NULL
  );
EXCEPTION
  WHEN duplicate_table THEN null;
END $$;

DO $$ BEGIN
  CREATE TABLE IF NOT EXISTS "Vote" (
    "chatId" uuid NOT NULL,
    "messageId" uuid NOT NULL,
    "isUpvoted" boolean NOT NULL,
    CONSTRAINT "Vote_chatId_messageId_pk" PRIMARY KEY("chatId","messageId")
  );
EXCEPTION
  WHEN duplicate_table THEN null;
END $$;

DO $$ BEGIN
  ALTER TABLE "Chat" ADD COLUMN "title" text NOT NULL;
EXCEPTION
  WHEN duplicate_column THEN 
    RAISE NOTICE 'Column title already exists in Chat table. Skipping.';
  WHEN undefined_table THEN 
    RAISE NOTICE 'Table Chat does not exist. Skipping.';
END $$;

DO $$ BEGIN
  ALTER TABLE "Message" ADD CONSTRAINT "Message_chatId_Chat_id_fk" 
    FOREIGN KEY ("chatId") REFERENCES "Chat"("id") ON DELETE CASCADE;
EXCEPTION
  WHEN duplicate_object THEN null;
  WHEN undefined_table THEN 
    RAISE NOTICE 'Table Message or Chat does not exist. Skipping constraint.';
  WHEN undefined_column THEN 
    RAISE NOTICE 'Required columns do not exist. Skipping constraint.';
END $$;

DO $$ BEGIN
  ALTER TABLE "Vote" ADD CONSTRAINT "Vote_chatId_Chat_id_fk" 
    FOREIGN KEY ("chatId") REFERENCES "Chat"("id") ON DELETE CASCADE;
EXCEPTION
  WHEN duplicate_object THEN null;
  WHEN undefined_table THEN 
    RAISE NOTICE 'Table Vote or Chat does not exist. Skipping constraint.';
  WHEN undefined_column THEN 
    RAISE NOTICE 'Required columns do not exist. Skipping constraint.';
END $$;

DO $$ BEGIN
  ALTER TABLE "Vote" ADD CONSTRAINT "Vote_messageId_Message_id_fk" 
    FOREIGN KEY ("messageId") REFERENCES "Message"("id") ON DELETE CASCADE;
EXCEPTION
  WHEN duplicate_object THEN null;
  WHEN undefined_table THEN 
    RAISE NOTICE 'Table Vote or Message does not exist. Skipping constraint.';
  WHEN undefined_column THEN 
    RAISE NOTICE 'Required columns do not exist. Skipping constraint.';
END $$;
--> statement-breakpoint
ALTER TABLE "Chat" DROP COLUMN IF EXISTS "messages";