"use client";

import { useState, useEffect, useCallback, useRef } from "react";
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
    setActiveConversationId(id);
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
    setInitialMessages([]);
    setChatKey((k) => k + 1);
  }

  function handleConversationCreated(id: string, title: string | null) {
    setActiveConversationId(id);
    setConversationList((prev) => [
      { id, title, createdAt: Date.now() / 1000, updatedAt: Date.now() / 1000 },
      ...prev,
    ]);
  }

  return (
    <div className="flex h-full">
      <div className="flex w-48 flex-col border-r">
        <div className="border-b px-3 py-2">
          <span className="text-xs font-medium text-zinc-500">History</span>
        </div>
        <div className="flex-1 overflow-y-auto">
          {conversationList.map((c) => (
            <button
              key={c.id}
              onClick={() => selectConversation(c.id)}
              className={`w-full truncate px-3 py-2 text-left text-xs ${
                c.id === activeConversationId
                  ? "bg-zinc-100 dark:bg-zinc-800"
                  : "hover:bg-zinc-50 dark:hover:bg-zinc-900"
              }`}
            >
              {c.title
                ? c.title.length > 60
                  ? c.title.slice(0, 60) + "…"
                  : c.title
                : "New conversation"}
            </button>
          ))}
        </div>
      </div>

      <div className="flex flex-1 flex-col">
        <ChatMessages
          key={chatKey}
          conversationId={activeConversationId}
          initialMessages={initialMessages}
          onConversationCreated={handleConversationCreated}
          onMessageSent={loadConversations}
          onNewChat={clearChat}
        />
      </div>
    </div>
  );
}

function ChatMessages({
  conversationId,
  initialMessages,
  onConversationCreated,
  onMessageSent,
  onNewChat,
}: {
  conversationId: string | null;
  initialMessages: { id: string; role: "user" | "assistant"; parts: { type: "text"; text: string }[] }[];
  onConversationCreated: (id: string, title: string | null) => void;
  onMessageSent: () => void;
  onNewChat: () => void;
}) {
  const [input, setInput] = useState("");
  const convIdRef = useRef(conversationId);
  const pendingTitleRef = useRef<string | null>(null);

  const { messages, sendMessage, status, error } = useChat({
    ...(conversationId ? { id: conversationId } : {}),
    messages: initialMessages,
    transport: new DefaultChatTransport({
      api: "/api/chat",
      body: () => ({ conversationId: convIdRef.current }),
      fetch: async (url, init) => {
        const res = await fetch(url, init);
        const newConvId = res.headers.get("X-Conversation-Id");
        if (newConvId && !convIdRef.current) {
          convIdRef.current = newConvId;
          onConversationCreated(newConvId, pendingTitleRef.current);
        }
        return res;
      },
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

    if (!convIdRef.current) {
      pendingTitleRef.current = text.slice(0, 60);
    }

    await sendMessage({ text });
  }

  return (
    <>
      <div ref={scrollRef} className="flex-1 overflow-y-auto p-4">
        {messages.length === 0 && (
          <p className="text-sm text-zinc-400">
            Ask anything. Inference runs locally via Ollama.
          </p>
        )}

        <div className="flex flex-col gap-4">
          {messages.map((m) => (
            <div
              key={m.id}
              className={`flex ${m.role === "user" ? "justify-end" : "justify-start"}`}
            >
              <div
                className={`max-w-[80%] rounded-lg px-4 py-2 text-sm whitespace-pre-wrap ${
                  m.role === "user"
                    ? "bg-black text-white dark:bg-white dark:text-black"
                    : "bg-zinc-100 text-zinc-900 dark:bg-zinc-800 dark:text-zinc-100"
                }`}
              >
                {m.parts.map((p: Record<string, unknown>, i: number) => {
                  if (p.type === "text") {
                    return <span key={i}>{p.text as string}</span>;
                  }
                  if (p.type === "tool-sendNotification" && p.state === "output-available") {
                    const { title, message } = p.output as { success: boolean; title: string; message: string };
                    return (
                      <div key={i} className="my-1 rounded border border-green-300 bg-green-50 px-3 py-2 dark:border-green-700 dark:bg-green-950">
                        <p className="font-medium text-green-900 dark:text-green-100">{title}</p>
                        <p className="text-green-700 dark:text-green-300">{message}</p>
                      </div>
                    );
                  }
                  return null;
                })}
              </div>
            </div>
          ))}
        </div>

        {status === "submitted" && (
          <div className="flex justify-start">
            <div className="rounded-lg bg-zinc-100 px-4 py-2 text-sm text-zinc-400 dark:bg-zinc-800">
              Thinking
              <span className="inline-flex w-4">
                <span className="animate-pulse">.</span>
                <span className="animate-pulse delay-200">.</span>
                <span className="animate-pulse delay-400">.</span>
              </span>
            </div>
          </div>
        )}

        {error && (
          <p className="mt-4 text-sm text-red-500">
            Could not reach Ollama. Is it running?
          </p>
        )}
      </div>

      {messages.length > 0 && (
        <div className="border-t px-4 pt-2">
          <button
            onClick={onNewChat}
            className="text-xs text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200"
          >
            New chat
          </button>
        </div>
      )}
      <form onSubmit={handleSubmit} className={`${messages.length > 0 ? "" : "border-t"} p-4`}>
        <div className="flex gap-2">
          <input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Message…"
            className="flex-1 rounded border px-3 py-2 text-sm"
            disabled={isLoading}
          />
          <button
            type="submit"
            disabled={isLoading || !input.trim()}
            className="rounded bg-black px-4 py-2 text-sm text-white disabled:opacity-40 dark:bg-white dark:text-black"
          >
            Send
          </button>
        </div>
      </form>
    </>
  );
}
