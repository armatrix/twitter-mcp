import { afterEach, beforeEach, describe, expect, test } from "bun:test";
import { ReaderClient } from "./reader.js";

type CapturedRequest = {
  url: string;
  headers: Headers;
};

const originalFetch = globalThis.fetch;
let requests: CapturedRequest[] = [];

beforeEach(() => {
  requests = [];
  const fetchMock = async (...args: Parameters<typeof fetch>) => {
    const [input, init] = args;
    const url = typeof input === "string" || input instanceof URL ? input.toString() : input.url;
    requests.push({
      url,
      headers: new Headers(init?.headers),
    });
    return new Response(JSON.stringify({ ok: true, url }), {
      headers: { "Content-Type": "application/json" },
    });
  };
  globalThis.fetch = Object.assign(fetchMock, {
    preconnect: originalFetch.preconnect,
  }) as typeof fetch;
});

afterEach(() => {
  globalThis.fetch = originalFetch;
});

describe("ReaderClient", () => {
  test("keeps twitterapi.io read routes by default", async () => {
    const reader = new ReaderClient({
      provider: "twitterapi.io",
      api_key: "twitterapi-key",
    });

    await reader.searchUsers("agent builders", "cursor-1");

    expect(requests).toHaveLength(1);
    const request = requests[0];
    expect(request.url).toBe(
      "https://api.twitterapi.io/twitter/user/search?query=agent+builders&cursor=cursor-1",
    );
    expect(request.headers.get("X-API-Key")).toBe("twitterapi-key");
  });

  test("maps search to the Hermes Tweet read endpoint", async () => {
    const reader = new ReaderClient({
      provider: "hermes-tweet",
      api_key: "xq-test-key",
    });

    await reader.searchTweets("AI agents", "Top", { max_results: 7 });

    expect(requests).toHaveLength(1);
    const url = new URL(requests[0].url);
    expect(`${url.origin}${url.pathname}`).toBe("https://xquik.com/api/v1/x/tweets/search");
    expect(url.searchParams.get("q")).toBe("AI agents");
    expect(url.searchParams.get("queryType")).toBe("Top");
    expect(url.searchParams.get("limit")).toBe("7");
    expect(requests[0].headers.get("X-API-Key")).toBe("xq-test-key");
  });

  test("maps multi-tweet reads to individual Hermes Tweet lookups", async () => {
    const reader = new ReaderClient({
      provider: "hermes-tweet",
      api_key: "xq-test-key",
      base_url: "https://example.test/",
    });

    await reader.getTweets(["123", "456"]);

    expect(requests.map((request) => request.url)).toEqual([
      "https://example.test/api/v1/x/tweets/123",
      "https://example.test/api/v1/x/tweets/456",
    ]);
  });

  test("rejects unsupported reader providers", () => {
    expect(() => new ReaderClient({
      provider: "unsupported",
      api_key: "test-key",
    } as never)).toThrow("Unsupported reader provider: unsupported");
  });
});
