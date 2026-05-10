"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import {
  listMessages,
  markThreadRead,
  sendMessage,
  type DmMessage,
} from "@/lib/dm/actions";

interface DmPanelProps {
  threadId: string;
  /** The current user's id, so we can right-align their messages. */
  currentUserId: string;
  /** Optional display name for the other participant (header). */
  otherDisplayName?: string;
}

type LocalMessage = DmMessage & { pending?: boolean };

function tempId() {
  return `tmp_${Math.random().toString(36).slice(2)}_${Date.now()}`;
}

export function DmPanel({
  threadId,
  currentUserId,
  otherDisplayName,
}: DmPanelProps) {
  const [messages, setMessages] = useState<LocalMessage[]>([]);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const scrollRef = useRef<HTMLDivElement>(null);

  // Keep the latest message id list around for the realtime callback so we
  // don't re-render against a stale closure.
  const seenIdsRef = useRef<Set<string>>(new Set());

  const upsertMessage = useCallback((next: LocalMessage) => {
    setMessages((prev) => {
      // If we already have a real (non-pending) row with this id, skip.
      if (seenIdsRef.current.has(next.id) && !next.pending) {
        return prev.map((m) => (m.id === next.id ? { ...m, ...next } : m));
      }
      seenIdsRef.current.add(next.id);

      // If this is a realtime confirmation of our optimistic message,
      // try to dedupe by sender + content + a recent timestamp.
      if (!next.pending && next.senderId === currentUserId) {
        const idx = prev.findIndex(
          (m) =>
            m.pending &&
            m.senderId === next.senderId &&
            m.content === next.content,
        );
        if (idx >= 0) {
          const copy = prev.slice();
          copy[idx] = next;
          return copy;
        }
      }
      return [...prev, next];
    });
  }, [currentUserId]);

  // Initial load + realtime subscription.
  useEffect(() => {
    let cancelled = false;
    const supabase = createClient();
    let channel: ReturnType<typeof supabase.channel> | null = null;

    async function setup() {
      const initial = await listMessages(threadId);
      if (cancelled) return;
      seenIdsRef.current = new Set(initial.map((m) => m.id));
      setMessages(initial);

      // CRITICAL: Realtime subscribes as anon unless we set the auth token
      // before .subscribe(). Without this, RLS hides every postgres_changes
      // event from the client.
      const {
        data: { session },
      } = await supabase.auth.getSession();
      if (session?.access_token) {
        await supabase.realtime.setAuth(session.access_token);
      }

      channel = supabase
        .channel(`dm:thread:${threadId}`)
        .on(
          "postgres_changes",
          {
            event: "INSERT",
            schema: "public",
            table: "dm_messages",
            filter: `thread_id=eq.${threadId}`,
          },
          (payload) => {
            const row = payload.new as {
              id: string;
              sender_id: string;
              content: string;
              created_at: string;
              read_at: string | null;
            };
            upsertMessage({
              id: row.id,
              senderId: row.sender_id,
              content: row.content,
              createdAt: row.created_at,
              readAt: row.read_at,
            });
          },
        )
        .subscribe();

      // Best-effort: mark anything we've already loaded as read.
      markThreadRead(threadId).catch(() => {});
    }

    setup();

    return () => {
      cancelled = true;
      if (channel) supabase.removeChannel(channel);
    };
  }, [threadId, upsertMessage]);

  // Auto-scroll on new messages.
  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    el.scrollTo(0, el.scrollHeight);
  }, [messages]);

  // When a message arrives from the other party, mark the thread as read.
  useEffect(() => {
    const last = messages[messages.length - 1];
    if (last && last.senderId !== currentUserId && !last.readAt) {
      markThreadRead(threadId).catch(() => {});
    }
  }, [messages, currentUserId, threadId]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const text = input.trim();
    if (!text || sending) return;
    setSending(true);
    setError(null);
    setInput("");

    const optimistic: LocalMessage = {
      id: tempId(),
      senderId: currentUserId,
      content: text,
      createdAt: new Date().toISOString(),
      readAt: null,
      pending: true,
    };
    setMessages((prev) => [...prev, optimistic]);

    try {
      const result = await sendMessage(threadId, text);
      if ("error" in result) {
        setError(result.error);
        // Roll back the optimistic message.
        setMessages((prev) => prev.filter((m) => m.id !== optimistic.id));
      } else {
        // Replace optimistic id with real id; realtime may also confirm.
        setMessages((prev) =>
          prev.map((m) =>
            m.id === optimistic.id
              ? { ...m, id: result.messageId, pending: false }
              : m,
          ),
        );
        seenIdsRef.current.add(result.messageId);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "send failed");
      setMessages((prev) => prev.filter((m) => m.id !== optimistic.id));
    } finally {
      setSending(false);
    }
  }

  return (
    <div className="flex h-full flex-col">
      {otherDisplayName && (
        <div className="flex items-center justify-between border-b px-4 py-2">
          <span className="truncate text-sm font-medium">
            {otherDisplayName}
          </span>
        </div>
      )}

      <div ref={scrollRef} className="flex-1 overflow-y-auto p-4">
        {messages.length === 0 ? (
          <p className="text-sm text-zinc-400">
            No messages yet. Say hello.
          </p>
        ) : (
          <div className="flex flex-col gap-3">
            {messages.map((m) => {
              const mine = m.senderId === currentUserId;
              return (
                <div
                  key={m.id}
                  className={`flex ${mine ? "justify-end" : "justify-start"}`}
                >
                  <div
                    className={`max-w-[80%] rounded-lg px-4 py-2 text-sm whitespace-pre-wrap ${
                      mine
                        ? "bg-black text-white dark:bg-white dark:text-black"
                        : "bg-zinc-100 text-zinc-900 dark:bg-zinc-800 dark:text-zinc-100"
                    } ${m.pending ? "opacity-60" : ""}`}
                  >
                    {m.content}
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {error && (
          <p className="mt-4 text-sm text-red-500">{error}</p>
        )}
      </div>

      <form onSubmit={handleSubmit} className="border-t p-4">
        <div className="flex gap-2">
          <textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                handleSubmit(e as unknown as React.FormEvent);
              }
            }}
            rows={1}
            placeholder="Message…"
            className="flex-1 resize-none rounded border px-3 py-2 text-sm"
            disabled={sending}
          />
          <button
            type="submit"
            disabled={sending || !input.trim()}
            className="rounded bg-black px-4 py-2 text-sm text-white disabled:opacity-60 dark:bg-white dark:text-black"
          >
            Send
          </button>
        </div>
      </form>
    </div>
  );
}
