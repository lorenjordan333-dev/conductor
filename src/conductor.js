const { createClient } = require('@supabase/supabase-js');
const { analyzeClient } = require('./agents/analyzer');
const { interlinker } = require('./agents/interlinker');
const { indexer } = require('./agents/indexer');
const { citationBuilder } = require('./agents/citationBuilder');
const { contentOptimizer } = require('./agents/contentOptimizer');
const { logActivity } = require('./utils/logger');

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function runConductor() {
  console.log('🎼 Conductor: fetching all active clients...');

  const { data: clients, error } = await supabase
    .from('clients')
    .select('*')
    .eq('status', 'active');

  if (error) {
    console.error('🎼 Conductor: failed to fetch clients:', error);
    return;
  }

  console.log(`🎼 Conductor: processing ${clients.length} clients...`);

  for (const client of clients) {
    try {
      console.log(`🎼 Processing client: ${client.name}`);
      await processClient(client);
    } catch (e) {
      console.error(`🎼 Error processing client ${client.name}:`, e);
      await logActivity(supabase, client.id, 'error', `Conductor error: ${e.message}`);
    }
  }

  console.log('🎼 Conductor: all clients processed.');
}

async function processClient(client) {
  // Step 1 — Analyze what this client needs
  const analysis = await analyzeClient(client, supabase);
  await logActivity(supabase, client.id, 'analyze', `Analysis complete. Readiness: ${analysis.readinessScore}/100`);

  // Step 2 — Interlink all published articles
  const interlinkResult = await interlinker(client, supabase);
  if (interlinkResult.updated > 0) {
    await logActivity(supabase, client.id, 'interlink', `Interlinked ${interlinkResult.updated} articles with consistent anchor text`);
  }

  // Step 3 — Ping indexing APIs for unindexed pages
  const indexResult = await indexer(client, supabase);
  if (indexResult.pinged > 0) {
    await logActivity(supabase, client.id, 'index', `Pinged ${indexResult.pinged} pages to Google and Bing indexing APIs`);
  }

  // Step 4 — Build citations on free platforms
  const citationResult = await citationBuilder(client, supabase);
  if (citationResult.submitted > 0) {
    await logActivity(supabase, client.id, 'citation', `Submitted to ${citationResult.submitted} citation platforms`);
  }

  // Step 5 — Optimize existing content for AI search
  const optimizeResult = await contentOptimizer(client, supabase);
  if (optimizeResult.optimized > 0) {
    await logActivity(supabase, client.id, 'optimize', `Optimized ${optimizeResult.optimized} articles for AI search visibility`);
  }
}

module.exports = { runConductor };
