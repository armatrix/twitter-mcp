import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import type { WriterClient } from "../clients/writer.js";
import type { CookieClient } from "../clients/cookie.js";

const MAX_TWEET_CHARS = 25000; // Premium account limit
const MAX_IMAGES = 4; // Twitter limit

export function registerWriteTools(
  server: McpServer,
  writer: WriterClient,
  cookie: CookieClient | null,
) {
  server.tool(
    "post_tweet",
    "Post a tweet with optional images. Supports reply and quote-tweet. " +
      "If replying to a non-interacted tweet and OAuth returns 403, " +
      "automatically falls back to cookie-based auth.",
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
      media_paths: z
        .array(z.string())
        .max(MAX_IMAGES)
        .optional()
        .describe("Local file paths to images (max 4). Supports png, jpg, gif, webp."),
    },
    async ({ text, reply_to_tweet_id, quote_tweet_id, media_paths }) => {
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

        let media_ids: string[] | undefined;
        if (media_paths && media_paths.length > 0) {
          media_ids = [];
          for (const filePath of media_paths) {
            const mediaId = await writer.uploadMedia(filePath);
            media_ids.push(mediaId);
          }
        }

        // Routing: external replies go through cookie client (OAuth Free tier blocks them).
        // Original tweets / self-replies / quote-tweets go through OAuth.
        const isExternalReply = !!reply_to_tweet_id && !quote_tweet_id;

        if (isExternalReply && cookie) {
          // Cookie client for replies (bypasses OAuth Free tier 403)
          process.stderr.write(
            `Reply detected → using cookie client (twitter.com + mobile UA)\n`,
          );
          const result = await cookie.sendTweet({
            text,
            reply_to_tweet_id,
          });
          return {
            content: [
              {
                type: "text" as const,
                text: JSON.stringify(result, null, 2),
              },
            ],
          };
        }

        // OAuth for original tweets, quote-tweets, and self-replies without cookie
        const result = await writer.postTweet({
          text,
          reply_to_tweet_id,
          quote_tweet_id,
          media_ids,
        });
        return {
          content: [
            {
              type: "text" as const,
              text: JSON.stringify({ ...result as object, method: "oauth" }, null, 2),
            },
          ],
        };
      } catch (err) {
        return {
          content: [{ type: "text" as const, text: `Error: ${(err as Error).message}` }],
          isError: true,
        };
      }
    },
  );

  server.tool(
    "like_tweet",
    "Like a tweet by ID",
    {
      tweet_id: z.string().describe("Tweet ID to like"),
    },
    async ({ tweet_id }) => {
      try {
        const result = await writer.likeTweet(tweet_id);
        return { content: [{ type: "text" as const, text: JSON.stringify(result, null, 2) }] };
      } catch (err) {
        return {
          content: [{ type: "text" as const, text: `Error: ${(err as Error).message}` }],
          isError: true,
        };
      }
    },
  );

  server.tool(
    "unlike_tweet",
    "Remove a like from a tweet",
    {
      tweet_id: z.string().describe("Tweet ID to unlike"),
    },
    async ({ tweet_id }) => {
      try {
        const result = await writer.unlikeTweet(tweet_id);
        return { content: [{ type: "text" as const, text: JSON.stringify(result, null, 2) }] };
      } catch (err) {
        return {
          content: [{ type: "text" as const, text: `Error: ${(err as Error).message}` }],
          isError: true,
        };
      }
    },
  );

  server.tool(
    "retweet",
    "Retweet a tweet by ID",
    {
      tweet_id: z.string().describe("Tweet ID to retweet"),
    },
    async ({ tweet_id }) => {
      try {
        const result = await writer.retweet(tweet_id);
        return { content: [{ type: "text" as const, text: JSON.stringify(result, null, 2) }] };
      } catch (err) {
        return {
          content: [{ type: "text" as const, text: `Error: ${(err as Error).message}` }],
          isError: true,
        };
      }
    },
  );

  server.tool(
    "delete_tweet",
    "Delete a tweet by ID",
    {
      tweet_id: z.string().describe("Tweet ID to delete"),
    },
    async ({ tweet_id }) => {
      try {
        const result = await writer.deleteTweet(tweet_id);
        return { content: [{ type: "text" as const, text: JSON.stringify(result, null, 2) }] };
      } catch (err) {
        return {
          content: [{ type: "text" as const, text: `Error: ${(err as Error).message}` }],
          isError: true,
        };
      }
    },
  );

  server.tool(
    "like_tweet",
    "Like a tweet by ID",
    {
      tweet_id: z.string().describe("Tweet ID to like"),
    },
    async ({ tweet_id }) => {
      try {
        const result = await writer.likeTweet(tweet_id);
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
    "unlike_tweet",
    "Remove a like from a tweet",
    {
      tweet_id: z.string().describe("Tweet ID to unlike"),
    },
    async ({ tweet_id }) => {
      try {
        const result = await writer.unlikeTweet(tweet_id);
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
    "retweet",
    "Retweet a tweet by ID",
    {
      tweet_id: z.string().describe("Tweet ID to retweet"),
    },
    async ({ tweet_id }) => {
      try {
        const result = await writer.retweet(tweet_id);
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
    "delete_tweet",
    "Delete a tweet by ID",
    {
      tweet_id: z.string().describe("Tweet ID to delete"),
    },
    async ({ tweet_id }) => {
      try {
        const result = await writer.deleteTweet(tweet_id);
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
