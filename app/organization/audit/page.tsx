import { getAuditLogs, getMyOrganization } from "../actions";
import { AuditLogViewer } from "@/components/audit-log-viewer";

export default async function AuditPage() {
  const [logs, organization] = await Promise.all([
    getAuditLogs(),
    getMyOrganization(),
  ]);

  return (
    <div className="mx-auto w-full max-w-3xl p-8">
      <h1 className="text-2xl font-semibold">Audit Log</h1>
      <p className="mt-1 text-sm text-zinc-500">
        Record of all clinically significant operations in your organization.
      </p>

      <div className="mt-6">
        <AuditLogViewer
          initialLogs={logs}
          organizationId={organization.id}
        />
      </div>
    </div>
  );
}
