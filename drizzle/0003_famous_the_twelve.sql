ALTER TABLE "relatives" ADD COLUMN "user_id" uuid;--> statement-breakpoint
ALTER TABLE "relatives" ADD CONSTRAINT "relatives_user_id_unique" UNIQUE("user_id");--> statement-breakpoint
CREATE POLICY "relative can read related patient" ON "patients" AS PERMISSIVE FOR SELECT TO "authenticated" USING (EXISTS (
        SELECT 1 FROM relatives r
        WHERE r.patient_id = "patients"."id" AND r.user_id = auth.uid()
      ));--> statement-breakpoint
CREATE POLICY "relative can read own record" ON "relatives" AS PERMISSIVE FOR SELECT TO "authenticated" USING ("relatives"."user_id" = auth.uid());