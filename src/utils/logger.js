async function logActivity(supabase, clientId, type, message) {
  console.log(`🎼 [${type.toUpperCase()}] Client ${clientId}: ${message}`);
  
  try {
    await supabase
      .from('conductor_logs')
      .insert({
        client_id: clientId,
        type,
        message,
        created_at: new Date().toISOString()
      });
  } catch (e) {
    console.error('Logger failed:', e.message);
  }
}

module.exports = { logActivity };
