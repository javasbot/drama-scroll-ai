import axios from 'axios';
import type { Story, ApiResponse, EngagementData } from '../types';

const nodeApi = axios.create({
  baseURL: import.meta.env.VITE_NODE_API_URL || '/api',
  timeout: 30000,
  headers: { 'Content-Type': 'application/json' },
});

const javaApi = axios.create({
  baseURL: import.meta.env.VITE_JAVA_API_URL || '/api',
  timeout: 10000,
  headers: { 'Content-Type': 'application/json' },
});

// --- 故事 API (Node.js BFF) ---

export async function fetchStories(page: number = 1, size: number = 5): Promise<ApiResponse<Story[]>> {
  try {
    const { data } = await nodeApi.get<ApiResponse<Story[]>>('/api/stories', {
      params: { page, size },
    });
    return data;
  } catch (error) {
    console.error('[API] 获取故事失败:', error);
    return {
      success: true,
      data: generateFallbackStories(size),
      pagination: { page, size, hasMore: true },
    };
  }
}

export async function generateStory(theme?: string): Promise<Story | null> {
  try {
    const { data } = await nodeApi.post<ApiResponse<Story>>('/api/stories/generate', { theme });
    return data.data;
  } catch (error) {
    console.error('[API] 生成故事失败:', error);
    return null;
  }
}

// --- 互动 API (Java Spring Boot) ---

export async function sendLike(storyId: string, userFingerprint: string, action: 'like' | 'dislike') {
  try {
    await javaApi.post('/api/engagement/like', { storyId, userFingerprint, action });
  } catch (error) {
    console.error('[API] 点赞失败:', error);
  }
}

export async function sendEmotionVote(storyId: string, userFingerprint: string, emotionType: string) {
  try {
    await javaApi.post('/api/engagement/emotion', { storyId, userFingerprint, emotionType });
  } catch (error) {
    console.error('[API] 投票失败:', error);
  }
}

export async function getEngagement(storyId: string): Promise<EngagementData | null> {
  try {
    const { data } = await javaApi.get<{ data: EngagementData }>(`/api/engagement/${storyId}`);
    return data.data;
  } catch (error) {
    return null;
  }
}

// --- SSE 连接 ---

export function createSSEConnection(
  onMessage: (story: Story) => void,
  onError?: (error: Event) => void,
): EventSource | null {
  const sseUrl = import.meta.env.VITE_SSE_URL || '/api/sse/feed';

  try {
    const eventSource = new EventSource(sseUrl);

    eventSource.onmessage = (event) => {
      try {
        const parsed = JSON.parse(event.data);
        if (parsed.type === 'new_story' && parsed.story) {
          onMessage(parsed.story);
        }
      } catch {
        // 忽略心跳等非 JSON 数据
      }
    };

    eventSource.onerror = (event) => {
      console.warn('[SSE] 连接异常，将自动重试...');
      onError?.(event);
    };

    return eventSource;
  } catch (error) {
    console.error('[SSE] 创建连接失败:', error);
    return null;
  }
}

// --- 离线/降级 Fallback 数据 ---

function generateFallbackStories(count: number): Story[] {
  const fallbacks = [
    {
      title: '领导在工作群发错了一条语音',
      content: '我们领导今天在一百多人的部门群里，发了一条本来应该发给他老婆的语音。开头就是"宝贝我真受不了这帮人了"，然后一个接一个地吐槽我们每个人。HR已经介入了，他"居家办公"三天了。最绝的是，上个月他给我绩效打了 3.25，理由是"沟通能力有待提升"。讽刺吗？要不要等赔偿还是直接提离职？💀',
      category: 'workplace',
      emotionTag: '🤯 震惊',
    },
    {
      title: '发现闺蜜一直在过双面人生',
      content: '认识12年的闺蜜，跟所有人说自己是做市场总监的，年薪五六十万。结果我打客服电话投诉网络的时候，对面接线的居然是她。我俩对视了三秒，她直接挂了那通电话走人了。一个礼拜没回我消息。我不是生气她说谎，是难过她不信任我。该怎么办？',
      category: 'friendship',
      emotionTag: '😭 心碎',
    },
    {
      title: '婚礼当天婆婆穿了白裙子来',
      content: '我婆婆穿了一条白色裙子来参加我的婚礼。我质问她的时候，她说"严格来说这是米色的"。我老公一句话没说。敬酒的时候她宣布她怀孕了——52岁。在我们的婚礼上抢风头！摄影师拍她的时间比拍我们还多。后来我发现她还跟 DJ 私下换了我们第一支舞的歌。我这辈子没被这么不尊重过。🚩',
      category: 'family',
      emotionTag: '😡 愤怒',
    },
    {
      title: '室友偷用我的身份办了四张信用卡',
      content: '刚发现室友用我的身份信息偷偷办了四张信用卡，搞了八个月。我是租房被拒审的时候才发现的，征信已经黑了。四张卡总共透支了十五万。我质问她的时候她说"我本来打算还的，你反应过大了"。已经报警了，但她搬走了全拉黑了。25岁，征信全毁。',
      category: 'community',
      emotionTag: '😈 爽文',
    },
    {
      title: '年夜饭上老爸说他还有一个家',
      content: '年夜饭的时候，我爸很随意地说他还有一个家庭。不是"以前有过"，是现在还有。隔壁省，有老婆有两个小孩。我妈手里的汤碗直接摔了。我姐开始歇斯底里地笑。我就那么坐着。他说他"需要活出真实的自己"。您那个真实有房贷有面包车。我妈三天没说过一句话。新年快乐吧。😭',
      category: 'family',
      emotionTag: '🤯 震惊',
    },
    {
      title: '邻居的"报复花园"让我崩溃',
      content: '因为我家围栏多出了五厘米到他那边，邻居沿着整条边界种了一排竹子。不懂的可以查一下，竹子基本就是植物版的生化武器。现在竹根已经窜到我家院子里了，车道都裂了。找人清除要好几万。他每天早上坐在门口喝茶跟我挥手。每天。早上。🔥',
      category: 'community',
      emotionTag: '🔥 辣评',
    },
    {
      title: '相亲对象带着他妈来了',
      content: '在某 App 上认识了个男生，聊了两周挺投缘。约了一家还不错的餐厅见面，结果他带了他妈来。不是偶遇——她已经坐下来了，还点了前菜，拿着一张准备好的问题清单。问了我征信分数、家族病史、会不会做饭。他坐旁边一直点头，好像这很正常。我借口上厕所从厨房溜了。💀',
      category: 'relationship',
      emotionTag: '💀 社死',
    },
    {
      title: 'HR 说有人投诉我吃饭太大声',
      content: '今天被叫去 HR 了，因为有人投诉我"制造了恶劣的办公环境"。原因是——吃东西声音太大。我每天中午在工位啃个沙拉。沙拉啊！投诉信说我"富有攻击性的咀嚼声引发了焦虑"。HR 读投诉的时候努力憋着没笑。让我去茶水间吃。我在这干了七年。投诉的人来了三个月。什么世道？👀',
      category: 'workplace',
      emotionTag: '👀 吃瓜',
    },
  ];

  return Array.from({ length: count }, (_, i) => {
    const base = fallbacks[i % fallbacks.length];
    return {
      id: `fallback-${Date.now()}-${i}-${Math.random().toString(36).slice(2, 8)}`,
      ...base,
      hookScore: 7 + Math.random() * 3,
      triggerWarning: null,
      generatedAt: new Date().toISOString(),
      model: 'fallback',
      likes: Math.floor(Math.random() * 800) + 50,
      comments: Math.floor(Math.random() * 150) + 5,
      shares: Math.floor(Math.random() * 80) + 2,
      readTime: 1,
    };
  });
}
