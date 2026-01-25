import { useQuery, useMutation } from "convex/react";
import { api } from "../../../convex/_generated/api";
import { Id } from "../../../convex/_generated/dataModel";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { Plus, MessageSquare, Trash2 } from "lucide-react";

interface ConversationSidebarProps {
  selectedId: Id<"conversations"> | null;
  onSelect: (id: Id<"conversations">) => void;
  onNew: () => void;
}

export function ConversationSidebar({
  selectedId,
  onSelect,
  onNew,
}: ConversationSidebarProps) {
  const conversations = useQuery(api.conversations.list, { limit: 20 });
  const removeConversation = useMutation(api.conversations.remove);

  const handleDelete = async (
    e: React.MouseEvent,
    id: Id<"conversations">
  ) => {
    e.stopPropagation();
    if (confirm("Delete this conversation?")) {
      await removeConversation({ id });
      if (selectedId === id) {
        onNew();
      }
    }
  };

  return (
    <div className="flex flex-col h-full">
      <div className="p-2">
        <Button onClick={onNew} className="w-full gap-2" variant="outline">
          <Plus className="h-4 w-4" />
          New Chat
        </Button>
      </div>

      <div className="flex-1 overflow-y-auto p-2 space-y-1">
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
            <div
              key={conversation._id}
              onClick={() => onSelect(conversation._id)}
              className={cn(
                "group flex items-center gap-2 px-3 py-2 rounded-md cursor-pointer transition-colors",
                selectedId === conversation._id
                  ? "bg-primary text-primary-foreground"
                  : "hover:bg-muted"
              )}
            >
              <MessageSquare className="h-4 w-4 flex-shrink-0" />
              <span className="flex-1 truncate text-sm">
                {conversation.title}
              </span>
              <button
                onClick={(e) => handleDelete(e, conversation._id)}
                className={cn(
                  "opacity-0 group-hover:opacity-100 transition-opacity p-1 rounded hover:bg-destructive/20",
                  selectedId === conversation._id && "hover:bg-primary-foreground/20"
                )}
              >
                <Trash2 className="h-3 w-3" />
              </button>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
