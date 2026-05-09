CREATE TABLE "patients" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"org_id" uuid NOT NULL,
	"practitioner_id" uuid,
	"name" text NOT NULL,
	"date_of_birth" date NOT NULL,
	"gender" text NOT NULL,
	"created_at" integer DEFAULT extract(epoch from now())::integer NOT NULL,
	"updated_at" integer DEFAULT extract(epoch from now())::integer NOT NULL
);
--> statement-breakpoint
ALTER TABLE "patients" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "relatives" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"patient_id" uuid NOT NULL,
	"name" text NOT NULL,
	"relationship" text NOT NULL,
	"created_at" integer DEFAULT extract(epoch from now())::integer NOT NULL
);
--> statement-breakpoint
ALTER TABLE "relatives" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "profiles" ADD COLUMN "org_id" uuid;--> statement-breakpoint
ALTER TABLE "patients" ADD CONSTRAINT "patients_org_id_organizations_id_fk" FOREIGN KEY ("org_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "patients" ADD CONSTRAINT "patients_practitioner_id_profiles_user_id_fk" FOREIGN KEY ("practitioner_id") REFERENCES "public"."profiles"("user_id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "relatives" ADD CONSTRAINT "relatives_patient_id_patients_id_fk" FOREIGN KEY ("patient_id") REFERENCES "public"."patients"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "profiles" ADD CONSTRAINT "profiles_org_id_organizations_id_fk" FOREIGN KEY ("org_id") REFERENCES "public"."organizations"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE POLICY "org members can read own org" ON "organizations" AS PERMISSIVE FOR SELECT TO "authenticated" USING ("organizations"."id" = (SELECT org_id FROM profiles WHERE user_id = auth.uid()));--> statement-breakpoint
CREATE POLICY "platform admin can manage profiles" ON "profiles" AS PERMISSIVE FOR ALL TO "authenticated" USING ((SELECT role FROM profiles WHERE user_id = auth.uid()) = 'platform_admin') WITH CHECK ((SELECT role FROM profiles WHERE user_id = auth.uid()) = 'platform_admin');--> statement-breakpoint
CREATE POLICY "org admin can manage profiles in own org" ON "profiles" AS PERMISSIVE FOR ALL TO "authenticated" USING ((SELECT role FROM profiles WHERE user_id = auth.uid()) = 'org_admin' AND "profiles"."org_id" = (SELECT org_id FROM profiles WHERE user_id = auth.uid())) WITH CHECK ((SELECT role FROM profiles WHERE user_id = auth.uid()) = 'org_admin' AND "profiles"."org_id" = (SELECT org_id FROM profiles WHERE user_id = auth.uid()));--> statement-breakpoint
CREATE POLICY "platform admin can manage patients" ON "patients" AS PERMISSIVE FOR ALL TO "authenticated" USING ((SELECT role FROM profiles WHERE user_id = auth.uid()) = 'platform_admin') WITH CHECK ((SELECT role FROM profiles WHERE user_id = auth.uid()) = 'platform_admin');--> statement-breakpoint
CREATE POLICY "org admin can manage org patients" ON "patients" AS PERMISSIVE FOR ALL TO "authenticated" USING ((SELECT role FROM profiles WHERE user_id = auth.uid()) = 'org_admin' AND "patients"."org_id" = (SELECT org_id FROM profiles WHERE user_id = auth.uid())) WITH CHECK ((SELECT role FROM profiles WHERE user_id = auth.uid()) = 'org_admin' AND "patients"."org_id" = (SELECT org_id FROM profiles WHERE user_id = auth.uid()));--> statement-breakpoint
CREATE POLICY "practitioner can manage org patients" ON "patients" AS PERMISSIVE FOR ALL TO "authenticated" USING ((SELECT role FROM profiles WHERE user_id = auth.uid()) = 'practitioner' AND "patients"."org_id" = (SELECT org_id FROM profiles WHERE user_id = auth.uid())) WITH CHECK ((SELECT role FROM profiles WHERE user_id = auth.uid()) = 'practitioner' AND "patients"."org_id" = (SELECT org_id FROM profiles WHERE user_id = auth.uid()));--> statement-breakpoint
CREATE POLICY "platform admin can manage relatives" ON "relatives" AS PERMISSIVE FOR ALL TO "authenticated" USING ((SELECT role FROM profiles WHERE user_id = auth.uid()) = 'platform_admin') WITH CHECK ((SELECT role FROM profiles WHERE user_id = auth.uid()) = 'platform_admin');--> statement-breakpoint
CREATE POLICY "org members can manage relatives of org patients" ON "relatives" AS PERMISSIVE FOR ALL TO "authenticated" USING (
        (SELECT role FROM profiles WHERE user_id = auth.uid()) IN ('org_admin', 'practitioner')
        AND EXISTS (
          SELECT 1 FROM patients p
          WHERE p.id = "relatives"."patient_id"
          AND p.org_id = (SELECT org_id FROM profiles WHERE user_id = auth.uid())
        )
      ) WITH CHECK (
        (SELECT role FROM profiles WHERE user_id = auth.uid()) IN ('org_admin', 'practitioner')
        AND EXISTS (
          SELECT 1 FROM patients p
          WHERE p.id = "relatives"."patient_id"
          AND p.org_id = (SELECT org_id FROM profiles WHERE user_id = auth.uid())
        )
      );