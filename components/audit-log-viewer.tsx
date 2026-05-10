"use client";

import { useState, useTransition, useCallback } from "react";
import { getAuditLogs } from "@/app/organization/actions";
import { useRealtimeAudit } from "@/lib/supabase/use-realtime-audit";

type AuditEntry = {
  id: number;
  timestamp: string;
  actor_id: string;
  action: string;
  table_name: string;
  record_id: string | null;
  metadata: unknown;
  actor_name: string | null;
};

export function AuditLogViewer({
  initialLogs,
  organizationId,
}: {
  initialLogs: AuditEntry[];
  organizationId: string;
}) {
  const [logs, setLogs] = useState(initialLogs);
  const [, startTransition] = useTransition();

  const refetch = useCallback(() => {
    startTransition(async () => {
      const fresh = await getAuditLogs();
      setLogs(fresh);
    });
  }, []);

  useRealtimeAudit(organizationId, refetch);

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-left text-sm">
        <thead className="border-b text-xs text-zinc-500">
          <tr>
            <th className="pb-2 pr-4">Time</th>
            <th className="pb-2 pr-4">Actor</th>
            <th className="pb-2 pr-4">Action</th>
            <th className="pb-2 pr-4">Table</th>
            <th className="pb-2">Record</th>
          </tr>
        </thead>
        <tbody>
          {logs.map((log) => (
            <tr key={log.id} className="border-b last:border-0">
              <td className="py-2 pr-4 whitespace-nowrap text-zinc-500">
                {new Date(log.timestamp).toLocaleString()}
              </td>
              <td className="py-2 pr-4">
                {log.actor_name ?? log.actor_id.slice(0, 8)}
              </td>
              <td className="py-2 pr-4 font-medium">{log.action}</td>
              <td className="py-2 pr-4 text-zinc-500">{log.table_name}</td>
              <td className="py-2 font-mono text-xs text-zinc-400">
                {log.record_id?.slice(0, 8) ?? "—"}
              </td>
            </tr>
          ))}
          {logs.length === 0 && (
            <tr>
              <td colSpan={5} className="py-4 text-center text-zinc-400">
                No audit events yet.
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}
