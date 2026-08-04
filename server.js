const express = require('express');
const cors = require('cors');

const app = express();
app.use(cors());
app.use(express.json());

// 静态文件服务
app.use(express.static(__dirname));

const DS_API_KEY = process.env.DS_API_KEY || process.env.ANTHROPIC_API_KEY || '';
const DS_API_URL = 'https://api.deepseek.com/v1/chat/completions';

const SYSTEM_PROMPT = `你是一个搜索意图分类器。根据用户输入的关键词判断最合适的搜索平台。

四个平台及其特点：
- xhs（小红书）：经验分享、探店、穿搭、美妆、护肤、旅行攻略、美食推荐、测评、生活方式、育儿、装修
- dy（抖音）：短视频、热门话题、生活小妙招、娱乐内容、快速教学、搞笑、才艺
- bili（哔哩哔哩）：长视频教程、深度知识科普、电脑/技术教程、纪录片、游戏攻略、考研/考证学习、数码评测
- bing（必应网页搜索）：查官网、查百科、查新闻、找资料、学术搜索、产品参数、法律法规

分类规则：
1. 如果关键词明显偏向某个平台的内容类型，直接推荐该平台
2. 如果关键词比较通用、信息型（如"今天天气""GDP"），推荐 bing
3. 如果无法明确判断，默认推荐 bing
4. 注意：生活经验类（如"装修""旅游""探店""穿搭""美妆""美食"）优先 xhs
5. 技术教程类（如"Python教程""电脑维修""剪辑教程"）优先 bili
6. 短平快的内容（如"小妙招""变装""舞蹈"）优先 dy

请只返回一个 JSON 对象，不要有任何其他内容：
{"platform":"xhs|dy|bili|bing","reason":"一句话简短说明为什么推荐这个平台"}`;

// 分类接口
app.post('/api/classify', async (req, res) => {
  const { query } = req.body;
  if (!query || !query.trim()) {
    return res.json({ platform: 'bing', reason: '空搜索，默认网页搜索' });
  }

  if (!DS_API_KEY) {
    return res.json({ platform: 'bing', reason: 'API Key 未配置' });
  }

  try {
    const resp = await fetch(DS_API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${DS_API_KEY}`,
      },
      body: JSON.stringify({
        model: 'deepseek-chat',
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
        const result = JSON.parse(jsonMatch[0]);
        return res.json(result);
      }
    }
    return res.json({ platform: 'bing', reason: '无法判断，默认网页搜索' });
  } catch (err) {
    console.error('Classify error:', err.message);
    return res.json({ platform: 'bing', reason: '服务暂不可用，默认网页搜索' });
  }
});

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
  console.log(`AI 搜索路由服务已启动 → http://localhost:${PORT}`);
});
