# Seitech Cloud Dashboard

A Next.js-based dashboard for monitoring and managing Seitech Cloud devices.

## Getting Started

To run the development server:

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

---
## System Architecture

The Seitech Cloud Dashboard uses a **client-side centric architecture** designed for real-time responsiveness and offline resilience.

### Architecture Diagram
```mermaid
graph TD
    subgraph Edge Devices
        D1[Inverters]
        D2[Flow Meters]
        D3[Energy Meters]
    end

    subgraph Cloud Infra
        B[MQTT Broker (EMQX)]
    end

    subgraph Client Application (Browser)
        M[MQTT Client (MQTT.js)]
        S[React State (Live Data)]
        DB[(IndexedDB / Dexie.js)]
        UI[Dashboard UI]
    end

    D1 -->|JSON Telemetry| B
    D2 -->|JSON Telemetry| B
    D3 -->|JSON Telemetry| B
    
    B -->|WSS (WebSockets)| M
    M -->|Real-time Update| S
    M -->|Persist History| DB
    
    S -->|Render| UI
    DB -->|Load History| UI
```

### Key Components

1.  **MQTT Broker (EMQX)**: Acts as the central hub. Devices publish telemetry here, and the dashboard subscribes to receive updates via WebSockets.
2.  **Next.js Frontend**: The application shell, rendered in the browser.
3.  **Local Database (Dexie.js / IndexedDB)**: 
    *   **Location**: Completely **Client-Side** (in your browser).
    *   **Purpose**: Stores telemetry history and alarms locally on the user's device. This allows for historical graphing and data review without needing a heavy backend database.
    *   **Persistence**: Data persists even if you refresh the page, but is specific to the browser instance.
4.  **React Context (MQTTContext)**: Manages the live connection, handles real-time state updates (optimistic UI), and coordinates saving data to the local DB in the background.

---

# Device Integration Guide

This guide explains how to connect your embedded device (ESP32, Arduino, STM32, etc.) to the Seitech Cloud Dashboard using MQTT.

## 1. MQTT Connection Details

Your device needs to connect to the following MQTT Broker:

-   **Broker URL**: `broker.emqx.io`
-   **Protocol**: TCP (for devices) or WSS (for browser)
-   **Port**: `1883` (TCP) or `8083`/`8084` (WSS)
-   **Client ID**: Any unique string (e.g., `device_12345`)

> **Note**: The dashboard uses `wss://broker.emqx.io:8084/mqtt`. Your embedded device should likely use the standard TCP port `1883`.

## 2. Topic Structure

Publish your data to the following topics. Replace `<DeviceName>` with your device's unique name (must match the dashboard configuration).

### Telemetry (Sensor Data)
**Topic**: `/device/<DeviceName>/telemetry`
**Example**: `/device/Inv_1/telemetry`

### Alarms
**Topic**: `/device/<DeviceName>/alarm`
**Example**: `/device/Inv_1/alarm`

### Events
**Topic**: `/device/<DeviceName>/events`
**Example**: `/device/Inv_1/events`

## 3. Payload Format (JSON)

### Telemetry Payload

The dashboard expects a JSON object with the `DeviceName` and a `data` object containing the sensor values.

**Generic Format:**
```json
{
  "DeviceName": "Inv_1",
  "data": {
    "key1": value1,
    "key2": value2
  }
}
```

#### Example: Inverter (`Inv_1`)
```json
{
  "DeviceName": "Inv_1",
  "data": {
    "pump_power": 12.5,
    "frequency": 45.2,
    "bus_voltage": 560,
    "pump_current": 8.1,
    "hourly_nonsolar_consumption": 2.5
  }
}
```

#### Example: Flow Meter (`FlowMeter_1`)
```json
{
  "DeviceName": "FlowMeter_1",
  "data": {
    "water_pumped_flow_rate_per_hour": 120.5,
    "totalWaterVolume_m3": 5000,
    "flowmeter_conductivity": 150
  }
}
```

#### Example: Energy Meter (`EnergyMeter_1`)
```json
{
  "DeviceName": "EnergyMeter_1",
  "data": {
    "total_active_power": 45.2,
    "sub_total_active_energy": 1200.5,
    "voltage_a": 230.1,
    "current_a": 15.2
  }
}
```

> **Tip**: You can add ANY custom key-value pair to the `data` object (e.g., `"temperature": 35`). You can then configure the dashboard to display this new data point using the "Customize View" feature.

### Alarm/Event Payload

```json
{
  "DeviceName": "Inv_1",
  "data": {
    "title": "Over Temperature",
    "type": "Alarm",
    "severity": 1,
    "status": 1
  }
}
```

## 4. How to Register a New Device

1.  **Dashboard Config**: Currently, devices are pre-configured in `lib/device-config.ts`.
    *   **Inverters**: `Inv_1`, `Inv_2`, `Inv_3`
    *   **Flow Meters**: `FlowMeter_1`, `FlowMeter_2`, `FlowMeter_3`
    *   **Energy Meters**: `EnergyMeter_1`

2.  **Add via Dashboard**:
    *   You can add more devices dynamically in the Sidebar by clicking the **(+)** icon next to "Inverters" or "Flow Meters".
    *   This will create a new ID (e.g., `Inv_4`).
    *   Configure your embedded device to publish to `/device/Inv_4/telemetry` with `"DeviceName": "Inv_4"`.

## 5. Quick Test (Using MQTT Explorer or CLI)

You can simulate a device using an MQTT client tool to verify the dashboard is working.

**Topic**: `/device/Inv_1/telemetry`
**Payload**:
```json
{
  "DeviceName": "Inv_1",
  "data": {
    "pump_power": { "value": 15.5 },
    "frequency": 50.0
  }
}
```
*Note: The dashboard supports both direct values (`15.5`) and object values (`{"value": 15.5}`).*

---

## 6. Firmware Example (Arduino/ESP32)

Below is a complete example of how to connect an ESP32 to the Seitech Cloud using the `PubSubClient` library.

```cpp
#include <WiFi.h>
#include <PubSubClient.h>

// 1. WiFi Credentials
const char* ssid = "YOUR_WIFI_SSID";
const char* password = "YOUR_WIFI_PASSWORD";

// 2. MQTT Broker Settings (Must match Dashboard)
const char* mqtt_server = "broker.emqx.io";
const int mqtt_port = 1883;
const char* client_id = "ESP32_Inverter_1"; // Unique ID

// 3. Device Configuration
const char* device_name = "Inv_1"; // MUST MATCH dashboard config (Inv_1, Inv_2, etc.)
const char* telemetry_topic = "/device/Inv_1/telemetry";

WiFiClient espClient;
PubSubClient client(espClient);
unsigned long lastMsg = 0;

void setup_wifi() {
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

void reconnect() {
  // Loop until we're reconnected
  while (!client.connected()) {
    Serial.print("Attempting MQTT connection...");
    // Attempt to connect
    if (client.connect(client_id)) {
      Serial.println("connected");
    } else {
      Serial.print("failed, rc=");
      Serial.print(client.state());
      Serial.println(" try again in 5 seconds");
      delay(5000);
    }
  }
}

void setup() {
  Serial.begin(115200);
  setup_wifi();
  client.setServer(mqtt_server, mqtt_port);
}

void loop() {
  if (!client.connected()) {
    reconnect();
  }
  client.loop();

  // Send data every 5 seconds
  unsigned long now = millis();
  if (now - lastMsg > 5000) {
    lastMsg = now;

    // 4. Create JSON Payload
    // Format: {"DeviceName": "Inv_1", "data": {"pump_power": 12.5, "frequency": 50.0}}
    
    float power = random(100, 500) / 10.0; // Simulated values
    float freq = 49.0 + (random(0, 20) / 10.0);

    String payload = "{";
    payload += "\"DeviceName\": \"" + String(device_name) + "\",";
    payload += "\"data\": {";
    payload += "\"pump_power\": " + String(power, 1) + ",";
    payload += "\"frequency\": " + String(freq, 1);
    payload += "}";
    payload += "}";

    Serial.print("Publishing message: ");
    Serial.println(payload);

    // 5. Publish to Dashboard Topic
    client.publish(telemetry_topic, payload.c_str());
  }
}
```
