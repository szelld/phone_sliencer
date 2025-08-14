const express = require('express');
const { authenticateUser, requireAuth } = require('./auth');
const state = require('./state');
const db = require('./db');
const mqtt = require('./mqtt');

const router = express.Router();

// Public login endpoint
router.post('/login', async (req, res) => {
  try {
    const { username, password } = req.body;
    
    if (!username || !password) {
      return res.status(400).json({ error: 'Username and password required' });
    }

    const result = await authenticateUser(username, password);
    
    if (!result) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    res.json(result);
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Protected endpoints - require JWT
router.use(requireAuth);

// Get aggregate state snapshot
router.get('/state', (req, res) => {
  try {
    const currentState = state.getState();
    res.json(currentState);
  } catch (error) {
    console.error('Get state error:', error);
    res.status(500).json({ error: 'Failed to get state' });
  }
});

// Toggle light
router.post('/light/:id/toggle', async (req, res) => {
  try {
    const lightId = req.params.id;
    const currentLight = state.getLightState(lightId);
    
    if (!currentLight) {
      return res.status(404).json({ error: 'Light not found' });
    }

    const newState = currentLight.state === 'on' ? 'off' : 'on';
    const result = state.setLightState(lightId, newState);
    
    if (result) {
      // Log event
      await db.logEvent('light', lightId, 'toggle', result.old, result.new);
      
      // Publish MQTT command
      try {
        mqtt.publishCommand(`light/${lightId}`, { state: newState });
      } catch (mqttError) {
        console.error('MQTT publish error:', mqttError);
      }
      
      res.json({ id: lightId, state: newState });
    } else {
      res.status(500).json({ error: 'Failed to toggle light' });
    }
  } catch (error) {
    console.error('Toggle light error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Control lock
router.post('/lock', async (req, res) => {
  try {
    const { action } = req.body;
    
    if (!action || !['lock', 'unlock'].includes(action)) {
      return res.status(400).json({ error: 'Invalid action. Must be "lock" or "unlock"' });
    }

    const newState = action === 'lock' ? 'locked' : 'unlocked';
    const result = state.setLockState(newState);
    
    // Log event
    await db.logEvent('lock', 'lock', action, result.old, result.new);
    
    // Publish MQTT command
    try {
      mqtt.publishCommand('lock', { state: newState });
    } catch (mqttError) {
      console.error('MQTT publish error:', mqttError);
    }
    
    res.json({ state: newState });
  } catch (error) {
    console.error('Lock control error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Control fan
router.post('/fan', async (req, res) => {
  try {
    const { mode, state: fanState } = req.body;
    
    if (!mode || !['auto', 'manual'].includes(mode)) {
      return res.status(400).json({ error: 'Invalid mode. Must be "auto" or "manual"' });
    }

    let newState = fanState;
    
    // If switching to auto mode, determine state automatically
    if (mode === 'auto') {
      newState = state.shouldFanBeOn() ? 'on' : 'off';
    } else {
      // Manual mode requires explicit state
      if (!fanState || !['on', 'off'].includes(fanState)) {
        return res.status(400).json({ error: 'Manual mode requires state "on" or "off"' });
      }
    }

    const result = state.setFanState(newState, mode);
    
    // Log event
    await db.logEvent('fan', 'fan', 'mode_change', JSON.stringify(result.old), JSON.stringify(result.new));
    
    // Publish MQTT command
    try {
      mqtt.publishCommand('fan', { state: newState, mode });
    } catch (mqttError) {
      console.error('MQTT publish error:', mqttError);
    }
    
    res.json(result.new);
  } catch (error) {
    console.error('Fan control error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Update climate thresholds
router.post('/climate', async (req, res) => {
  try {
    const { temp_high, humidity_high } = req.body;
    
    if (typeof temp_high !== 'number' || typeof humidity_high !== 'number') {
      return res.status(400).json({ error: 'temp_high and humidity_high must be numbers' });
    }

    const result = state.setThresholds(temp_high, humidity_high);
    
    // Log event
    await db.logEvent('climate', 'thresholds', 'update', JSON.stringify(result.old), JSON.stringify(result.new));
    
    // Publish MQTT command
    try {
      mqtt.publishCommand('climateConfig', { temp_high, humidity_high });
    } catch (mqttError) {
      console.error('MQTT publish error:', mqttError);
    }
    
    res.json(result.new);
  } catch (error) {
    console.error('Climate control error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get events
router.get('/events', async (req, res) => {
  try {
    const limit = parseInt(req.query.limit) || 100;
    const events = await db.getEvents(Math.min(limit, 1000)); // Cap at 1000
    res.json(events);
  } catch (error) {
    console.error('Get events error:', error);
    res.status(500).json({ error: 'Failed to get events' });
  }
});

// Get sensor data
router.get('/sensors', async (req, res) => {
  try {
    const { type, limit } = req.query;
    
    if (!type || !['temperature', 'humidity'].includes(type)) {
      return res.status(400).json({ error: 'Invalid sensor type. Must be "temperature" or "humidity"' });
    }

    const sensorLimit = parseInt(limit) || 1440;
    const sensors = await db.getSensorData(type, Math.min(sensorLimit, 10000)); // Cap at 10000
    res.json(sensors);
  } catch (error) {
    console.error('Get sensors error:', error);
    res.status(500).json({ error: 'Failed to get sensor data' });
  }
});

module.exports = router;