import Dexie, { Table } from 'dexie';

export interface TelemetryRecord {
    id?: number;
    deviceName: string;
    timestamp: number;
    data: any; // The valid JSON payload
    isValid: boolean;
    error?: string; // Error message if invalid
    rawMessage?: string; // Original string if invalid
}

export interface AlarmRecord {
    id?: number;
    deviceName: string;
    timestamp: number;
    type: string;
    category?: 'Alarm' | 'Event'; // New field for broad classification
    data: any;
}

export class TelemetryDatabase extends Dexie {
    telemetry!: Table<TelemetryRecord>;
    alarms!: Table<AlarmRecord>;

    constructor() {
        super('SeitechCloudDB');
        this.version(2).stores({
            telemetry: '++id, deviceName, timestamp, isValid',
            alarms: '++id, deviceName, timestamp, type, category' // Added category to index
        });
        // Keep version 1 for reference if needed, Dexie handles upgrades
    }
}

export const db = new TelemetryDatabase();
