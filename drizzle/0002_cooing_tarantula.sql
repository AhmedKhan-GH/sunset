ALTER POLICY "patient can manage own relatives" ON "relatives" TO authenticated USING (EXISTS (
        SELECT 1 FROM patients p
        WHERE p.id = "relatives"."patient_id" AND p.user_id = auth.uid()
      )) WITH CHECK (EXISTS (
        SELECT 1 FROM patients p
        WHERE p.id = "relatives"."patient_id" AND p.user_id = auth.uid()
      ));