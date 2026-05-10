import { ChatPanel } from "./chat-panel";

export default function ChatPage() {
  return (
    <div className="mx-auto flex h-[calc(100vh-4rem)] w-full max-w-2xl flex-col p-8">
      <h1 className="mb-4 text-2xl font-semibold">Chat</h1>
      <div className="flex-1 overflow-hidden rounded border">
        <ChatPanel />
      </div>
    </div>
  );
}
