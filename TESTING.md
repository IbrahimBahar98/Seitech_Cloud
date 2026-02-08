# Testing Guide: Seitech Cloud Dashboard

No, you do **not** need physical hardware to test this project. Since the dashboard relies on MQTT, any software that can publish MQTT messages can simulate a device.

## Option 1: Use the Included Simulator Script
6.  We have created a helper script to simulate 3 devices:
    *   **Inverter_1**
    *   **FlowMeter_1**
    *   **EnergyMeter_1**

1.  **Install dependencies** (if not already done):
    ```bash
    npm install
    ```
    *Note: The script uses the `mqtt` package which is already in your `package.json`.*

2.  **Run the simulator**:
    ```bash
    node scripts/simulate-device.js
    ```

3.  **Verify**:
    -   Open the Dashboard at `http://localhost:3000`.
    -   You will see **Inverter_1**, **FlowMeter_1**, and **EnergyMeter_1** appear automatically.
    -   You can click on each device to see their specific full telemetry data.

## Option 2: Use MQTT Explorer (GUI Tool)
[MQTT Explorer](http://mqtt-explorer.com/) is a generic MQTT client that lets you manually publish messages.

1.  **Connect**:
    -   **Host**: `broker.emqx.io`
    -   **Port**: `1883` (TCP) or `8083` (WS)
    -   **Protocol**: `mqtt://` or `ws://`

2.  **Publish Telemetry**:
    -   **Topic**: `/device/Inverter_1/telemetry`
    -   **Payload (JSON)**:
        ```json
        {
          "DeviceName": "Inverter_1",
          "data": {
            "pump_power": 25.5,
            "frequency": 50.1
          }
        }
        ```
    -   Click **Publish**.

3.  **Publish Alarm**:
    -   **Topic**: `/device/Inverter_1/alarm`
    -   **Payload (JSON)**:
        ```json
        {
          "DeviceName": "Inverter_1",
          "data": {
            "title": "High Temp",
            "type": "Alarm",
            "severity": 3,
            "status": 1
          }
        }
        ```

## Option 3: Use Command Line (Mosquitto)
If you have `mosquitto_pub` installed:

```bash
mosquitto_pub -h broker.emqx.io -t "/device/Inverter_1/telemetry" -m '{"DeviceName":"Inverter_1","data":{"pump_power":12.3}}'
```
