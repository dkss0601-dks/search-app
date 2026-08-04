// Cloudflare Worker — AI 搜索分类代理 (SiliconFlow 版)
// 在 Cloudflare Workers 中粘贴此代码，替换 YOUR_SILICONFLOW_API_KEY

const SF_API_KEY = 'YOUR_SILICONFLOW_API_KEY'; // ← 硅基流动 API Key
const SF_API_URL = 'https://api.siliconflow.cn/v1/chat/completions';
const MODEL = 'deepseek-ai/DeepSeek-V3'; // 硅基流动代理的 DeepSeek V3，国内毫秒级响应

const SYSTEM_PROMPT = `你是一个搜索意图分类器。根据用户输入的关键词判断最合适的搜索平台。

四个平台及其特点：
- xhs（小红书）：经验分享、探店、穿搭、美妆、护肤、旅行攻略、美食推荐、测评、生活方式、育儿、装修
- dy（抖音）：短视频、热门话题、生活小妙招、娱乐内容、快速教学、搞笑、才艺
- bili（哔哩哔哩）：长视频教程、深度知识科普、电脑/技术教程、纪录片、游戏攻略、考研/考证学习、数码评测
- bing（必应网页搜索）：查官网、查百科、查新闻、找资料、学术搜索、产品参数、法律法规

分类规则：
1. 生活经验类（如"装修""旅游""探店""穿搭""美妆""美食"）优先 xhs
2. 技术教程类（如"Python教程""电脑维修""剪辑教程"）优先 bili
3. 短平快的内容（如"小妙招""变装""舞蹈"）优先 dy
4. 通用信息型默认 bing

只返回JSON：{"platform":"xhs|dy|bili|bing","reason":"简短说明"}`;

export default {
  async fetch(request) {
    if (request.method === 'OPTIONS') {
      return new Response(null, {
        headers: {
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Methods': 'POST, OPTIONS',
          'Access-Control-Allow-Headers': 'Content-Type',
        },
      });
    }

    const url = new URL(request.url);
    if (request.method !== 'POST' || url.pathname !== '/api/classify') {
      return new Response('Not Found', { status: 404 });
    }

    try {
      const { query } = await request.json();
      if (!query || !query.trim()) {
        return jsonResponse({ platform: 'bing', reason: '空搜索' });
      }

      const resp = await fetch(SF_API_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${SF_API_KEY}`,
        },
        body: JSON.stringify({
          model: MODEL,
          max_tokens: 100,
          temperature: 0,
          messages: [
            { role: 'system', content: SYSTEM_PROMPT },
            { role: 'user', content: query.trim() },
          ],
        }),
      });

      const data = await resp.json();
      const text = data.choices?.[0]?.message?.content?.trim();

      if (text) {
        const jsonMatch = text.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          return jsonResponse(JSON.parse(jsonMatch[0]));
        }
      }
      return jsonResponse({ platform: 'bing', reason: '无法判断' });
    } catch (err) {
      return jsonResponse({ platform: 'bing', reason: '服务暂不可用' }, 500);
    }
  },
};

function jsonResponse(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      'Content-Type': 'application/json',
      'Access-Control-Allow-Origin': '*',
    },
  });
}
