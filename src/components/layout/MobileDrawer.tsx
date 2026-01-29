import { useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { X, ChefHat, Plus, Search, BookOpen, MessageSquare } from "lucide-react";
import { useQuery, useMutation } from "convex/react";
import { api } from "../../../convex/_generated/api";
import { Id } from "../../../convex/_generated/dataModel";
import { useSidebar } from "@/providers/SidebarProvider";
import { useMotion } from "@/providers/MotionProvider";
import { UserProfilePopup } from "./UserProfilePopup";
import { cn } from "@/lib/utils";

interface MobileDrawerProps {
  selectedConversationId?: Id<"conversations"> | null;
  onSelectConversation?: (id: Id<"conversations">) => void;
  onNewConversation?: () => void;
}

export function MobileDrawer({
  selectedConversationId,
  onSelectConversation,
  onNewConversation,
}: MobileDrawerProps) {
  const { isMobileOpen, closeMobile } = useSidebar();
  const { enableAnimations } = useMotion();
  const navigate = useNavigate();
  const location = useLocation();

  const conversations = useQuery(api.conversations.list, { limit: 20 });
  const removeConversation = useMutation(api.conversations.remove);

  useEffect(() => {
    if (isMobileOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }

    return () => {
      document.body.style.overflow = "";
    };
  }, [isMobileOpen]);

  useEffect(() => {
    function handleEscape(event: KeyboardEvent) {
      if (event.key === "Escape") {
        closeMobile();
      }
    }

    if (isMobileOpen) {
      document.addEventListener("keydown", handleEscape);
    }

    return () => {
      document.removeEventListener("keydown", handleEscape);
    };
  }, [isMobileOpen, closeMobile]);

  const handleNewChat = () => {
    if (onNewConversation) {
      onNewConversation();
    }
    closeMobile();
  };

  const handleSelectConversation = (id: Id<"conversations">) => {
    if (onSelectConversation) {
      onSelectConversation(id);
    }
    closeMobile();
  };

  const handleNavigate = (path: string) => {
    navigate(path);
    closeMobile();
  };

  if (!isMobileOpen) return null;

  return (
    <>
      <div
        className={cn(
          "fixed inset-0 z-50 bg-black/50",
          enableAnimations && "animate-in fade-in-0 duration-200"
        )}
        onClick={closeMobile}
        aria-hidden="true"
      />

      <aside
        role="dialog"
        aria-modal="true"
        aria-label="Navigation menu"
        className={cn(
          "fixed left-0 top-0 bottom-0 z-50 w-[280px] bg-background border-r border-border flex flex-col",
          enableAnimations && "animate-in slide-in-from-left duration-300"
        )}
      >
        <div className="flex items-center justify-between p-4 border-b border-border">
          <div className="flex items-center gap-2">
            <ChefHat className="h-6 w-6 text-primary" />
            <span className="font-semibold text-lg">Culinary AI</span>
          </div>
          <button
            onClick={closeMobile}
            className="p-2 -mr-2 rounded-lg hover:bg-muted transition-colors"
            aria-label="Close menu"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="p-3 space-y-1">
          <button
            onClick={handleNewChat}
            className="flex items-center gap-3 w-full px-3 py-2.5 rounded-lg bg-primary text-primary-foreground font-medium"
          >
            <Plus className="h-5 w-5" />
            New Chat
          </button>

          <button
            onClick={() => {}}
            className="flex items-center gap-3 w-full px-3 py-2.5 rounded-lg text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
          >
            <Search className="h-5 w-5" />
            Search
          </button>
        </div>

        <div className="px-3 py-2">
          <button
            onClick={() => handleNavigate("/recipes")}
            className={cn(
              "flex items-center gap-3 w-full px-3 py-2.5 rounded-lg transition-colors font-medium",
              location.pathname === "/recipes"
                ? "bg-primary text-primary-foreground"
                : "text-foreground hover:bg-muted"
            )}
          >
            <BookOpen className="h-5 w-5" />
            Recipe Book
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-3 py-2">
          <div className="text-xs font-medium text-muted-foreground px-3 py-2">
            Your Chats
          </div>
          <div className="space-y-1">
            {conversations === undefined ? (
              <div className="text-center text-muted-foreground text-sm py-4">
                Loading...
              </div>
            ) : conversations.length === 0 ? (
              <div className="text-center text-muted-foreground text-sm py-4">
                No conversations yet
              </div>
            ) : (
              conversations.map((conversation) => (
                <button
                  key={conversation._id}
                  onClick={() => handleSelectConversation(conversation._id)}
                  className={cn(
                    "flex items-center gap-3 w-full px-3 py-2 rounded-lg text-sm transition-colors text-left",
                    selectedConversationId === conversation._id
                      ? "bg-primary text-primary-foreground"
                      : "text-muted-foreground hover:bg-muted hover:text-foreground"
                  )}
                >
                  <MessageSquare className="h-4 w-4 flex-shrink-0" />
                  <span className="truncate">{conversation.title}</span>
                </button>
              ))
            )}
          </div>
        </div>

        <div className="p-3 border-t border-border">
          <UserProfilePopup isExpanded />
        </div>
      </aside>
    </>
  );
}
