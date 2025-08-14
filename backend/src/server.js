const express = require('express');
const http = require('http');
const path = require('path');
const cors = require('cors');

const config = require('./config');
const db = require('./db');
const state = require('./state');
const websocket = require('./websocket');
const mqtt = require('./mqtt');
const apiRoutes = require('./api');

async function startServer() {
  try {
    console.log('Starting Smart House Backend Server...');

    // Initialize database
    await db.initDatabase();
    
    // Initialize state thresholds from config
    state.setThresholds(config.thresholds.tempHigh, config.thresholds.humidityHigh);

    // Create Express app
    const app = express();
    const server = http.createServer(app);

    // Middleware
    app.use(cors());
    app.use(express.json());
    app.use(express.urlencoded({ extended: true }));

    // API routes
    app.use('/api', apiRoutes);

    // Serve static files (frontend)
    const frontendPath = path.join(__dirname, '../../frontend');
    app.use(express.static(frontendPath));

    // Serve frontend for any non-API routes
    app.get('*', (req, res) => {
      if (!req.path.startsWith('/api')) {
        res.sendFile(path.join(frontendPath, 'index.html'));
      } else {
        res.status(404).json({ error: 'API endpoint not found' });
      }
    });

    // Error handling middleware
    app.use((error, req, res, next) => {
      console.error('Unhandled error:', error);
      res.status(500).json({ error: 'Internal server error' });
    });

    // Initialize WebSocket server
    websocket.initWebSocket(server);

    // Initialize MQTT client
    mqtt.initMQTT();

    // Start HTTP server
    const port = config.server.port;
    server.listen(port, () => {
      console.log(`Server running on port ${port}`);
      console.log(`Frontend available at: http://localhost:${port}`);
      console.log(`API available at: http://localhost:${port}/api`);
    });

    // Graceful shutdown
    process.on('SIGTERM', () => {
      console.log('Received SIGTERM, shutting down gracefully');
      server.close(() => {
        console.log('HTTP server closed');
        process.exit(0);
      });
    });

    process.on('SIGINT', () => {
      console.log('Received SIGINT, shutting down gracefully');
      server.close(() => {
        console.log('HTTP server closed');
        process.exit(0);
      });
    });

  } catch (error) {
    console.error('Failed to start server:', error);
    process.exit(1);
  }
}

// Start the server
startServer();