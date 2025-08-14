# Sequence Diagram: Toggle Light

This document describes the sequence of events when a user toggles a light in the smart house system.

## Participants
- **User**: Person interacting with the web interface
- **Frontend**: Web browser application
- **Backend**: Node.js server with Express API
- **MQTT**: Mosquitto message broker
- **ESP32**: Microcontroller with sensors and actuators
- **Database**: SQLite database for event logging

## Sequence Flow

```
User       Frontend    Backend     MQTT       ESP32      Database
 │           │           │           │          │          │
 │  Click    │           │           │          │          │
 │  Room  ──►│           │           │          │          │
 │           │           │           │          │          │
 │           │  POST     │           │          │          │
 │           │  /api/    │           │          │          │
 │           │  light/   │           │          │          │
 │           │  living/  │           │          │          │
 │           │  toggle ──►│           │          │          │
 │           │           │           │          │          │
 │           │           │  Verify   │          │          │
 │           │           │  JWT      │          │          │
 │           │           │  Token    │          │          │
 │           │           │           │          │          │
 │           │           │  Update   │          │          │
 │           │           │  State    │          │          │
 │           │           │  (off→on) │          │          │
 │           │           │           │          │          │
 │           │           │  Log      │          │          │
 │           │           │  Event  ──┼──────────┼─────────►│
 │           │           │           │          │          │
 │           │           │  Publish  │          │          │
 │           │           │  Command ─►│          │          │
 │           │           │           │          │          │
 │           │           │           │ house/   │          │
 │           │           │           │ command/ │          │
 │           │           │           │ light/   │          │
 │           │           │           │ living   │          │
 │           │           │           │ {"state" │          │
 │           │           │           │ :"on"}  ─►│          │
 │           │           │           │          │          │
 │           │           │           │          │  Parse   │
 │           │           │           │          │  JSON    │
 │           │           │           │          │  Command │
 │           │           │           │          │          │
 │           │           │           │          │  Set     │
 │           │           │           │          │  GPIO    │
 │           │           │           │          │  HIGH    │
 │           │           │           │          │  (Light  │
 │           │           │           │          │  ON)     │
 │           │           │           │          │          │
 │           │           │           │          │  Publish │
 │           │           │           │ house/   │  State   │
 │           │           │           │ rooms/   │  Update  │
 │           │           │           │ living/  │          │
 │           │           │           │ state    │          │
 │           │           │           │ {"state" │          │
 │           │           │           │ :"on"}   │          │
 │           │           │           │ (retained)◄─────────│
 │           │           │           │          │          │
 │           │           │  Receive  │          │          │
 │           │           │  State   ◄│          │          │
 │           │           │  Update   │          │          │
 │           │           │           │          │          │
 │           │           │  Update   │          │          │
 │           │           │  Internal │          │          │
 │           │           │  State    │          │          │
 │           │           │           │          │          │
 │           │           │  WebSocket│          │          │
 │           │  Real-time │  Broadcast│          │          │
 │           │  Update   ◄│           │          │          │
 │           │  {"type": │           │          │          │
 │           │  "update",│           │          │          │
 │           │  "entity":│           │          │          │
 │           │  "light", │           │          │          │
 │           │  "id":    │           │          │          │
 │           │  "living",│           │          │          │
 │           │  "state": │           │          │          │
 │           │  "on"}    │           │          │          │
 │           │           │           │          │          │
 │  Visual   │  Update   │           │          │          │
 │  Light    │  SVG Room │           │          │          │
 │  On      ◄│  Highlight│           │          │          │
 │  Feedback │  & Light  │           │          │          │
 │           │  Indicator│           │          │          │
 │           │           │           │          │          │
```

## Step-by-Step Description

### 1. User Interaction
- User clicks on a room in the SVG floor plan
- Frontend captures the click event and identifies the light ID

### 2. API Request
- Frontend sends POST request to `/api/light/:id/toggle`
- Request includes JWT token in Authorization header

### 3. Backend Processing
- Backend validates JWT token
- Retrieves current light state from memory
- Determines new state (toggle: off → on or on → off)
- Updates internal state

### 4. Event Logging
- Backend logs the event to SQLite database
- Event includes timestamp, category, target, action, old state, new state

### 5. MQTT Command Publishing
- Backend publishes command message to MQTT broker
- Topic: `house/command/light/<light_id>`
- Payload: `{"state": "on"}` or `{"state": "off"}`

### 6. ESP32 Processing
- ESP32 receives MQTT message on subscribed command topic
- Parses JSON payload to extract desired state
- Controls GPIO pin (HIGH for on, LOW for off)
- Physical light turns on/off

### 7. ESP32 State Confirmation
- ESP32 publishes current state to MQTT broker
- Topic: `house/rooms/<light_id>/state`
- Payload: `{"state": "on"}` 
- Message is published with retain flag for persistence

### 8. Backend State Synchronization
- Backend receives state update message from ESP32
- Updates internal state to match hardware state
- Ensures backend and ESP32 are synchronized

### 9. Real-time Frontend Update
- Backend broadcasts state change via WebSocket
- All connected web clients receive update message
- Frontend updates UI without page refresh

### 10. Visual Feedback
- SVG room highlighting changes (adds `.on` class)
- Light indicator icon changes appearance
- User sees immediate visual confirmation

## Timing Considerations
- **API Response**: ~50-100ms (local network)
- **MQTT Publish**: ~10-50ms (local broker)
- **ESP32 Processing**: ~5-20ms
- **GPIO Response**: ~1ms (nearly instantaneous)
- **State Confirmation**: ~10-50ms (MQTT publish back)
- **WebSocket Update**: ~5-20ms
- **UI Update**: ~1-5ms (DOM manipulation)

**Total End-to-End**: ~100-250ms from click to visual feedback

## Error Handling Scenarios

### Network Disconnection
```
User → Frontend → Backend → MQTT → X (ESP32 offline)
                          ↓
                    WebSocket update shows "connection lost"
                    Automatic reconnection attempts
```

### Invalid JWT Token
```
User → Frontend → Backend (401 Unauthorized)
                     ↓
               Redirect to login
```

### MQTT Broker Down
```
User → Frontend → Backend → X (MQTT offline)
                     ↓
               API returns error
               WebSocket shows connection status
```

### Hardware Failure
```
ESP32 receives command but GPIO fails
ESP32 doesn't publish state confirmation
Backend waits briefly, then may retry or log error
```

## Reliability Features
- **Retained Messages**: State survives broker restarts
- **JWT Expiry**: Automatic session management
- **WebSocket Reconnection**: Handles connection drops
- **MQTT QoS**: Ensures message delivery
- **Error Logging**: All failures are logged for debugging