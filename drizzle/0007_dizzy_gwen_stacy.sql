CREATE TABLE "invite_codes" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"email" text NOT NULL,
	"code" text NOT NULL,
	"created_by" uuid NOT NULL,
	"used_at" integer,
	"created_at" integer DEFAULT extract(epoch from now())::integer NOT NULL,
	CONSTRAINT "invite_codes_code_unique" UNIQUE("code")
);
--> statement-breakpoint
ALTER TABLE "invite_codes" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE POLICY "organization members can read invite codes they created" ON "invite_codes" AS PERMISSIVE FOR SELECT TO "authenticated" USING (created_by = auth.uid());--> statement-breakpoint
CREATE POLICY "platform admin can manage all invite codes" ON "invite_codes" AS PERMISSIVE FOR ALL TO "authenticated" USING ((SELECT role FROM profiles WHERE user_id = auth.uid()) = 'platform_admin') WITH CHECK ((SELECT role FROM profiles WHERE user_id = auth.uid()) = 'platform_admin');