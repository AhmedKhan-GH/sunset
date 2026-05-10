import { ChatPanel } from "@/components/chat-panel";

export default function ChatPage() {
  return (
    <div className="mx-auto flex h-[calc(100vh-5.5rem)] w-full max-w-4xl flex-col p-8">
      <div className="flex-1 overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
        <ChatPanel />
      </div>
    </div>
  );
}
