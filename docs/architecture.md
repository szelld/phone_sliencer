# Smart House Demo Architecture

## Overview
This smart house demo project demonstrates a complete IoT system with ESP32 firmware, MQTT communication, Node.js backend, and a web frontend. The system controls lights, a fan, and a door lock while monitoring temperature and humidity.

## System Components

### 1. ESP32 Firmware
- **Framework**: Arduino (PlatformIO)
- **Language**: C++
- **Responsibilities**:
  - Control 4 room lights (GPIO outputs)
  - Control fan via transistor/MOSFET
  - Control servo lock mechanism
  - Read DHT22 temperature/humidity sensor
  - Communicate via MQTT
  - Handle automatic fan control with hysteresis

### 2. MQTT Broker
- **Implementation**: Mosquitto
- **Purpose**: Message broker for pub/sub communication
- **Features**:
  - Retained messages for device states
  - Command topics for device control
  - Sensor data topics for readings

### 3. Node.js Backend
- **Framework**: Express.js
- **Language**: JavaScript
- **Responsibilities**:
  - MQTT ↔ WebSocket bridge
  - REST API for device control
  - JWT authentication
  - SQLite data persistence
  - Real-time WebSocket communication

### 4. Web Frontend
- **Technology**: Plain HTML/CSS/JavaScript
- **Features**:
  - Interactive SVG floor plan
  - Real-time sensor monitoring
  - Device control interface
  - Event logging
  - Responsive design

### 5. Database
- **Type**: SQLite
- **Tables**:
  - `events`: System events and state changes
  - `sensors`: Temperature and humidity readings

## Architecture Diagram (ASCII)

```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│                 │    │                 │    │                 │
│   Web Browser   │◄──►│   Node.js       │◄──►│   MQTT Broker   │
│   (Frontend)    │    │   Backend       │    │   (Mosquitto)   │
│                 │    │                 │    │                 │
└─────────────────┘    └─────────────────┘    └─────────────────┘
                              │                         ▲
                              ▼                         │
                       ┌─────────────────┐              │
                       │                 │              │
                       │   SQLite DB     │              │
                       │   (Events +     │              │
                       │   Sensors)      │              │
                       │                 │              │
                       └─────────────────┘              │
                                                        │
                                                        ▼
                                              ┌─────────────────┐
                                              │                 │
                                              │   ESP32         │
                                              │   Firmware      │
                                              │                 │
                                              └─────────────────┘
                                                        │
                                                        ▼
                                              ┌─────────────────┐
                                              │   Physical      │
                                              │   Devices:      │
                                              │   • Lights      │
                                              │   • Fan         │
                                              │   • Lock        │
                                              │   • Sensors     │
                                              └─────────────────┘
```

## Communication Flow

### 1. Device Control Flow
1. User interacts with web frontend
2. Frontend sends REST API request to backend
3. Backend validates JWT token
4. Backend updates internal state
5. Backend publishes MQTT command message
6. ESP32 receives MQTT message
7. ESP32 executes hardware action
8. ESP32 publishes updated state (retained)
9. Backend receives state update
10. Backend broadcasts to WebSocket clients
11. Frontend updates UI in real-time

### 2. Sensor Data Flow
1. ESP32 reads sensor data (every 60s)
2. ESP32 publishes sensor data via MQTT
3. Backend receives sensor data
4. Backend stores data in SQLite
5. Backend updates internal state
6. Backend broadcasts to WebSocket clients
7. Frontend displays live sensor data
8. Backend checks automatic fan control rules

## Key Features

### Automatic Fan Control
- **Trigger**: Temperature > threshold OR humidity > threshold
- **Hysteresis**: 
  - Turn ON: temp > temp_high OR humidity > humidity_high
  - Turn OFF: temp < (temp_high - 0.5) AND humidity < (humidity_high - 2)

### State Persistence
- All device states published as retained MQTT messages
- State survives broker/device restarts
- Database logging for events and sensor history

### Security
- JWT-based authentication (1-hour expiry)
- Bcrypt password hashing
- Protected API endpoints

### Real-time Updates
- WebSocket connection for live UI updates
- MQTT retained messages for state synchronization
- Event logging for audit trail

## Scalability Considerations

### Adding New Rooms/Lights
1. Update ESP32 firmware pin definitions
2. Add light IDs to state management
3. Update SVG floor plan
4. No backend code changes required

### Adding New Sensors
1. Update ESP32 firmware
2. Add sensor types to state management
3. Update database schema if needed
4. Add UI components in frontend

## Deployment Architecture
- Single-host deployment for demo
- MQTT broker runs as system service
- Node.js backend as application service
- Frontend served as static files
- SQLite database as local file