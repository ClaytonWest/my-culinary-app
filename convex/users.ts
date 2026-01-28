import { v } from "convex/values";
import { mutation, query, internalQuery, internalMutation } from "./_generated/server";
import { requireAuth, getUserProfile } from "./lib/auth";
import { Id } from "./_generated/dataModel";

// Create profile after signup
export const createProfile = mutation({
  args: {
    name: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const userId = await requireAuth(ctx);

    // Check if profile exists
    const existing = await getUserProfile(ctx, userId);
    if (existing) {
      return existing._id;
    }

    return await ctx.db.insert("userProfiles", {
      userId,
      name: args.name,
      subscriptionTier: "free",
      dailyRequestCount: 0,
      lastRequestReset: Date.now(),
      createdAt: Date.now(),
    });
  },
});

// Get current user profile
export const getProfile = query({
  args: {},
  handler: async (ctx) => {
    const userId = await requireAuth(ctx);
    return await getUserProfile(ctx, userId);
  },
});

// Get profile (internal - for actions)
export const getProfileInternal = internalQuery({
  args: { userId: v.id("users") },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("userProfiles")
      .withIndex("by_userId", (q) => q.eq("userId", args.userId))
      .unique();
  },
});

// Update profile
export const updateProfile = mutation({
  args: {
    name: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const userId = await requireAuth(ctx);
    const profile = await getUserProfile(ctx, userId);

    if (!profile) {
      throw new Error("Profile not found");
    }

    const updates: Record<string, unknown> = {};
    if (args.name !== undefined) updates.name = args.name;

    await ctx.db.patch(profile._id, updates);
  },
});

// Check and update rate limit
export const checkRateLimit = mutation({
  args: {},
  handler: async (ctx) => {
    const userId = await requireAuth(ctx);
    const profile = await getUserProfile(ctx, userId);

    if (!profile) {
      throw new Error("Profile not found");
    }

    const now = Date.now();
    const dayInMs = 24 * 60 * 60 * 1000;
    const limit = profile.subscriptionTier === "premium" ? 1000 : 50;

    // Reset if new day
    if (profile.lastRequestReset < now - dayInMs) {
      await ctx.db.patch(profile._id, {
        dailyRequestCount: 1,
        lastRequestReset: now,
      });
      return { allowed: true, remaining: limit - 1 };
    }

    // Increment FIRST (atomic with transaction)
    const newCount = profile.dailyRequestCount + 1;
    await ctx.db.patch(profile._id, { dailyRequestCount: newCount });

    // THEN check if over limit
    if (newCount > limit) {
      // Over limit - decrement back and reject
      await ctx.db.patch(profile._id, { dailyRequestCount: newCount - 1 });
      return { allowed: false, remaining: 0 };
    }

    return { allowed: true, remaining: limit - newCount };
  },
});

// Ensure profile exists (called after sign in)
export const ensureProfile = mutation({
  args: {},
  handler: async (ctx) => {
    const userId = await requireAuth(ctx);
    const existing = await getUserProfile(ctx, userId);

    if (existing) {
      return existing._id;
    }

    return await ctx.db.insert("userProfiles", {
      userId,
      name: undefined,
      subscriptionTier: "free",
      dailyRequestCount: 0,
      lastRequestReset: Date.now(),
      createdAt: Date.now(),
    });
  },
});
