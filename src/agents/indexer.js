const fetch = require('node-fetch');

async function indexer(client, supabase) {
  // Get articles not yet pinged for indexing
  const { data: articles } = await supabase
    .from('blog_posts')
    .select('id, url, slug')
    .eq('client_id', client.id)
    .eq('status', 'published')
    .is('indexed_at', null)
    .limit(10);

  if (!articles || articles.length === 0) return { pinged: 0 };

  let pinged = 0;

  for (const article of articles) {
    const pageUrl = article.url || `${client.website_url}/blog/${article.slug}`;
    
    try {
      // Ping Bing IndexNow API (free, no auth needed)
      await fetch('https://api.indexnow.org/indexnow', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          host: extractDomain(client.website_url),
          key: process.env.INDEXNOW_KEY || 'orbitrank',
          urlList: [pageUrl]
        })
      });

      // Mark as indexed in Supabase
      await supabase
        .from('blog_posts')
        .update({ indexed_at: new Date().toISOString() })
        .eq('id', article.id);

      pinged++;
    } catch (e) {
      console.error(`Indexer failed for ${pageUrl}:`, e.message);
    }
  }

  return { pinged };
}

function extractDomain(url) {
  try {
    return new URL(url.startsWith('http') ? url : `https://${url}`)
      .hostname.replace(/^www\./, '');
  } catch {
    return url;
  }
}

module.exports = { indexer };
