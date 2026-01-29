import { useNavigate, useLocation } from "react-router-dom";
import { useQuery, useMutation } from "convex/react";
import { api } from "../../../convex/_generated/api";
import { Id } from "../../../convex/_generated/dataModel";
import {
  ChefHat,
  Plus,
  Search,
  BookOpen,
  MessageSquare,
  PanelLeftClose,
  PanelLeft,
  Trash2,
} from "lucide-react";
import { useSidebar } from "@/providers/SidebarProvider";
import { useMotion } from "@/providers/MotionProvider";
import { SlimRailNavItem } from "./SlimRailNavItem";
import { UserProfilePopup } from "./UserProfilePopup";
import { cn } from "@/lib/utils";

interface SlimRailProps {
  selectedConversationId?: Id<"conversations"> | null;
  onSelectConversation?: (id: Id<"conversations">) => void;
  onNewConversation?: () => void;
}

export function SlimRail({
  selectedConversationId,
  onSelectConversation,
  onNewConversation,
}: SlimRailProps) {
  const { isExpanded, isPinned, expand, collapse, togglePin } = useSidebar();
  const { enableAnimations } = useMotion();
  const navigate = useNavigate();
  const location = useLocation();

  const conversations = useQuery(api.conversations.list, { limit: 20 });
  const removeConversation = useMutation(api.conversations.remove);

  const handleDelete = async (
    e: React.MouseEvent,
    id: Id<"conversations">
  ) => {
    e.stopPropagation();
    if (confirm("Delete this conversation?")) {
      await removeConversation({ id });
      if (selectedConversationId === id && onNewConversation) {
        onNewConversation();
      }
    }
  };

  return (
    <aside
      onMouseEnter={expand}
      onMouseLeave={collapse}
      className={cn(
        "hidden md:flex flex-col h-screen bg-card border-r border-border",
        "sticky top-0 overflow-x-hidden",
        enableAnimations ? "transition-all duration-300" : "",
        isExpanded ? "w-sidebar" : "w-sidebar-collapsed"
      )}
      aria-label="Main navigation"
    >
      <div
        className={cn(
          "flex items-center h-14 px-3 border-b border-border",
          isExpanded ? "justify-between" : "justify-center"
        )}
      >
        <div className="flex items-center gap-2">
          <ChefHat className="h-6 w-6 text-primary flex-shrink-0" />
          {isExpanded && (
            <span className="font-semibold text-lg whitespace-nowrap">
              Culinary AI
            </span>
          )}
        </div>

        {isExpanded && (
          <button
            onClick={togglePin}
            className="p-1.5 rounded-md hover:bg-muted transition-colors"
            aria-label={isPinned ? "Unpin sidebar" : "Pin sidebar"}
          >
            {isPinned ? (
              <PanelLeftClose className="h-4 w-4" />
            ) : (
              <PanelLeft className="h-4 w-4" />
            )}
          </button>
        )}
      </div>

      <div className="p-2 space-y-1">
        <SlimRailNavItem
          icon={Plus}
          label="New Chat"
          isExpanded={isExpanded}
          onClick={onNewConversation}
        />
        <SlimRailNavItem
          icon={Search}
          label="Search"
          isExpanded={isExpanded}
          onClick={() => {}}
        />
      </div>

      <div className="px-2 py-1">
        <SlimRailNavItem
          icon={BookOpen}
          label="Recipe Book"
          isExpanded={isExpanded}
          isActive={location.pathname === "/recipes"}
          onClick={() => navigate("/recipes")}
        />
      </div>

      <div className="flex-1 overflow-y-auto overflow-x-hidden px-2 py-2">
        {isExpanded && (
          <div className="text-xs font-medium text-muted-foreground px-3 py-2">
            Your Chats
          </div>
        )}
        <div className="space-y-1">
          {!isExpanded ? (
            <SlimRailNavItem
              icon={MessageSquare}
              label="Conversations"
              isExpanded={false}
              isActive={location.pathname === "/"}
              onClick={() => navigate("/")}
            />
          ) : conversations === undefined ? (
            <div className="text-center text-muted-foreground text-sm py-4">
              Loading...
            </div>
          ) : conversations.length === 0 ? (
            <div className="text-center text-muted-foreground text-sm py-4">
              No conversations yet
            </div>
          ) : (
            conversations.map((conversation) => (
              <div
                key={conversation._id}
                onClick={() => onSelectConversation?.(conversation._id)}
                className={cn(
                  "group flex items-center gap-3 px-3 py-2 rounded-lg cursor-pointer transition-colors",
                  selectedConversationId === conversation._id
                    ? "bg-primary text-primary-foreground"
                    : "text-muted-foreground hover:bg-muted hover:text-foreground"
                )}
              >
                <MessageSquare className="h-4 w-4 flex-shrink-0" />
                <span className="flex-1 truncate text-sm">
                  {conversation.title}
                </span>
                <button
                  onClick={(e) => handleDelete(e, conversation._id)}
                  className={cn(
                    "opacity-0 group-hover:opacity-100 p-1 rounded hover:bg-destructive/20 transition-opacity",
                    selectedConversationId === conversation._id &&
                      "hover:bg-primary-foreground/20"
                  )}
                  aria-label="Delete conversation"
                >
                  <Trash2 className="h-3 w-3" />
                </button>
              </div>
            ))
          )}
        </div>
      </div>

      <div className="p-2 border-t border-border">
        <UserProfilePopup isExpanded={isExpanded} />
      </div>
    </aside>
  );
}
