import { useState, useEffect } from "react";
import { useMutation } from "convex/react";
import { api } from "../../convex/_generated/api";
import { Id } from "../../convex/_generated/dataModel";
import { useAuthActions } from "@convex-dev/auth/react";
import { Button } from "@/components/ui/button";
import { ChatWindow } from "@/components/chat/ChatWindow";
import { ConversationSidebar } from "@/components/chat/ConversationSidebar";
import {
  ChefHat,
  LogOut,
  BookOpen,
  Settings,
  PanelLeftClose,
  PanelLeft,
} from "lucide-react";
import { Link } from "react-router-dom";
import { cn } from "@/lib/utils";

export function ChatPage() {
  const { signOut } = useAuthActions();
  const ensureProfile = useMutation(api.users.ensureProfile);
  const createConversation = useMutation(api.conversations.create);

  const [selectedConversationId, setSelectedConversationId] =
    useState<Id<"conversations"> | null>(null);
  const [sidebarOpen, setSidebarOpen] = useState(true);

  // Ensure user has a profile
  useEffect(() => {
    ensureProfile().catch(console.error);
  }, [ensureProfile]);

  const handleNewConversation = async () => {
    const id = await createConversation({});
    setSelectedConversationId(id);
  };

  return (
    <div className="min-h-screen flex">
      {/* Sidebar */}
      <aside
        className={cn(
          "border-r bg-card flex flex-col transition-all duration-300",
          sidebarOpen ? "w-64" : "w-0 overflow-hidden"
        )}
      >
        {/* Logo */}
        <div className="p-4 border-b flex items-center gap-2">
          <ChefHat className="h-6 w-6 text-primary" />
          <span className="font-semibold">Culinary AI</span>
        </div>

        {/* Conversation list */}
        <div className="flex-1 overflow-hidden">
          <ConversationSidebar
            selectedId={selectedConversationId}
            onSelect={setSelectedConversationId}
            onNew={handleNewConversation}
          />
        </div>

        {/* Bottom nav */}
        <div className="border-t p-2 space-y-1">
          <Link
            to="/recipes"
            className="flex items-center gap-2 px-3 py-2 rounded-md hover:bg-muted text-sm"
          >
            <BookOpen className="h-4 w-4" />
            Recipe Book
          </Link>
          <Link
            to="/settings"
            className="flex items-center gap-2 px-3 py-2 rounded-md hover:bg-muted text-sm"
          >
            <Settings className="h-4 w-4" />
            Settings
          </Link>
          <Button
            variant="ghost"
            className="w-full justify-start gap-2"
            onClick={() => signOut()}
          >
            <LogOut className="h-4 w-4" />
            Sign Out
          </Button>
        </div>
      </aside>

      {/* Main content */}
      <main className="flex-1 flex flex-col">
        {/* Header */}
        <header className="h-14 border-b flex items-center px-4 gap-4">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setSidebarOpen(!sidebarOpen)}
          >
            {sidebarOpen ? (
              <PanelLeftClose className="h-5 w-5" />
            ) : (
              <PanelLeft className="h-5 w-5" />
            )}
          </Button>
          <h1 className="font-semibold">
            {selectedConversationId ? "Chat" : "Welcome"}
          </h1>
        </header>

        {/* Chat window */}
        <ChatWindow
          conversationId={selectedConversationId}
          onMessageSent={() => {}}
        />
      </main>
    </div>
  );
}
