"use client";

import { useEffect, useRef, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import {
  listMyNotifications,
  markAsRead,
  markAllAsRead,
  type InboxNotification,
} from "@/lib/notifications/actions";

type Urgency = InboxNotification["urgency"];

const URGENCY_STYLES: Record<Urgency, string> = {
  urgent:
    "border-red-300 bg-red-50 dark:border-red-800 dark:bg-red-950",
  high:
    "border-amber-300 bg-amber-50 dark:border-amber-800 dark:bg-amber-950",
  normal:
    "border-zinc-200 bg-white dark:border-zinc-700 dark:bg-zinc-900",
  low:
    "border-zinc-100 bg-zinc-50 dark:border-zinc-800 dark:bg-zinc-900/40",
};

const URGENCY_DOT: Record<Urgency, string> = {
  urgent: "bg-red-500",
  high: "bg-amber-500",
  normal: "bg-zinc-400",
  low: "bg-zinc-300",
};

function formatTime(iso: string): string {
  const d = new Date(iso);
  const now = Date.now();
  const diff = (now - d.getTime()) / 1000;
  if (diff < 60) return "just now";
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  if (diff < 86400 * 7) return `${Math.floor(diff / 86400)}d ago`;
  return d.toLocaleDateString();
}

export function NotificationsInbox() {
  const [items, setItems] = useState<InboxNotification[]>([]);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const containerRef = useRef<HTMLDivElement>(null);

  // Initial fetch + realtime subscription.
  useEffect(() => {
    let cancelled = false;
    const supabase = createClient();

    type CleanupFn = () => void;
    let cleanup: CleanupFn | null = null;

    (async () => {
      const fresh = await listMyNotifications(20);
      if (cancelled) return;
      setItems(fresh);
      setLoading(false);

      const {
        data: { session },
      } = await supabase.auth.getSession();
      if (!session || cancelled) return;

      const userId = session.user.id;

      // RLS would otherwise hide the realtime payloads — must auth the
      // realtime socket before subscribing.
      await supabase.realtime.setAuth(session.access_token);

      const channel = supabase
        .channel(`notifications:${userId}`)
        .on(
          "postgres_changes",
          {
            event: "INSERT",
            schema: "public",
            table: "notifications",
            filter: `recipient_id=eq.${userId}`,
          },
          (payload) => {
            const row = payload.new as InboxNotification;
            setItems((prev) => {
              if (prev.some((p) => p.id === row.id)) return prev;
              return [row, ...prev].slice(0, 20);
            });
          },
        )
        .on(
          "postgres_changes",
          {
            event: "UPDATE",
            schema: "public",
            table: "notifications",
            filter: `recipient_id=eq.${userId}`,
          },
          (payload) => {
            const row = payload.new as InboxNotification;
            setItems((prev) =>
              prev.map((p) => (p.id === row.id ? { ...p, ...row } : p)),
            );
          },
        )
        .subscribe();

      cleanup = () => {
        supabase.removeChannel(channel);
      };
    })();

    return () => {
      cancelled = true;
      cleanup?.();
    };
  }, []);

  // Close on outside click.
  useEffect(() => {
    if (!open) return;
    function onClick(e: MouseEvent) {
      if (
        containerRef.current &&
        !containerRef.current.contains(e.target as Node)
      ) {
        setOpen(false);
      }
    }
    window.addEventListener("mousedown", onClick);
    return () => window.removeEventListener("mousedown", onClick);
  }, [open]);

  const unreadCount = items.filter((i) => !i.read_at).length;

  async function handleItemClick(n: InboxNotification) {
    if (n.read_at) return;
    setItems((prev) =>
      prev.map((p) =>
        p.id === n.id ? { ...p, read_at: new Date().toISOString() } : p,
      ),
    );
    await markAsRead(n.id);
  }

  async function handleMarkAll() {
    setItems((prev) =>
      prev.map((p) =>
        p.read_at ? p : { ...p, read_at: new Date().toISOString() },
      ),
    );
    await markAllAsRead();
  }

  return (
    <div ref={containerRef} className="relative">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-label="Notifications"
        className="relative inline-flex h-9 w-9 items-center justify-center rounded-full border border-zinc-200 bg-white text-zinc-600 hover:bg-zinc-50 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-300 dark:hover:bg-zinc-800"
      >
        <BellIcon />
        {unreadCount > 0 && (
          <span className="absolute -top-1 -right-1 inline-flex min-w-[1.25rem] items-center justify-center rounded-full bg-red-500 px-1.5 text-[10px] font-semibold text-white">
            {unreadCount > 99 ? "99+" : unreadCount}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 z-50 mt-2 w-96 max-w-[90vw] rounded-lg border border-zinc-200 bg-white shadow-lg dark:border-zinc-700 dark:bg-zinc-900">
          <div className="flex items-center justify-between border-b border-zinc-200 px-4 py-2 dark:border-zinc-700">
            <span className="text-sm font-medium">Notifications</span>
            <button
              type="button"
              onClick={handleMarkAll}
              disabled={unreadCount === 0}
              className="text-xs text-zinc-500 hover:text-zinc-900 disabled:opacity-50 dark:text-zinc-400 dark:hover:text-zinc-100"
            >
              Mark all read
            </button>
          </div>

          <ul className="max-h-[28rem] overflow-y-auto">
            {loading && (
              <li className="px-4 py-6 text-center text-sm text-zinc-400">
                Loading…
              </li>
            )}
            {!loading && items.length === 0 && (
              <li className="px-4 py-6 text-center text-sm text-zinc-400">
                No notifications yet.
              </li>
            )}
            {items.map((n) => (
              <li
                key={n.id}
                className="border-b border-zinc-100 last:border-0 dark:border-zinc-800"
              >
                <button
                  type="button"
                  onClick={() => handleItemClick(n)}
                  className={`flex w-full flex-col gap-1 border-l-4 px-4 py-3 text-left text-sm transition ${
                    URGENCY_STYLES[n.urgency]
                  } ${n.read_at ? "opacity-70" : ""}`}
                >
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2 min-w-0">
                      <span
                        className={`inline-block h-2 w-2 shrink-0 rounded-full ${URGENCY_DOT[n.urgency]}`}
                        aria-hidden
                      />
                      <span className="truncate font-medium text-zinc-900 dark:text-zinc-100">
                        {n.title}
                      </span>
                    </div>
                    <span className="shrink-0 text-[11px] text-zinc-400">
                      {formatTime(n.created_at)}
                    </span>
                  </div>
                  <p className="text-xs text-zinc-700 dark:text-zinc-300 whitespace-pre-wrap">
                    {n.body}
                  </p>
                  <p className="text-[11px] text-zinc-500 dark:text-zinc-400">
                    From {n.sender_label}
                  </p>
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

function BellIcon() {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      className="h-5 w-5"
      aria-hidden
    >
      <path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9" />
      <path d="M10.3 21a1.94 1.94 0 0 0 3.4 0" />
    </svg>
  );
}
