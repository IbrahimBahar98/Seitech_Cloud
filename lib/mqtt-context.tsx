"use client";

import React, { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import mqtt, { MqttClient } from 'mqtt';

import { useConfig } from './config-context';
import { db } from './db';

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
    category?: 'Alarm' | 'Event';
}

interface MQTTContextType {
    client: MqttClient | null;
    isConnected: boolean;
    connectionError: string | null;
    telemetry: Record<string, DeviceTelemetry>; // Keyed by DeviceName
    alerts: AlertData[];
    publishCommand: (deviceName: string, payload: any) => void;
}

const MQTTContext = createContext<MQTTContextType | undefined>(undefined);

// Configuration - In a real app, these might be env vars
// Configuration - In a real app, these might be env vars
// Note: User specified broker.dev.kuido.io:1883 (TCP). Browser requires WSS.
// Assuming WSS port 8083 or 8084 for Kuido, or using EMQX public for demo with same topic structure.
// const BROKER_URL = 'wss://broker.emqx.io:8084/mqtt';

// The ClientID of the device/gateway you want to monitor.
// Use '+' to monitor ALL devices broadcasting to this broker.
// Use a specific ID (e.g., 'site1', 'Vodafone1') to filter.
const TARGET_CLIENT_ID = '+';

// const BROKER_URL = 'wss://broker.dev.kuido.io:8083/mqtt'; // Uncomment if Kuido supports WSS

export const MQTTProvider = ({ children }: { children: ReactNode }) => {
    const { brokerUrl } = useConfig();
    const [client, setClient] = useState<MqttClient | null>(null);
    const [isConnected, setIsConnected] = useState(false);
    const [connectionError, setConnectionError] = useState<string | null>(null);
    const [telemetry, setTelemetry] = useState<Record<string, DeviceTelemetry>>({});
    const [alerts, setAlerts] = useState<AlertData[]>([]);

    // Hydrate state from server-side logs on mount
    useEffect(() => {
        const fetchInitialState = async () => {
            console.log('[MQTT Context] Fetching initial state...');
            try {
                const res = await fetch('/api/telemetry');
                if (res.ok) {
                    const data = await res.json();
                    console.log('[MQTT Context] Initial state loaded:', Object.keys(data).length, 'devices');
                    setTelemetry(prev => ({ ...prev, ...data }));
                }
            } catch (error) {
                console.error('[MQTT Context] Failed to load initial state:', error);
            }
        };
        fetchInitialState();
    }, []);

    useEffect(() => {
        console.log('Connecting to MQTT broker...', brokerUrl);
        const mqttClient = mqtt.connect(brokerUrl, {
            clientId: `dashboard_${Math.random().toString(16).slice(2, 10)}`,
            clean: true,
            reconnectPeriod: 5000,
        });

        mqttClient.on('connect', () => {
            console.log('Connected to MQTT Broker');
            setIsConnected(true);
            setConnectionError(null);

            const topics = [
                'devices/+/telemetry', '/devices/+/telemetry',
                'device/+/telemetry', '/device/+/telemetry',
                '+/+/telemetry', '/+/+/telemetry',
                'device/+/alarm', '/device/+/alarm',
                'device/+/event', '/device/+/event',
                'device/+/events', '/device/+/events',
                '+/telemetry', '+/alarm', '+/event', '+/events'
            ];

            mqttClient.subscribe(topics, (err) => {
                if (err) console.error('Subscription error:', err);
                else console.log(`Subscribed to ${topics.join(', ')}`);
            });
        });

        mqttClient.on('message', async (topic, message) => {
            const payloadStr = message.toString();
            const timestamp = Date.now();

            try {
                let payload;
                try {
                    payload = JSON.parse(payloadStr);
                } catch (e) {
                    console.error('[MQTT] JSON Parse Error:', e);
                    // Fire and forget error logging
                    db.telemetry.add({
                        deviceName: 'Invalid',
                        timestamp,
                        data: {},
                        isValid: false,
                        error: 'JSON Parse Error',
                        rawMessage: payloadStr
                    }).catch(err => console.error("Failed to log invalid msg", err));
                    return;
                }

                // --- HELPER: Smart Merge for Telemetry ---
                // Retains old values if new ones are null/undefined
                const mergeDeviceData = (prevData: any, newData: any) => {
                    const result = { ...prevData };
                    Object.keys(newData).forEach(key => {
                        const val = newData[key];
                        // If value is valid (not null/undefined), update it.
                        // If it IS null/undefined, we intentionally do NOT update (keeping prev).
                        if (val !== null && val !== undefined) {
                            result[key] = val;
                        }
                    });
                    return result;
                };

                // 1. Process Telemetry (IMMEDIATE UI UPDATE)
                if (topic.includes('telemetry')) {
                    if (payload.DeviceName && payload.data) {
                        // Handle Double-Stringified Data
                        let incomingData = payload.data;
                        if (typeof payload.data === 'string') {
                            try {
                                incomingData = JSON.parse(payload.data);
                            } catch (e) {
                                console.error('Failed to parse inner data JSON:', e);
                            }
                        }

                        setTelemetry((prev) => {
                            const existingData = prev[payload.DeviceName]?.data || {};
                            const mergedData = mergeDeviceData(existingData, incomingData);

                            return {
                                ...prev,
                                [payload.DeviceName]: {
                                    DeviceName: payload.DeviceName,
                                    data: mergedData,
                                    timestamp,
                                },
                            };
                        });
                    } else {
                        console.warn('[MQTT] Telemetry missing DeviceName or data:', payload);
                    }
                }

                // 2. Debug / Fallback for non-standard telemetry topics
                // Only process if it looks like telemetry and wasn't caught above
                // AND explicitly has data.
                else if (payload.DeviceName && payload.data && !topic.includes('alarm') && !topic.includes('event')) {
                    let incomingData = payload.data;
                    if (typeof payload.data === 'string') {
                        try {
                            incomingData = JSON.parse(payload.data);
                        } catch (e) {
                            // If parsing fails, it might be a simple string value, but our state expects an object map.
                            // We'll log it and proceed with caution, or maybe treat it as a single value if we knew the key?
                            // For now, we assume it WAS meant to be JSON.
                            console.error('Failed to parse inner fallback data JSON:', e);
                        }
                    }

                    // Check if incomingData is actually an object before merging
                    if (incomingData && typeof incomingData === 'object') {
                        setTelemetry((prev) => {
                            const existingData = prev[payload.DeviceName]?.data || {};
                            const mergedData = mergeDeviceData(existingData, incomingData);
                            return {
                                ...prev,
                                [payload.DeviceName]: {
                                    DeviceName: payload.DeviceName,
                                    data: mergedData,
                                    timestamp,
                                },
                            };
                        });
                    }
                }

                // 3. Process Alarms & Events (State Update)
                if (topic.includes('alarm') || topic.includes('event')) {
                    const processAlerts = (rawPayload: any) => {
                        const incomingItems = Array.isArray(rawPayload) ? rawPayload : [rawPayload];
                        const newItems: AlertData[] = [];

                        incomingItems.forEach((item: any) => {
                            const deviceName = item.DeviceName || "Unknown";
                            // Flatten structure if needed, or use directly
                            // Structure from file:
                            // { "DeviceName": "...", "type": "...", "title": "...", "status": ..., "severity": ... }

                            // Default values for Events if missing
                            const isEvent = topic.includes('event');
                            const defaultSeverity = isEvent ? 1 : 3;
                            const defaultStatus = 1;

                            // If item has direct properties
                            if (item.title) {
                                newItems.push({
                                    DeviceName: deviceName,
                                    title: item.title,
                                    type: item.type || (isEvent ? 'Event' : 'Alarm'),
                                    category: (item.type && ['Inverter protection status', 'SetPointTemp', 'No Set Password'].includes(item.type)) || isEvent ? 'Event' : 'Alarm',
                                    severity: item.severity ?? defaultSeverity,
                                    status: item.status ?? defaultStatus,
                                    timestamp
                                });
                            }
                            // Backward compatibility: if data is nested in 'data'
                            else if (item.data && item.data.title) {
                                newItems.push({
                                    DeviceName: deviceName,
                                    title: item.data.title,
                                    type: item.data.type || (isEvent ? 'Event' : 'Alarm'),
                                    category: isEvent ? 'Event' : 'Alarm',
                                    severity: item.data.severity ?? defaultSeverity,
                                    status: item.data.status ?? defaultStatus,
                                    timestamp
                                });
                            }
                        });
                        return newItems;
                    };

                    console.log('[MQTT] Processing Alarm/Event:', topic, JSON.stringify(payload).substring(0, 100));
                    const newAlerts = processAlerts(payload);
                    console.log('[MQTT] Parsed Alerts:', newAlerts.length);

                    if (newAlerts.length > 0) {
                        setAlerts((prev) => [...newAlerts, ...prev].slice(0, 100));

                        // Persist Alarms to DB (Fire and Forget)
                        newAlerts.forEach(alert => {
                            db.alarms.add({
                                deviceName: alert.DeviceName,
                                timestamp: alert.timestamp,
                                type: alert.type,
                                category: alert.category,
                                data: alert
                            }).catch(e => console.error("Failed to save alert:", e));
                        });
                    }
                }

                // 4. Validate & Persist Telemetry to DB (BACKGROUND)
                // Fire and forget to avoid blocking UI thread
                if (payload.DeviceName && (topic.includes('telemetry') || (!topic.includes('alarm') && !topic.includes('event')))) {
                    db.telemetry.add({
                        deviceName: payload.DeviceName,
                        timestamp,
                        data: payload,
                        isValid: true
                    }).catch(e => console.error("Failed to persist telemetry:", e));
                }

            } catch (e) {
                console.error('Error processing MQTT message:', e);
            }
        });

        mqttClient.on('error', (err) => {
            console.error('MQTT Connection Error:', err);
            setConnectionError(err.message || 'Connection Error');
            setIsConnected(false);
        });

        mqttClient.on('offline', () => {
            console.log('MQTT Client Offline');
            setIsConnected(false);
            setConnectionError('Offline / Reconnecting...');
        });

        mqttClient.on('reconnect', () => {
            console.log('Reconnecting...');
            setConnectionError('Reconnecting...');
        });

        mqttClient.on('close', () => {
            setIsConnected(false);
        });

        setClient(mqttClient);

        return () => {
            mqttClient.end();
        };
    }, [brokerUrl]);

    const publishCommand = (deviceName: string, payload: any) => {
        if (client && isConnected) {
            const topic = `device/${deviceName}/rpc`;
            const message = JSON.stringify(payload);
            console.log(`[MQTT] Publishing Command to ${topic}:`, message);
            client.publish(topic, message, { qos: 1 }, (err) => {
                if (err) console.error('[MQTT] Command Publish Error:', err);
            });
        } else {
            console.warn('[MQTT] Cannot publish command: Client not connected');
        }
    };

    return (
        <MQTTContext.Provider value={{ client, isConnected, connectionError, telemetry, alerts, publishCommand }}>
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
