import type { ReaderConfig } from "../config.js";

const BASE_URL = "https://api.twitterapi.io";

export class ReaderClient {
  private apiKey: string;

  constructor(config: ReaderConfig) {
    this.apiKey = config.api_key;
  }

  private async get<T>(path: string, params: Record<string, string | number | undefined>): Promise<T> {
    const url = new URL(`${BASE_URL}${path}`);
    for (const [key, value] of Object.entries(params)) {
      if (value !== undefined && value !== null && value !== "") {
        url.searchParams.set(key, String(value));
      }
    }

    const res = await fetch(url.toString(), {
      headers: {
        "X-API-Key": this.apiKey,
        "Content-Type": "application/json",
      },
    });

    if (!res.ok) {
      const body = await res.text();
      throw new Error(`twitterapi.io ${path} failed: ${res.status} ${body}`);
    }

    return res.json() as Promise<T>;
  }

  async searchTweets(
    query: string,
    queryType = "Latest",
    filters?: {
      min_likes?: number;
      min_followers?: number;
      max_results?: number;
      exclude_replies?: boolean;
    }
  ): Promise<unknown> {
    const raw = await this.get<{
      tweets?: Array<{
        likeCount?: number;
        isReply?: boolean;
        author?: { followers?: number };
        [key: string]: unknown;
      }>;
      [key: string]: unknown;
    }>("/twitter/tweet/advanced_search", { query, queryType });

    if (!filters || !raw.tweets) return raw;

    let tweets = raw.tweets;

    if (filters.exclude_replies) {
      tweets = tweets.filter((t) => !t.isReply);
    }
    if (filters.min_likes !== undefined) {
      tweets = tweets.filter((t) => (t.likeCount ?? 0) >= filters.min_likes!);
    }
    if (filters.min_followers !== undefined) {
      tweets = tweets.filter(
        (t) => (t.author?.followers ?? 0) >= filters.min_followers!
      );
    }
    if (filters.max_results !== undefined) {
      tweets = tweets.slice(0, filters.max_results);
    }

    return { ...raw, tweets };
  }

  async getTweets(tweetIds: string[]): Promise<unknown> {
    return this.get("/twitter/tweets", { tweet_ids: tweetIds.join(",") });
  }

  async getArticle(tweetId: string): Promise<unknown> {
    return this.get("/twitter/article", { tweet_id: tweetId });
  }

  async getUserInfo(userName: string): Promise<unknown> {
    return this.get("/twitter/user/info", { userName });
  }

  async getUserTimeline(userName: string, count: number): Promise<unknown> {
    return this.get("/twitter/user/last_tweets", { userName, count });
  }

  async getUserFollowers(userName: string, pageSize: number): Promise<unknown> {
    return this.get("/twitter/user/followers", { userName, pageSize });
  }

  async getUserFollowing(userName: string, count: number): Promise<unknown> {
    return this.get("/twitter/user/following", { userName, count });
  }

  async getUserMentions(userName: string, cursor?: string): Promise<unknown> {
    return this.get("/twitter/user/mentions", { userName, cursor });
  }

  async getTweetReplies(tweetId: string, cursor?: string): Promise<unknown> {
    return this.get("/twitter/tweet/replies/v2", { tweetId, cursor });
  }

  async getTweetQuotes(tweetId: string, cursor?: string): Promise<unknown> {
    return this.get("/twitter/tweet/quotes", { tweetId, cursor });
  }

  async getTweetThread(tweetId: string, cursor?: string): Promise<unknown> {
    return this.get("/twitter/tweet/thread_context", { tweetId, cursor });
  }

  async getTrends(woeid: string): Promise<unknown> {
    return this.get("/twitter/trends", { woeid });
  }

  async searchUsers(query: string, cursor?: string): Promise<unknown> {
    return this.get("/twitter/user/search", { query, cursor });
  }
}
