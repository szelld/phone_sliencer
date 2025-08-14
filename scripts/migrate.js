const path = require('path');
const db = require('../backend/src/db');

async function migrate() {
  try {
    console.log('Running database migration...');
    
    await db.initDatabase();
    
    console.log('Database migration completed successfully');
    process.exit(0);
  } catch (error) {
    console.error('Migration failed:', error);
    process.exit(1);
  }
}

// Run migration if called directly
if (require.main === module) {
  migrate();
}

module.exports = { migrate };