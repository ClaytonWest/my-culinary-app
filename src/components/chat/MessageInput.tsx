import { useState, FormEvent } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ImageUpload } from "./ImageUpload";
import { Send } from "lucide-react";
import { Id } from "../../../convex/_generated/dataModel";

interface MessageInputProps {
  onSend: (content: string, imageStorageId?: Id<"_storage">) => Promise<void>;
  disabled?: boolean;
  placeholder?: string;
}

export function MessageInput({
  onSend,
  disabled,
  placeholder = "Type a message...",
}: MessageInputProps) {
  const [content, setContent] = useState("");
  const [sending, setSending] = useState(false);
  const [imageStorageId, setImageStorageId] = useState<Id<"_storage"> | null>(
    null
  );
  const [imagePreview, setImagePreview] = useState<string | null>(null);

  const handleImageUploaded = (storageId: Id<"_storage">) => {
    setImageStorageId(storageId);
    // Create a preview URL (we'll use a placeholder since we don't have the actual URL easily)
    setImagePreview("uploaded");
  };

  const handleClearImage = () => {
    setImageStorageId(null);
    setImagePreview(null);
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
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

  return (
    <form onSubmit={handleSubmit} className="p-4 border-t bg-background">
      {imageStorageId && (
        <div className="max-w-3xl mx-auto mb-2">
          <div className="inline-flex items-center gap-2 bg-muted px-3 py-2 rounded-md text-sm">
            <span>Image attached</span>
            <button
              type="button"
              onClick={handleClearImage}
              className="text-muted-foreground hover:text-foreground"
            >
              &times;
            </button>
          </div>
        </div>
      )}
      <div className="flex gap-2 max-w-3xl mx-auto">
        <ImageUpload
          onImageUploaded={handleImageUploaded}
          onClear={handleClearImage}
          preview={imagePreview}
        />
        <Input
          value={content}
          onChange={(e) => setContent(e.target.value)}
          placeholder={
            imageStorageId
              ? "Add a message about your ingredients..."
              : placeholder
          }
          disabled={disabled || sending}
          className="flex-1"
          autoFocus
        />
        <Button
          type="submit"
          disabled={(!content.trim() && !imageStorageId) || sending || disabled}
          size="icon"
        >
          <Send className="h-4 w-4" />
        </Button>
      </div>
    </form>
  );
}
