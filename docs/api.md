# API Documentation

## Base URL
`http://localhost:3000/api`

## Authentication
All endpoints except `/login` require JWT authentication via the `Authorization` header:
```
Authorization: Bearer <jwt_token>
```

JWT tokens expire after 1 hour and must be renewed by logging in again.

## Endpoints

### 1. Authentication

#### POST /login
Authenticate user and receive JWT token.

**Request:**
```json
{
  "username": "admin",
  "password": "admin123"
}
```

**Response (200):**
```json
{
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "user": {
    "username": "admin",
    "role": "admin"
  }
}
```

**Response (401):**
```json
{
  "error": "Invalid credentials"
}
```

### 2. State Management

#### GET /state
Get complete system state snapshot.

**Response (200):**
```json
{
  "lights": {
    "light_living": { "id": "light_living", "state": "off" },
    "light_kitchen": { "id": "light_kitchen", "state": "on" },
    "light_bedroom": { "id": "light_bedroom", "state": "off" },
    "light_hall": { "id": "light_hall", "state": "off" }
  },
  "fan": {
    "state": "on",
    "mode": "auto"
  },
  "lock": {
    "state": "locked"
  },
  "sensors": {
    "temperature": 25.3,
    "humidity": 58.2
  },
  "thresholds": {
    "temp_high": 26.0,
    "humidity_high": 60.0
  }
}
```

### 3. Light Control

#### POST /light/:id/toggle
Toggle a specific light on/off.

**Parameters:**
- `id`: Light ID (light_living, light_kitchen, light_bedroom, light_hall)

**Response (200):**
```json
{
  "id": "light_living",
  "state": "on"
}
```

**Response (404):**
```json
{
  "error": "Light not found"
}
```

### 4. Lock Control

#### POST /lock
Control the door lock.

**Request:**
```json
{
  "action": "lock"
}
```
*Valid actions: "lock", "unlock"*

**Response (200):**
```json
{
  "state": "locked"
}
```

**Response (400):**
```json
{
  "error": "Invalid action. Must be \"lock\" or \"unlock\""
}
```

### 5. Fan Control

#### POST /fan
Control fan mode and state.

**Request (Auto Mode):**
```json
{
  "mode": "auto"
}
```

**Request (Manual Mode):**
```json
{
  "mode": "manual",
  "state": "on"
}
```
*Manual mode requires state: "on" or "off"*

**Response (200):**
```json
{
  "state": "on",
  "mode": "auto"
}
```

**Response (400):**
```json
{
  "error": "Manual mode requires state \"on\" or \"off\""
}
```

### 6. Climate Settings

#### POST /climate
Update temperature and humidity thresholds for automatic fan control.

**Request:**
```json
{
  "temp_high": 26.5,
  "humidity_high": 65.0
}
```

**Response (200):**
```json
{
  "temp_high": 26.5,
  "humidity_high": 65.0
}
```

**Response (400):**
```json
{
  "error": "temp_high and humidity_high must be numbers"
}
```

### 7. Event History

#### GET /events
Get recent system events.

**Query Parameters:**
- `limit` (optional): Number of events to return (default: 100, max: 1000)

**Response (200):**
```json
[
  {
    "id": 1,
    "ts": 1703123456789,
    "category": "light",
    "target": "light_living",
    "action": "toggle",
    "old_state": "off",
    "new_state": "on"
  },
  {
    "id": 2,
    "ts": 1703123456790,
    "category": "fan",
    "target": "fan",
    "action": "mode_change",
    "old_state": "{\"state\":\"off\",\"mode\":\"manual\"}",
    "new_state": "{\"state\":\"on\",\"mode\":\"auto\"}"
  }
]
```

### 8. Sensor History

#### GET /sensors
Get historical sensor data.

**Query Parameters:**
- `type` (required): Sensor type ("temperature" or "humidity")
- `limit` (optional): Number of readings to return (default: 1440, max: 10000)

**Response (200):**
```json
[
  {
    "id": 1,
    "ts": 1703123456789,
    "type": "temperature",
    "value": 25.3
  },
  {
    "id": 2,
    "ts": 1703123456849,
    "type": "temperature",
    "value": 25.1
  }
]
```

**Response (400):**
```json
{
  "error": "Invalid sensor type. Must be \"temperature\" or \"humidity\""
}
```

## Error Responses

### Common HTTP Status Codes
- `200`: Success
- `400`: Bad Request - Invalid input parameters
- `401`: Unauthorized - Invalid or missing JWT token
- `404`: Not Found - Resource not found
- `500`: Internal Server Error - Server-side error

### Error Response Format
```json
{
  "error": "Error message description"
}
```

## Rate Limiting
Currently no rate limiting is implemented. In production, consider implementing:
- Login attempt limiting
- API call rate limiting per user
- WebSocket connection limits

## WebSocket Events
The system also provides real-time updates via WebSocket. After authentication, clients receive:

### Initial Snapshot
```json
{
  "type": "snapshot",
  "state": { /* complete state object */ }
}
```

### State Updates
```json
{
  "type": "update",
  "entity": "light",
  "id": "light_living",
  "state": "on"
}
```

### Sensor Updates
```json
{
  "type": "sensor",
  "sensor": "temperature",
  "value": 25.3,
  "ts": 1703123456789
}
```

### Event Notifications
```json
{
  "type": "event",
  "category": "light",
  "target": "light_living",
  "action": "toggle",
  "old_state": "off",
  "new_state": "on",
  "ts": 1703123456789
}
```