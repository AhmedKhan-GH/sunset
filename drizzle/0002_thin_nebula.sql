ALTER TABLE "patients" ADD COLUMN "user_id" uuid;--> statement-breakpoint
ALTER TABLE "patients" ADD CONSTRAINT "patients_user_id_unique" UNIQUE("user_id");--> statement-breakpoint
DROP POLICY "platform admin can manage profiles" ON "profiles" CASCADE;--> statement-breakpoint
DROP POLICY "org admin can manage profiles in own org" ON "profiles" CASCADE;--> statement-breakpoint
CREATE POLICY "patient can read own record" ON "patients" AS PERMISSIVE FOR SELECT TO "authenticated" USING ("patients"."user_id" = auth.uid());--> statement-breakpoint
CREATE POLICY "patient can manage own relatives" ON "relatives" AS PERMISSIVE FOR ALL TO "authenticated" USING (EXISTS (
        SELECT 1 FROM patients p
        WHERE p.id = "relatives"."patient_id" AND p.user_id = auth.uid()
      )) WITH CHECK (EXISTS (
        SELECT 1 FROM patients p
        WHERE p.id = "relatives"."patient_id" AND p.user_id = auth.uid()
      ));