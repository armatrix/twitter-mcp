import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import type { WriterClient } from "../clients/writer.js";

const MAX_TWEET_CHARS = 25000; // Premium account limit

export function registerWriteTools(server: McpServer, writer: WriterClient) {
  server.tool(
    "post_tweet",
    "Post a tweet or reply to an existing tweet",
    {
      text: z
        .string()
        .max(MAX_TWEET_CHARS)
        .describe(`Tweet text content (max ${MAX_TWEET_CHARS} characters for Premium)`),
      reply_to_tweet_id: z
        .string()
        .optional()
        .describe("Tweet ID to reply to (for threading)"),
      quote_tweet_id: z
        .string()
        .optional()
        .describe("Tweet ID to quote-tweet"),
    },
    async ({ text, reply_to_tweet_id, quote_tweet_id }) => {
      try {
        if (text.length > MAX_TWEET_CHARS) {
          return {
            content: [
              {
                type: "text" as const,
                text: `Error: Tweet text exceeds ${MAX_TWEET_CHARS} character limit (got ${text.length} chars)`,
              },
            ],
            isError: true,
          };
        }

        const result = await writer.postTweet({
          text,
          reply_to_tweet_id,
          quote_tweet_id,
        });
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
