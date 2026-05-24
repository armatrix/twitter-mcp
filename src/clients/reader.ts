import type { ReaderConfig } from "../config.js";

const TWITTERAPI_BASE_URL = "https://api.twitterapi.io";
const HERMES_TWEET_BASE_URL = "https://xquik.com";
const HERMES_TWEET_PROVIDER = "hermes-tweet";
const TWITTERAPI_PROVIDER = "twitterapi.io";

export class ReaderClient {
  private provider: ReaderConfig["provider"];
  private apiKey: string;
  private baseUrl: string;

  constructor(config: ReaderConfig) {
    if (config.provider !== TWITTERAPI_PROVIDER && config.provider !== HERMES_TWEET_PROVIDER) {
      throw new Error(`Unsupported reader provider: ${String(config.provider)}`);
    }
    this.provider = config.provider;
    this.apiKey = config.api_key;
    this.baseUrl = (
      config.base_url ??
      (config.provider === HERMES_TWEET_PROVIDER ? HERMES_TWEET_BASE_URL : TWITTERAPI_BASE_URL)
    ).replace(/\/+$/, "");
  }

  private async get<T>(path: string, params: Record<string, string | number | undefined>): Promise<T> {
    const url = new URL(`${this.baseUrl}${path}`);
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
      throw new Error(`${this.provider} ${path} failed: ${res.status} ${body}`);
    }

    return res.json() as Promise<T>;
  }

  private async getReader<T>(
    twitterApiPath: string,
    twitterApiParams: Record<string, string | number | undefined>,
    hermesTweetPath: string,
    hermesTweetParams: Record<string, string | number | undefined> = twitterApiParams,
  ): Promise<T> {
    if (this.provider === TWITTERAPI_PROVIDER) {
      return this.get(twitterApiPath, twitterApiParams);
    }
    return this.get(hermesTweetPath, hermesTweetParams);
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
    const raw = await this.getReader<{
      tweets?: Array<{
        likeCount?: number;
        isReply?: boolean;
        author?: { followers?: number };
        [key: string]: unknown;
      }>;
      [key: string]: unknown;
    }>(
      "/twitter/tweet/advanced_search",
      { query, queryType },
      "/api/v1/x/tweets/search",
      {
        q: query,
        queryType,
        limit: filters?.max_results,
      },
    );

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
    if (this.provider === HERMES_TWEET_PROVIDER) {
      const tweets = await Promise.all(
        tweetIds.map((id) => this.get(`/api/v1/x/tweets/${encodeURIComponent(id)}`, {})),
      );
      return tweetIds.length === 1 ? tweets[0] : { tweets };
    }
    return this.get("/twitter/tweets", { tweet_ids: tweetIds.join(",") });
  }

  async getArticle(tweetId: string): Promise<unknown> {
    return this.getReader(
      "/twitter/article",
      { tweet_id: tweetId },
      `/api/v1/x/articles/${encodeURIComponent(tweetId)}`,
      {},
    );
  }

  async getUserInfo(userName: string): Promise<unknown> {
    return this.getReader(
      "/twitter/user/info",
      { userName },
      `/api/v1/x/users/${encodeURIComponent(userName)}`,
      {},
    );
  }

  async getUserTimeline(userName: string, count: number): Promise<unknown> {
    return this.getReader(
      "/twitter/user/last_tweets",
      { userName, count },
      `/api/v1/x/users/${encodeURIComponent(userName)}/tweets`,
      {},
    );
  }

  async getUserFollowers(userName: string, pageSize: number): Promise<unknown> {
    return this.getReader(
      "/twitter/user/followers",
      { userName, pageSize },
      `/api/v1/x/users/${encodeURIComponent(userName)}/followers`,
      { pageSize },
    );
  }

  async getUserFollowing(userName: string, count: number): Promise<unknown> {
    return this.getReader(
      "/twitter/user/following",
      { userName, count },
      `/api/v1/x/users/${encodeURIComponent(userName)}/following`,
      { pageSize: count },
    );
  }

  async getUserMentions(userName: string, cursor?: string): Promise<unknown> {
    return this.getReader(
      "/twitter/user/mentions",
      { userName, cursor },
      `/api/v1/x/users/${encodeURIComponent(userName)}/mentions`,
      { cursor },
    );
  }

  async getTweetReplies(tweetId: string, cursor?: string): Promise<unknown> {
    return this.getReader(
      "/twitter/tweet/replies/v2",
      { tweetId, cursor },
      `/api/v1/x/tweets/${encodeURIComponent(tweetId)}/replies`,
      { cursor },
    );
  }

  async getTweetQuotes(tweetId: string, cursor?: string): Promise<unknown> {
    return this.getReader(
      "/twitter/tweet/quotes",
      { tweetId, cursor },
      `/api/v1/x/tweets/${encodeURIComponent(tweetId)}/quotes`,
      { cursor },
    );
  }

  async getTweetThread(tweetId: string, cursor?: string): Promise<unknown> {
    return this.getReader(
      "/twitter/tweet/thread_context",
      { tweetId, cursor },
      `/api/v1/x/tweets/${encodeURIComponent(tweetId)}/thread`,
      { cursor },
    );
  }

  async getTrends(woeid: string): Promise<unknown> {
    return this.getReader("/twitter/trends", { woeid }, "/api/v1/x/trends", { woeid });
  }

  async searchUsers(query: string, cursor?: string): Promise<unknown> {
    return this.getReader(
      "/twitter/user/search",
      { query, cursor },
      "/api/v1/x/users/search",
      { q: query, cursor },
    );
  }
}
