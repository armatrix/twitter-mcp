import { CookieClient } from "../src/clients/cookie.ts";
import { readFileSync } from "fs";
import { homedir } from "os";
import { resolve } from "path";

const config = JSON.parse(
  readFileSync(resolve(homedir(), ".twitter-mcp", "config.json"), "utf-8"),
);
const client = new CookieClient(config.cookie);

const replies = [
  {
    target: "2037064217325367514",
    label: "@mubeitech — Google算法砍内存6倍",
    text: `有意思的是，这个 TurboQuant 的思路和当年 JPEG 压缩图片的路径很像 — 不是让硬件更快，而是让数据更小。

区别在于 JPEG 丢精度换空间，这次号称零损失。如果真能做到，影响最大的不是美光，是云厂商的定价模型 — 同样一张卡能跑的并发直接翻几倍，按 token 收费的价格锚点要重新算了。`,
  },
  {
    target: "2037103009063375128",
    label: "@IndieDevHailey — AI股票分析工具",
    text: `这类工具最值钱的不是分析本身，是它把"每天花两小时看盘"压缩成了"扫一眼仪表盘"。

我在搭 LLM API 计费系统时发现类似的 pattern — AI 做决策辅助最难的不是准确度，是怎么把 20 个指标压成一个"做不做"的判断。信息过载和没信息一样危险。`,
  },
  {
    target: "2036984363578253777",
    label: "@AYi_AInotes — Google TurboQuant本地大模型",
    text: `16GB Mac Mini 能跑的话，意味着一个人拿三四台 Mini 组个小集群就能跑私有模型服务了。成本不到两万块。

对我这种一个人做产品的来说，最实际的变化是：之前必须走云 API 的场景（数据敏感、延迟要求高），现在可以本地解决。省的不只是钱，是一整层对第三方的依赖。`,
  },
  {
    target: "2034670791380635926",
    label: "@qkl2058 — 学生用Claude在Polymarket赚$1.35M",
    text: `这个案例最值得注意的细节是 NOAA 天气预报 94% 准确度 — 他不是在赌，是在用公开数据源的确定性去套 prediction market 的不确定性定价。

本质上和做市商赚 bid-ask spread 一个逻辑，只是以前需要几百万启动资金和一个团队，现在一个学生加一个 Claude session 就够了。门槛变化的速度比赚钱的速度更值得关注。`,
  },
  {
    target: "2037110156300083361",
    label: "@imwsl90 — 稳定使用Claude + Skills",
    text: `最稳的路子就是官方 Pro plan，$20/月 直接用，Skills 在 Claude Code 里原生支持。

我这几个月一直在用 Skills 搭自动化工作流 — 踩过的坑是：Skills 写起来不难，难的是评估标准。如果你的 eval criteria 互相矛盾，skill 会在两个方向之间震荡，越迭代越差。建议从一个非常窄的任务开始，别一上来就搞通用的。`,
  },
];

for (let i = 0; i < replies.length; i++) {
  const r = replies[i];
  console.log(`\n[${i + 1}/5] ${r.label}`);

  try {
    const result = await client.sendTweet({
      text: r.text,
      reply_to_tweet_id: r.target,
    });
    const id = (result as any).data?.id;
    if (id) {
      console.log(`  ✅ https://x.com/defi88888888/status/${id}`);
    } else {
      console.log(`  ⚠️ Response:`, JSON.stringify(result).slice(0, 200));
    }
  } catch (err) {
    console.error(`  ❌ ${(err as Error).message.slice(0, 200)}`);
  }

  // 5s delay between posts
  if (i < replies.length - 1) {
    await new Promise((r) => setTimeout(r, 5000));
  }
}
