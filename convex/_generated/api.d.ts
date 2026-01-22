/* eslint-disable */
/**
 * Generated `api` utility.
 *
 * THIS CODE IS AUTOMATICALLY GENERATED.
 *
 * To regenerate, run `npx convex dev`.
 * @module
 */

import type * as ai from "../ai.js";
import type * as auth from "../auth.js";
import type * as conversations from "../conversations.js";
import type * as files from "../files.js";
import type * as http from "../http.js";
import type * as lib_auth from "../lib/auth.js";
import type * as lib_errors from "../lib/errors.js";
import type * as lib_imageAnalysis from "../lib/imageAnalysis.js";
import type * as lib_memoryCompaction from "../lib/memoryCompaction.js";
import type * as lib_recipeGeneration from "../lib/recipeGeneration.js";
import type * as lib_topicGuardrails from "../lib/topicGuardrails.js";
import type * as lib_validators from "../lib/validators.js";
import type * as memories from "../memories.js";
import type * as memoryCompaction from "../memoryCompaction.js";
import type * as messages from "../messages.js";
import type * as recipes from "../recipes.js";
import type * as users from "../users.js";

import type {
  ApiFromModules,
  FilterApi,
  FunctionReference,
} from "convex/server";

declare const fullApi: ApiFromModules<{
  ai: typeof ai;
  auth: typeof auth;
  conversations: typeof conversations;
  files: typeof files;
  http: typeof http;
  "lib/auth": typeof lib_auth;
  "lib/errors": typeof lib_errors;
  "lib/imageAnalysis": typeof lib_imageAnalysis;
  "lib/memoryCompaction": typeof lib_memoryCompaction;
  "lib/recipeGeneration": typeof lib_recipeGeneration;
  "lib/topicGuardrails": typeof lib_topicGuardrails;
  "lib/validators": typeof lib_validators;
  memories: typeof memories;
  memoryCompaction: typeof memoryCompaction;
  messages: typeof messages;
  recipes: typeof recipes;
  users: typeof users;
}>;

/**
 * A utility for referencing Convex functions in your app's public API.
 *
 * Usage:
 * ```js
 * const myFunctionReference = api.myModule.myFunction;
 * ```
 */
export declare const api: FilterApi<
  typeof fullApi,
  FunctionReference<any, "public">
>;

/**
 * A utility for referencing Convex functions in your app's internal API.
 *
 * Usage:
 * ```js
 * const myFunctionReference = internal.myModule.myFunction;
 * ```
 */
export declare const internal: FilterApi<
  typeof fullApi,
  FunctionReference<any, "internal">
>;

export declare const components: {};
