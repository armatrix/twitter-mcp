import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import type { ReaderClient } from "../clients/reader.js";
import type { DefaultsConfig } from "../config.js";

export function registerUserTools(
  server: McpServer,
  reader: ReaderClient,
  defaults: DefaultsConfig
) {
  server.tool(
    "get_user",
    "Get Twitter user profile info by username",
    {
      username: z.string().describe("Twitter username (without @)"),
    },
    async ({ username }) => {
      try {
        const result = await reader.getUserInfo(username);
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
    "get_user_timeline",
    "Get recent tweets from a user's timeline",
    {
      username: z.string().describe("Twitter username (without @)"),
      count: z
        .number()
        .optional()
        .describe(`Number of tweets to retrieve (default ${defaults.timeline_count})`),
    },
    async ({ username, count }) => {
      try {
        const result = await reader.getUserTimeline(username, count ?? defaults.timeline_count);
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
    "get_user_followers",
    "Get followers of a Twitter user",
    {
      username: z.string().describe("Twitter username (without @)"),
      page_size: z
        .number()
        .optional()
        .describe(`Number of followers to retrieve (default ${defaults.timeline_count})`),
    },
    async ({ username, page_size }) => {
      try {
        const result = await reader.getUserFollowers(username, page_size ?? defaults.timeline_count);
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
    "get_user_following",
    "Get accounts that a Twitter user follows",
    {
      username: z.string().describe("Twitter username (without @)"),
      count: z
        .number()
        .optional()
        .describe(`Number of following to retrieve (default ${defaults.timeline_count})`),
    },
    async ({ username, count }) => {
      try {
        const result = await reader.getUserFollowing(username, count ?? defaults.timeline_count);
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
    "get_user_mentions",
    "Get tweets that mention a specific user",
    {
      username: z.string().describe("Twitter username (without @)"),
      cursor: z.string().optional().describe("Pagination cursor for next page"),
    },
    async ({ username, cursor }) => {
      try {
        const result = await reader.getUserMentions(username, cursor);
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
