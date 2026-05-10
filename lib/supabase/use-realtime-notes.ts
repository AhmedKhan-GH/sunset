"use client";

import { useEffect } from "react";
import { createClient } from "./client";

type RealtimePayload = {
  new: Record<string, unknown>;
  old: Record<string, unknown>;
  eventType: "INSERT" | "UPDATE" | "DELETE";
};

export function useRealtimeNotes(
  organizationId: string,
  onInsert: (payload: Record<string, unknown>) => void,
) {
  useEffect(() => {
    const supabase = createClient();

    const channel = supabase
      .channel("notes-realtime")
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "patient_notes",
          filter: `organization_id=eq.${organizationId}`,
        },
        (payload: RealtimePayload) => {
          onInsert(payload.new);
        },
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [organizationId, onInsert]);
}
