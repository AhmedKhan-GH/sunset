"use client";

import { useEffect } from "react";
import { createClient } from "./client";

export function useRealtimeNotes(
  organizationId: string,
  onInsert: () => void,
) {
  useEffect(() => {
    if (!organizationId) return;

    const supabase = createClient();

    const channel = supabase
      .channel(`notes-${organizationId}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "patient_notes",
          filter: `organization_id=eq.${organizationId}`,
        },
        () => {
          onInsert();
        },
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [organizationId, onInsert]);
}
