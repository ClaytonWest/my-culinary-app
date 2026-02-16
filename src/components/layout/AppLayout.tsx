import { useState, useEffect } from "react";
import { Outlet, useNavigate, useLocation, useOutletContext } from "react-router-dom";
import { useMutation } from "convex/react";
import { api } from "../../../convex/_generated/api";
import { Id } from "../../../convex/_generated/dataModel";
import { SlimRail } from "./SlimRail";
import { MobileHeader } from "./MobileHeader";
import { MobileDrawer } from "./MobileDrawer";

interface AppLayoutContext {
  selectedConversationId: Id<"conversations"> | null;
  setSelectedConversationId: (id: Id<"conversations"> | null) => void;
}

export function useAppLayout() {
  return useOutletContext<AppLayoutContext>();
}

export function AppLayout() {
  const navigate = useNavigate();
  const location = useLocation();
  const ensureProfile = useMutation(api.users.ensureProfile);

  const [selectedConversationId, setSelectedConversationId] =
    useState<Id<"conversations"> | null>(null);

  useEffect(() => {
    ensureProfile().catch(console.error);
  }, [ensureProfile]);

  const handleSelectConversation = (id: Id<"conversations">) => {
    setSelectedConversationId(id);
    // Navigate to chat if we're not already there
    if (location.pathname !== "/") {
      navigate("/");
    }
  };

  const handleNewConversation = () => {
    setSelectedConversationId(null);
    if (location.pathname !== "/") {
      navigate("/");
    }
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
        onSelectConversation={handleSelectConversation}
        onNewConversation={handleNewConversation}
      />

      <MobileDrawer
        selectedConversationId={selectedConversationId}
        onSelectConversation={handleSelectConversation}
        onNewConversation={handleNewConversation}
      />

      <main id="main-content" className="flex-1 flex flex-col min-w-0">
        <MobileHeader />
        <Outlet
          context={{ selectedConversationId, setSelectedConversationId }}
        />
      </main>
    </div>
  );
}
