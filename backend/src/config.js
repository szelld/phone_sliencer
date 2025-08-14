const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../../.env') });

module.exports = {
  mqtt: {
    brokerUrl: process.env.BROKER_URL || 'mqtt://localhost:1883',
    prefix: process.env.MQTT_PREFIX || 'house'
  },
  jwt: {
    secret: process.env.JWT_SECRET || 'change_this_secret',
    expiresIn: '1h'
  },
  admin: {
    username: process.env.ADMIN_USER || 'admin',
    passwordHash: process.env.ADMIN_PASS_HASH || '$2b$10$TBINLoSw7VLxw8103lDia.Mi0dUT0o8rk19hZKOdXi08orsB6Y.4e'
  },
  database: {
    file: process.env.DB_FILE || 'house.db'
  },
  sensor: {
    intervalMs: parseInt(process.env.SENSOR_INTERVAL_MS) || 60000
  },
  thresholds: {
    tempHigh: parseFloat(process.env.TEMP_HIGH) || 26.0,
    humidityHigh: parseFloat(process.env.HUMIDITY_HIGH) || 60.0
  },
  server: {
    port: parseInt(process.env.PORT) || 3000
  }
};