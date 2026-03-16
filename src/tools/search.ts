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
    "Search tweets by keyword or advanced query",
    {
      query: z.string().describe("Search query (supports Twitter advanced search syntax)"),
      query_type: z
        .enum(["Latest", "Top"])
        .optional()
        .describe("Query type: Latest (default) or Top"),
    },
    async ({ query, query_type }) => {
      try {
        const result = await reader.searchTweets(query, query_type ?? "Latest");
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
