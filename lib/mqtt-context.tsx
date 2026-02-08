"use client";

import React, { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import mqtt, { MqttClient } from 'mqtt';

import { useConfig } from './config-context';

import { z } from 'zod';

// Zod Schemas for Runtime Validation - Optimized
const TelemetrySchema = z.object({
    DeviceName: z.string(),
    // We treat 'data' as a record of values. Complex objects should be pre-processed or strictly typed elsewhere.
    data: z.record(z.string(), z.any()),
    timestamp: z.number().optional()
});

const AlertSchema = z.object({
    DeviceName: z.string(),
    title: z.string(),
    type: z.string().default('Event'),
    severity: z.number().default(1),
    status: z.number().default(0),
    timestamp: z.number().optional()
});

export type TelemetryData = z.infer<typeof TelemetrySchema>;
export type AlertData = z.infer<typeof AlertSchema>;

// Types derived from firmware analysis (Legacy compatible)
export interface DeviceTelemetry extends TelemetryData {
    timestamp: number;
}

export interface EnrichedAlertData extends AlertData {
    timestamp: number;
}

interface MQTTConnectionContextType {
    client: MqttClient | null;
    isConnected: boolean;
    connectionError: string | null;
}

interface MQTTDataContextType {
    telemetry: Record<string, DeviceTelemetry>;
    alerts: EnrichedAlertData[];
}

const MQTTConnectionContext = createContext<MQTTConnectionContextType | undefined>(undefined);
const MQTTDataContext = createContext<MQTTDataContextType | undefined>(undefined);

export const MQTTProvider = ({ children }: { children: ReactNode }) => {
    const { brokerUrl } = useConfig();
    const [client, setClient] = useState<MqttClient | null>(null);
    const [isConnected, setIsConnected] = useState(false);
    const [connectionError, setConnectionError] = useState<string | null>(null);
    const [telemetry, setTelemetry] = useState<Record<string, DeviceTelemetry>>({});
    const [alerts, setAlerts] = useState<EnrichedAlertData[]>([]);

    // BATCHING: Store pending telemetry updates in a ref to avoid excessive renders
    const pendingTelemetry = React.useRef<Record<string, DeviceTelemetry>>({});

    useEffect(() => {
        // Interval to flush pending updates every 100ms
        const flushInterval = setInterval(() => {
            if (Object.keys(pendingTelemetry.current).length > 0) {
                const updates = { ...pendingTelemetry.current };
                pendingTelemetry.current = {};

                setTelemetry(prev => {
                    const newState = { ...prev };
                    Object.entries(updates).forEach(([name, update]) => {
                        const existing = newState[name]?.data || {};
                        newState[name] = {
                            ...update,
                            data: { ...existing, ...update.data }
                        };
                    });
                    return newState;
                });
            }
        }, 100);

        return () => clearInterval(flushInterval);
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
                'devices/+/telemetry', '/devices/+/telemetry', 'device/+/telemetry', '/device/+/telemetry',
                '+/+/telemetry', '/+/+/telemetry',
                'device/+/alarm', '/device/+/alarm', 'device/+/event', '/device/+/event',
                'device/+/events', '/device/+/events',
                '+/telemetry', '+/alarm', '+/event', '+/events'
            ];

            mqttClient.subscribe(topics, (err) => {
                if (err) console.error('Subscription error:', err);
                else console.log(`Subscribed to ${topics.length} topics`);
            });
        });

        mqttClient.on('message', (topic, message) => {
            const payloadStr = message.toString();
            const timestamp = Date.now();

            try {
                const rawPayload = JSON.parse(payloadStr);

                // --- TELEMETRY HANDLING ---
                if (topic.includes('telemetry') || (rawPayload.DeviceName && rawPayload.data && !topic.includes('alarm') && !topic.includes('event'))) {
                    let cleanData = rawPayload.data;

                    // Normalize: Handle stringified or nested values
                    if (typeof cleanData === 'string') {
                        try { cleanData = JSON.parse(cleanData); } catch (e) { }
                    }

                    // Simple Validation (Fast)
                    if (rawPayload.DeviceName && typeof cleanData === 'object') {
                        // Unpack {value: X} nested objects if they persist from legacy firmware
                        const normalizedData: Record<string, any> = {};
                        Object.entries(cleanData).forEach(([key, val]) => {
                            if (val !== null && typeof val === 'object' && 'value' in val) {
                                normalizedData[key] = (val as any).value;
                            } else {
                                normalizedData[key] = val;
                            }
                        });

                        // Buffer the update
                        pendingTelemetry.current[rawPayload.DeviceName] = {
                            DeviceName: rawPayload.DeviceName,
                            data: normalizedData,
                            timestamp: rawPayload.timestamp || timestamp
                        };
                    }
                }

                // --- ALARM/EVENT HANDLING ---
                if (topic.includes('alarm') || topic.includes('event')) {
                    const incomingAlerts = Array.isArray(rawPayload) ? rawPayload : [rawPayload];
                    const newAlerts: EnrichedAlertData[] = [];

                    incomingAlerts.forEach((item: any) => {
                        // fallback: sometimes alias is used or flat structure
                        const potentialAlert = item.data?.title ? { ...item.data, DeviceName: item.DeviceName } : item;

                        const result = AlertSchema.safeParse(potentialAlert);

                        if (result.success) {
                            newAlerts.push({
                                ...result.data,
                                timestamp: result.data.timestamp || timestamp
                            });
                        } else {
                            // Minimal fallback for "title" only alerts that might miss other fields
                            if (potentialAlert?.title && potentialAlert?.DeviceName) {
                                newAlerts.push({
                                    DeviceName: potentialAlert.DeviceName,
                                    title: potentialAlert.title,
                                    type: potentialAlert.type || 'Event',
                                    severity: Number(potentialAlert.severity) || 1,
                                    status: Number(potentialAlert.status) || 0,
                                    timestamp
                                });
                            }
                        }
                    });

                    if (newAlerts.length > 0) {
                        setAlerts((prev) => [...newAlerts, ...prev].slice(0, 50)); // Keep last 50
                    }
                }
            } catch (e) {
                console.error('Error parsing MQTT message:', e);
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

    // Split valid objects
    const connectionValue = { client, isConnected, connectionError };
    const dataValue = { telemetry, alerts };

    return (
        <MQTTConnectionContext.Provider value={connectionValue}>
            <MQTTDataContext.Provider value={dataValue}>
                {children}
            </MQTTDataContext.Provider>
        </MQTTConnectionContext.Provider>
    );
};

export const useMQTTConnection = () => {
    const context = useContext(MQTTConnectionContext);
    if (context === undefined) throw new Error('useMQTTConnection must be used within MQTTProvider');
    return context;
};

export const useMQTTData = () => {
    const context = useContext(MQTTDataContext);
    if (context === undefined) throw new Error('useMQTTData must be used within MQTTProvider');
    return context;
};

// Backward compatibility (Returns combined)
export const useMQTT = () => {
    const conn = useMQTTConnection();
    const data = useMQTTData();
    return { ...conn, ...data };
};
