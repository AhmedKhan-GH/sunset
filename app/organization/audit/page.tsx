import { getAuditLogs } from "../actions";

export default async function AuditPage() {
  const logs = await getAuditLogs();

  return (
    <div className="mx-auto w-full max-w-3xl p-8">
      <h1 className="text-2xl font-semibold">Audit Log</h1>
      <p className="mt-1 text-sm text-zinc-500">
        Record of all clinically significant operations in your organization.
      </p>

      <div className="mt-6 overflow-x-auto">
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
    </div>
  );
}
