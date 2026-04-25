const Anthropic = require('@anthropic-ai/sdk');

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

async function contentOptimizer(client, supabase) {
  // Get articles not yet optimized for AI search
  const { data: articles } = await supabase
    .from('blog_posts')
    .select('id, title, content, slug')
    .eq('client_id', client.id)
    .eq('status', 'published')
    .is('ai_optimized_at', null)
    .limit(5);

  if (!articles || articles.length === 0) return { optimized: 0 };

  const knownFor = client.known_for || '';
  const narrative = client.content_narrative || '';
  const keywords = client.target_keywords || [];
  let optimized = 0;

  for (const article of articles) {
    if (!article.content || article.content.length < 200) continue;

    const prompt = `You are an AI search optimization specialist. Your job is to optimize this article so that ChatGPT, Gemini, and other AI search engines are more likely to cite this business.

BUSINESS KNOWN FOR: ${knownFor}
CONTENT NARRATIVE: ${narrative}
TARGET KEYWORDS: ${keywords.join(', ')}
ARTICLE TITLE: ${article.title}

RULES for AI search optimization:
1. Add a clear "Entity Definition" paragraph at the start that states exactly what this business is and what it's known for — AI models need clear entity signals
2. Add an FAQ section at the end with 3-5 questions that people actually ask AI about this service — with clear, direct answers
3. Make sure the "Known For" statement appears naturally 2-3 times in the content
4. Use specific language — not "we provide services" but "Calgary's 24/7 emergency locksmith trusted for fast response"
5. Keep all existing content — only ADD the entity definition paragraph at top and FAQ at bottom

CURRENT CONTENT:
${article.content.slice(0, 3000)}

Return the full optimized content only. No explanations.`;

    try {
      const response = await anthropic.messages.create({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 3000,
        messages: [{ role: 'user', content: prompt }],
      });

      const optimizedContent = response.content[0].text;

      if (optimizedContent && optimizedContent.length > 200) {
        await supabase
          .from('blog_posts')
          .update({
            content: optimizedContent,
            ai_optimized_at: new Date().toISOString()
          })
          .eq('id', article.id);

        optimized++;
      }
    } catch (e) {
      console.error(`Content optimizer failed for article ${article.id}:`, e.message);
    }
  }

  return { optimized };
}

module.exports = { contentOptimizer };
