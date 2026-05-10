"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";

type Org = {
  id: string;
  name: string;
  created_at: number;
  updated_at: number;
};

type Event = {
  id: string;
  time: string;
  type: "INSERT" | "UPDATE" | "DELETE";
  name: string;
};

type Ping = {
  id: string;
  message: string;
  fired_at: string;
};

export function LiveFeed({
  initialOrgs,
  initialPings,
}: {
  initialOrgs: Org[];
  initialPings: Ping[];
}) {
  const [orgs, setOrgs] = useState<Org[]>(initialOrgs);
  const [events, setEvents] = useState<Event[]>([]);
  const [pings, setPings] = useState<Ping[]>(initialPings);
  const [status, setStatus] = useState<string>("connecting…");

  useEffect(() => {
    const supabase = createClient();
    let channel: ReturnType<typeof supabase.channel> | null = null;
    let cancelled = false;

    (async () => {
      // ─── THIS IS WHAT MAKES REALTIME WORK FOR COOKIE-BACKED SESSIONS ──
      // The browser client hydrates the session from cookies, but the
      // realtime sub-client doesn't always have the JWT pinned by the
      // time we subscribe. Without the JWT, the channel connects as anon
      // and RLS hides every event. Pull the session and call setAuth
      // before subscribing to guarantee the JWT is attached.
      const {
        data: { session },
      } = await supabase.auth.getSession();
      if (cancelled) return;
      if (!session) {
        setStatus("no session");
        return;
      }
      await supabase.realtime.setAuth(session.access_token);
      // ──────────────────────────────────────────────────────────────────

      channel = supabase
        .channel("admin-live-orgs")
        .on(
          "postgres_changes",
          { event: "INSERT", schema: "public", table: "cron_pings" },
          (payload) => {
            const p = payload.new as Ping;
            setPings((prev) => [p, ...prev].slice(0, 20));
          },
        )
        .on(
          "postgres_changes",
          { event: "*", schema: "public", table: "organizations" },
          (payload) => {
            const row = (payload.new ?? payload.old) as Org;
            setEvents((prev) =>
              [
                {
                  id: crypto.randomUUID(),
                  time: new Date().toLocaleTimeString(),
                  type: payload.eventType as Event["type"],
                  name: row?.name ?? "(unknown)",
                },
                ...prev,
              ].slice(0, 20),
            );

            if (payload.eventType === "INSERT") {
              setOrgs((prev) => [...prev, payload.new as Org]);
            } else if (payload.eventType === "UPDATE") {
              setOrgs((prev) =>
                prev.map((o) =>
                  o.id === (payload.new as Org).id ? (payload.new as Org) : o,
                ),
              );
            } else if (payload.eventType === "DELETE") {
              setOrgs((prev) =>
                prev.filter((o) => o.id !== (payload.old as Org).id),
              );
            }
          },
        )
        .subscribe((s) => setStatus(s));
    })();

    return () => {
      cancelled = true;
      if (channel) supabase.removeChannel(channel);
    };
  }, []);

  return (
    <div className="mx-auto w-full max-w-3xl p-8">
      <h1 className="text-2xl font-semibold">Live realtime demo</h1>
      <p className="mt-1 text-sm text-zinc-500">
        Channel status: <code>{status}</code>
      </p>
      <p className="mt-3 text-sm text-zinc-500">
        Open <code>/admin</code> in another tab. Create, rename, or delete an
        organization there. Watch this page update without a refresh.
      </p>

      <h2 className="mt-8 text-lg font-medium">
        Organizations ({orgs.length})
      </h2>
      <ul className="mt-3 space-y-1">
        {orgs.map((o) => (
          <li
            key={o.id}
            className="rounded border px-3 py-2 text-sm"
          >
            {o.name}
          </li>
        ))}
        {orgs.length === 0 && (
          <li className="text-sm text-zinc-400">No organizations.</li>
        )}
      </ul>

      <h2 className="mt-8 text-lg font-medium">
        Live event log (last {events.length})
      </h2>
      {events.length === 0 ? (
        <p className="mt-3 text-sm text-zinc-400">
          Nothing yet. Create an org in another tab.
        </p>
      ) : (
        <ul className="mt-3 space-y-1 font-mono text-xs">
          {events.map((e) => (
            <li key={e.id} className="rounded border px-3 py-2">
              <span className="text-zinc-400">[{e.time}]</span>{" "}
              <strong
                className={
                  e.type === "INSERT"
                    ? "text-green-600"
                    : e.type === "DELETE"
                      ? "text-red-600"
                      : "text-blue-600"
                }
              >
                {e.type}
              </strong>{" "}
              {e.name}
            </li>
          ))}
        </ul>
      )}

      <h2 className="mt-8 text-lg font-medium">pg_cron pings ({pings.length})</h2>
      <p className="text-xs text-zinc-400">
        Scheduled job <code>demo-ping</code> fires daily at 00:40 UTC (5:40 PM PDT).
      </p>
      {pings.length === 0 ? (
        <p className="mt-3 text-sm text-zinc-400">
          No pings yet. Wait for the scheduled time.
        </p>
      ) : (
        <ul className="mt-3 space-y-1 font-mono text-xs">
          {pings.map((p) => (
            <li
              key={p.id}
              className="rounded border border-purple-300 bg-purple-50 px-3 py-2 dark:border-purple-700 dark:bg-purple-950"
            >
              <span className="text-zinc-400">
                [{new Date(p.fired_at).toLocaleTimeString()}]
              </span>{" "}
              <strong className="text-purple-700 dark:text-purple-300">
                PING
              </strong>{" "}
              {p.message}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
