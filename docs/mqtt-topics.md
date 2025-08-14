# MQTT Topics and Message Schema

## Topic Structure
All topics use the configurable prefix (default: `house`) from the `MQTT_PREFIX` environment variable.

```
<prefix>/
├── rooms/
│   ├── <light_id>/
│   │   └── state           (retained)
├── fan/
│   └── state               (retained)
├── lock/
│   └── state               (retained)
├── sensors/
│   ├── temperature         (not retained)
│   └── humidity            (not retained)
└── command/
    ├── light/
    │   └── <light_id>      (commands)
    ├── fan                 (commands)
    ├── lock                (commands)
    └── climateConfig       (commands)
```

## State Topics (Published by ESP32)

### Light State
**Topic:** `house/rooms/<light_id>/state`
**Retained:** Yes
**Publisher:** ESP32
**Subscriber:** Backend

**Light IDs:**
- `light_living`
- `light_kitchen`
- `light_bedroom`
- `light_hall`

**Payload:**
```json
{
  "state": "on"
}
```
*Values: "on", "off"*

**Example:**
```
Topic: house/rooms/light_living/state
Payload: {"state":"off"}
```

### Fan State
**Topic:** `house/fan/state`
**Retained:** Yes
**Publisher:** ESP32
**Subscriber:** Backend

**Payload:**
```json
{
  "state": "off",
  "mode": "manual"
}
```
*State values: "on", "off"*
*Mode values: "auto", "manual"*

### Lock State
**Topic:** `house/lock/state`
**Retained:** Yes
**Publisher:** ESP32
**Subscriber:** Backend

**Payload:**
```json
{
  "state": "locked"
}
```
*Values: "locked", "unlocked"*

## Sensor Topics (Published by ESP32)

### Temperature
**Topic:** `house/sensors/temperature`
**Retained:** No
**Publisher:** ESP32
**Subscriber:** Backend
**Frequency:** Every 60 seconds (configurable)

**Payload:**
```json
{
  "value": 25.3
}
```

### Humidity
**Topic:** `house/sensors/humidity`
**Retained:** No
**Publisher:** ESP32
**Subscriber:** Backend
**Frequency:** Every 60 seconds (configurable)

**Payload:**
```json
{
  "value": 58.2
}
```

## Command Topics (Published by Backend)

### Light Commands
**Topic:** `house/command/light/<light_id>`
**Retained:** No
**Publisher:** Backend
**Subscriber:** ESP32

**Payload:**
```json
{
  "state": "on"
}
```

**Example:**
```
Topic: house/command/light/light_living
Payload: {"state":"on"}
```

### Fan Commands
**Topic:** `house/command/fan`
**Retained:** No
**Publisher:** Backend
**Subscriber:** ESP32

**Payload (Auto Mode):**
```json
{
  "mode": "auto"
}
```

**Payload (Manual Mode):**
```json
{
  "state": "on",
  "mode": "manual"
}
```

### Lock Commands
**Topic:** `house/command/lock`
**Retained:** No
**Publisher:** Backend
**Subscriber:** ESP32

**Payload:**
```json
{
  "state": "locked"
}
```

### Climate Configuration Commands
**Topic:** `house/command/climateConfig`
**Retained:** No
**Publisher:** Backend
**Subscriber:** ESP32

**Payload:**
```json
{
  "temp_high": 26.0,
  "humidity_high": 60.0
}
```

## Message Flow Examples

### User Toggles Light
1. **Frontend → Backend API:** `POST /api/light/light_living/toggle`
2. **Backend → MQTT:** 
   ```
   Topic: house/command/light/light_living
   Payload: {"state":"on"}
   ```
3. **ESP32 → MQTT:** 
   ```
   Topic: house/rooms/light_living/state (retained)
   Payload: {"state":"on"}
   ```
4. **Backend → WebSocket:** Real-time update to frontend

### ESP32 Sensor Reading
1. **ESP32 → MQTT:** 
   ```
   Topic: house/sensors/temperature
   Payload: {"value":25.3}
   ```
2. **Backend:** Store in database, update state
3. **Backend → WebSocket:** Real-time update to frontend
4. **Backend:** Check auto fan rules

### Fan Auto Mode Trigger
1. **Backend:** Detects temp > threshold from sensor data
2. **Backend → MQTT:** 
   ```
   Topic: house/command/fan
   Payload: {"state":"on","mode":"auto"}
   ```
3. **ESP32 → MQTT:** 
   ```
   Topic: house/fan/state (retained)
   Payload: {"state":"on","mode":"auto"}
   ```

## Quality of Service (QoS)
- **State Topics (Retained):** QoS 1 (At least once delivery)
- **Sensor Topics:** QoS 0 (At most once delivery)
- **Command Topics:** QoS 1 (At least once delivery)

## Retained Messages
State topics use retained messages to ensure:
- New clients receive last known state immediately
- State survives broker restarts
- Device states remain synchronized

## Error Handling
- Invalid JSON payloads are logged and ignored
- Missing required fields are handled gracefully
- Network disconnections trigger automatic reconnection
- Failed sensor readings (NaN) are not published

## Topic Naming Conventions
- Use lowercase with underscores for consistency
- Light IDs follow pattern: `light_<room_name>`
- Sensor types use descriptive names: `temperature`, `humidity`
- Commands use imperative verbs where applicable

## Adding New Device Types
To add a new device type (e.g., blinds):

1. **Add state topic:** `house/blinds/state`
2. **Add command topic:** `house/command/blinds`
3. **Update ESP32 firmware:** Subscribe to commands, publish states
4. **Update backend:** Handle new MQTT messages
5. **Update frontend:** Add UI controls

## MQTT Broker Configuration
Recommended Mosquitto configuration:
```
# Allow anonymous connections for demo
allow_anonymous true

# Persistence for retained messages
persistence true
persistence_location /var/lib/mosquitto/

# Logging
log_dest file /var/log/mosquitto/mosquitto.log
log_type all

# Connection limits
max_connections -1
max_queued_messages 1000
```