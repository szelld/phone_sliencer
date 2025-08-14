const config = require('./config');

// In-memory state
const state = {
  lights: {
    light_living: { id: 'light_living', state: 'off' },
    light_kitchen: { id: 'light_kitchen', state: 'off' },
    light_bedroom: { id: 'light_bedroom', state: 'off' },
    light_hall: { id: 'light_hall', state: 'off' }
  },
  fan: {
    state: 'off',
    mode: 'manual'
  },
  lock: {
    state: 'locked'
  },
  sensors: {
    temperature: null,
    humidity: null
  },
  thresholds: {
    temp_high: config.thresholds.tempHigh,
    humidity_high: config.thresholds.humidityHigh
  }
};

function getState() {
  return JSON.parse(JSON.stringify(state));
}

function getLightState(lightId) {
  return state.lights[lightId] ? { ...state.lights[lightId] } : null;
}

function setLightState(lightId, newState) {
  if (state.lights[lightId]) {
    const oldState = state.lights[lightId].state;
    state.lights[lightId].state = newState;
    return { old: oldState, new: newState };
  }
  return null;
}

function getFanState() {
  return { ...state.fan };
}

function setFanState(newState, mode) {
  const oldState = { ...state.fan };
  if (newState !== undefined) state.fan.state = newState;
  if (mode !== undefined) state.fan.mode = mode;
  return { old: oldState, new: { ...state.fan } };
}

function getLockState() {
  return { ...state.lock };
}

function setLockState(newState) {
  const oldState = state.lock.state;
  state.lock.state = newState;
  return { old: oldState, new: newState };
}

function setSensorValue(type, value) {
  const oldValue = state.sensors[type];
  state.sensors[type] = value;
  return { old: oldValue, new: value };
}

function getSensorValue(type) {
  return state.sensors[type];
}

function setThresholds(tempHigh, humidityHigh) {
  const oldThresholds = { ...state.thresholds };
  if (tempHigh !== undefined) state.thresholds.temp_high = tempHigh;
  if (humidityHigh !== undefined) state.thresholds.humidity_high = humidityHigh;
  return { old: oldThresholds, new: { ...state.thresholds } };
}

function getThresholds() {
  return { ...state.thresholds };
}

// Helper to check if fan should be auto-controlled
function shouldFanBeOn() {
  const temp = state.sensors.temperature;
  const humidity = state.sensors.humidity;
  const thresholds = state.thresholds;
  
  if (temp === null || humidity === null) return false;
  
  return temp > thresholds.temp_high || humidity > thresholds.humidity_high;
}

function shouldFanBeOff() {
  const temp = state.sensors.temperature;
  const humidity = state.sensors.humidity;
  const thresholds = state.thresholds;
  
  if (temp === null || humidity === null) return true;
  
  // Hysteresis: turn off only when both conditions are below threshold minus hysteresis
  return temp < (thresholds.temp_high - 0.5) && humidity < (thresholds.humidity_high - 2);
}

module.exports = {
  getState,
  getLightState,
  setLightState,
  getFanState,
  setFanState,
  getLockState,
  setLockState,
  setSensorValue,
  getSensorValue,
  setThresholds,
  getThresholds,
  shouldFanBeOn,
  shouldFanBeOff
};