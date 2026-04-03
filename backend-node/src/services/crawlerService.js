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
    'A coworker is taking credit for my work and got promoted over me',
    'My partner has been secretly talking to their ex for months',
    'I found out my best friend has been gossiping about me behind my back',
    'My family is pressuring me to give up my dreams for their expectations',
    'I discovered my landlord has been entering my apartment without permission',
    'My bridesmaid just told me she can\'t come to my wedding because of a petty reason',
    'I caught my neighbor stealing my delivered packages on camera',
    'My college roommate is bringing strangers to our dorm every night',
    'My boss scheduled a mandatory meeting on my approved vacation day',
    'I found my sister\'s diary and she wrote terrible things about our family',
    'My in-laws are trying to control how I raise my children',
    'A friend borrowed money and is now avoiding me completely',
    'My coworker reported me to HR for something I didn\'t do',
    'I discovered my parents have been lying about my adoption',
    'My partner made a major financial decision without consulting me',
  ];
}
