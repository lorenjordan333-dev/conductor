const fetch = require('node-fetch');

const BRIDGE_URL = process.env.CONDUCTOR_BRIDGE_URL;
const CONDUCTOR_SECRET = process.env.CONDUCTOR_SECRET;

async function callBridge(action, params = {}) {
  const res = await fetch(BRIDGE_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-conductor-key': CONDUCTOR_SECRET
    },
    body: JSON.stringify({ action, ...params })
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || `Bridge error ${res.status}`);
  return data;
}

module.exports = { callBridge };
