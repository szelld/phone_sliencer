const mqtt = require('mqtt');
const config = require('./config');
const state = require('./state');
const db = require('./db');
const websocket = require('./websocket');

let client = null;

function initMQTT() {
  client = mqtt.connect(config.mqtt.brokerUrl);

  client.on('connect', () => {
    console.log('Connected to MQTT broker');
    
    // Subscribe to command topics
    const topics = [
      `${config.mqtt.prefix}/command/light/+`,
      `${config.mqtt.prefix}/command/fan`,
      `${config.mqtt.prefix}/command/lock`,
      `${config.mqtt.prefix}/command/climateConfig`
    ];

    topics.forEach(topic => {
      client.subscribe(topic, (err) => {
        if (err) {
          console.error(`Error subscribing to ${topic}:`, err);
        } else {
          console.log(`Subscribed to ${topic}`);
        }
      });
    });

    // Publish current states as retained messages
    publishCurrentStates();
  });

  client.on('message', (topic, message) => {
    try {
      handleMQTTMessage(topic, message.toString());
    } catch (error) {
      console.error('Error handling MQTT message:', error);
    }
  });

  client.on('error', (error) => {
    console.error('MQTT connection error:', error);
  });

  client.on('offline', () => {
    console.log('MQTT client offline');
  });

  client.on('reconnect', () => {
    console.log('MQTT client reconnecting...');
  });

  return client;
}

function handleMQTTMessage(topic, message) {
  const prefix = config.mqtt.prefix;
  
  if (topic.startsWith(`${prefix}/command/light/`)) {
    const lightId = topic.split('/').pop();
    handleLightCommand(lightId, message);
  } else if (topic === `${prefix}/command/fan`) {
    handleFanCommand(message);
  } else if (topic === `${prefix}/command/lock`) {
    handleLockCommand(message);
  } else if (topic === `${prefix}/command/climateConfig`) {
    handleClimateConfigCommand(message);
  } else if (topic.startsWith(`${prefix}/sensors/`)) {
    const sensorType = topic.split('/').pop();
    handleSensorData(sensorType, message);
  } else if (topic.startsWith(`${prefix}/rooms/`)) {
    // Handle state updates from ESP32
    handleStateUpdate(topic, message);
  }
}

function handleLightCommand(lightId, message) {
  try {
    const command = JSON.parse(message);
    const result = state.setLightState(lightId, command.state);
    
    if (result) {
      db.logEvent('light', lightId, 'toggle', result.old, result.new);
      websocket.broadcastLightUpdate(lightId, command.state);
      publishLightState(lightId, command.state);
    }
  } catch (error) {
    console.error('Error handling light command:', error);
  }
}

function handleFanCommand(message) {
  try {
    const command = JSON.parse(message);
    const result = state.setFanState(command.state, command.mode);
    
    db.logEvent('fan', 'fan', 'change', JSON.stringify(result.old), JSON.stringify(result.new));
    websocket.broadcastFanUpdate(result.new);
    publishFanState(result.new);
  } catch (error) {
    console.error('Error handling fan command:', error);
  }
}

function handleLockCommand(message) {
  try {
    const command = JSON.parse(message);
    const result = state.setLockState(command.state);
    
    db.logEvent('lock', 'lock', command.state, result.old, result.new);
    websocket.broadcastLockUpdate(result.new);
    publishLockState(result.new);
  } catch (error) {
    console.error('Error handling lock command:', error);
  }
}

function handleClimateConfigCommand(message) {
  try {
    const command = JSON.parse(message);
    state.setThresholds(command.temp_high, command.humidity_high);
    console.log('Climate thresholds updated:', command);
  } catch (error) {
    console.error('Error handling climate config command:', error);
  }
}

function handleSensorData(sensorType, message) {
  try {
    const data = JSON.parse(message);
    const value = data.value;
    
    if (typeof value === 'number' && !isNaN(value)) {
      state.setSensorValue(sensorType, value);
      db.logSensor(sensorType, value);
      websocket.broadcastSensorUpdate(sensorType, value);
      
      // Check fan auto mode
      checkFanAutoMode();
    }
  } catch (error) {
    console.error('Error handling sensor data:', error);
  }
}

function handleStateUpdate(topic, message) {
  // Handle state updates from ESP32 (e.g., when ESP32 publishes current states)
  try {
    const parts = topic.split('/');
    if (parts.length >= 3) {
      const entityType = parts[parts.length - 2]; // rooms, fan, lock
      const entityId = parts[parts.length - 1]; // light_id or state
      
      const data = JSON.parse(message);
      
      if (entityType === 'rooms' && entityId === 'state') {
        // Light state update
        const lightId = parts[parts.length - 3];
        state.setLightState(lightId, data.state);
        websocket.broadcastLightUpdate(lightId, data.state);
      }
    }
  } catch (error) {
    console.error('Error handling state update:', error);
  }
}

function checkFanAutoMode() {
  const fanState = state.getFanState();
  
  if (fanState.mode === 'auto') {
    const currentState = fanState.state;
    let newState = currentState;
    
    if (currentState === 'off' && state.shouldFanBeOn()) {
      newState = 'on';
    } else if (currentState === 'on' && state.shouldFanBeOff()) {
      newState = 'off';
    }
    
    if (newState !== currentState) {
      const result = state.setFanState(newState, 'auto');
      db.logEvent('fan', 'fan', 'auto_change', result.old.state, result.new.state);
      websocket.broadcastFanUpdate(result.new);
      publishFanState(result.new);
    }
  }
}

function publishCurrentStates() {
  if (!client || !client.connected) return;
  
  const currentState = state.getState();
  
  // Publish light states
  Object.values(currentState.lights).forEach(light => {
    publishLightState(light.id, light.state);
  });
  
  // Publish fan state
  publishFanState(currentState.fan);
  
  // Publish lock state
  publishLockState(currentState.lock.state);
}

function publishLightState(lightId, lightState) {
  if (!client || !client.connected) return;
  
  const topic = `${config.mqtt.prefix}/rooms/${lightId}/state`;
  const payload = JSON.stringify({ state: lightState });
  
  client.publish(topic, payload, { retain: true }, (err) => {
    if (err) {
      console.error(`Error publishing light state for ${lightId}:`, err);
    }
  });
}

function publishFanState(fanState) {
  if (!client || !client.connected) return;
  
  const topic = `${config.mqtt.prefix}/fan/state`;
  const payload = JSON.stringify({ state: fanState.state, mode: fanState.mode });
  
  client.publish(topic, payload, { retain: true }, (err) => {
    if (err) {
      console.error('Error publishing fan state:', err);
    }
  });
}

function publishLockState(lockState) {
  if (!client || !client.connected) return;
  
  const topic = `${config.mqtt.prefix}/lock/state`;
  const payload = JSON.stringify({ state: lockState });
  
  client.publish(topic, payload, { retain: true }, (err) => {
    if (err) {
      console.error('Error publishing lock state:', err);
    }
  });
}

function publishCommand(topic, command) {
  if (!client || !client.connected) {
    throw new Error('MQTT client not connected');
  }
  
  const fullTopic = `${config.mqtt.prefix}/command/${topic}`;
  client.publish(fullTopic, JSON.stringify(command));
}

module.exports = {
  initMQTT,
  publishCommand,
  publishLightState,
  publishFanState,
  publishLockState
};