import * as cheerio from 'cheerio';

const USER_AGENTS = [
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36',
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36',
  'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36',
];

function getRandomUA() {
  return USER_AGENTS[Math.floor(Math.random() * USER_AGENTS.length)];
}

/**
 * Crawl trending topics from public sources for story inspiration
 * @returns {Promise<string[]>} Array of trending topic strings
 */
export async function crawlTrendingTopics() {
  const topics = [];

  try {
    // Attempt to get trending/popular topics from public RSS-like sources
    const sources = [
      { url: 'https://www.reddit.com/r/AmItheAsshole/hot.json?limit=10', parser: parseRedditJSON },
      { url: 'https://www.reddit.com/r/tifu/hot.json?limit=10', parser: parseRedditJSON },
      { url: 'https://www.reddit.com/r/relationship_advice/hot.json?limit=10', parser: parseRedditJSON },
    ];

    const results = await Promise.allSettled(
      sources.map(async ({ url, parser }) => {
        const response = await fetch(url, {
          headers: {
            'User-Agent': getRandomUA(),
            'Accept': 'application/json',
          },
          signal: AbortSignal.timeout(8000),
        });

        if (!response.ok) {
          throw new Error(`HTTP ${response.status} from ${url}`);
        }

        const data = await response.json();
        return parser(data);
      })
    );

    for (const result of results) {
      if (result.status === 'fulfilled' && Array.isArray(result.value)) {
        topics.push(...result.value);
      }
    }
  } catch (error) {
    console.warn('[Crawler] Failed to crawl trending topics:', error.message);
  }

  // Fallback dramatic themes if crawling fails
  if (topics.length === 0) {
    return getStaticDramaThemes();
  }

  return topics.slice(0, 20);
}

/**
 * Parse Reddit JSON response
 * @param {Object} data
 * @returns {string[]}
 */
function parseRedditJSON(data) {
  const posts = data?.data?.children || [];
  return posts
    .filter(p => p.data && p.data.title && !p.data.stickied)
    .map(p => p.data.title)
    .slice(0, 5);
}

/**
 * Crawl and extract dramatic content from a given URL
 * @param {string} url
 * @returns {Promise<Object|null>}
 */
export async function crawlPage(url) {
  try {
    const response = await fetch(url, {
      headers: { 'User-Agent': getRandomUA() },
      signal: AbortSignal.timeout(10000),
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }

    const html = await response.text();
    const $ = cheerio.load(html);

    // Remove scripts and styles
    $('script, style, nav, header, footer, .sidebar').remove();

    const title = $('h1').first().text().trim() || $('title').text().trim();
    const paragraphs = [];
    $('p').each((_, el) => {
      const text = $(el).text().trim();
      if (text.length > 30) {
        paragraphs.push(text);
      }
    });

    return {
      title: title.slice(0, 200),
      content: paragraphs.slice(0, 5).join('\n\n'),
      sourceUrl: url,
      crawledAt: new Date().toISOString(),
    };
  } catch (error) {
    console.error(`[Crawler] Failed to crawl ${url}:`, error.message);
    return null;
  }
}

/**
 * Static dramatic themes as fallback
 */
function getStaticDramaThemes() {
  return [
    '同事抢了我的功劳还比我先升职了',
    '我发现我对象这几个月一直在偷偷和前任联系',
    '我最好的朋友竟然一直在背后到处传我的八卦',
    '家里人一直逼我放弃梦想，回老家考公考编',
    '我发现房东竟然在没打招呼的情况下偷偷进过我的房间',
    '我的伴娘竟然因为一个很离谱的小事说不来参加我的婚礼了',
    '我用监控抓到了邻居偷我快递的现行',
    '我的大学室友每天晚上都带陌生人回宿舍过夜',
    '老板在我好不容易批下来的年假期间安排了强制性会议',
    '我看了我姐的日记，发现她对家里每个人的怨念都深得可怕',
    '我公婆总是想插手我怎么带孩子，甚至想搬过来长住',
    '一个朋友借了我的钱之后就开始玩消失，发微信也不回',
    '同事为了推卸责任，竟然去 HR 那里反咬我一口',
    '我偶然发现我爸妈隐瞒了我其实是被领养的真相',
    '我的另一半在没跟我商量的情况下，动用大笔积蓄买了理财',
  ];
}
