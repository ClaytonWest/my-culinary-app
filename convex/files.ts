import { v } from "convex/values";
import { mutation } from "./_generated/server";
import { requireAuth } from "./lib/auth";

// Generate upload URL for image uploads
export const generateUploadUrl = mutation({
  args: {},
  handler: async (ctx) => {
    await requireAuth(ctx);
    return await ctx.storage.generateUploadUrl();
  },
});

// Register file upload ownership after upload completes
export const registerUpload = mutation({
  args: {
    storageId: v.id("_storage"),
  },
  handler: async (ctx, args) => {
    const userId = await requireAuth(ctx);

    // Verify storage ID exists
    const url = await ctx.storage.getUrl(args.storageId);
    if (!url) {
      throw new Error("Invalid storage ID");
    }

    // Check if already registered
    const existing = await ctx.db
      .query("uploadedFiles")
      .withIndex("by_storageId", (q) => q.eq("storageId", args.storageId))
      .first();

    if (existing) {
      // Already registered - verify ownership
      if (existing.userId !== userId) {
        throw new Error("File belongs to another user");
      }
      return args.storageId;
    }

    // Register the upload
    const recordId = await ctx.db.insert("uploadedFiles", {
      storageId: args.storageId,
      userId,
      uploadedAt: Date.now(),
    });

    // RACE CONDITION FIX: Verify no duplicate was created
    const allRecords = await ctx.db
      .query("uploadedFiles")
      .withIndex("by_storageId", (q) => q.eq("storageId", args.storageId))
      .collect();

    if (allRecords.length > 1) {
      // Duplicates exist - keep earliest, delete others
      const sorted = allRecords.sort((a, b) => a.uploadedAt - b.uploadedAt);
      const keeper = sorted[0];

      // If we're not the keeper, delete our record
      if (keeper._id !== recordId) {
        await ctx.db.delete(recordId);

        // Verify the keeper belongs to us, otherwise reject
        if (keeper.userId !== userId) {
          throw new Error("File belongs to another user");
        }
      } else {
        // We're the keeper - delete the duplicates
        for (const record of sorted.slice(1)) {
          await ctx.db.delete(record._id);
        }
      }
    }

    return args.storageId;
  },
});
