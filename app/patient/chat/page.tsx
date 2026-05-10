import { ChatPanel } from "@/components/chat-panel";

export default function ChatPage() {
  return (
    <div className="mx-auto flex h-[calc(100vh-3rem)] w-full max-w-2xl flex-col p-8">
      <div className="flex-1 overflow-hidden rounded border">
        <ChatPanel />
      </div>
    </div>
  );
}
