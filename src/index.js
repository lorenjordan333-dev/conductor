const cron = require('node-cron');
const { runConductor } = require('./conductor');

console.log('🎼 Conductor starting...');

// Run every day at 6am UTC
cron.schedule('0 6 * * *', async () => {
  console.log('🎼 Conductor running...');
  await runConductor();
});

// Also run immediately on startup
runConductor();
