CREATE TABLE "practitioners" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"organization_id" uuid NOT NULL,
	"specialty" text,
	"license_number" text,
	"npi" text,
	"created_at" integer DEFAULT extract(epoch from now())::integer NOT NULL,
	"updated_at" integer DEFAULT extract(epoch from now())::integer NOT NULL,
	CONSTRAINT "practitioners_user_id_unique" UNIQUE("user_id")
);
--> statement-breakpoint
ALTER TABLE "practitioners" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "patients" DROP CONSTRAINT "patients_practitioner_id_profiles_user_id_fk";
--> statement-breakpoint
ALTER TABLE "practitioners" ADD CONSTRAINT "practitioners_user_id_profiles_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."profiles"("user_id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "practitioners" ADD CONSTRAINT "practitioners_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "patients" ADD CONSTRAINT "patients_practitioner_id_practitioners_id_fk" FOREIGN KEY ("practitioner_id") REFERENCES "public"."practitioners"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE POLICY "platform admin can manage practitioners" ON "practitioners" AS PERMISSIVE FOR ALL TO "authenticated" USING ((SELECT role FROM profiles WHERE user_id = auth.uid()) = 'platform_admin') WITH CHECK ((SELECT role FROM profiles WHERE user_id = auth.uid()) = 'platform_admin');--> statement-breakpoint
CREATE POLICY "organization admin can manage organization practitioners" ON "practitioners" AS PERMISSIVE FOR ALL TO "authenticated" USING ((SELECT role FROM profiles WHERE user_id = auth.uid()) = 'organization_admin' AND "practitioners"."organization_id" = (SELECT organization_id FROM profiles WHERE user_id = auth.uid())) WITH CHECK ((SELECT role FROM profiles WHERE user_id = auth.uid()) = 'organization_admin' AND "practitioners"."organization_id" = (SELECT organization_id FROM profiles WHERE user_id = auth.uid()));--> statement-breakpoint
CREATE POLICY "practitioners can read own record" ON "practitioners" AS PERMISSIVE FOR SELECT TO "authenticated" USING ("practitioners"."user_id" = auth.uid());--> statement-breakpoint
CREATE POLICY "organization members can read organization practitioners" ON "practitioners" AS PERMISSIVE FOR SELECT TO "authenticated" USING ("practitioners"."organization_id" = (SELECT organization_id FROM profiles WHERE user_id = auth.uid()));