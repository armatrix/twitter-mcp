import OAuth from "oauth-1.0a";
import crypto from "crypto";
import type { WriterConfig } from "../config.js";

const BASE_URL = "https://api.twitter.com/2";

export class WriterClient {
  private oauth: OAuth;
  private token: { key: string; secret: string };

  constructor(config: WriterConfig) {
    this.oauth = new OAuth({
      consumer: {
        key: config.api_key,
        secret: config.api_secret_key,
      },
      signature_method: "HMAC-SHA1",
      hash_function(baseString: string, key: string) {
        return crypto.createHmac("sha1", key).update(baseString).digest("base64");
      },
    });

    this.token = {
      key: config.access_token,
      secret: config.access_token_secret,
    };
  }

  private getAuthHeader(url: string, method: string): string {
    const requestData = { url, method };
    const authData = this.oauth.authorize(requestData, this.token);
    return this.oauth.toHeader(authData).Authorization;
  }

  async postTweet(params: {
    text: string;
    reply_to_tweet_id?: string;
    quote_tweet_id?: string;
  }): Promise<unknown> {
    const url = `${BASE_URL}/tweets`;
    const method = "POST";

    const body: Record<string, unknown> = { text: params.text };
    if (params.reply_to_tweet_id) {
      body.reply = { in_reply_to_tweet_id: params.reply_to_tweet_id };
    }
    if (params.quote_tweet_id) {
      body.quote_tweet_id = params.quote_tweet_id;
    }

    const authHeader = this.getAuthHeader(url, method);

    const res = await fetch(url, {
      method,
      headers: {
        Authorization: authHeader,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
    });

    if (!res.ok) {
      const errBody = await res.text();
      throw new Error(`Twitter API POST /tweets failed: ${res.status} ${errBody}`);
    }

    return res.json();
  }
}
