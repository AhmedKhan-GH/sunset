CREATE TABLE "patients" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" uuid NOT NULL,
	"practitioner_id" uuid,
	"user_id" uuid,
	"name" text NOT NULL,
	"date_of_birth" date NOT NULL,
	"gender" text NOT NULL,
	"created_at" integer DEFAULT extract(epoch from now())::integer NOT NULL,
	"updated_at" integer DEFAULT extract(epoch from now())::integer NOT NULL,
	CONSTRAINT "patients_user_id_unique" UNIQUE("user_id")
);
--> statement-breakpoint
ALTER TABLE "patients" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "relatives" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"patient_id" uuid NOT NULL,
	"user_id" uuid,
	"name" text NOT NULL,
	"relationship" text NOT NULL,
	"created_at" integer DEFAULT extract(epoch from now())::integer NOT NULL,
	CONSTRAINT "relatives_user_id_unique" UNIQUE("user_id")
);
--> statement-breakpoint
ALTER TABLE "relatives" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "profiles" ADD COLUMN "organization_id" uuid;--> statement-breakpoint
ALTER TABLE "patients" ADD CONSTRAINT "patients_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "patients" ADD CONSTRAINT "patients_practitioner_id_profiles_user_id_fk" FOREIGN KEY ("practitioner_id") REFERENCES "public"."profiles"("user_id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "relatives" ADD CONSTRAINT "relatives_patient_id_patients_id_fk" FOREIGN KEY ("patient_id") REFERENCES "public"."patients"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "profiles" ADD CONSTRAINT "profiles_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE POLICY "organization members can read own organization" ON "organizations" AS PERMISSIVE FOR SELECT TO "authenticated" USING ("organizations"."id" = (SELECT organization_id FROM profiles WHERE user_id = auth.uid()));--> statement-breakpoint
CREATE POLICY "platform admin can manage patients" ON "patients" AS PERMISSIVE FOR ALL TO "authenticated" USING ((SELECT role FROM profiles WHERE user_id = auth.uid()) = 'platform_admin') WITH CHECK ((SELECT role FROM profiles WHERE user_id = auth.uid()) = 'platform_admin');--> statement-breakpoint
CREATE POLICY "organization admin can manage organization patients" ON "patients" AS PERMISSIVE FOR ALL TO "authenticated" USING ((SELECT role FROM profiles WHERE user_id = auth.uid()) = 'organization_admin' AND "patients"."organization_id" = (SELECT organization_id FROM profiles WHERE user_id = auth.uid())) WITH CHECK ((SELECT role FROM profiles WHERE user_id = auth.uid()) = 'organization_admin' AND "patients"."organization_id" = (SELECT organization_id FROM profiles WHERE user_id = auth.uid()));--> statement-breakpoint
CREATE POLICY "practitioner can manage organization patients" ON "patients" AS PERMISSIVE FOR ALL TO "authenticated" USING ((SELECT role FROM profiles WHERE user_id = auth.uid()) = 'practitioner' AND "patients"."organization_id" = (SELECT organization_id FROM profiles WHERE user_id = auth.uid())) WITH CHECK ((SELECT role FROM profiles WHERE user_id = auth.uid()) = 'practitioner' AND "patients"."organization_id" = (SELECT organization_id FROM profiles WHERE user_id = auth.uid()));--> statement-breakpoint
CREATE POLICY "patient can read own record" ON "patients" AS PERMISSIVE FOR SELECT TO "authenticated" USING ("patients"."user_id" = auth.uid());--> statement-breakpoint
CREATE POLICY "platform admin can manage relatives" ON "relatives" AS PERMISSIVE FOR ALL TO "authenticated" USING ((SELECT role FROM profiles WHERE user_id = auth.uid()) = 'platform_admin') WITH CHECK ((SELECT role FROM profiles WHERE user_id = auth.uid()) = 'platform_admin');--> statement-breakpoint
CREATE POLICY "patient can manage own relatives" ON "relatives" AS PERMISSIVE FOR ALL TO "authenticated" USING (EXISTS (
        SELECT 1 FROM patients p
        WHERE p.id = "relatives"."patient_id" AND p.user_id = auth.uid()
      )) WITH CHECK (EXISTS (
        SELECT 1 FROM patients p
        WHERE p.id = "relatives"."patient_id" AND p.user_id = auth.uid()
      ));--> statement-breakpoint
CREATE POLICY "relative can read own record" ON "relatives" AS PERMISSIVE FOR SELECT TO "authenticated" USING ("relatives"."user_id" = auth.uid());--> statement-breakpoint
CREATE POLICY "organization members can manage relatives of organization patients" ON "relatives" AS PERMISSIVE FOR ALL TO "authenticated" USING (
        (SELECT role FROM profiles WHERE user_id = auth.uid()) IN ('organization_admin', 'practitioner')
        AND EXISTS (
          SELECT 1 FROM patients p
          WHERE p.id = "relatives"."patient_id"
          AND p.organization_id = (SELECT organization_id FROM profiles WHERE user_id = auth.uid())
        )
      ) WITH CHECK (
        (SELECT role FROM profiles WHERE user_id = auth.uid()) IN ('organization_admin', 'practitioner')
        AND EXISTS (
          SELECT 1 FROM patients p
          WHERE p.id = "relatives"."patient_id"
          AND p.organization_id = (SELECT organization_id FROM profiles WHERE user_id = auth.uid())
        )
      );