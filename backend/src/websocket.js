const WebSocket = require('ws');
const state = require('./state');

let wss = null;
const clients = new Set();

function initWebSocket(server) {
  wss = new WebSocket.Server({ server });

  wss.on('connection', (ws) => {
    console.log('WebSocket client connected');
    clients.add(ws);

    // Send initial state snapshot
    const snapshot = {
      type: 'snapshot',
      state: state.getState()
    };
    
    try {
      ws.send(JSON.stringify(snapshot));
    } catch (error) {
      console.error('Error sending snapshot:', error);
    }

    ws.on('close', () => {
      console.log('WebSocket client disconnected');
      clients.delete(ws);
    });

    ws.on('error', (error) => {
      console.error('WebSocket error:', error);
      clients.delete(ws);
    });
  });

  console.log('WebSocket server initialized');
}

function broadcast(message) {
  const messageStr = JSON.stringify(message);
  
  clients.forEach((ws) => {
    if (ws.readyState === WebSocket.OPEN) {
      try {
        ws.send(messageStr);
      } catch (error) {
        console.error('Error broadcasting to client:', error);
        clients.delete(ws);
      }
    } else {
      clients.delete(ws);
    }
  });
}

function broadcastLightUpdate(lightId, lightState) {
  broadcast({
    type: 'update',
    entity: 'light',
    id: lightId,
    state: lightState
  });
}

function broadcastFanUpdate(fanState) {
  broadcast({
    type: 'update',
    entity: 'fan',
    state: fanState.state,
    mode: fanState.mode
  });
}

function broadcastLockUpdate(lockState) {
  broadcast({
    type: 'update',
    entity: 'lock',
    state: lockState
  });
}

function broadcastSensorUpdate(sensorType, value) {
  broadcast({
    type: 'sensor',
    sensor: sensorType,
    value: value,
    ts: Date.now()
  });
}

function broadcastEvent(event) {
  broadcast({
    type: 'event',
    ...event
  });
}

module.exports = {
  initWebSocket,
  broadcast,
  broadcastLightUpdate,
  broadcastFanUpdate,
  broadcastLockUpdate,
  broadcastSensorUpdate,
  broadcastEvent
};