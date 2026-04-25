const fetch = require('node-fetch');

// Free platforms that accept programmatic submissions
const CITATION_PLATFORMS = [
  {
    name: 'Bing Places',
    submitUrl: 'https://www.bingplaces.com',
    hasApi: false,
    note: 'Manual but high priority'
  },
  {
    name: 'Apple Maps',
    submitUrl: 'https://mapsconnect.apple.com',
    hasApi: false,
    note: 'Manual verification required'
  },
  {
    name: 'OpenStreetMap',
    submitUrl: 'https://www.openstreetmap.org',
    hasApi: true,
    apiEndpoint: 'https://api.openstreetmap.org'
  }
];

async function citationBuilder(client, supabase) {
  // Check which platforms this client is already logged
  const { data: existing } = await supabase
    .from('conductor_citations')
    .select('platform')
    .eq('client_id', client.id);

  const existingPlatforms = new Set((existing || []).map(e => e.platform));
  let submitted = 0;

  for (const platform of CITATION_PLATFORMS) {
    if (existingPlatforms.has(platform.name)) continue;

    // Log the citation opportunity in Supabase
    await supabase
      .from('conductor_citations')
      .insert({
        client_id: client.id,
        platform: platform.name,
        status: platform.hasApi ? 'submitted' : 'pending_manual',
        submit_url: platform.submitUrl,
        note: platform.note,
        created_at: new Date().toISOString()
      });

    submitted++;
  }

  return { submitted };
}

module.exports = { citationBuilder };
