"use client";

import { useEffect } from "react";
import { createClient } from "./client";

export function useRealtimeAudit(
  organizationId: string,
  onInsert: () => void,
) {
  useEffect(() => {
    if (!organizationId) return;

    const supabase = createClient();

    const channel = supabase
      .channel(`audit-${organizationId}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "audit",
          table: "log",
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
