import OAuth from "oauth-1.0a";
import crypto from "crypto";
import fs from "fs";
import path from "path";
import type { WriterConfig } from "../config.js";

const BASE_URL = "https://api.twitter.com/2";
const UPLOAD_URL = "https://upload.twitter.com/1.1/media/upload.json";

export class WriterClient {
  private oauth: OAuth;
  private token: { key: string; secret: string };

  constructor(config: WriterConfig) {
    this.oauth = new OAuth({
      consumer: {
        key: config.api_key,
        secret: config.api_secret_key,
      },
      signature_method: "HMAC-SHA1",
      hash_function(baseString: string, key: string) {
        return crypto.createHmac("sha1", key).update(baseString).digest("base64");
      },
    });

    this.token = {
      key: config.access_token,
      secret: config.access_token_secret,
    };
  }

  private getAuthHeader(url: string, method: string): string {
    const requestData = { url, method };
    const authData = this.oauth.authorize(requestData, this.token);
    return this.oauth.toHeader(authData).Authorization;
  }

  async uploadMedia(filePath: string): Promise<string> {
    const absolutePath = filePath.startsWith("~")
      ? filePath.replace("~", process.env.HOME || "")
      : path.resolve(filePath);

    const fileData = fs.readFileSync(absolutePath);
    const base64Data = fileData.toString("base64");

    const ext = path.extname(absolutePath).toLowerCase();
    const mimeMap: Record<string, string> = {
      ".png": "image/png",
      ".jpg": "image/jpeg",
      ".jpeg": "image/jpeg",
      ".gif": "image/gif",
      ".webp": "image/webp",
    };
    const mediaType = mimeMap[ext] || "image/png";

    const authHeader = this.getAuthHeader(UPLOAD_URL, "POST");

    const formData = new FormData();
    formData.append("media_data", base64Data);
    formData.append("media_category", "tweet_image");

    const res = await fetch(UPLOAD_URL, {
      method: "POST",
      headers: {
        Authorization: authHeader,
      },
      body: formData,
    });

    if (!res.ok) {
      const errBody = await res.text();
      throw new Error(`Twitter media upload failed: ${res.status} ${errBody}`);
    }

    const data = (await res.json()) as { media_id_string: string };
    return data.media_id_string;
  }

  async postTweet(params: {
    text: string;
    reply_to_tweet_id?: string;
    quote_tweet_id?: string;
    media_ids?: string[];
  }): Promise<unknown> {
    const url = `${BASE_URL}/tweets`;
    const method = "POST";

    const body: Record<string, unknown> = { text: params.text };
    if (params.reply_to_tweet_id) {
      body.reply = { in_reply_to_tweet_id: params.reply_to_tweet_id };
    }
    if (params.quote_tweet_id) {
      body.quote_tweet_id = params.quote_tweet_id;
    }
    if (params.media_ids && params.media_ids.length > 0) {
      body.media = { media_ids: params.media_ids };
    }

    const authHeader = this.getAuthHeader(url, method);

    const res = await fetch(url, {
      method,
      headers: {
        Authorization: authHeader,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
    });

    if (!res.ok) {
      const errBody = await res.text();
      throw new Error(`Twitter API POST /tweets failed: ${res.status} ${errBody}`);
    }

    return res.json();
  }
}
