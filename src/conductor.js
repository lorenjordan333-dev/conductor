const { callBridge } = require('./utils/bridge');
const { analyzeClient } = require('./agents/analyzer');
const { interlinker } = require('./agents/interlinker');
const { indexer } = require('./agents/indexer');
const { citationBuilder } = require('./agents/citationBuilder');
const { contentOptimizer } = require('./agents/contentOptimizer');

async function runConductor() {
  console.log('🎼 Conductor: fetching all active clients...');
  const { clients } = await callBridge('get_clients');
  console.log(`🎼 Conductor: processing ${clients.length} clients...`);

  for (const client of clients) {
    try {
      console.log(`🎼 Processing: ${client.name}`);
      await processClient(client);
    } catch (e) {
      console.error(`🎼 Error processing ${client.name}:`, e);
      await callBridge('log_activity', {
        client_id: client.id,
        type: 'error',
        message: `Conductor error: ${e.message}`
      });
    }
  }
  console.log('🎼 Conductor: done.');
}

async function processClient(client) {
  const analysis = await analyzeClient(client);
  await callBridge('log_activity', {
    client_id: client.id,
    type: 'analyze',
    message: `Analysis complete. Readiness: ${analysis.readinessScore}/100`
  });

  const interlinkResult = await interlinker(client);
  if (interlinkResult.updated > 0) {
    await callBridge('log_activity', {
      client_id: client.id,
      type: 'interlink',
      message: `Interlinked ${interlinkResult.updated} articles`
    });
  }

  const indexResult = await indexer(client);
  if (indexResult.pinged > 0) {
    await callBridge('log_activity', {
      client_id: client.id,
      type: 'index',
      message: `Pinged ${indexResult.pinged} pages to indexing APIs`
    });
  }

  const citationResult = await citationBuilder(client);
  if (citationResult.submitted > 0) {
    await callBridge('log_activity', {
      client_id: client.id,
      type: 'citation',
      message: `Submitted to ${citationResult.submitted} citation platforms`
    });
  }

  const optimizeResult = await contentOptimizer(client);
  if (optimizeResult.optimized > 0) {
    await callBridge('log_activity', {
      client_id: client.id,
      type: 'optimize',
      message: `Optimized ${optimizeResult.optimized} articles for AI search`
    });
  }
}

module.exports = { runConductor };
