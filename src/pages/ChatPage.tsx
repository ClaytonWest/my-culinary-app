import { useState, useEffect } from "react";
import { useMutation } from "convex/react";
import { api } from "../../convex/_generated/api";
import { Id } from "../../convex/_generated/dataModel";
import { ChatWindow } from "@/components/chat/ChatWindow";
import { SlimRail } from "@/components/layout/SlimRail";
import { MobileHeader } from "@/components/layout/MobileHeader";
import { MobileDrawer } from "@/components/layout/MobileDrawer";

export function ChatPage() {
  const ensureProfile = useMutation(api.users.ensureProfile);
  const createConversation = useMutation(api.conversations.create);

  const [selectedConversationId, setSelectedConversationId] =
    useState<Id<"conversations"> | null>(null);

  useEffect(() => {
    ensureProfile().catch(console.error);
  }, [ensureProfile]);

  const handleNewConversation = async () => {
    const id = await createConversation({});
    setSelectedConversationId(id);
  };

  return (
    <div className="min-h-screen flex">
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:absolute focus:z-50 focus:p-4 focus:bg-background focus:text-foreground"
      >
        Skip to main content
      </a>

      <SlimRail
        selectedConversationId={selectedConversationId}
        onSelectConversation={setSelectedConversationId}
        onNewConversation={handleNewConversation}
      />

      <MobileDrawer
        selectedConversationId={selectedConversationId}
        onSelectConversation={setSelectedConversationId}
        onNewConversation={handleNewConversation}
      />

      <main id="main-content" className="flex-1 flex flex-col min-w-0">
        <MobileHeader />

        <ChatWindow
          conversationId={selectedConversationId}
          onMessageSent={() => {}}
          onNewConversation={handleNewConversation}
        />
      </main>
    </div>
  );
}
