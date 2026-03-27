import { CookieClient } from "../src/clients/cookie.ts";
import { readFileSync } from "fs";
import { homedir } from "os";
import { resolve } from "path";

const config = JSON.parse(
  readFileSync(resolve(homedir(), ".twitter-mcp", "config.json"), "utf-8"),
);
const client = new CookieClient(config.cookie);

// Test: post a tweet via Scraper (TLS cipher randomization active)
console.log("=== Test: sendTweet via agent-twitter-client Scraper ===");
try {
  const result = await client.sendTweet({
    text: "scraper test — will delete " + Date.now(),
  });
  console.log("✅ SUCCESS:", JSON.stringify(result, null, 2));
} catch (err) {
  console.error("❌ FAILED:", (err as Error).message.slice(0, 300));
}
