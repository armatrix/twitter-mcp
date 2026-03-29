import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import type { ReaderClient } from "../clients/reader.js";
import type { DefaultsConfig } from "../config.js";

export function registerSearchTools(
  server: McpServer,
  reader: ReaderClient,
  defaults: DefaultsConfig
) {
  server.tool(
    "search_tweets",
    "Search tweets by keyword or advanced query. Supports filtering by engagement and author metrics.",
    {
      query: z.string().describe("Search query (supports Twitter advanced search syntax)"),
      query_type: z
        .enum(["Latest", "Top"])
        .optional()
        .describe("Query type: Latest (default) or Top"),
      min_likes: z
        .number()
        .optional()
        .describe("Minimum likes to include (filters out low-engagement tweets)"),
      min_followers: z
        .number()
        .optional()
        .describe("Minimum author followers to include"),
      max_results: z
        .number()
        .optional()
        .describe("Maximum number of tweets to return (default: all)"),
      exclude_replies: z
        .boolean()
        .optional()
        .describe("Exclude reply tweets (default: false)"),
    },
    async ({ query, query_type, min_likes, min_followers, max_results, exclude_replies }) => {
      try {
        const filters =
          min_likes !== undefined ||
          min_followers !== undefined ||
          max_results !== undefined ||
          exclude_replies
            ? { min_likes, min_followers, max_results, exclude_replies: exclude_replies ?? false }
            : undefined;
        const result = await reader.searchTweets(query, query_type ?? "Latest", filters);
        return { content: [{ type: "text" as const, text: JSON.stringify(result, null, 2) }] };
      } catch (err) {
        return {
          content: [{ type: "text" as const, text: `Error: ${(err as Error).message}` }],
          isError: true,
        };
      }
    }
  );

  server.tool(
    "search_users",
    "Search Twitter users by keyword",
    {
      query: z.string().describe("Search query for users"),
      cursor: z.string().optional().describe("Pagination cursor for next page"),
    },
    async ({ query, cursor }) => {
      try {
        const result = await reader.searchUsers(query, cursor);
        return { content: [{ type: "text" as const, text: JSON.stringify(result, null, 2) }] };
      } catch (err) {
        return {
          content: [{ type: "text" as const, text: `Error: ${(err as Error).message}` }],
          isError: true,
        };
      }
    }
  );
}
