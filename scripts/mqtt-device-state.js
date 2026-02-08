const mqtt = require('mqtt');
const fs = require('fs');
const path = require('path');

// Configuration
const BROKER_URL = 'mqtt://broker.emqx.io:1883'; // TCP connection
const TOPICS = [
    'devices/+/telemetry', '/devices/+/telemetry',
    'device/+/telemetry', '/device/+/telemetry',
    'device/+/alarm', '/device/+/alarm',
    'device/+/event', '/device/+/events'
];

const ALLOWED_KEYS = {
    FlowMeter: [
        'water_pumped_flow_rate_per_hour',
        'totalWaterVolume_m3',
        'flowmeter_conductivity',
        'last_system_update', // internal
        'DeviceName' // internal
    ]
};

const LOG_DIR = path.join(__dirname, '..', 'server_logs');

// Ensure log directory exists
if (!fs.existsSync(LOG_DIR)) {
    fs.mkdirSync(LOG_DIR);
}

console.log(`[DeviceTracker] Connecting to ${BROKER_URL}...`);
const client = mqtt.connect(BROKER_URL, {
    clientId: 'tracker_' + Math.random().toString(16).substr(2, 8)
});

client.on('connect', () => {
    console.log('[DeviceTracker] Connected');
    client.subscribe(TOPICS, (err) => {
        if (!err) console.log(`[DeviceTracker] Subscribed to topics`);
    });
});

client.on('message', (topic, message) => {
    const payloadStr = message.toString();
    let payload;

    try {
        payload = JSON.parse(payloadStr);
    } catch (e) {
        // console.error('[DeviceTracker] Invalid JSON:', e.message);
        return;
    }

    // Identify Device
    const deviceName = payload.DeviceName;
    if (!deviceName) return;

    // Determine File Path
    const deviceFile = path.join(LOG_DIR, `${deviceName}.json`);

    // Read Existing State
    let existingState = {};
    if (fs.existsSync(deviceFile)) {
        try {
            existingState = JSON.parse(fs.readFileSync(deviceFile, 'utf8'));
        } catch (e) {
            console.error(`[DeviceTracker] Error reading ${deviceName}.json`, e);
        }
    }

    // Merge Logic (Flatten 'data' if present)
    let newData = payload.data || payload; // Support both format types

    // If newData is double-stringified (common issue), parse it
    if (typeof newData === 'string') {
        try { newData = JSON.parse(newData); } catch (e) { }
    }

    // FILTERING: Fix Contamination
    if (deviceName.startsWith('FlowMeter')) {
        const allowed = ALLOWED_KEYS.FlowMeter;
        const filtered = {};
        Object.keys(newData).forEach(key => {
            if (allowed.includes(key)) {
                filtered[key] = newData[key];
            }
        });
        // console.log(`[Filter] Filtered ${deviceName} keys. Before: ${Object.keys(newData).length}, After: ${Object.keys(filtered).length}`);
        newData = filtered;
    }

    // Handle "Smart Merge" - only update non-null values
    // We assume the file stores the FLAT state of keys
    const mergedState = { ...existingState };

    // Update timestamp
    mergedState.last_system_update = new Date().toISOString();

    if (typeof newData === 'object' && newData !== null) {
        Object.keys(newData).forEach(key => {
            const val = newData[key];
            if (val !== null && val !== undefined) {
                // Preserving full object structure as requested by user
                // Previously we extracted .value, now we keep the whole object {id:..., value:...}
                mergedState[key] = val;
            }
        });
    }

    // SANITIZATION: Remove keys that shouldn't be there (fix for existing polluted logs)
    if (deviceName.startsWith('FlowMeter')) {
        const allowed = ALLOWED_KEYS.FlowMeter;
        Object.keys(mergedState).forEach(key => {
            if (!allowed.includes(key)) {
                delete mergedState[key];
            }
        });
    }

    // Write Back
    try {
        fs.writeFileSync(deviceFile, JSON.stringify(mergedState, null, 2));
        console.log(`[DeviceTracker] Updated ${deviceName}.json`);
    } catch (e) {
        console.error(`[DeviceTracker] Error writing ${deviceName}.json`, e);
    }
});

client.on('error', (err) => {
    console.error('[DeviceTracker] MQTT Error:', err);
});
