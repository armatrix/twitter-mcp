import { readFileSync } from "fs";
import { homedir } from "os";
import { resolve } from "path";

export interface ReaderConfig {
  provider: "twitterapi.io" | "hermes-tweet";
  api_key: string;
  base_url?: string;
}

export interface WriterConfig {
  provider: "twitter-official";
  api_key: string;
  api_secret_key: string;
  access_token: string;
  access_token_secret: string;
}

export interface CookieConfig {
  ct0: string;
  auth_token: string;
}

export interface DefaultsConfig {
  timeline_count: number;
  search_count: number;
  dm_count?: number;
}

export interface Config {
  reader: ReaderConfig;
  writer: WriterConfig;
  cookie?: CookieConfig;
  defaults: DefaultsConfig;
}

export function loadConfig(configPath?: string): Config {
  const path = configPath
    ? resolve(configPath.replace(/^~/, homedir()))
    : resolve(homedir(), ".twitter-mcp", "config.json");

  const raw = readFileSync(path, "utf-8");
  return JSON.parse(raw) as Config;
}
