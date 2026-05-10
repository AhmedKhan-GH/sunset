"use client";

import { useState, useEffect, useCallback, useRef, useId } from "react";
import { useChat } from "@ai-sdk/react";
import { DefaultChatTransport } from "ai";

interface Conversation {
  id: string;
  title: string | null;
  createdAt: number;
  updatedAt: number;
}

interface StoredMessage {
  id: string;
  role: string;
  content: string;
}

function storedToUIMessages(stored: StoredMessage[]) {
  return stored
    .filter((m) => m.role === "user" || m.role === "assistant")
    .map((m) => ({
      id: m.id,
      role: m.role as "user" | "assistant",
      parts: [{ type: "text" as const, text: m.content }],
    }));
}

export function ChatPanel() {
  const [conversationList, setConversationList] = useState<Conversation[]>([]);
  const [activeConversationId, setActiveConversationId] = useState<string | null>(null);
  const [activeTitle, setActiveTitle] = useState<string | null>(null);
  const [initialMessages, setInitialMessages] = useState<
    { id: string; role: "user" | "assistant"; parts: { type: "text"; text: string }[] }[]
  >([]);
  const [chatKey, setChatKey] = useState(0);

  const loadConversations = useCallback(async () => {
    const res = await fetch("/api/conversations");
    if (res.ok) setConversationList(await res.json());
  }, []);

  useEffect(() => {
    loadConversations();
  }, [loadConversations]);

  async function selectConversation(id: string) {
    const conv = conversationList.find((c) => c.id === id);
    setActiveConversationId(id);
    setActiveTitle(conv?.title ?? null);
    const res = await fetch(`/api/conversations/${id}/messages`);
    if (res.ok) {
      setInitialMessages(storedToUIMessages(await res.json()));
    } else {
      setInitialMessages([]);
    }
    setChatKey((k) => k + 1);
  }

  function clearChat() {
    setActiveConversationId(null);
    setActiveTitle(null);
    setInitialMessages([]);
    setChatKey((k) => k + 1);
  }

  function handleConversationCreated(id: string, title: string | null) {
    setActiveConversationId(id);
    setActiveTitle(title);
    setConversationList((prev) => [
      { id, title, createdAt: Date.now() / 1000, updatedAt: Date.now() / 1000 },
      ...prev,
    ]);
  }

  function handleTitleChange(title: string) {
    setActiveTitle(title);
    if (activeConversationId) {
      setConversationList((prev) =>
        prev.map((c) =>
          c.id === activeConversationId ? { ...c, title } : c,
        ),
      );
    }
  }

  return (
    <div className="flex h-full">
      <div className="flex w-52 flex-col border-r border-slate-200 bg-slate-50">
        <div className="border-b border-slate-200 px-3 py-2">
          <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">History</span>
        </div>
        <div className="flex-1 overflow-y-auto">
          {conversationList.map((c) => (
            <button
              key={c.id}
              onClick={() => selectConversation(c.id)}
              className={`w-full truncate px-3 py-2.5 text-left text-xs transition ${
                c.id === activeConversationId
                  ? "bg-brand/10 font-medium text-brand"
                  : "text-foreground hover:bg-slate-100"
              }`}
            >
              {c.title || "New conversation"}
            </button>
          ))}
        </div>
      </div>

      <div className="flex flex-1 flex-col">
        <ChatHeader
          conversationId={activeConversationId}
          title={activeTitle}
          onTitleChange={handleTitleChange}
          onNewChat={clearChat}
        />
        <ChatMessages
          key={chatKey}
          conversationId={activeConversationId}
          initialMessages={initialMessages}
          onConversationCreated={handleConversationCreated}
          onMessageSent={loadConversations}
        />
      </div>
    </div>
  );
}

function ChatHeader({
  conversationId,
  title,
  onTitleChange,
  onNewChat,
}: {
  conversationId: string | null;
  title: string | null;
  onTitleChange: (title: string) => void;
  onNewChat: () => void;
}) {
  const [editing, setEditing] = useState(false);
  const [editValue, setEditValue] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  function startEditing() {
    if (!conversationId) return;
    setEditValue(title || "");
    setEditing(true);
    setTimeout(() => inputRef.current?.select(), 0);
  }

  async function saveTitle() {
    setEditing(false);
    const trimmed = editValue.trim();
    if (!conversationId || trimmed === (title || "")) return;
    onTitleChange(trimmed);
    await fetch(`/api/conversations/${conversationId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title: trimmed }),
    });
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === "Enter") saveTitle();
    if (e.key === "Escape") setEditing(false);
  }

  return (
    <div className="flex items-center justify-between border-b border-slate-200 px-4 py-2">
      <div className="min-w-0 flex-1">
        {conversationId ? (
          editing ? (
            <input
              ref={inputRef}
              value={editValue}
              onChange={(e) => setEditValue(e.target.value)}
              onBlur={saveTitle}
              onKeyDown={handleKeyDown}
              className="w-full rounded-lg bg-transparent px-2 text-sm font-medium outline-none ring-1 ring-brand-soft focus:ring-2 focus:ring-brand"
              autoFocus
            />
          ) : (
            <button
              onClick={startEditing}
              className="w-full truncate rounded-lg bg-transparent px-2 text-left text-sm font-medium ring-1 ring-slate-200 transition hover:ring-brand-soft"
              title="Click to rename"
            >
              {title || "New conversation"}
            </button>
          )
        ) : (
          <span className="text-sm font-medium text-muted-foreground">New conversation</span>
        )}
      </div>
      <button
        onClick={onNewChat}
        className="ml-3 shrink-0 rounded-lg border border-slate-200 px-2.5 py-1 text-xs font-medium text-foreground transition hover:bg-slate-50"
      >
        New chat
      </button>
    </div>
  );
}

function ChatMessages({
  conversationId,
  initialMessages,
  onConversationCreated,
  onMessageSent,
}: {
  conversationId: string | null;
  initialMessages: { id: string; role: "user" | "assistant"; parts: { type: "text"; text: string }[] }[];
  onConversationCreated: (id: string, title: string | null) => void;
  onMessageSent: () => void;
}) {
  const [input, setInput] = useState("");
  const convIdRef = useRef(conversationId);
  const chatInstanceId = useId();

  const { messages, sendMessage, status, error } = useChat({
    id: chatInstanceId,
    messages: initialMessages,
    transport: new DefaultChatTransport({
      api: "/api/chat",
      body: () => ({ conversationId: convIdRef.current }),
    }),
    onFinish() {
      onMessageSent();
    },
  });

  const isLoading = status === "streaming" || status === "submitted";
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    scrollRef.current?.scrollTo(0, scrollRef.current.scrollHeight);
  }, [messages, status]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const text = input.trim();
    if (!text || isLoading) return;
    setInput("");

    let created: { id: string; title: string | null } | null = null;

    if (!convIdRef.current) {
      const res = await fetch("/api/conversations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title: text.length > 32 ? text.slice(0, 32) + "..." : text }),
      });
      if (res.ok) {
        created = await res.json();
        convIdRef.current = created!.id;
      }
    }

    sendMessage({ text });

    if (created) {
      const { id, title } = created;
      setTimeout(() => onConversationCreated(id, title), 0);
    }
  }

  return (
    <>
      <div ref={scrollRef} className="flex-1 overflow-y-auto p-4">
        {messages.length === 0 && (
          <p className="text-sm text-muted-foreground">
            Ask anything. Inference runs locally via Ollama.
          </p>
        )}

        <div className="flex flex-col gap-4">
          {messages.map((m) => {
            const hasText = m.parts.some(
              (p: Record<string, unknown>) => p.type === "text" && (p.text as string),
            );

            return (
              <div
                key={m.id}
                className={`flex ${m.role === "user" ? "justify-end" : "justify-start"}`}
              >
                <div
                  className={`max-w-[80%] rounded-xl px-4 py-2.5 text-sm whitespace-pre-wrap ${
                    m.role === "user"
                      ? "bg-brand text-white"
                      : "bg-slate-100 text-foreground"
                  }`}
                >
                  {!hasText && m.role === "assistant" && isLoading ? (
                    <span className="text-muted-foreground">
                      Thinking
                      <span className="inline-flex w-4">
                        <span className="animate-pulse">.</span>
                        <span className="animate-pulse delay-200">.</span>
                        <span className="animate-pulse delay-400">.</span>
                      </span>
                    </span>
                  ) : (
                    m.parts.map((p: Record<string, unknown>, i: number) => {
                      if (p.type === "text") {
                        return <span key={i}>{p.text as string}</span>;
                      }
                      if (p.type === "tool-sendNotification" && p.state === "output-available") {
                        const { title, message } = p.output as { success: boolean; title: string; message: string };
                        return (
                          <div key={i} className="my-1 rounded-lg border border-green-300 bg-green-50 px-3 py-2">
                            <p className="font-medium text-green-900">{title}</p>
                            <p className="text-green-700">{message}</p>
                          </div>
                        );
                      }
                      return null;
                    })
                  )}
                </div>
              </div>
            );
          })}

          {status === "submitted" && !messages.some((m) => m.role === "assistant") && (
            <div className="flex justify-start">
              <div className="rounded-xl bg-slate-100 px-4 py-2.5 text-sm text-muted-foreground">
                Thinking
                <span className="inline-flex w-4">
                  <span className="animate-pulse">.</span>
                  <span className="animate-pulse delay-200">.</span>
                  <span className="animate-pulse delay-400">.</span>
                </span>
              </div>
            </div>
          )}
        </div>

        {error && (
          <p className="mt-4 text-sm text-red-500">
            Could not reach Ollama. Is it running?
          </p>
        )}
      </div>

      <form onSubmit={handleSubmit} className="border-t border-slate-200 p-4">
        <div className="flex gap-2">
          <input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Message…"
            className="flex-1 rounded-lg border border-border bg-surface px-3 py-2 text-sm focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand-soft"
            disabled={isLoading}
          />
          <button
            type="submit"
            disabled={isLoading || !input.trim()}
            className="rounded-lg bg-brand px-4 py-2 text-sm font-medium text-white transition hover:brightness-110 disabled:opacity-60"
          >
            Send
          </button>
        </div>
      </form>
    </>
  );
}
