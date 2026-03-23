#include <ESP8266WiFi.h>
#include <PubSubClient.h>
#include <ArduinoJson.h>
#include <DHT.h>
#include <time.h>
#include "secret.h"

// CONFIG 
#define DHTPIN 2
#define DHTTYPE DHT11
#define LIGHT_PIN A0

// WIFI 
const char* ssid     = WIFI_SSID;
const char* password = WIFI_PASSWORD;
const char* mqtt_server = MQTT_SERVER;
// 4G: đổi MQTT_SERVER trong secret.h

// MQTT 
const int mqtt_port   = MQTT_PORT;
const char* mqtt_user = MQTT_USER;
const char* mqtt_pass = MQTT_PASS;

// TOPIC 
const char* topic_data = "esp/data";
const char* topic_control = "esp/control";
const char* topic_action = "esp/action";
const char* topic_state = "esp/state";

// OBJECT
WiFiClient espClient;
PubSubClient client(espClient);
DHT dht(DHTPIN, DHTTYPE);

// TIME
const char* ntpServer = "pool.ntp.org";
const long gmtOffset_sec = 7 * 3600;

// TIMER
unsigned long lastSend = 0;
const unsigned long interval = 2000;

// DEVICE STRUCT 
struct Device {
  const char* id;
  int pin;
  bool state;
};

Device devices[] = {
  { "light_1", 5, false },
  { "fan_1", 4, false },
  { "ac_1", 13, false }
};

const int deviceCount = sizeof(devices) / sizeof(devices[0]);

// HELPER
int getDeviceIndex(const char* device_id) {
  for (int i = 0; i < deviceCount; i++) {
    if (strcmp(device_id, devices[i].id) == 0) {
      return i;
    }
  }
  return -1;
}

// WIFI
void connectWiFi() {
  Serial.print("Connecting WiFi");

  WiFi.begin(ssid, password);

  while (WiFi.status() != WL_CONNECTED) {
    delay(500);
    Serial.print(".");
  }

  Serial.println("\nWiFi connected!");
  Serial.print("IP: ");
  Serial.println(WiFi.localIP());
}

// MQTT
void reconnectMQTT() {
  while (!client.connected()) {

    Serial.print("Connecting MQTT...");

    if (WiFi.status() != WL_CONNECTED) {
      connectWiFi();
    }

    if (client.connect("esp8266_client", mqtt_user, mqtt_pass)) {
      Serial.println("OK");
      client.subscribe(topic_control);

      for (int i = 0; i < deviceCount; i++) {
        StaticJsonDocument<128> doc;
        doc["device_id"] = devices[i].id;
        doc["state"] = devices[i].state ? "on" : "off";

        char buffer[128];
        serializeJson(doc, buffer);

        client.publish(topic_state, buffer, true);
      }

    } else {
      Serial.print("Fail, rc=");
      Serial.println(client.state());
      delay(2000);
    }
  }
}

// TIME
unsigned long getTimeStamp() {
  time_t now;
  time(&now);

  if (now < 100000) {
    return millis();
  }

  return (unsigned long)now;
}

// SEND SENSOR 
void sendSensorData() {
  float temp = dht.readTemperature();
  float hum = dht.readHumidity();

  if (isnan(temp) || isnan(hum)) {
    delay(200);
    temp = dht.readTemperature();
    hum = dht.readHumidity();
  }

  if (isnan(temp) || isnan(hum)) {
    Serial.println("DHT error!");
    return;
  }

  int light = 1023 - analogRead(LIGHT_PIN);

  Serial.print("Temp: ");
  Serial.print(temp);
  Serial.print(" | Hum: ");
  Serial.print(hum);
  Serial.print(" | Light: ");
  Serial.println(light);

  StaticJsonDocument<512> doc;

  doc["device_id"] = "esp1";
  doc["group_id"] = getTimeStamp();

  JsonArray sensors = doc.createNestedArray("sensors");

  JsonObject dhtObj = sensors.createNestedObject();
  dhtObj["sensor_id"] = "dht11_1";
  dhtObj["temperature"] = temp;
  dhtObj["humidity"] = hum;

  JsonObject ldrObj = sensors.createNestedObject();
  ldrObj["sensor_id"] = "ldr_1";
  ldrObj["light"] = light;

  char buffer[512];
  serializeJson(doc, buffer);

  client.publish(topic_data, buffer);
}

// SEND ACTION
void sendAction(const char* device, const char* action, const char* status, const char* state) {
  StaticJsonDocument<256> doc;

  doc["device_id"] = device;
  doc["action"] = action;
  doc["status"] = status;
  doc["state"] = state;

  char buffer[256];
  serializeJson(doc, buffer);

  client.publish(topic_action, buffer);
}

// CONTROL
void controlDevice(const char* device, const char* action) {

  int index = getDeviceIndex(device);

  if (index == -1) {
    sendAction(device, action, "fail", "unknown");
    return;
  }

  Serial.print("Control: ");
  Serial.print(device);
  Serial.print(" -> ");
  Serial.println(action);

  if (strcmp(action, "turn_on") == 0) {
    digitalWrite(devices[index].pin, HIGH);
    devices[index].state = true;

    sendAction(device, action, "success", "on");

  } else if (strcmp(action, "turn_off") == 0) {
    digitalWrite(devices[index].pin, LOW);
    devices[index].state = false;

    sendAction(device, action, "success", "off");

  } else {
    sendAction(device, action, "fail", "unknown");
    return;
  }

  StaticJsonDocument<128> doc;
  doc["device_id"] = device;
  doc["state"] = devices[index].state ? "on" : "off";

  char buffer[128];
  serializeJson(doc, buffer);

  client.publish(topic_state, buffer, true);
}

// CALLBACK 
void callback(char* topic, byte* payload, unsigned int length) {

  char msg[256];
  memcpy(msg, payload, length);
  msg[length] = '\0';

  Serial.print("Received: ");
  Serial.println(msg);

  StaticJsonDocument<256> doc;

  if (deserializeJson(doc, msg)) return;

  const char* device = doc["device_id"];
  const char* action = doc["action"];

  sendAction(device, action, "waiting", "unknown");

  controlDevice(device, action);
}

// SETUP 
void setup() {
  Serial.begin(115200);
  Serial.println("ESP starting...");

  // WiFi
  connectWiFi();

  // NTP
  configTime(gmtOffset_sec, 0, ntpServer);

  Serial.print("Syncing time...");
  time_t now = time(nullptr);

  int retry = 0;
  while (now < 100000 && retry < 20) {
    delay(500);
    Serial.print(".");
    now = time(nullptr);
    retry++;
  }

  Serial.println("\nTime synced!");

  // Device init
  for (int i = 0; i < deviceCount; i++) {
    pinMode(devices[i].pin, OUTPUT);
    digitalWrite(devices[i].pin, LOW);
  }

  dht.begin();

  // MQTT
  client.setServer(mqtt_server, mqtt_port);
  client.setCallback(callback);
}

// LOOP 
void loop() {

  if (WiFi.status() != WL_CONNECTED) {
    connectWiFi();
  }

  if (!client.connected()) {
    reconnectMQTT();
  }

  client.loop();

  if (millis() - lastSend >= interval) {
    lastSend = millis();
    sendSensorData();
  }
}