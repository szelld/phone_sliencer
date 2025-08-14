# Smart House Demo Project 🏠

A complete IoT smart home demonstration system featuring ESP32 firmware, MQTT communication, Node.js backend, and responsive web interface. Control lights, monitor sensors, manage fan and lock automation - all in real-time!

## Overview

This project demonstrates a miniature smart house system with:
- **4 controllable room lights** (Living, Kitchen, Bedroom, Hall)
- **Temperature & humidity monitoring** (DHT22 sensor)
- **Automated fan control** with hysteresis-based climate rules
- **Door lock control** via servo mechanism
- **Real-time web dashboard** with interactive floor plan
- **Event logging** and sensor data persistence

## Features

### 🏠 Smart Home Controls
- Interactive SVG floor plan with clickable rooms
- Real-time light control with visual feedback
- Automatic fan control based on temperature/humidity
- Manual lock/unlock controls with status indication

### 📊 Monitoring & Data
- Live temperature and humidity readings
- Historical sensor data storage (SQLite)
- Event logging for all device state changes
- Real-time WebSocket updates

### 🔒 Security & Authentication
- JWT-based authentication system
- Bcrypt password hashing
- Protected API endpoints
- Session management with automatic expiry

### 🌐 Architecture
- **ESP32 Firmware**: Arduino C++ with MQTT communication
- **Backend**: Node.js with Express, WebSocket, and MQTT
- **Frontend**: Vanilla HTML/CSS/JS (no build step required)
- **Database**: SQLite for events and sensor history
- **Messaging**: MQTT with retained state messages

## Quick Start

### Prerequisites
- Node.js 16+ installed
- Mosquitto MQTT broker running
- ESP32 development board (for hardware)
- PlatformIO for firmware development

### 1. Setup Backend
```bash
# Clone the repository
git clone https://github.com/szelld/phone_sliencer.git
cd phone_sliencer

# Setup environment
cp config/sample.env .env
# Edit .env with your MQTT broker details

# Install dependencies
cd backend
npm install

# Initialize database
npm run migrate
npm run seed

# Start the server
npm run dev
```

### 2. Start MQTT Broker
```bash
# Install Mosquitto (Ubuntu/Debian)
sudo apt-get install mosquitto mosquitto-clients

# Start the broker
mosquitto -v
```

### 3. Flash ESP32 Firmware
```bash
# Install PlatformIO
pip install platformio

# Navigate to firmware directory
cd firmware

# Update Wi-Fi credentials in src/main.cpp
# Update MQTT broker IP address

# Build and upload
pio run --target upload --target monitor
```

### 4. Access Dashboard
Open your browser and navigate to:
```
http://localhost:3000
```

**Login credentials:**
- Username: `admin`
- Password: `admin123`

## Configuration

### Environment Variables (.env)
```bash
BROKER_URL=mqtt://localhost:1883    # MQTT broker URL
MQTT_PREFIX=house                   # Topic prefix
JWT_SECRET=your_secret_key          # JWT signing secret
ADMIN_USER=admin                    # Admin username
ADMIN_PASS_HASH=bcrypt_hash         # Bcrypt password hash
DB_FILE=house.db                    # SQLite database file
SENSOR_INTERVAL_MS=60000            # Sensor reading interval
TEMP_HIGH=26.0                      # Temperature threshold (°C)
HUMIDITY_HIGH=60.0                  # Humidity threshold (%)
```

### Generate Password Hash
```bash
cd backend/src/utils
node password.js your_new_password
```

## Running the System

### Development Mode
```bash
# Terminal 1: Start MQTT broker
mosquitto -v

# Terminal 2: Start backend
cd backend
npm run dev

# Terminal 3: Flash and monitor ESP32
cd firmware
pio run --target upload --target monitor
```

### Production Mode
```bash
# Start backend
cd backend
npm start

# Setup system service for auto-start
sudo systemctl enable mosquitto
```

## Architecture Summary

```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   Web Browser   │◄──►│   Node.js       │◄──►│   MQTT Broker   │
│   (Frontend)    │    │   Backend       │    │   (Mosquitto)   │
└─────────────────┘    └─────────────────┘    └─────────────────┘
                              │                         ▲
                              ▼                         │
                       ┌─────────────────┐              │
                       │   SQLite DB     │              │
                       │   (Events +     │              │
                       │   Sensors)      │              │
                       └─────────────────┘              │
                                                        │
                                                        ▼
                                              ┌─────────────────┐
                                              │   ESP32 +       │
                                              │   Sensors +     │
                                              │   Actuators     │
                                              └─────────────────┘
```

## Adding a New Room/Light

### 1. Update ESP32 Firmware
```cpp
// Add pin definition
#define LIGHT_NEWROOM_PIN   21

// Add to arrays
const char* lightIds[] = {"light_living", "light_kitchen", "light_bedroom", "light_hall", "light_newroom"};
const int lightPins[] = {LIGHT_LIVING_PIN, LIGHT_KITCHEN_PIN, LIGHT_BEDROOM_PIN, LIGHT_HALL_PIN, LIGHT_NEWROOM_PIN};
bool lightStates[5] = {false, false, false, false, false}; // Update array size
```

### 2. Update Backend State
```javascript
// In backend/src/state.js
lights: {
  light_living: { id: 'light_living', state: 'off' },
  light_kitchen: { id: 'light_kitchen', state: 'off' },
  light_bedroom: { id: 'light_bedroom', state: 'off' },
  light_hall: { id: 'light_hall', state: 'off' },
  light_newroom: { id: 'light_newroom', state: 'off' }  // Add this
}
```

### 3. Update SVG Floor Plan
```xml
<!-- Add room rectangle -->
<rect x="750" y="300" width="200" height="200" fill="#f0e6ff" stroke="#333" stroke-width="2" 
      data-light="light_newroom" class="room" id="newroom"/>
<text x="850" y="400" text-anchor="middle" font-family="Arial" font-size="16" font-weight="bold">
  New Room
</text>

<!-- Add light indicator -->
<circle cx="850" cy="350" r="8" class="light-indicator" data-light="light_newroom" fill="#ffff99"/>
```

No backend API or database changes required!

## API Endpoints

### Authentication
- `POST /api/login` - User authentication

### Device Control
- `GET /api/state` - Get complete system state
- `POST /api/light/:id/toggle` - Toggle room light
- `POST /api/lock` - Control door lock
- `POST /api/fan` - Control fan mode/state
- `POST /api/climate` - Update thresholds

### Data Retrieval
- `GET /api/events` - Get event history
- `GET /api/sensors` - Get sensor data history

See [API Documentation](docs/api.md) for detailed examples.

## MQTT Topics

### State Topics (Retained)
- `house/rooms/<light_id>/state` - Light states
- `house/fan/state` - Fan state and mode
- `house/lock/state` - Door lock state

### Sensor Topics
- `house/sensors/temperature` - Temperature readings
- `house/sensors/humidity` - Humidity readings

### Command Topics
- `house/command/light/<light_id>` - Light commands
- `house/command/fan` - Fan commands
- `house/command/lock` - Lock commands

See [MQTT Topics Documentation](docs/mqtt-topics.md) for complete schema.

## Security Notes

### Current Implementation
- JWT tokens expire after 1 hour
- Passwords stored as bcrypt hashes
- No rate limiting implemented
- MQTT broker allows anonymous connections

### Production Recommendations
- Enable MQTT authentication and TLS
- Implement API rate limiting
- Use HTTPS for web interface
- Add user management system
- Implement device authentication
- Regular security updates

## Troubleshooting

### Backend Issues
```bash
# Check if MQTT broker is running
mosquitto_pub -h localhost -t test -m "hello"

# Verify database
sqlite3 house.db ".tables"

# Check logs
npm run dev  # Shows detailed logging
```

### ESP32 Issues
```bash
# Monitor serial output
pio device monitor

# Check Wi-Fi connection
# Check MQTT broker IP in firmware

# Verify topic subscriptions in broker logs
```

### Frontend Issues
- Check browser console for JavaScript errors
- Verify WebSocket connection status
- Ensure backend is running on correct port

## Next Steps & Future Enhancements

### Immediate Improvements
- [ ] Add device status health checks
- [ ] Implement user preference storage
- [ ] Add mobile-responsive design improvements
- [ ] Include unit tests for core functionality

### Advanced Features
- [ ] Multi-user support with role-based access
- [ ] Voice control integration (Alexa/Google Home)
- [ ] Mobile app development (React Native/Flutter)
- [ ] Advanced automation rules engine
- [ ] Energy usage monitoring
- [ ] Integration with weather APIs
- [ ] Security camera feeds
- [ ] Motion sensor integration

### Scalability Enhancements
- [ ] Docker containerization
- [ ] Kubernetes deployment
- [ ] Redis for session management
- [ ] PostgreSQL for larger datasets
- [ ] Load balancing for multiple instances
- [ ] Microservices architecture

## Contributing

We welcome contributions! Please feel free to submit issues and enhancement requests.

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.
