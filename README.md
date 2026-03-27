# twitter-mcp

A lightweight Twitter MCP server for Claude Code. Zero compilation — edit and run instantly with Bun.

## Architecture

```
┌──────────────────────────────────────────────────────────────┐
│                       twitter-mcp v1.1                       │
│                        (MCP Server)                          │
├──────────────────────────────────────────────────────────────┤
│                    17 Tools + Media Upload                   │
│  ┌──────────────┐ ┌──────────────┐ ┌──────────────────────┐ │
│  │ search_tweets│ │ get_tweet    │ │ get_user             │ │
│  │ search_users │ │ get_article  │ │ get_user_timeline    │ │
│  │              │ │ get_replies  │ │ get_user_followers   │ │
│  │              │ │ get_quotes   │ │ get_user_following   │ │
│  │              │ │ get_thread   │ │ get_user_mentions    │ │
│  │              │ │ get_trends   │ │                      │ │
│  └──────┬───────┘ └──────┬──────┘ └──────┬───────────────┘ │
│         └────────────────┼───────────────┘                  │
│                          │                                  │
│                    API Router                                │
│         ┌────────────────┼─────────────────┐                │
│         ▼                ▼                  ▼               │
│  ┌─────────────┐  ┌─────────────┐  ┌──────────────┐        │
│  │twitterapi.io│  │Official API │  │Cookie Client │        │
│  │ (API Key)   │  │(OAuth 1.0a) │  │(ct0+auth)    │        │
│  │             │  │             │  │              │        │
│  │ 13 read     │  │ post_tweet  │  │ reply        │        │
│  │ tools       │  │ like/unlike │  │ fallback     │        │
│  │             │  │ retweet     │  │ (auto on 403)│        │
│  │             │  │ delete      │  │              │        │
│  │             │  │ media upload│  │              │        │
│  └─────────────┘  └─────────────┘  └──────────────┘        │
└──────────────────────────────────────────────────────────────┘
```

### Why Hybrid API?

| API | Auth | Cost | Use Case |
|-----|------|------|----------|
| **twitterapi.io** | API Key | ~$0.15/1K calls | Read operations (search, timeline, user info) |
| **Official Twitter API** | OAuth 1.0a | Free tier | Write operations (post, like, retweet, delete) |
| **Cookie (browser session)** | ct0 + auth_token | Free | Reply fallback (Free tier OAuth blocks replies to non-interacted tweets) |

## Setup

### 1. Install

```bash
git clone https://github.com/armatrix/twitter-mcp.git
cd twitter-mcp
bun install
```

### 2. Configure

```bash
mkdir -p ~/.twitter-mcp
cp config.example.json ~/.twitter-mcp/config.json
```

Edit `~/.twitter-mcp/config.json`:

```json
{
  "reader": {
    "provider": "twitterapi.io",
    "api_key": "your-twitterapi-io-key"
  },
  "writer": {
    "provider": "twitter-official",
    "api_key": "your-consumer-api-key",
    "api_secret_key": "your-consumer-api-secret",
    "access_token": "your-access-token",
    "access_token_secret": "your-access-token-secret"
  },
  "cookie": {
    "ct0": "your-ct0-cookie",
    "auth_token": "your-auth-token-cookie"
  },
  "defaults": {
    "timeline_count": 20,
    "search_count": 20
  }
}
```

**Get credentials:**
- `reader.api_key`: [twitterapi.io](https://twitterapi.io) — sign up and copy API key
- `writer.*`: [Twitter Developer Portal](https://developer.twitter.com) → Create App → Keys and Tokens
- `cookie.*`: Browser DevTools → Application → Cookies → x.com → copy `ct0` and `auth_token` values

> **Cookie section is optional.** If omitted, reply fallback is disabled and OAuth 403 errors on replies are returned as-is.

### 3. Get Cookie Credentials

1. Open [x.com](https://x.com) in your browser and log in
2. Open DevTools (F12) → Application → Cookies → `https://x.com`
3. Copy the value of `ct0` (CSRF token, rotates periodically)
4. Copy the value of `auth_token` (session token, long-lived)
5. Paste both into `config.json` under the `cookie` section

> **Note:** `ct0` rotates every few hours. When cookie auth starts failing, refresh it from the browser.

### 4. Add to Claude Code

```bash
claude mcp add twitter -- bun run /path/to/twitter-mcp/src/index.ts -config ~/.twitter-mcp/config.json
```

Verify:

```bash
claude mcp list
```

## Tools

### Read (13 tools — twitterapi.io)

| Tool | Description |
|------|-------------|
| `search_tweets` | Search tweets by keyword (advanced search syntax) |
| `search_users` | Search users by keyword |
| `get_tweet` | Get tweets by ID (supports comma-separated multiple IDs, includes viewCount) |
| `get_article` | Get X Article full content by tweet ID |
| `get_tweet_replies` | Get replies to a tweet |
| `get_tweet_quotes` | Get quote tweets |
| `get_tweet_thread` | Get full thread context |
| `get_user` | Get user profile by username |
| `get_user_timeline` | Get user's recent tweets |
| `get_user_followers` | Get user's followers |
| `get_user_following` | Get accounts a user follows |
| `get_user_mentions` | Get tweets mentioning a user |
| `get_trends` | Get trending topics by region (WOEID) |

### Write (4 tools — Official Twitter API, OAuth 1.0a)

| Tool | Description |
|------|-------------|
| `post_tweet` | Post a tweet with optional images, reply, quote-tweet. Auto-fallback to cookie auth on reply 403. |
| `like_tweet` | Like a tweet by ID |
| `unlike_tweet` | Remove a like from a tweet |
| `retweet` | Retweet a tweet by ID |
| `delete_tweet` | Delete a tweet by ID |

### Reply Fallback Flow

```
post_tweet(text, reply_to_tweet_id)
  │
  ▼
OAuth 1.0a POST /2/tweets
  │
  ├─ 200 OK → return result (method: "oauth")
  │
  └─ 403 Forbidden (Free tier reply restriction)
       │
       ▼
     Cookie client configured?
       │
       ├─ Yes → GraphQL CreateTweet → return result (method: "cookie")
       │
       └─ No → return error
```

**Image upload**: Pass `media_paths` with up to 4 local file paths (png/jpg/gif/webp). Images are uploaded via Twitter v1.1 media endpoint, then attached to the tweet.

```
post_tweet(
  text: "Hello world",
  media_paths: ["/path/to/screenshot.png", "/path/to/chart.jpg"]
)
```

## Known Limitations

| Issue | Workaround |
|-------|-----------|
| Official API Free tier blocks replies to non-interacted tweets (403) | Cookie fallback auto-handles this |
| `ct0` cookie rotates every few hours | Re-extract from browser when cookie auth fails |
| `get_user_timeline` / `get_tweet` via twitterapi.io don't return views/impressions | Use `get_tweet` (which goes through twitterapi.io) — it returns `viewCount` |
| Cookie client doesn't support image upload | Images only via OAuth `post_tweet` (no fallback for image+reply combo) |

## Development

No build step required. Edit any `.ts` file and restart the MCP server.

```bash
# Run directly
bun run src/index.ts -config ~/.twitter-mcp/config.json

# Type check
bun build src/index.ts --target=bun
```

## Project Structure

```
src/
├── index.ts              # MCP server entry point
├── config.ts             # Config types and loader
├── clients/
│   ├── reader.ts         # twitterapi.io client (read operations)
│   ├── writer.ts         # Official Twitter API client (OAuth 1.0a write)
│   └── cookie.ts         # Cookie-based client (GraphQL, reply fallback)
└── tools/
    ├── search.ts         # search_tweets, search_users
    ├── tweets.ts         # get_tweet, get_article, get_replies, get_quotes, get_thread
    ├── users.ts          # get_user, get_timeline, get_followers, get_following, get_mentions
    ├── discovery.ts      # get_trends
    └── write.ts          # post_tweet, like_tweet, unlike_tweet, retweet, delete_tweet
```

## Tech Stack

- **Runtime**: [Bun](https://bun.sh)
- **MCP SDK**: [@modelcontextprotocol/sdk](https://github.com/modelcontextprotocol/typescript-sdk)
- **OAuth**: [oauth-1.0a](https://github.com/nicobytes/oauth-1.0a) (Official API auth)
- **Cookie Auth**: Direct fetch + Twitter internal GraphQL (no external deps)

## License

MIT
