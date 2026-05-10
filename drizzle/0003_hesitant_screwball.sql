CREATE TABLE "conversations" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"title" text,
	"created_at" integer DEFAULT extract(epoch from now())::integer NOT NULL,
	"updated_at" integer DEFAULT extract(epoch from now())::integer NOT NULL
);
--> statement-breakpoint
ALTER TABLE "conversations" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "messages" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"conversation_id" uuid NOT NULL,
	"role" text NOT NULL,
	"content" text NOT NULL,
	"tool_name" text,
	"tool_input" jsonb,
	"tool_output" jsonb,
	"created_at" integer DEFAULT extract(epoch from now())::integer NOT NULL
);
--> statement-breakpoint
ALTER TABLE "messages" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "messages" ADD CONSTRAINT "messages_conversation_id_conversations_id_fk" FOREIGN KEY ("conversation_id") REFERENCES "public"."conversations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE POLICY "users can read own conversations" ON "conversations" AS PERMISSIVE FOR SELECT TO "authenticated" USING ("conversations"."user_id" = auth.uid());--> statement-breakpoint
CREATE POLICY "users can create own conversations" ON "conversations" AS PERMISSIVE FOR INSERT TO "authenticated" WITH CHECK ("conversations"."user_id" = auth.uid());--> statement-breakpoint
CREATE POLICY "users can read own conversation messages" ON "messages" AS PERMISSIVE FOR SELECT TO "authenticated" USING (EXISTS (
        SELECT 1 FROM conversations c
        WHERE c.id = "messages"."conversation_id" AND c.user_id = auth.uid()
      ));--> statement-breakpoint
CREATE POLICY "users can insert own conversation messages" ON "messages" AS PERMISSIVE FOR INSERT TO "authenticated" WITH CHECK (EXISTS (
        SELECT 1 FROM conversations c
        WHERE c.id = "messages"."conversation_id" AND c.user_id = auth.uid()
      ));