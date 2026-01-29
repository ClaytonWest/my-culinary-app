import { useState, useRef, useEffect, FormEvent, KeyboardEvent } from "react";
import { ImageUpload } from "./ImageUpload";
import { Send, X } from "lucide-react";
import { Id } from "../../../convex/_generated/dataModel";
import { cn } from "@/lib/utils";

interface InputPillProps {
  onSend: (content: string, imageStorageId?: Id<"_storage">) => Promise<void>;
  disabled?: boolean;
  placeholder?: string;
}

export function InputPill({
  onSend,
  disabled,
  placeholder = "Ask about recipes, ingredients, cooking tips...",
}: InputPillProps) {
  const [content, setContent] = useState("");
  const [sending, setSending] = useState(false);
  const [imageStorageId, setImageStorageId] = useState<Id<"_storage"> | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    const textarea = textareaRef.current;
    if (textarea) {
      textarea.style.height = "auto";
      const newHeight = Math.min(textarea.scrollHeight, 200);
      textarea.style.height = `${newHeight}px`;
    }
  }, [content]);

  const handleImageUploaded = (storageId: Id<"_storage">) => {
    setImageStorageId(storageId);
    setImagePreview("uploaded");
  };

  const handleClearImage = () => {
    setImageStorageId(null);
    setImagePreview(null);
  };

  const handleSubmit = async (e?: FormEvent) => {
    e?.preventDefault();
    if ((!content.trim() && !imageStorageId) || sending || disabled) return;

    setSending(true);
    try {
      await onSend(
        content.trim() || "What can I make with these ingredients?",
        imageStorageId || undefined
      );
      setContent("");
      setImageStorageId(null);
      setImagePreview(null);
    } finally {
      setSending(false);
    }
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  };

  return (
    <div className="sticky bottom-0 p-4 bg-gradient-to-t from-background via-background to-transparent">
      <form
        onSubmit={handleSubmit}
        className={cn(
          "max-w-chat mx-auto",
          "bg-card/80 backdrop-blur-glass border border-border",
          "rounded-pill shadow-lg",
          "focus-within:ring-2 focus-within:ring-ring focus-within:ring-offset-2"
        )}
      >
        {imageStorageId && (
          <div className="px-4 pt-3">
            <div className="inline-flex items-center gap-2 bg-muted px-3 py-1.5 rounded-full text-sm">
              <span className="text-muted-foreground">Image attached</span>
              <button
                type="button"
                onClick={handleClearImage}
                className="text-muted-foreground hover:text-foreground p-0.5 rounded-full hover:bg-muted-foreground/20 transition-colors"
                aria-label="Remove image"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            </div>
          </div>
        )}

        <div className="flex items-end gap-2 p-2">
          <ImageUpload
            onImageUploaded={handleImageUploaded}
            onClear={handleClearImage}
            preview={imagePreview}
          />

          <textarea
            ref={textareaRef}
            value={content}
            onChange={(e) => setContent(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={
              imageStorageId
                ? "Add a message about your ingredients..."
                : placeholder
            }
            disabled={disabled || sending}
            rows={1}
            className={cn(
              "flex-1 resize-none bg-transparent border-0 outline-none",
              "text-sm placeholder:text-muted-foreground",
              "py-2 px-2",
              "max-h-[200px]",
              "scrollbar-thin scrollbar-thumb-muted-foreground/30 scrollbar-track-transparent",
              "disabled:opacity-50"
            )}
            aria-label="Message input"
          />

          <button
            type="submit"
            disabled={(!content.trim() && !imageStorageId) || sending || disabled}
            className={cn(
              "flex-shrink-0 w-10 h-10 rounded-full",
              "flex items-center justify-center",
              "bg-primary text-primary-foreground",
              "hover:bg-primary/90 transition-colors",
              "disabled:opacity-50 disabled:cursor-not-allowed",
              "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            )}
            aria-label="Send message"
          >
            <Send className="h-4 w-4" />
          </button>
        </div>
      </form>
    </div>
  );
}
