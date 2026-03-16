import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import type { ReaderClient } from "../clients/reader.js";

const LOCATION_TO_WOEID: Record<string, string> = {
  "": "1",
  Worldwide: "1",
  US: "23424977",
  JP: "23424856",
  GB: "23424975",
  CA: "23424775",
  AU: "23424748",
  DE: "23424829",
  FR: "23424819",
  BR: "23424768",
  IN: "23424848",
  MX: "23424900",
};

export function registerDiscoveryTools(server: McpServer, reader: ReaderClient) {
  server.tool(
    "get_trends",
    "Get trending topics on Twitter for a location",
    {
      location: z
        .enum(["", "Worldwide", "US", "JP", "GB", "CA", "AU", "DE", "FR", "BR", "IN", "MX"])
        .optional()
        .describe(
          "Location code (empty or 'Worldwide' for global trends). Supported: US, JP, GB, CA, AU, DE, FR, BR, IN, MX"
        ),
    },
    async ({ location }) => {
      try {
        const woeid = LOCATION_TO_WOEID[location ?? ""] ?? "1";
        const result = await reader.getTrends(woeid);
        return { content: [{ type: "text" as const, text: JSON.stringify(result, null, 2) }] };
      } catch (err) {
        return {
          content: [{ type: "text" as const, text: `Error: ${(err as Error).message}` }],
          isError: true,
        };
      }
    }
  );
}
