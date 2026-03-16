import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import type { ReaderClient } from "../clients/reader.js";

export function registerTweetTools(server: McpServer, reader: ReaderClient) {
  server.tool(
    "get_tweet",
    "Get one or more tweets by ID, including view counts",
    {
      tweet_ids: z
        .string()
        .describe("Comma-separated tweet IDs (e.g. '1234,5678')"),
    },
    async ({ tweet_ids }) => {
      try {
        const ids = tweet_ids.split(",").map((s) => s.trim()).filter(Boolean);
        const result = await reader.getTweets(ids);
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
    "get_article",
    "Get a Twitter article (long-form tweet) by tweet ID",
    {
      tweet_id: z.string().describe("Tweet ID of the article"),
    },
    async ({ tweet_id }) => {
      try {
        const result = await reader.getArticle(tweet_id);
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
    "get_tweet_replies",
    "Get replies to a tweet",
    {
      tweet_id: z.string().describe("Tweet ID to get replies for"),
      cursor: z.string().optional().describe("Pagination cursor for next page"),
    },
    async ({ tweet_id, cursor }) => {
      try {
        const result = await reader.getTweetReplies(tweet_id, cursor);
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
    "get_tweet_quotes",
    "Get quote tweets for a tweet",
    {
      tweet_id: z.string().describe("Tweet ID to get quote tweets for"),
      cursor: z.string().optional().describe("Pagination cursor for next page"),
    },
    async ({ tweet_id, cursor }) => {
      try {
        const result = await reader.getTweetQuotes(tweet_id, cursor);
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
    "get_tweet_thread",
    "Get the full thread context for a tweet",
    {
      tweet_id: z.string().describe("Tweet ID to get thread for"),
      cursor: z.string().optional().describe("Pagination cursor for next page"),
    },
    async ({ tweet_id, cursor }) => {
      try {
        const result = await reader.getTweetThread(tweet_id, cursor);
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
