import { Pinecone } from '@pinecone-database/pinecone';

let pineconeIndex = null;

/**
 * Initialize Pinecone client and index
 */
async function getIndex() {
  if (pineconeIndex) return pineconeIndex;

  const apiKey = process.env.PINECONE_API_KEY;
  if (!apiKey || apiKey === 'your_pinecone_api_key_here') {
    console.warn('[Vector] Pinecone API key not configured, using mock mode');
    return null;
  }

  try {
    const pc = new Pinecone({ apiKey });
    const indexName = process.env.PINECONE_INDEX || 'drama-stories';

    // Check if index exists, create if needed
    const indexes = await pc.listIndexes();
    const indexExists = indexes.indexes?.some(i => i.name === indexName);

    if (!indexExists) {
      console.log(`[Vector] Creating index "${indexName}"...`);
      await pc.createIndex({
        name: indexName,
        dimension: 384, // MiniLM embedding dimension
        metric: 'cosine',
        spec: {
          serverless: {
            cloud: 'aws',
            region: process.env.PINECONE_ENVIRONMENT || 'us-east-1',
          },
        },
      });
      // Wait for index to be ready
      await new Promise(resolve => setTimeout(resolve, 5000));
    }

    pineconeIndex = pc.index(indexName);
    console.log(`[Vector] Connected to Pinecone index "${indexName}"`);
    return pineconeIndex;
  } catch (error) {
    console.error('[Vector] Failed to connect to Pinecone:', error.message);
    return null;
  }
}

/**
 * Simple text to vector embedding using character frequency
 * In production, replace with a proper embedding model (e.g., sentence-transformers)
 * @param {string} text
 * @returns {number[]} 384-dimensional vector
 */
function textToVector(text) {
  const vector = new Array(384).fill(0);
  const normalized = text.toLowerCase();
  for (let i = 0; i < normalized.length; i++) {
    const charCode = normalized.charCodeAt(i);
    const idx = charCode % 384;
    vector[idx] += 1;
  }
  // Normalize
  const magnitude = Math.sqrt(vector.reduce((sum, v) => sum + v * v, 0)) || 1;
  return vector.map(v => v / magnitude);
}

/**
 * Upsert a story embedding into Pinecone
 * @param {string} storyId
 * @param {Object} story
 */
export async function upsertStoryVector(storyId, story) {
  const index = await getIndex();
  if (!index) return;

  try {
    const text = `${story.title} ${story.content} ${story.category} ${story.emotionTag}`;
    const values = textToVector(text);

    await index.upsert([{
      id: storyId,
      values,
      metadata: {
        title: story.title,
        category: story.category,
        emotionTag: story.emotionTag,
        hookScore: story.hookScore,
        createdAt: story.generatedAt,
      },
    }]);
  } catch (error) {
    console.error('[Vector] Upsert failed:', error.message);
  }
}

/**
 * Find similar stories based on text query
 * @param {string} queryText
 * @param {number} topK
 * @returns {Promise<Object[]>}
 */
export async function findSimilarStories(queryText, topK = 5) {
  const index = await getIndex();
  if (!index) return [];

  try {
    const queryVector = textToVector(queryText);
    const results = await index.query({
      vector: queryVector,
      topK,
      includeMetadata: true,
    });

    return results.matches?.map(match => ({
      id: match.id,
      score: match.score,
      ...match.metadata,
    })) || [];
  } catch (error) {
    console.error('[Vector] Query failed:', error.message);
    return [];
  }
}

/**
 * Delete a story vector
 * @param {string} storyId
 */
export async function deleteStoryVector(storyId) {
  const index = await getIndex();
  if (!index) return;

  try {
    await index.deleteOne(storyId);
  } catch (error) {
    console.error('[Vector] Delete failed:', error.message);
  }
}
