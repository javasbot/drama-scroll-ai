import Groq from 'groq-sdk';

const groq = new Groq({
  apiKey: process.env.GROQ_API_KEY || '',
});

const DRAMA_CATEGORIES = [
  'workplace',
  'family',
  'relationship',
  'friendship',
  'community',
];

const EMOTION_TAGS = ['😡 愤怒', '😭 心碎', '🤯 震惊', '😈 爽文', '🔥 辣评', '💀 社死', '👀 吃瓜', '🚩 避雷'];

const SYSTEM_PROMPT = `你是一名资深的情景剧编剧 AI。请为社交媒体信息流生成一段**短小精悍且极具爆发力**的故事贴。
要求：
1. 字数控制在 80-150 字之间。
2. 以第一人称（“我”）写作，模拟真实的社交媒体吐槽风格。
3. 必须有一个极其抓人的开头（Hook），让人忍不住想看下去。
4. 包含一个戏剧性的转折或悬念。
5. 语言口语化，具有真实感，偶尔可以使用感叹号表示强调。
6. 以一个能引起强烈情绪共鸣的问题或陈述结尾。

输出必须是合法的 JSON 格式，结构如下：
{
  "title": "5-8个字的标题，要地道且抓眼",
  "content": "故事正文",
  "category": "必须是以下之一: workplace, family, relationship, friendship, community",
  "emotionTag": "一个表情+情绪词，如 '😡 愤怒' 或 '😭 心碎'",
  "hookScore": 8.5,
  "triggerWarning": null
}

严禁输出 JSON 以外的任何文字。`;

/**
 * Generate a single dramatic story via LLM
 * @param {string} [theme] - Optional theme hint
 * @returns {Promise<Object>} Generated story object
 */
export async function generateStory(theme) {
  const category = DRAMA_CATEGORIES[Math.floor(Math.random() * DRAMA_CATEGORIES.length)];
  const emotion = EMOTION_TAGS[Math.floor(Math.random() * EMOTION_TAGS.length)];

  const userPrompt = theme
    ? `Generate a dramatic story about: ${theme}. Category hint: ${category}. Emotion vibe: ${emotion}.`
    : `Generate a dramatic story. Category: ${category}. Emotion vibe: ${emotion}. Make it fresh and unique.`;

  try {
    const completion = await groq.chat.completions.create({
      model: 'llama-3.3-70b-versatile',
      messages: [
        { role: 'system', content: SYSTEM_PROMPT },
        { role: 'user', content: userPrompt },
      ],
      temperature: 0.9,
      max_tokens: 500,
      top_p: 0.95,
    });

    const raw = completion.choices?.[0]?.message?.content?.trim();
    if (!raw) {
      throw new Error('Empty response from LLM');
    }

    // Extract JSON from potential markdown code blocks
    const jsonStr = raw.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
    const story = JSON.parse(jsonStr);

    // Validate required fields
    if (!story.title || !story.content) {
      throw new Error('Missing required fields in LLM response');
    }

    return {
      title: String(story.title).slice(0, 100),
      content: String(story.content).slice(0, 1000),
      category: story.category || category,
      emotionTag: story.emotionTag || emotion,
      hookScore: Math.min(10, Math.max(0, Number(story.hookScore) || 7)),
      triggerWarning: story.triggerWarning || null,
      generatedAt: new Date().toISOString(),
      model: 'llama-3.3-70b-versatile',
    };
  } catch (error) {
    console.error('[LLM] Generation failed:', error.message);
    // Fallback story for resilience
    return createFallbackStory(category, emotion);
  }
}

/**
 * Stream a story generation via SSE
 * @param {import('express').Response} res - Express response for SSE
 * @param {string} [theme] - Optional theme hint
 */
export async function streamStoryGeneration(res, theme) {
  const category = DRAMA_CATEGORIES[Math.floor(Math.random() * DRAMA_CATEGORIES.length)];
  const emotion = EMOTION_TAGS[Math.floor(Math.random() * EMOTION_TAGS.length)];

  const userPrompt = theme
    ? `Generate a dramatic story about: ${theme}. Category hint: ${category}. Emotion vibe: ${emotion}.`
    : `Generate a dramatic story. Category: ${category}. Emotion vibe: ${emotion}. Make it fresh and unique.`;

  try {
    const stream = await groq.chat.completions.create({
      model: 'llama-3.3-70b-versatile',
      messages: [
        { role: 'system', content: SYSTEM_PROMPT },
        { role: 'user', content: userPrompt },
      ],
      temperature: 0.9,
      max_tokens: 500,
      top_p: 0.95,
      stream: true,
    });

    let accumulated = '';
    for await (const chunk of stream) {
      const delta = chunk.choices?.[0]?.delta?.content || '';
      accumulated += delta;
      res.write(`data: ${JSON.stringify({ type: 'chunk', content: delta })}\n\n`);
    }

    // Parse final accumulated response
    try {
      const jsonStr = accumulated.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
      const story = JSON.parse(jsonStr);
      res.write(`data: ${JSON.stringify({ type: 'complete', story: {
        title: String(story.title).slice(0, 100),
        content: String(story.content).slice(0, 1000),
        category: story.category || category,
        emotionTag: story.emotionTag || emotion,
        hookScore: Math.min(10, Math.max(0, Number(story.hookScore) || 7)),
        triggerWarning: story.triggerWarning || null,
        generatedAt: new Date().toISOString(),
        model: 'llama-3.3-70b-versatile',
      }})}\n\n`);
    } catch {
      const fallback = createFallbackStory(category, emotion);
      res.write(`data: ${JSON.stringify({ type: 'complete', story: fallback })}\n\n`);
    }
  } catch (error) {
    console.error('[LLM] Stream failed:', error.message);
    const fallback = createFallbackStory(category, emotion);
    res.write(`data: ${JSON.stringify({ type: 'error', fallback })}\n\n`);
  }
}

/**
 * Generate batch of stories
 * @param {number} count
 * @returns {Promise<Object[]>}
 */
export async function generateBatch(count = 5) {
  const batchSize = Math.min(count, Number(process.env.STORY_BATCH_SIZE) || 5);
  const promises = Array.from({ length: batchSize }, () => generateStory());
  const results = await Promise.allSettled(promises);
  return results
    .filter(r => r.status === 'fulfilled')
    .map(r => r.value);
}

function createFallbackStory(category, emotion) {
  const fallbacks = [
    {
      title: "老板竟然在工作群发了这段语音",
      content: "天呐，我老板刚才手滑把发给老婆的语音发到了部门大群，开头第一句就是：'亲爱的，这帮蠢货我一秒钟都待不下去了'。接着他把我们组每个人挨个点了名吐了一遍槽，包括这周请病假的老李。现在人事部已经介入了，他已经'居家办公'三天没敢露面。最讽刺的是，上个月绩效面谈他刚给我的沟通能力打了2分。这回到底谁没沟通好？我是该现在辞职还是等遣散费？💀",
    },
    {
      title: "发现我相处12年的闺蜜在过双重生活",
      content: "我认识了12年的闺蜜一直跟所有人说她在做年薪百万的市场总监。结果我昨天去交网费。竟然在呼叫中心柜台撞见了正在工作的她。我俩对视那一秒，空气都凝固了。她直接挂掉电话扭头就走。这一周她都没回我信息。其实我根本不在意她赚多少钱，我难过的是，相处这么久她竟然一点都不信任我。这闺蜜还能做吗？",
    },
    {
      title: "婚礼现场竟然成了婆婆的大型秀场",
      content: "我婆婆竟然穿了一件白色的礼服来参加我的婚礼！我私下问她，她竟然理直气壮说这是'米白色'。我老公一句话都不敢坑。更炸裂的是，在敬酒环节，她突然宣布她怀孕了，52岁啊！我的婚礼头条瞬间变成了她老树开花。摄影师拍她的时间比拍我俩都多。我觉得整个婚礼都被毁了。我是不是该考虑及时止损？🚩",
    },
    {
      title: "合租室友的秘密差点毁了我的一生",
      content: "我刚刚发现我的室友过去8个月一直在盗用我的身份申请信用卡！如果不是我申请房贷被拒，我根本不知道我的信用分竟然掉到了340分。她一共开了四张卡刷了23万。我找她对质，她竟然说：'我本来打算还的，你反应也太激烈了吧'。她已经连夜搬走并把我拉黑了。25岁的我就背了这么多债。我该怎么办啊？😭",
    },
    {
      title: "这顿年夜饭吃得我整个人都崩塌了",
      content: "在全家人吃年夜饭的时候，我爸云淡风轻地宣布他在隔壁省还有一个家。不是曾经，是现在！家里还有一个老婆和两个已经读初中的孩子。我妈手里的汤勺直接砸在了地上，我姐开始疯狂大笑，而我坐在那像个傻子。他竟然说他'需要活出自我'。你的自我就是背着我们养了十几年小的？我妈已经三天没说话了。这种家真的还有救吗？💀",
    },
  ];

  const pick = fallbacks[Math.floor(Math.random() * fallbacks.length)];
  return {
    ...pick,
    category: category || 'community',
    emotionTag: emotion || '🤯 震惊',
    hookScore: 8.5,
    triggerWarning: null,
    generatedAt: new Date().toISOString(),
    model: 'fallback',
  };
}
