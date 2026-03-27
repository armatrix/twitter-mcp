/**
 * Cookie-based Twitter client using internal GraphQL API.
 * Full browser simulation — headers, cookie jar, Accept chain, ct0 rotation.
 *
 * Anti-detection layers:
 *   1. Complete browser header set (Accept, Accept-Language, Sec-Fetch-*, etc.)
 *   2. Realistic cookie string (guest_id, personalization_id, twid, etc.)
 *   3. Auto ct0 rotation from Set-Cookie on every response
 *   4. Referer that matches real navigation (compose tweet page)
 */

// Twitter web app's public bearer token (same for all users)
const BEARER =
  "AAAAAAAAAAAAAAAAAAAAANRILgAAAAAAnNwIzUejRCOuH5E6I8xnZz4puTs=1Zv7ttfk8LF81IUq16cHjhLTvJu4FA33AGWWjCpTnA";

// Use twitter.com (not x.com) — x.com requires X-Client-Transaction-Id for writes
const GRAPHQL_BASE = "https://twitter.com/i/api/graphql";

// CreateTweet mutation — query ID rotates with x.com deploys; update if broken
// Last updated: 2026-03-27 from main.a4767c1a.js
const CREATE_TWEET_ID = "lvs5-tN_lLNg_PhdRSURMg";

const TWEET_FEATURES = {
  communities_web_enable_tweet_community_results_fetch: true,
  c9s_tweet_anatomy_moderator_badge_enabled: true,
  tweetypie_unmention_optimization_enabled: true,
  responsive_web_edit_tweet_api_enabled: true,
  graphql_is_translatable_rweb_tweet_is_translatable_enabled: true,
  view_counts_everywhere_api_enabled: true,
  longform_notetweets_consumption_enabled: true,
  responsive_web_twitter_article_tweet_consumption_enabled: true,
  tweet_awards_web_tipping_enabled: false,
  creator_subscriptions_quote_tweet_preview_enabled: false,
  longform_notetweets_rich_text_read_enabled: true,
  longform_notetweets_inline_media_enabled: true,
  articles_preview_enabled: true,
  rweb_video_timestamps_enabled: true,
  rweb_tipjar_consumption_enabled: true,
  responsive_web_graphql_exclude_directive_enabled: true,
  verified_phone_label_enabled: false,
  freedom_of_speech_not_reach_fetch_enabled: true,
  standardized_nudges_misinfo: true,
  tweet_with_visibility_results_prefer_gql_limited_actions_policy_enabled: true,
  responsive_web_graphql_skip_user_profile_image_extensions_enabled: false,
  responsive_web_graphql_timeline_navigation_enabled: true,
  responsive_web_enhance_cards_enabled: false,
};

export interface CookieConfig {
  ct0: string;
  auth_token: string;
  /** Optional — extracted from browser. Auto-generated if missing. */
  twid?: string;
  /** Optional — extracted from browser. Auto-generated if missing. */
  guest_id?: string;
}

/**
 * Generate a realistic guest_id cookie value.
 * Format: v1%3A{13-digit timestamp}
 */
function generateGuestId(): string {
  const ts = Date.now() - Math.floor(Math.random() * 86400000); // within last 24h
  return `v1%3A${ts}`;
}

/**
 * Generate a realistic personalization_id cookie value.
 * Format: v1_{22 random base64 chars}==
 */
function generatePersonalizationId(): string {
  const chars =
    "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/";
  let result = "v1_";
  for (let i = 0; i < 22; i++) {
    result += chars[Math.floor(Math.random() * chars.length)];
  }
  return result + "==";
}

export class CookieClient {
  private ct0: string;
  private authToken: string;
  private twid: string;
  private guestId: string;
  private personalizationId: string;

  constructor(config: CookieConfig) {
    this.ct0 = config.ct0;
    this.authToken = config.auth_token;
    this.twid = config.twid || "";
    this.guestId = config.guest_id || generateGuestId();
    this.personalizationId = generatePersonalizationId();
  }

  /**
   * Build full browser-like header set.
   * Matches what Safari 17.5 on macOS sends to x.com GraphQL endpoints.
   */
  private headers(): Record<string, string> {
    const cookieParts = [
      `auth_token=${this.authToken}`,
      `ct0=${this.ct0}`,
      `guest_id=${this.guestId}`,
      `personalization_id="${this.personalizationId}"`,
      `lang=en`,
    ];
    if (this.twid) {
      cookieParts.push(`twid=u%3D${this.twid}`);
    }

    return {
      // Auth
      authorization: `Bearer ${BEARER}`,
      "x-csrf-token": this.ct0,
      "x-twitter-auth-type": "OAuth2Session",
      cookie: cookieParts.join("; "),

      // Content
      "content-type": "application/json",

      // Mobile Android UA — twitter.com + mobile UA bypasses X-Client-Transaction-Id check
      // Same combination used by agent-twitter-client (elizaOS, 3K+ stars)
      "user-agent":
        "Mozilla/5.0 (Linux; Android 11; Nokia G20) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.88 Mobile Safari/537.36",
      accept: "*/*",
      "accept-language": "en-US,en;q=0.9",
      "accept-encoding": "gzip, deflate, br",

      // Navigation context
      origin: "https://twitter.com",
      referer: "https://twitter.com/compose/post",

      // Sec-Fetch metadata — required by browsers, Twitter checks these
      "sec-fetch-dest": "empty",
      "sec-fetch-mode": "cors",
      "sec-fetch-site": "same-origin",

      // Twitter-specific client headers
      "x-twitter-active-user": "yes",
      "x-twitter-client-language": "en",
    };
  }

  /**
   * Update ct0 from response Set-Cookie header.
   * Twitter rotates ct0 on every response — stale ct0 causes silent failures.
   */
  private updateCt0FromResponse(res: Response): void {
    const setCookie = res.headers.get("set-cookie");
    if (!setCookie) return;

    const ct0Match = setCookie.match(/ct0=([^;]+)/);
    if (ct0Match && ct0Match[1] !== this.ct0) {
      process.stderr.write(
        `Cookie client: ct0 rotated (${this.ct0.slice(0, 8)}… → ${ct0Match[1].slice(0, 8)}…)\n`,
      );
      this.ct0 = ct0Match[1];
    }

    // Also capture twid if returned
    if (!this.twid) {
      const twidMatch = setCookie.match(/twid=u%3D(\d+)/);
      if (twidMatch) {
        this.twid = twidMatch[1];
        process.stderr.write(`Cookie client: twid captured (${this.twid})\n`);
      }
    }
  }

  async sendTweet(params: {
    text: string;
    reply_to_tweet_id?: string;
  }): Promise<unknown> {
    const variables: Record<string, unknown> = {
      tweet_text: params.text,
      dark_request: false,
      media: {
        media_entities: [],
        possibly_sensitive: false,
      },
      semantic_annotation_ids: [],
    };

    if (params.reply_to_tweet_id) {
      variables.reply = {
        in_reply_to_tweet_id: params.reply_to_tweet_id,
        exclude_reply_user_ids: [],
      };
    }

    const body = {
      variables,
      features: TWEET_FEATURES,
      queryId: CREATE_TWEET_ID,
    };

    const url = `${GRAPHQL_BASE}/${CREATE_TWEET_ID}/CreateTweet`;
    const res = await fetch(url, {
      method: "POST",
      headers: this.headers(),
      body: JSON.stringify(body),
    });

    // Always try to refresh ct0 from response
    this.updateCt0FromResponse(res);

    if (!res.ok) {
      const errBody = await res.text();
      throw new Error(`Cookie CreateTweet failed: ${res.status} ${errBody}`);
    }

    const data = (await res.json()) as {
      data?: {
        create_tweet?: {
          tweet_results?: {
            result?: { rest_id?: string };
          };
        };
      };
      errors?: Array<{ message: string; code: number }>;
    };

    // Check for GraphQL-level errors (API returns 200 but with errors)
    if (data.errors && data.errors.length > 0) {
      throw new Error(
        `Cookie CreateTweet GraphQL error: ${data.errors.map((e) => `[${e.code}] ${e.message}`).join("; ")}`,
      );
    }

    const tweetId = data?.data?.create_tweet?.tweet_results?.result?.rest_id;
    if (!tweetId) {
      throw new Error(
        `Cookie CreateTweet: no tweet ID in response — tweet may have been silently dropped. Response: ${JSON.stringify(data).slice(0, 500)}`,
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
