"use client";

import { useState } from "react";
import { useChat } from "@ai-sdk/react";

export function ChatPanel() {
  const [input, setInput] = useState("");
  const { messages, sendMessage, status, error } = useChat();

  const isLoading = status === "streaming" || status === "submitted";

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const text = input.trim();
    if (!text || isLoading) return;
    setInput("");
    await sendMessage({ text });
  }

  return (
    <div className="flex h-full flex-col">
      <div className="flex-1 overflow-y-auto p-4">
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
                {m.parts
                  .filter((p) => p.type === "text")
                  .map((p, i) => (
                    <span key={i}>{p.text}</span>
                  ))}
              </div>
            </div>
          ))}
        </div>

        {error && (
          <p className="mt-4 text-sm text-red-500">
            Could not reach Ollama. Is it running?
          </p>
        )}
      </div>

      <form onSubmit={handleSubmit} className="border-t p-4">
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
    </div>
  );
}
