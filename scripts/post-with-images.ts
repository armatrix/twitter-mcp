#!/usr/bin/env bun
/**
 * One-off script: post a tweet with up to 4 images.
 * Usage: bun run scripts/post-with-images.ts
 */
import { WriterClient } from "../src/clients/writer.js";
import { loadConfig } from "../src/config.js";
import path from "path";

const config = loadConfig(path.join(process.env.HOME!, ".twitter-mcp/config.json"));
const writer = new WriterClient(config.writer);

const TEXT = `最近在用 Claude Code 做项目，发现一个事——我一天里最慢的环节不是写代码，是打字。

说话比打字快三四倍，这个谁都知道。问题是我试了一圈语音输入工具，没有一个能用。

我的情况是这样的：做 Crypto 和 AI 方向，每天要说大量英文术语，但我不是英语母语，发音也不太标准。一句话里经常中英文混着来，「我用 Cursor 部署了一个 Solana 合约」这种。豆包听到英文就开始乱猜，ChatGPT 的语音转文字就更离谱了——我说「可劳德」它给我写三个汉字「可劳德」，我说「衣根 layer」它就老老实实打出来「衣根 layer」。完全不知道我在说什么。

想了想可能是我的问题，就去找专门做语音输入的产品。闪电说、讯飞、搜狗语音，还有海外的 Otter、Whisper，挨个试了一遍。核心问题都一样：它们只靠 ASR 引擎那一层去识别，你的发音不标准它就认不出来，没有任何后续的纠错，也不会随着你用的时间变长而变准。

其实这个问题不只是我有。你只要不是英语母语，又在一个全是英文术语的行业工作，用语音输入就一定会碰到。中文技术圈很多人应该都有类似的体感——想用嘴代替键盘，但每次说完还得改一大堆，改完还不如直接打字。

找了一圈发现真没有现成的东西能解决这个问题。那就自己做一个。

用 Claude Code 辅助开发，Swift 写的 macOS 原生 App，前后大概算下来真正写代码的时间也就一天左右。思路其实不复杂——不是去换一个更强的语音识别引擎，而是在识别结果出来之后再叠纠错。

具体来说做了四层：第一层是 ASR 引擎出原始结果，用的 FireRedASR，目前中英双语识别准确率最高的开源模型。第二层是一个持续拓展的 Crypto 和 AI 领域词库，目前覆盖了几千个术语，把常见的识别错误直接映射回正确术语。第三层是上下文感知——它会自动读你当前打开的窗口内容，比如你在看一篇关于 EigenLayer 的文章，EigenLayer 这个词就会被加到热词里，识别率直接拉上去。第四层是隐式学习，你每次在浮窗里把识别错误的地方手动改对，系统就永久记住了你这个词的发音模式。

效果就是：我说「可劳德」它输出 Claude，我说「deep seek 的推理」它输出 DeepSeek 的推理。不是引擎本身有多强，是四层叠在一起把准确率堆上去的。而且用得越多越准，因为你的每一次修改都在教它认识你的口音。

全部在本地跑，不上传任何音频，不需要注册登录，不需要联网。按一下右 Option 开始说话，再按一下自动识别然后粘贴到光标位置。

已经开源了。如果你也是那种每天要说大量英文术语但发音不太标准的人，可以试试。macOS，Apple Silicon。`;

const IMAGE_PATHS = [
  "/Users/aaron/azex/speech/Resources/screenshots/dashboard.png",
  "/Users/aaron/azex/speech/Resources/screenshots/history.png",
  "/Users/aaron/azex/speech/Resources/screenshots/calibration.png",
  "/Users/aaron/azex/speech/Resources/screenshots/vocabulary.png",
];

async function main() {
  console.log("Uploading 4 images...");
  const mediaIds: string[] = [];
  for (const imgPath of IMAGE_PATHS) {
    console.log(`  Uploading ${imgPath.split("/").pop()}...`);
    const id = await writer.uploadMedia(imgPath);
    console.log(`  → media_id: ${id}`);
    mediaIds.push(id);
  }

  console.log("Posting tweet with images...");
  const result = await writer.postTweet({
    text: TEXT,
    media_ids: mediaIds,
  });

  console.log("Done!", JSON.stringify(result, null, 2));
}

main().catch((err) => {
  console.error("Failed:", err.message);
  process.exit(1);
});
