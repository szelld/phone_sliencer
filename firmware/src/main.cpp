#include <WiFi.h>
#include <PubSubClient.h>
#include <DHT.h>
#include <ESP32Servo.h>
#include <ArduinoJson.h>

// Wi-Fi credentials (replace with your network)
const char* ssid = "YOUR_WIFI_SSID";
const char* password = "YOUR_WIFI_PASSWORD";

// MQTT broker configuration
const char* mqtt_server = "192.168.1.100";  // Replace with your MQTT broker IP
const int mqtt_port = 1883;
const char* mqtt_prefix = "house";

// GPIO pin definitions
#define LIGHT_LIVING_PIN    2
#define LIGHT_KITCHEN_PIN   4
#define LIGHT_BEDROOM_PIN   5
#define LIGHT_HALL_PIN      16
#define FAN_PIN             17
#define SERVO_PIN           18
#define DHT_PIN             19

// DHT sensor configuration
#define DHT_TYPE DHT22
DHT dht(DHT_PIN, DHT_TYPE);

// Servo configuration
Servo lockServo;
bool lockState = true; // true = locked, false = unlocked

// Light states
bool lightStates[4] = {false, false, false, false}; // living, kitchen, bedroom, hall
const char* lightIds[] = {"light_living", "light_kitchen", "light_bedroom", "light_hall"};
const int lightPins[] = {LIGHT_LIVING_PIN, LIGHT_KITCHEN_PIN, LIGHT_BEDROOM_PIN, LIGHT_HALL_PIN};

// Fan control
bool fanState = false;
String fanMode = "manual";

// Climate thresholds
float tempHigh = 26.0;
float humidityHigh = 60.0;

// Sensor timing
unsigned long lastSensorRead = 0;
const unsigned long SENSOR_INTERVAL = 60000; // 60 seconds

// Wi-Fi and MQTT clients
WiFiClient espClient;
PubSubClient client(espClient);

// Function prototypes
void setupWiFi();
void setupMQTT();
void reconnectMQTT();
void callback(char* topic, byte* payload, unsigned int length);
void readSensors();
void publishStates();
void publishSensorData(const char* sensorType, float value);
void controlLight(int lightIndex, bool state);
void controlFan(bool state);
void controlLock(bool locked);
void checkAutoFan(float temp, float humidity);
String createJsonPayload(const char* key, const char* value);
String createJsonPayload(const char* key, float value);

void setup() {
  Serial.begin(115200);
  delay(1000);
  
  Serial.println("Smart House ESP32 starting...");
  
  // Initialize GPIO pins
  for (int i = 0; i < 4; i++) {
    pinMode(lightPins[i], OUTPUT);
    digitalWrite(lightPins[i], LOW);
  }
  pinMode(FAN_PIN, OUTPUT);
  digitalWrite(FAN_PIN, LOW);
  
  // Initialize servo
  lockServo.attach(SERVO_PIN);
  controlLock(true); // Start locked
  
  // Initialize DHT sensor
  dht.begin();
  
  // Setup connections
  setupWiFi();
  setupMQTT();
  
  // Publish initial states
  publishStates();
  
  Serial.println("Setup complete");
}

void loop() {
  // Maintain MQTT connection
  if (!client.connected()) {
    reconnectMQTT();
  }
  client.loop();
  
  // Read sensors periodically
  unsigned long now = millis();
  if (now - lastSensorRead >= SENSOR_INTERVAL) {
    readSensors();
    lastSensorRead = now;
  }
  
  delay(100);
}

void setupWiFi() {
  delay(10);
  Serial.println();
  Serial.print("Connecting to ");
  Serial.println(ssid);

  WiFi.begin(ssid, password);

  while (WiFi.status() != WL_CONNECTED) {
    delay(500);
    Serial.print(".");
  }

  Serial.println("");
  Serial.println("WiFi connected");
  Serial.println("IP address: ");
  Serial.println(WiFi.localIP());
}

void setupMQTT() {
  client.setServer(mqtt_server, mqtt_port);
  client.setCallback(callback);
}

void reconnectMQTT() {
  while (!client.connected()) {
    Serial.print("Attempting MQTT connection...");
    
    String clientId = "ESP32SmartHouse-";
    clientId += String(random(0xffff), HEX);
    
    if (client.connect(clientId.c_str())) {
      Serial.println("connected");
      
      // Subscribe to command topics
      String baseTopic = String(mqtt_prefix) + "/command/";
      client.subscribe((baseTopic + "light/+").c_str());
      client.subscribe((baseTopic + "fan").c_str());
      client.subscribe((baseTopic + "lock").c_str());
      client.subscribe((baseTopic + "climateConfig").c_str());
      
      Serial.println("Subscribed to command topics");
      
      // Re-publish states after reconnect
      publishStates();
    } else {
      Serial.print("failed, rc=");
      Serial.print(client.state());
      Serial.println(" try again in 5 seconds");
      delay(5000);
    }
  }
}

void callback(char* topic, byte* payload, unsigned int length) {
  String message = "";
  for (int i = 0; i < length; i++) {
    message += (char)payload[i];
  }
  
  Serial.print("Message arrived [");
  Serial.print(topic);
  Serial.print("] ");
  Serial.println(message);
  
  String topicStr = String(topic);
  String prefix = String(mqtt_prefix) + "/command/";
  
  // Parse JSON command
  DynamicJsonDocument doc(200);
  DeserializationError error = deserializeJson(doc, message);
  
  if (error) {
    Serial.print("JSON parsing failed: ");
    Serial.println(error.c_str());
    return;
  }
  
  // Handle light commands
  if (topicStr.startsWith(prefix + "light/")) {
    String lightId = topicStr.substring((prefix + "light/").length());
    String state = doc["state"];
    
    for (int i = 0; i < 4; i++) {
      if (lightId == lightIds[i]) {
        controlLight(i, state == "on");
        break;
      }
    }
  }
  // Handle fan commands
  else if (topicStr == prefix + "fan") {
    String state = doc["state"];
    String mode = doc["mode"];
    
    fanMode = mode;
    if (mode == "manual") {
      controlFan(state == "on");
    }
    // Auto mode will be handled by sensor reading
  }
  // Handle lock commands
  else if (topicStr == prefix + "lock") {
    String state = doc["state"];
    controlLock(state == "locked");
  }
  // Handle climate config commands
  else if (topicStr == prefix + "climateConfig") {
    if (doc.containsKey("temp_high")) {
      tempHigh = doc["temp_high"];
    }
    if (doc.containsKey("humidity_high")) {
      humidityHigh = doc["humidity_high"];
    }
    Serial.println("Climate thresholds updated");
  }
}

void readSensors() {
  float humidity = dht.readHumidity();
  float temperature = dht.readTemperature();
  
  // Check if readings are valid
  if (isnan(humidity) || isnan(temperature)) {
    Serial.println("Failed to read from DHT sensor!");
    return;
  }
  
  Serial.print("Temperature: ");
  Serial.print(temperature);
  Serial.print("°C, Humidity: ");
  Serial.print(humidity);
  Serial.println("%");
  
  // Publish sensor data
  publishSensorData("temperature", temperature);
  publishSensorData("humidity", humidity);
  
  // Check auto fan mode
  if (fanMode == "auto") {
    checkAutoFan(temperature, humidity);
  }
}

void checkAutoFan(float temp, float humidity) {
  static bool hysteresisState = false;
  
  // Hysteresis logic
  if (!fanState && (temp > tempHigh || humidity > humidityHigh)) {
    // Turn fan on
    controlFan(true);
    hysteresisState = true;
  } else if (fanState && hysteresisState && 
             temp < (tempHigh - 0.5) && humidity < (humidityHigh - 2.0)) {
    // Turn fan off
    controlFan(false);
    hysteresisState = false;
  }
}

void publishStates() {
  String baseTopic = String(mqtt_prefix) + "/rooms/";
  
  // Publish light states
  for (int i = 0; i < 4; i++) {
    String topic = baseTopic + lightIds[i] + "/state";
    String payload = createJsonPayload("state", lightStates[i] ? "on" : "off");
    client.publish(topic.c_str(), payload.c_str(), true);
  }
  
  // Publish fan state
  String fanTopic = String(mqtt_prefix) + "/fan/state";
  DynamicJsonDocument fanDoc(100);
  fanDoc["state"] = fanState ? "on" : "off";
  fanDoc["mode"] = fanMode;
  String fanPayload;
  serializeJson(fanDoc, fanPayload);
  client.publish(fanTopic.c_str(), fanPayload.c_str(), true);
  
  // Publish lock state
  String lockTopic = String(mqtt_prefix) + "/lock/state";
  String lockPayload = createJsonPayload("state", lockState ? "locked" : "unlocked");
  client.publish(lockTopic.c_str(), lockPayload.c_str(), true);
}

void publishSensorData(const char* sensorType, float value) {
  String topic = String(mqtt_prefix) + "/sensors/" + sensorType;
  String payload = createJsonPayload("value", value);
  client.publish(topic.c_str(), payload.c_str());
}

void controlLight(int lightIndex, bool state) {
  if (lightIndex >= 0 && lightIndex < 4) {
    lightStates[lightIndex] = state;
    digitalWrite(lightPins[lightIndex], state ? HIGH : LOW);
    
    // Publish updated state
    String topic = String(mqtt_prefix) + "/rooms/" + lightIds[lightIndex] + "/state";
    String payload = createJsonPayload("state", state ? "on" : "off");
    client.publish(topic.c_str(), payload.c_str(), true);
    
    Serial.print("Light ");
    Serial.print(lightIds[lightIndex]);
    Serial.print(" ");
    Serial.println(state ? "ON" : "OFF");
  }
}

void controlFan(bool state) {
  fanState = state;
  digitalWrite(FAN_PIN, state ? HIGH : LOW);
  
  // Publish updated state
  String topic = String(mqtt_prefix) + "/fan/state";
  DynamicJsonDocument doc(100);
  doc["state"] = state ? "on" : "off";
  doc["mode"] = fanMode;
  String payload;
  serializeJson(doc, payload);
  client.publish(topic.c_str(), payload.c_str(), true);
  
  Serial.print("Fan ");
  Serial.println(state ? "ON" : "OFF");
}

void controlLock(bool locked) {
  lockState = locked;
  // Servo positions: 0° for locked, 90° for unlocked
  lockServo.write(locked ? 0 : 90);
  
  // Publish updated state
  String topic = String(mqtt_prefix) + "/lock/state";
  String payload = createJsonPayload("state", locked ? "locked" : "unlocked");
  client.publish(topic.c_str(), payload.c_str(), true);
  
  Serial.print("Lock ");
  Serial.println(locked ? "LOCKED" : "UNLOCKED");
}

String createJsonPayload(const char* key, const char* value) {
  DynamicJsonDocument doc(100);
  doc[key] = value;
  String payload;
  serializeJson(doc, payload);
  return payload;
}

String createJsonPayload(const char* key, float value) {
  DynamicJsonDocument doc(100);
  doc[key] = value;
  String payload;
  serializeJson(doc, payload);
  return payload;
}