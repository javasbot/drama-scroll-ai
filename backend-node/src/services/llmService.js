import Groq from 'groq-sdk';

const groq = new Groq({
  apiKey: process.env.GROQ_API_KEY || '',
});

const DRAMA_CATEGORIES = [
  'workplace_betrayal',
  'family_scandal',
  'relationship_revenge',
  'neighborhood_war',
  'friend_backstab',
  'wedding_disaster',
  'inheritance_fight',
  'roommate_nightmare',
  'school_drama',
  'online_dating_horror',
];

const EMOTION_TAGS = ['😡 Rage', '😭 Heartbreak', '🤯 Shocking', '😈 Revenge', '🔥 Hot Take', '💀 Cringe', '👀 Tea', '🚩 Red Flag'];

const SYSTEM_PROMPT = `You are an expert dramatic storytelling AI. Generate a SHORT, intensely engaging dramatic story post for a social media feed. The story must:

1. Be 80-150 words maximum
2. Written in first person as if posted on social media
3. Have an extremely hooky opening line that makes people NEED to read more
4. Include a dramatic twist or cliffhanger
5. Feel authentic and relatable - like a real person venting
6. Use casual, conversational language with occasional caps for emphasis
7. End with a question or statement that provokes strong emotional reactions

Output ONLY valid JSON with this exact structure:
{
  "title": "catchy 5-8 word title",
  "content": "the dramatic story text",
  "category": "one of: workplace, family, relationship, friendship, community",
  "emotionTag": "one emoji + emotion word like '😡 Rage' or '😭 Heartbreak'",
  "hookScore": 8.5,
  "triggerWarning": null
}

DO NOT include any text outside the JSON object.`;

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
      title: "My Boss Just Sent This in the Group Chat",
      content: "So my boss accidentally sent a voice note meant for his wife to our entire department group chat. It started with 'baby I can't stand these people anymore' and then proceeded to ROAST every single one of us by name. HR is involved now and he's been 'working from home' for 3 days. The best part? He gave me a 2/5 on my performance review last month for 'poor communication skills.' THE IRONY. Should I quit or wait for the severance package? 💀",
    },
    {
      title: "Caught My Best Friend Living a Double Life",
      content: "My best friend of 12 years has been telling everyone she's a marketing manager making 6 figures. I just found out she actually works at a call center. I only discovered this because I ran into her AT the call center while calling about my internet bill. She looked at me, I looked at her, and she just... hung up the call and walked out. She hasn't answered my texts in a week. I'm not even mad about the lie, I'm hurt she didn't trust me enough to tell the truth. What do I do?",
    },
    {
      title: "Wedding Day From Absolute Hell",
      content: "My mother-in-law wore a WHITE DRESS to my wedding. When I confronted her, she said 'well technically it's cream.' My husband said NOTHING. Then during the toast, she announced that she's pregnant... at 52. She literally stole our thunder at OUR wedding. The photographer spent more time taking HER photos than ours. I found out later she called the DJ to play 'her song' during our first dance slot. I have never felt so disrespected in my LIFE. Am I overreacting?? 🚩",
    },
    {
      title: "Roommate's Secret Almost Destroyed My Life",
      content: "I just discovered my roommate has been using MY identity to sign up for credit cards for the past 8 months. I found out when I got denied for an apartment and my credit score was 340. THREE HUNDRED AND FORTY. She maxed out FOUR cards in my name totaling $23K. When I confronted her she said 'I was going to pay it back, you're overreacting.' I'm literally shaking. Filed a police report but she's already moved out and blocked me everywhere. My credit is DESTROYED at 25.",
    },
    {
      title: "The Family Dinner That Ended Everything",
      content: "At Thanksgiving dinner, my dad casually announced he has another family. Not HAD - HAS. As in, a whole other wife and TWO kids in the next state over. My mom dropped the gravy boat and it shattered. My sister started laughing hysterically. I just sat there. He said he 'needed to live his truth.' Sir, your truth has a mortgage and a minivan. The turkey went cold while we all just... stared. My mom hasn't said a word in three days. Happy holidays I guess? 😭",
    },
  ];

  const pick = fallbacks[Math.floor(Math.random() * fallbacks.length)];
  return {
    ...pick,
    category: category || 'community',
    emotionTag: emotion || '🤯 Shocking',
    hookScore: 8.5,
    triggerWarning: null,
    generatedAt: new Date().toISOString(),
    model: 'fallback',
  };
}
