# twitter-mcp

A lightweight Twitter MCP server for Claude Code. Zero compilation — edit and run instantly with Bun.

## Architecture

```
┌─────────────────────────────────────────────────────┐
│                    twitter-mcp                        │
│                   (MCP Server)                        │
├─────────────────────────────────────────────────────┤
│                     13 Tools                         │
│  ┌──────────────┐ ┌──────────────┐ ┌─────────────┐  │
│  │ search_tweets│ │ get_tweet    │ │ get_user    │  │
│  │ search_users │ │ get_article  │ │ get_timeline│  │
│  │              │ │ get_replies  │ │ get_followers│ │
│  │              │ │ get_quotes   │ │ get_following│ │
│  │              │ │ get_thread   │ │ get_mentions│  │
│  └──────┬───────┘ └──────┬──────┘ └──────┬──────┘  │
│         │                │               │          │
│  ┌──────┴────────────────┴───────────────┘          │
│  │              API Router                           │
│  ├─────────────────────┬────────────────────┐       │
│  │      Read           │       Write        │       │
│  ▼                     ▼                    ▼       │
│  ┌─────────────────┐  ┌────────────────────┐        │
│  │ twitterapi.io   │  │ Official Twitter   │        │
│  │ (API Key)       │  │ API (OAuth 1.0a)   │        │
│  │                 │  │                    │        │
│  │ 12 read tools   │  │ • post_tweet       │        │
│  └─────────────────┘  └────────────────────┘        │
└─────────────────────────────────────────────────────┘
```

### Why Hybrid API?

| API | Auth | Cost | Use Case |
|-----|------|------|----------|
| **twitterapi.io** | API Key | ~$0.15/1K calls | Read operations |
| **Official Twitter API** | OAuth 1.0a | Free tier | Write operations |

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
  "defaults": {
    "timeline_count": 20,
    "search_count": 20
  }
}
```

**Get credentials:**
- `reader.api_key`: [twitterapi.io](https://twitterapi.io) — sign up and copy API key
- `writer.*`: [Twitter Developer Portal](https://developer.twitter.com) → Create App → Keys and Tokens

### 3. Add to Claude Code

```bash
claude mcp add twitter -- bun run /path/to/twitter-mcp/src/index.ts -config ~/.twitter-mcp/config.json
```

Verify:

```bash
claude mcp list
```

## Tools

### Read (twitterapi.io)

| Tool | Description |
|------|-------------|
| `search_tweets` | Search tweets by keyword (advanced search) |
| `search_users` | Search users by keyword |
| `get_tweet` | Get tweets by ID (supports multiple) |
| `get_article` | Get X Article full content by tweet ID |
| `get_tweet_replies` | Get replies to a tweet (sortable) |
| `get_tweet_quotes` | Get quote tweets |
| `get_tweet_thread` | Get full thread context |
| `get_user` | Get user profile by username |
| `get_user_timeline` | Get user's recent tweets |
| `get_user_followers` | Get user's followers |
| `get_user_following` | Get accounts a user follows |
| `get_user_mentions` | Get tweets mentioning a user |
| `get_trends` | Get trending topics by region |

### Write (Official Twitter API)

| Tool | Description |
|------|-------------|
| `post_tweet` | Post a tweet (supports reply and quote) |

## Development

No build step required. Edit any `.ts` file and restart the MCP server.

```bash
# Run directly
bun run src/index.ts -config ~/.twitter-mcp/config.json

# Test reader client
bun -e "
const { loadConfig } = require('./src/config.ts');
const { ReaderClient } = require('./src/clients/reader.ts');
const config = loadConfig();
const reader = new ReaderClient(config.reader);
reader.getUserInfo('naval').then(r => console.log(r.data.userName));
"
```

## Tech Stack

- **Runtime**: [Bun](https://bun.sh)
- **MCP SDK**: [@modelcontextprotocol/sdk](https://github.com/modelcontextprotocol/typescript-sdk)
- **OAuth**: [oauth-1.0a](https://github.com/nicobytes/oauth-1.0a)

## License

MIT
