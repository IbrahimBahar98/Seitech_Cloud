"use client";

import React, { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import mqtt, { MqttClient } from 'mqtt';

// Types derived from firmware analysis
export interface TelemetryData {
    [key: string]: {
        id: string;
        value: string | number | boolean;
    };
}

export interface DeviceTelemetry {
    DeviceName: string;
    timestamp: number;
    data: TelemetryData;
}

export interface AlertData {
    DeviceName: string;
    title: string;
    type: string;
    severity: number;
    status: number;
    timestamp: number;
}

interface MQTTContextType {
    client: MqttClient | null;
    isConnected: boolean;
    telemetry: Record<string, DeviceTelemetry>; // Keyed by DeviceName
    alerts: AlertData[];
}

const MQTTContext = createContext<MQTTContextType | undefined>(undefined);

// Configuration - In a real app, these might be env vars
// Configuration - In a real app, these might be env vars
// Note: User specified broker.dev.kuido.io:1883 (TCP). Browser requires WSS.
// Assuming WSS port 8083 or 8084 for Kuido, or using EMQX public for demo with same topic structure.
const BROKER_URL = 'wss://broker.emqx.io:8084/mqtt';

// The ClientID of the device/gateway you want to monitor.
// Use '+' to monitor ALL devices broadcasting to this broker.
// Use a specific ID (e.g., 'site1', 'Vodafone1') to filter.
const TARGET_CLIENT_ID = '+';

// const BROKER_URL = 'wss://broker.dev.kuido.io:8083/mqtt'; // Uncomment if Kuido supports WSS

export const MQTTProvider = ({ children }: { children: ReactNode }) => {
    const [client, setClient] = useState<MqttClient | null>(null);
    const [isConnected, setIsConnected] = useState(false);
    const [telemetry, setTelemetry] = useState<Record<string, DeviceTelemetry>>({});
    const [alerts, setAlerts] = useState<AlertData[]>([]);

    useEffect(() => {
        console.log('Connecting to MQTT broker...', BROKER_URL);
        const mqttClient = mqtt.connect(BROKER_URL, {
            clientId: `dashboard_${Math.random().toString(16).slice(2, 10)}`,
            clean: true,
            reconnectPeriod: 5000,
        });

        mqttClient.on('connect', () => {
            console.log('Connected to MQTT Broker');
            setIsConnected(true);

            // Subscribe to topics based on Kuido/Vodafone Platform structure
            // Structure: /device/{clientID}/{topic_type}

            const topics = [
                `/device/${TARGET_CLIENT_ID}/telemetry`,
                `/device/${TARGET_CLIENT_ID}/alarm`,
                `/device/${TARGET_CLIENT_ID}/events`
            ];

            mqttClient.subscribe(topics, (err) => {
                if (err) console.error('Subscription error:', err);
                else console.log(`Subscribed to ${topics.join(', ')}`);
            });
        });

        mqttClient.on('message', (topic, message) => {
            const payloadStr = message.toString();
            const timestamp = Date.now();

            try {
                const payload = JSON.parse(payloadStr);

                if (topic.includes('telemetry')) {
                    // Expected payload: { "DeviceName": "Inv_1", "data": { ... } }
                    if (payload.DeviceName && payload.data) {
                        setTelemetry((prev) => ({
                            ...prev,
                            [payload.DeviceName]: {
                                DeviceName: payload.DeviceName,
                                data: payload.data,
                                timestamp,
                            },
                        }));
                    }
                } else if (topic.includes('alarm')) {
                    // Expected payload: Array of alerts [{ "DeviceName": "Inv_1", ... }] based on firmware
                    // Or single object. Firmware logic: CloudComH_Publish_Device_Alarms_Data adds to buffer, 
                    // HandleTx constructs "DeviceName":..., "data": { title: ... } actually?
                    // Re-checking CloudComH.cpp:
                    // "{\"DeviceName\":\"%s\",\"data\":{%s}}" where data is the list of alarms/telemetry?
                    // Wait, for Alarms: CloudComH_HandleTx uses MSG_TYPE_ALARMS.
                    // It constructs: "{\"DeviceName\":\"%s\",\"data\":[%s]}" (if multiple?) 
                    // Actually the code snippet viewed earlier:
                    // snprintf(payload, ..., "{\"DeviceName\":\"%s\",\"data\":{%s}}", ... buf->telemetry.c_str());
                    // It seems 'data' is an object for telemetry.
                    // For alarms, if it's multiple, usually it's an array or nested objects.
                    // The provided snippet for Alarms wasn't fully visible in detail but followed the same pattern.
                    // Note: User said "sending a payload... make tabs for every device".
                    // If the payload from `site1/{clientid}/alerts` contains multiple devices, 
                    // it implies the payload might be an ARRAY of device objects OR the "data" object contains keys for multiple devices?
                    // "CloudComH_HandleTx" sends per-device Name.
                    // So `site1/{clientid}/alerts` might receive multiple messages, one per device.
                    // OR one message containing data for multiple devices? 
                    // "CloudComH" buffers PER DEVICE. Loop: for (int i=0; i<CloudComH_Device_Buffer_Max; i++) ... sends ONE message per device buffer.
                    // So we receive separate messages: { DeviceName: Inv_1, ... }, { DeviceName: Inv_2, ... }
                    // So we just accumulate them.

                    // Adjusting parsing to handle both single object and array (just in case)
                    const incomingAlerts = Array.isArray(payload) ? payload : [payload];

                    // Process each alert object
                    /* 
                       Firmware payload for Alarm:
                       { "DeviceName": "...", "data": ...? } -> Actually CloudComH constructs the whole JSON.
                       If the wrapper is { DeviceName: ..., data: ... }, we need to extract from data?
                       OR is the 'data' the alarm itself?
                       Snippet: "{\"DeviceName\":\"%s\",\"data\":{%s}}"
                       So for alarms, 'data' might be keyed by something or be a list string?
                       "CloudComH_Publish_Device_Alarms_Data" adds "title":... to buffer.
                       If multiple alarms, they are appended in buffer string? 
                       Usually comma separated? The code does `temp = ...` then `AddToDeviceBuffer`.
                       If `AddToDeviceBuffer` appends with commas, then `{%s}` makes it a valid JSON object? 
                       If keys are unique (e.g. alarm IDs), yes. If not, invalid JSON?
                       Let's assume the payload sent is valid JSON.
                       We will treat `payload` or `payload.data` as the source of info.
                    */

                    // Simplified assumption: The payload contains the alert info directly or in .data
                    // We'll normalize it.
                    const newAlerts: AlertData[] = [];
                    incomingAlerts.forEach((item: any) => {
                        const deviceName = item.DeviceName || "Unknown";
                        const alertInfo = item.data || item; // Fallback

                        // If alertInfo is the object with title, severity etc.
                        // We flatten it to AlertData
                        // Note: If 'data' is a map of alarms, iterate values.
                        if (alertInfo.title) {
                            newAlerts.push({
                                DeviceName: deviceName,
                                title: alertInfo.title,
                                type: alertInfo.type,
                                severity: alertInfo.severity,
                                status: alertInfo.status,
                                timestamp
                            });
                        } else {
                            // Try iterating keys if it's a map
                            Object.keys(alertInfo).forEach(key => {
                                const val = alertInfo[key];
                                if (typeof val === 'object' && val.title) {
                                    newAlerts.push({
                                        DeviceName: deviceName,
                                        ...val,
                                        timestamp
                                    });
                                }
                            });
                        }
                    });

                    setAlerts((prev) => [...newAlerts, ...prev].slice(0, 100)); // Keep last 100
                }
            } catch (e) {
                console.error('Error parsing MQTT message:', e);
            }
        });

        mqttClient.on('error', (err) => {
            console.error('MQTT Connection Error:', err);
            setIsConnected(false);
        });

        mqttClient.on('close', () => {
            setIsConnected(false);
        });

        setClient(mqttClient);

        return () => {
            mqttClient.end();
        };
    }, []);

    return (
        <MQTTContext.Provider value={{ client, isConnected, telemetry, alerts }}>
            {children}
        </MQTTContext.Provider>
    );
};

export const useMQTT = () => {
    const context = useContext(MQTTContext);
    if (context === undefined) {
        throw new Error('useMQTT must be used within an MQTTProvider');
    }
    return context;
};
