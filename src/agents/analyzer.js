const fetch = require('node-fetch');

async function analyzeClient(client, supabase) {
  const domain = extractDomain(client.website_url);
  
  // Get published articles count
  const { data: articles } = await supabase
    .from('blog_posts')
    .select('id, title, slug, content, url')
    .eq('client_id', client.id)
    .eq('status', 'published');

  // Get OpenPageRank data
  let domainAuthority = 0;
  let backlinks = 0;
  try {
    const oprRes = await fetch(
      `https://openpagerank.com/api/v1.0/getPageRank?domains[]=${domain}`,
      { headers: { 'API-OPR': process.env.OPENPAGERANK_API_KEY } }
    );
    const oprData = await oprRes.json();
    const row = oprData?.response?.[0];
    domainAuthority = row?.page_rank_decimal || 0;
    backlinks = row?.backlinks || 0;
  } catch (e) {
    console.error('OPR fetch failed:', e.message);
  }

  // Calculate readiness score
  const articleScore = Math.min(25, (articles?.length || 0) * 2);
  const authorityScore = Math.min(25, domainAuthority * 5);
  const knownForScore = client.known_for ? 25 : 0;
  const narrativeScore = client.content_narrative ? 25 : 0;
  const readinessScore = articleScore + authorityScore + knownForScore + narrativeScore;

  return {
    domain,
    articles: articles || [],
    domainAuthority,
    backlinks,
    readinessScore,
    hasKnownFor: !!client.known_for,
    hasNarrative: !!client.content_narrative,
  };
}

function extractDomain(url) {
  try {
    return new URL(url.startsWith('http') ? url : `https://${url}`)
      .hostname.replace(/^www\./, '');
  } catch {
    return url;
  }
}

module.exports = { analyzeClient };
