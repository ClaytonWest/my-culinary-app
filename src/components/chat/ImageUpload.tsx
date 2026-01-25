import { useRef, useState } from "react";
import { useMutation } from "convex/react";
import { api } from "../../../convex/_generated/api";
import { Button } from "@/components/ui/button";
import { ImagePlus, X } from "lucide-react";
import { Id } from "../../../convex/_generated/dataModel";

interface ImageUploadProps {
  onImageUploaded: (storageId: Id<"_storage">) => void;
  onClear: () => void;
  preview: string | null;
}

export function ImageUpload({
  onImageUploaded,
  onClear,
  preview,
}: ImageUploadProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const generateUploadUrl = useMutation(api.files.generateUploadUrl);

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file type
    if (!file.type.startsWith("image/")) {
      alert("Please select an image file");
      return;
    }

    // Validate file size (max 10MB)
    if (file.size > 10 * 1024 * 1024) {
      alert("Image must be under 10MB");
      return;
    }

    setUploading(true);
    try {
      // Get upload URL from Convex
      const uploadUrl = await generateUploadUrl();

      // Upload the file
      const response = await fetch(uploadUrl, {
        method: "POST",
        headers: { "Content-Type": file.type },
        body: file,
      });

      if (!response.ok) {
        throw new Error("Upload failed");
      }

      const { storageId } = await response.json();
      onImageUploaded(storageId);
    } catch (error) {
      console.error("Upload error:", error);
      alert("Failed to upload image");
    } finally {
      setUploading(false);
    }
  };

  if (preview) {
    return (
      <div className="relative inline-block">
        <img
          src={preview}
          alt="Upload preview"
          className="h-20 w-20 object-cover rounded-md"
        />
        <button
          onClick={onClear}
          className="absolute -top-2 -right-2 bg-destructive text-destructive-foreground rounded-full p-1"
        >
          <X className="h-3 w-3" />
        </button>
      </div>
    );
  }

  return (
    <>
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        onChange={handleFileSelect}
        className="hidden"
      />
      <Button
        type="button"
        variant="ghost"
        size="icon"
        onClick={() => fileInputRef.current?.click()}
        disabled={uploading}
      >
        <ImagePlus className="h-5 w-5" />
      </Button>
    </>
  );
}
