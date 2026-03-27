/**
 * Debug: test cookie auth validity step by step.
 * 1. Try to verify session (GET request)
 * 2. Try a simple original tweet (not reply)
 * 3. Try a reply
 */
import { readFileSync } from "fs";
import { homedir } from "os";
import { resolve } from "path";

const config = JSON.parse(
  readFileSync(resolve(homedir(), ".twitter-mcp", "config.json"), "utf-8"),
);
const { ct0, auth_token } = config.cookie;

const BEARER =
  "AAAAAAAAAAAAAAAAAAAAANRILgAAAAAAnNwIzUejRCOuH5E6I8xnZz4puTs=1Zv7ttfk8LF81IUq16cHjhLTvJu4FA33AGWWjCpTnA";

function headers(currentCt0: string): Record<string, string> {
  return {
    authorization: `Bearer ${BEARER}`,
    "x-csrf-token": currentCt0,
    "x-twitter-auth-type": "OAuth2Session",
    cookie: `auth_token=${auth_token}; ct0=${currentCt0}; lang=en`,
    "content-type": "application/json",
    "user-agent":
      "Mozilla/5.0 (Macintosh; Intel Mac OS X 14_6_1) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.5 Safari/605.1.15",
    accept: "*/*",
    "accept-language": "en-US,en;q=0.9",
    origin: "https://x.com",
    referer: "https://x.com/compose/post",
    "sec-fetch-dest": "empty",
    "sec-fetch-mode": "cors",
    "sec-fetch-site": "same-origin",
    "x-twitter-active-user": "yes",
    "x-twitter-client-language": "en",
  };
}

// Step 1: Verify session — GET current user settings
console.log("=== Step 1: Verify session (GET /Settings) ===");
try {
  const settingsUrl =
    "https://x.com/i/api/graphql/tD8zKvQzwY3kdx5yz6YmOw/Viewer?variables=%7B%22withCommunitiesMemberships%22%3Atrue%7D&features=%7B%22rweb_tipjar_consumption_enabled%22%3Atrue%7D";
  const res1 = await fetch(settingsUrl, {
    method: "GET",
    headers: headers(ct0),
  });
  console.log(`  Status: ${res1.status}`);

  // Check for new ct0
  const setCookie = res1.headers.get("set-cookie") || "";
  const ct0Match = setCookie.match(/ct0=([^;]+)/);
  if (ct0Match) {
    console.log(
      `  New ct0 from response: ${ct0Match[1].slice(0, 16)}…`,
    );
  }

  const body1 = await res1.text();
  if (res1.ok) {
    // Try to extract screen_name
    const parsed = JSON.parse(body1);
    const screenName =
      parsed?.data?.viewer?.user_results?.result?.legacy?.screen_name;
    console.log(`  Logged in as: @${screenName || "UNKNOWN"}`);
  } else {
    console.log(`  Error body: ${body1.slice(0, 300)}`);
  }
} catch (err) {
  console.log(`  FAILED: ${(err as Error).message}`);
}

// Step 2: Try fresh ct0 — fetch x.com homepage to get a fresh ct0
console.log("\n=== Step 2: Fetch fresh ct0 from x.com ===");
let freshCt0 = ct0;
try {
  const homeRes = await fetch("https://x.com/home", {
    method: "GET",
    headers: {
      "user-agent":
        "Mozilla/5.0 (Macintosh; Intel Mac OS X 14_6_1) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.5 Safari/605.1.15",
      accept:
        "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
      cookie: `auth_token=${auth_token}; ct0=${ct0}`,
    },
    redirect: "manual",
  });
  console.log(`  Status: ${homeRes.status}`);

  const allCookies = homeRes.headers.getSetCookie?.() || [];
  for (const c of allCookies) {
    const m = c.match(/ct0=([^;]+)/);
    if (m) {
      freshCt0 = m[1];
      console.log(`  Fresh ct0: ${freshCt0.slice(0, 16)}…`);
    }
  }

  if (freshCt0 === ct0) {
    // Try from single header
    const sc = homeRes.headers.get("set-cookie") || "";
    const m2 = sc.match(/ct0=([^;]+)/);
    if (m2) {
      freshCt0 = m2[1];
      console.log(`  Fresh ct0 (fallback): ${freshCt0.slice(0, 16)}…`);
    } else {
      console.log("  No new ct0 returned — using config ct0");
    }
  }
} catch (err) {
  console.log(`  FAILED: ${(err as Error).message}`);
}

// Step 3: Retry Viewer with fresh ct0
console.log("\n=== Step 3: Verify session with fresh ct0 ===");
try {
  const settingsUrl =
    "https://x.com/i/api/graphql/tD8zKvQzwY3kdx5yz6YmOw/Viewer?variables=%7B%22withCommunitiesMemberships%22%3Atrue%7D&features=%7B%22rweb_tipjar_consumption_enabled%22%3Atrue%7D";
  const res3 = await fetch(settingsUrl, {
    method: "GET",
    headers: headers(freshCt0),
  });
  console.log(`  Status: ${res3.status}`);
  const body3 = await res3.text();
  if (res3.ok) {
    const parsed = JSON.parse(body3);
    const screenName =
      parsed?.data?.viewer?.user_results?.result?.legacy?.screen_name;
    console.log(`  Logged in as: @${screenName || "UNKNOWN"}`);
  } else {
    console.log(`  Error body: ${body3.slice(0, 500)}`);
  }
} catch (err) {
  console.log(`  FAILED: ${(err as Error).message}`);
}

// Step 4: Try CreateTweet with fresh ct0 (raw, minimal)
console.log("\n=== Step 4: CreateTweet test with fresh ct0 ===");
try {
  const CREATE_TWEET_ID = "a1p9RWpkYKBjWv_I3WzS-A";
  const tweetBody = {
    variables: {
      tweet_text: "debug test — will delete",
      dark_request: false,
      media: { media_entities: [], possibly_sensitive: false },
      semantic_annotation_ids: [],
    },
    features: {
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
    },
    queryId: CREATE_TWEET_ID,
  };

  const url = `https://x.com/i/api/graphql/${CREATE_TWEET_ID}/CreateTweet`;
  const res4 = await fetch(url, {
    method: "POST",
    headers: headers(freshCt0),
    body: JSON.stringify(tweetBody),
  });

  console.log(`  Status: ${res4.status}`);
  const body4 = await res4.text();
  console.log(`  Response: ${body4.slice(0, 500)}`);

  // If success, extract tweet ID for cleanup
  if (res4.ok) {
    try {
      const parsed = JSON.parse(body4);
      const tweetId =
        parsed?.data?.create_tweet?.tweet_results?.result?.rest_id;
      if (tweetId) {
        console.log(`  Tweet ID: ${tweetId} — DELETING...`);
        // Delete the test tweet
        const deleteUrl = `https://x.com/i/api/graphql/VaenaVgh5q5ih7kvyVjgtg/DeleteTweet`;
        const delRes = await fetch(deleteUrl, {
          method: "POST",
          headers: headers(freshCt0),
          body: JSON.stringify({
            variables: { tweet_id: tweetId, dark_request: false },
            queryId: "VaenaVgh5q5ih7kvyVjgtg",
          }),
        });
        console.log(`  Delete status: ${delRes.status}`);
      }
    } catch {}
  }
} catch (err) {
  console.log(`  FAILED: ${(err as Error).message}`);
}
