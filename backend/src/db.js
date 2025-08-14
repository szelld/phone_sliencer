const sqlite3 = require('sqlite3').verbose();
const { open } = require('sqlite');
const config = require('./config');

let db = null;

async function initDatabase() {
  try {
    db = await open({
      filename: config.database.file,
      driver: sqlite3.Database
    });

    // Create tables if they don't exist
    await db.exec(`
      CREATE TABLE IF NOT EXISTS events (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        ts INTEGER NOT NULL,
        category TEXT NOT NULL,
        target TEXT NOT NULL,
        action TEXT NOT NULL,
        old_state TEXT,
        new_state TEXT
      );

      CREATE TABLE IF NOT EXISTS sensors (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        ts INTEGER NOT NULL,
        type TEXT NOT NULL,
        value REAL NOT NULL
      );

      CREATE INDEX IF NOT EXISTS idx_events_ts ON events(ts);
      CREATE INDEX IF NOT EXISTS idx_sensors_ts_type ON sensors(ts, type);
    `);

    console.log('Database initialized successfully');
    return db;
  } catch (error) {
    console.error('Database initialization error:', error);
    throw error;
  }
}

async function logEvent(category, target, action, oldState, newState) {
  try {
    if (!db) throw new Error('Database not initialized');
    
    await db.run(
      'INSERT INTO events (ts, category, target, action, old_state, new_state) VALUES (?, ?, ?, ?, ?, ?)',
      [Date.now(), category, target, action, oldState, newState]
    );
  } catch (error) {
    console.error('Error logging event:', error);
  }
}

async function logSensor(type, value) {
  try {
    if (!db) throw new Error('Database not initialized');
    
    await db.run(
      'INSERT INTO sensors (ts, type, value) VALUES (?, ?, ?)',
      [Date.now(), type, value]
    );
  } catch (error) {
    console.error('Error logging sensor data:', error);
  }
}

async function getEvents(limit = 100) {
  try {
    if (!db) throw new Error('Database not initialized');
    
    return await db.all(
      'SELECT * FROM events ORDER BY ts DESC LIMIT ?',
      [limit]
    );
  } catch (error) {
    console.error('Error fetching events:', error);
    return [];
  }
}

async function getSensorData(type, limit = 1440) {
  try {
    if (!db) throw new Error('Database not initialized');
    
    return await db.all(
      'SELECT * FROM sensors WHERE type = ? ORDER BY ts DESC LIMIT ?',
      [type, limit]
    );
  } catch (error) {
    console.error('Error fetching sensor data:', error);
    return [];
  }
}

module.exports = {
  initDatabase,
  logEvent,
  logSensor,
  getEvents,
  getSensorData
};