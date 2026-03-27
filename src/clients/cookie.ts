/**
 * Cookie-based Twitter client powered by agent-twitter-client (elizaOS).
 *
 * Uses ct0 + auth_token from config, but routes through Scraper which handles:
 *   - TLS cipher randomization (defeats fingerprinting)
 *   - Automatic ct0/CSRF rotation on every response
 *   - Cookie jar management
 *   - Rate limit retry (429 backoff)
 */

import { Scraper } from "agent-twitter-client";
import { Cookie } from "tough-cookie";

export interface CookieConfig {
  ct0: string;
  auth_token: string;
}

export class CookieClient {
  private scraper: Scraper;
  private ready: Promise<void>;

  constructor(config: CookieConfig) {
    this.scraper = new Scraper();
    this.ready = this.initCookies(config);
  }

  /**
   * Inject ct0 + auth_token into Scraper's cookie jar.
   * Scraper handles TLS fingerprint randomization and ct0 rotation from here.
   */
  private async initCookies(config: CookieConfig): Promise<void> {
    const cookies = [
      `auth_token=${config.auth_token}; Domain=.twitter.com; Path=/; Secure; HttpOnly`,
      `ct0=${config.ct0}; Domain=.twitter.com; Path=/; Secure`,
    ];
    await this.scraper.setCookies(cookies);

    const loggedIn = await this.scraper.isLoggedIn();
    if (loggedIn) {
      process.stderr.write("Cookie client: session active (via Scraper)\n");
    } else {
      process.stderr.write(
        "Cookie client: warning — session may be expired\n",
      );
    }
  }

  async sendTweet(params: {
    text: string;
    reply_to_tweet_id?: string;
  }): Promise<unknown> {
    await this.ready;

    const response = await this.scraper.sendTweet(
      params.text,
      params.reply_to_tweet_id,
    );

    const body = (await response.json()) as {
      data?: {
        create_tweet?: {
          tweet_results?: {
            result?: { rest_id?: string };
          };
        };
      };
      errors?: Array<{ code: number; message: string }>;
    };

    // Check GraphQL errors
    if (body.errors && body.errors.length > 0) {
      throw new Error(
        `Cookie CreateTweet error: ${body.errors.map((e) => `[${e.code}] ${e.message}`).join("; ")}`,
      );
    }

    const tweetId = body?.data?.create_tweet?.tweet_results?.result?.rest_id;
    if (!tweetId) {
      throw new Error(
        `Cookie CreateTweet: no tweet ID in response. Body: ${JSON.stringify(body).slice(0, 500)}`,
      );
    }

    return {
      data: {
        id: tweetId,
        text: params.text,
      },
      method: "cookie",
    };
  }
}
