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
