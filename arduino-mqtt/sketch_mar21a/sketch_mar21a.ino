#include "secret.h"
#include <ArduinoJson.h>
#include <DHT.h>
#include <ESP8266WiFi.h>
#include <PubSubClient.h>
#include <time.h>

#define DHTPIN 2
#define DHTTYPE DHT11
#define LIGHT_PIN A0

// WIFI
const char *ssid = WIFI_SSID;
const char *password = WIFI_PASSWORD;
const char *mqtt_server = MQTT_SERVER;

// MQTT
const int mqtt_port = MQTT_PORT;
const char *mqtt_user = MQTT_USER;
const char *mqtt_pass = MQTT_PASS;

// TOPIC
const char *topic_data = "esp/data";
const char *topic_control = "esp/control";
const char *topic_state = "esp/state";

// OBJECT
WiFiClient espClient;
PubSubClient client(espClient);
DHT dht(DHTPIN, DHTTYPE);

int soilCounter = 0;
float soilM = 0;

// TIME
const char *ntpServer = "pool.ntp.org";
const long gmtOffset_sec = 7 * 3600;

// TIMER
unsigned long lastSend = 0;
const unsigned long interval = 2000;

// DEVICE STRUCT
struct Device
{
  const char *id;
  int pin;
  bool state;
};

Device devices[] = {
    {"light_1", 5, false}, {"fan_1", 4, false}, {"ac_1", 13, false}, {"alarm_1", 12, false}};

const int deviceCount = sizeof(devices) / sizeof(devices[0]);

int getDeviceIndex(const char *device_id)
{
  for (int i = 0; i < deviceCount; i++)
  {
    if (strcmp(device_id, devices[i].id) == 0)
    {
      return i;
    }
  }
  return -1;
}

// WIFI
void connectWiFi()
{
  Serial.print("Connecting WiFi");

  WiFi.begin(ssid, password);

  while (WiFi.status() != WL_CONNECTED)
  {
    delay(500);
    Serial.print(".");
  }

  Serial.println("\nWiFi connected!");
  Serial.print("IP: ");
  Serial.println(WiFi.localIP());
}

// MQTT
void reconnectMQTT()
{
  while (!client.connected())
  {

    Serial.print("Connecting MQTT...");

    if (WiFi.status() != WL_CONNECTED)
    {
      connectWiFi();
    }

    if (client.connect("esp8266_client", mqtt_user, mqtt_pass))
    {
      Serial.println("OK");
      client.subscribe(topic_control);

      for (int i = 0; i < deviceCount; i++)
      {
        StaticJsonDocument<128> doc;
        doc["device_id"] = devices[i].id;
        doc["state"] = devices[i].state ? "on" : "off";

        char buffer[128];
        serializeJson(doc, buffer);

        client.publish(topic_state, buffer, true);
      }
    }
    else
    {
      Serial.print("Fail, rc=");
      Serial.println(client.state());
      delay(2000);
    }
  }
}

// TIME
unsigned long getTimeStamp()
{
  time_t now = time(nullptr);

  if (now < 100000)
  {
    return 0;
  }

  return (unsigned long)now;
}

// DATA
void sendSensorData()
{

  float temp = dht.readTemperature();
  float hum = dht.readHumidity();
  if (isnan(temp) || isnan(hum))
  {
    delay(200);
    temp = dht.readTemperature();
    hum = dht.readHumidity();
  }
  if (isnan(temp) || isnan(hum))
  {
    Serial.println("DHT error!");
    return;
  }

  float light = 1023 - analogRead(LIGHT_PIN);
  if (light < 0)
    light = 0;

  soilCounter++;
  if (soilCounter <= 5)
  {
    soilM = random(0, 701) / 10.0;
  }
  else
  {
    soilM = random(700, 1001) / 10.0;
  }
  if (soilCounter >= 10)
  {
    soilCounter = 0;
  }

  Serial.print("Temp: ");
  Serial.print(temp);
  Serial.print(" | Hum: ");
  Serial.print(hum);
  Serial.print(" | Light: ");
  Serial.print(light);
  Serial.print(" | Soil Moisture: ");
  Serial.println(soilM);

  StaticJsonDocument<512> doc;

  // message_id
  unsigned long ts = getTimeStamp();
  if (ts == 0)
  {
    Serial.println("[WARN] No valid time yet, skip sending");
    return;
  }

  doc["message_id"] = ts;

  JsonArray sensors = doc.createNestedArray("sensors");

  // temperature
  JsonObject t = sensors.createNestedObject();
  t["sensor_id"] = "dht11_1";
  t["value_type"] = "temperature";
  t["value"] = temp;

  // humidity
  JsonObject h = sensors.createNestedObject();
  h["sensor_id"] = "dht11_1";
  h["value_type"] = "humidity";
  h["value"] = hum;

  // light
  JsonObject l = sensors.createNestedObject();
  l["sensor_id"] = "ldr_1";
  l["value_type"] = "light";
  l["value"] = light;

  // soil moisture
  JsonObject sm = sensors.createNestedObject();
  sm["sensor_id"] = "sm_1";
  sm["value_type"] = "soil_moisture";
  sm["value"] = soilM;

  char buffer[512];
  serializeJson(doc, buffer);

  client.publish(topic_data, buffer);
}

// CONTROL + STATE
void controlDevice(const char *request_id, const char *device, const char *action)
{

  int index = getDeviceIndex(device);

  Serial.print("Control: ");
  Serial.print(device);
  Serial.print(" -> ");
  Serial.println(action);

  // control
  if (index == -1)
  {
    Serial.println("[WARN] Unknown device, skipping");
    return;
  }

  if (strcmp(action, "turn_on") == 0)
  {
    digitalWrite(devices[index].pin, HIGH);
    devices[index].state = true;
  }
  else if (strcmp(action, "turn_off") == 0)
  {
    digitalWrite(devices[index].pin, LOW);
    devices[index].state = false;
  }
  else
  {
    Serial.println("[WARN] Unknown action, skipping");
    return;
  }

  // state
  bool actualState = (digitalRead(devices[index].pin) == HIGH);

  StaticJsonDocument<256> doc;
  doc["request_id"] = request_id;
  doc["device_id"] = device;
  doc["state"] = actualState ? "on" : "off";

  char buffer[256];
  serializeJson(doc, buffer);

  client.publish(topic_state, buffer, true);
  Serial.print("[State] Published: ");
  Serial.println(buffer);
}

// CALLBACK
void callback(char *topic, byte *payload, unsigned int length)
{

  char msg[256];
  memcpy(msg, payload, length);
  msg[length] = '\0';

  Serial.print("Received: ");
  Serial.println(msg);

  StaticJsonDocument<256> doc;

  if (deserializeJson(doc, msg))
  {
    Serial.println("[ERROR] JSON parse failed");
    return;
  }

  const char *request_id = doc["request_id"] | "";
  const char *device = doc["device_id"];
  const char *action = doc["action"];

  if (!device || !action)
  {
    Serial.println("[WARN] Missing device_id or action");
    return;
  }
  controlDevice(request_id, device, action);
}

// SETUP + LOOP
void setup()
{
  Serial.begin(115200);
  Serial.println("ESP starting...");

  connectWiFi();

  configTime(gmtOffset_sec, 0, ntpServer);

  Serial.print("Syncing time...");
  time_t now = time(nullptr);

  int retry = 0;
  while (now < 100000 && retry < 20)
  {
    delay(500);
    Serial.print(".");
    now = time(nullptr);
    retry++;
  }

  Serial.println("\nTime synced!");

  for (int i = 0; i < deviceCount; i++)
  {
    pinMode(devices[i].pin, OUTPUT);
    digitalWrite(devices[i].pin, LOW);
  }

  dht.begin();

  client.setServer(mqtt_server, mqtt_port);
  client.setBufferSize(512);
  client.setCallback(callback);
}

void loop()
{

  if (WiFi.status() != WL_CONNECTED)
  {
    connectWiFi();
  }

  if (!client.connected())
  {
    reconnectMQTT();
  }

  client.loop();

  if (millis() - lastSend >= interval)
  {
    lastSend = millis();
    sendSensorData();
  }
}