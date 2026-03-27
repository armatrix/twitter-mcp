import { CookieClient } from "../src/clients/cookie.ts";
import { readFileSync } from "fs";
import { homedir } from "os";
import { resolve } from "path";

const config = JSON.parse(
  readFileSync(resolve(homedir(), ".twitter-mcp", "config.json"), "utf-8"),
);
if (!config.cookie) {
  console.error("No cookie config");
  process.exit(1);
}

const client = new CookieClient(config.cookie);

// Test 1: Reply to our own tweet
console.log("=== Test 1: Reply to own tweet ===");
const OWN_TWEET = "2037316444845924572";
try {
  const result = await client.sendTweet({
    text: "self-reply test — cookie v3 " + Date.now(),
    reply_to_tweet_id: OWN_TWEET,
  });
  console.log("✅ Self-reply:", JSON.stringify(result, null, 2));
} catch (err) {
  console.error("❌ Self-reply:", (err as Error).message.slice(0, 200));
}

await new Promise((r) => setTimeout(r, 3000));

// Test 2: Reply to external tweet (the real test)
console.log("\n=== Test 2: Reply to external tweet ===");
const EXT_TWEET = "2033585333028204877"; // @RoundtableSpace Claude Pentagon 549K views
try {
  const result = await client.sendTweet({
    text: "interesting find — the gap between what AI flags and what procurement actually acts on is where the real story is",
    reply_to_tweet_id: EXT_TWEET,
  });
  console.log("✅ External reply:", JSON.stringify(result, null, 2));
} catch (err) {
  console.error("❌ External reply:", (err as Error).message.slice(0, 300));
}
