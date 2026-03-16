import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { loadConfig } from "./config.js";
import { ReaderClient } from "./clients/reader.js";
import { WriterClient } from "./clients/writer.js";
import { registerSearchTools } from "./tools/search.js";
import { registerTweetTools } from "./tools/tweets.js";
import { registerUserTools } from "./tools/users.js";
import { registerDiscoveryTools } from "./tools/discovery.js";
import { registerWriteTools } from "./tools/write.js";

function parseArgs(): { configPath?: string } {
  const args = process.argv.slice(2);
  const configIdx = args.indexOf("-config");
  if (configIdx !== -1 && args[configIdx + 1]) {
    return { configPath: args[configIdx + 1] };
  }
  return {};
}

async function main() {
  const { configPath } = parseArgs();

  let config;
  try {
    config = loadConfig(configPath);
  } catch (err) {
    process.stderr.write(`Failed to load config: ${(err as Error).message}\n`);
    process.exit(1);
  }

  const reader = new ReaderClient(config.reader);
  const writer = new WriterClient(config.writer);

  const server = new McpServer({
    name: "twitter-mcp",
    version: "2.0.0",
  });

  registerSearchTools(server, reader, config.defaults);
  registerTweetTools(server, reader);
  registerUserTools(server, reader, config.defaults);
  registerDiscoveryTools(server, reader);
  registerWriteTools(server, writer);

  const transport = new StdioServerTransport();
  await server.connect(transport);

  process.stderr.write("twitter-mcp v2 started\n");
}

main().catch((err) => {
  process.stderr.write(`Fatal: ${err.message}\n`);
  process.exit(1);
});
