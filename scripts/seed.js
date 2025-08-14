const db = require('../backend/src/db');

async function seed() {
  try {
    console.log('Seeding database with initial data...');
    
    await db.initDatabase();
    
    // Add some sample events
    const now = Date.now();
    
    await db.logEvent('system', 'startup', 'init', null, 'running');
    await db.logEvent('light', 'light_living', 'toggle', 'off', 'on');
    await db.logEvent('light', 'light_living', 'toggle', 'on', 'off');
    await db.logEvent('fan', 'fan', 'mode_change', '{"state":"off","mode":"manual"}', '{"state":"on","mode":"auto"}');
    await db.logEvent('lock', 'lock', 'unlock', 'locked', 'unlocked');
    
    // Add some sample sensor data
    const temps = [22.5, 23.1, 24.2, 25.8, 26.3, 25.9, 24.7];
    const humidities = [45, 48, 52, 58, 62, 59, 55];
    
    for (let i = 0; i < temps.length; i++) {
      const timestamp = now - (temps.length - i) * 60000; // 1 minute intervals
      await db.logSensor('temperature', temps[i]);
      await db.logSensor('humidity', humidities[i]);
    }
    
    console.log('Database seeding completed successfully');
    process.exit(0);
  } catch (error) {
    console.error('Seeding failed:', error);
    process.exit(1);
  }
}

// Run seeding if called directly
if (require.main === module) {
  seed();
}

module.exports = { seed };