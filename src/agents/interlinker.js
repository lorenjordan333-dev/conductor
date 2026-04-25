const Anthropic = require('@anthropic-ai/sdk');

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

async function interlinker(client, supabase) {
  // Get all published articles for this client
  const { data: articles } = await supabase
    .from('blog_posts')
    .select('id, title, slug, content, url')
    .eq('client_id', client.id)
    .eq('status', 'published')
    .order('created_at', { ascending: false })
    .limit(20);

  if (!articles || articles.length < 2) return { updated: 0 };

  const knownFor = client.known_for || '';
  const keywords = client.target_keywords || [];
  let updated = 0;

  for (const article of articles) {
    // Find other articles to link to from this one
    const otherArticles = articles.filter(a => a.id !== article.id).slice(0, 5);
    
    if (!article.content) continue;

    // Use Anthropic to intelligently add internal links
    const prompt = `You are an SEO specialist. Add internal links to this article content.

ARTICLE TITLE: ${article.title}
KNOWN FOR STATEMENT: ${knownFor}
TARGET KEYWORDS: ${keywords.join(', ')}

ARTICLES TO LINK TO:
${otherArticles.map(a => `- "${a.title}" → URL: ${a.url || `/blog/${a.slug}`}`).join('\n')}

CURRENT CONTENT (first 2000 chars):
${article.content.slice(0, 2000)}

Rules:
- Add 2-3 natural internal links using relevant anchor text
- Anchor text must match the "Known For" narrative and target keywords
- Links must feel natural, not forced
- Return ONLY the updated content with links added as HTML anchor tags
- Keep all existing content exactly the same, only add the links inline`;

    try {
      const response = await anthropic.messages.create({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 2000,
        messages: [{ role: 'user', content: prompt }],
      });

      const updatedContent = response.content[0].text;
      
      if (updatedContent && updatedContent.length > 100) {
        await supabase
          .from('blog_posts')
          .update({ 
            content: updatedContent,
            interlinked_at: new Date().toISOString()
          })
          .eq('id', article.id);
        
        updated++;
      }
    } catch (e) {
      console.error(`Interlinker failed for article ${article.id}:`, e.message);
    }
  }

  return { updated };
}

module.exports = { interlinker };
