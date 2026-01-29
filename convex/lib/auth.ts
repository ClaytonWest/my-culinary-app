import { QueryCtx, MutationCtx } from "../_generated/server";
import { Id } from "../_generated/dataModel";
import { getAuthUserId } from "@convex-dev/auth/server";

export async function requireAuth(ctx: QueryCtx | MutationCtx) {
  const userId = await getAuthUserId(ctx);
  if (!userId) {
    throw new Error("Unauthorized: Please sign in");
  }
  return userId;
}

export async function getUserProfile(
  ctx: QueryCtx | MutationCtx,
  userId: Id<"users">
) {
  const profile = await ctx.db
    .query("userProfiles")
    .withIndex("by_userId", (q) => q.eq("userId", userId))
    .unique();

  return profile;
}

export async function requireUserProfile(ctx: QueryCtx | MutationCtx) {
  const userId = await requireAuth(ctx);
  const profile = await getUserProfile(ctx, userId);

  if (!profile) {
    throw new Error("Profile not found");
  }

  return { userId, profile };
}

export function requireOwnership(
  resourceUserId: Id<"users">,
  currentUserId: Id<"users">
) {
  if (resourceUserId !== currentUserId) {
    throw new Error("Access denied");
  }
}

export async function verifyFileOwnership(
  ctx: QueryCtx | MutationCtx,
  storageId: Id<"_storage">,
  userId: Id<"users">
): Promise<void> {
  const file = await ctx.db
    .query("uploadedFiles")
    .withIndex("by_storageId", (q) => q.eq("storageId", storageId))
    .first();

  if (!file) {
    throw new Error("File not found or not registered");
  }

  if (file.userId !== userId) {
    throw new Error("Access denied: file belongs to another user");
  }
}
