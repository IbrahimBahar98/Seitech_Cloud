const mqtt = require('mqtt');
const fs = require('fs');
const path = require('path');

// Configuration
const BROKER_URL = 'mqtt://broker.emqx.io:1883'; // Use TCP for Node.js, not WSS
const TOPICS = [
    'devices/+/telemetry', '/devices/+/telemetry',
    'device/+/telemetry', '/device/+/telemetry',
    'device/+/alarm', '/device/+/alarm',
    'device/+/event', '/device/+/events',
    'device/+/events'
];

const LOG_DIR = path.join(__dirname, '..', 'server_logs');
const LOG_FILE = path.join(LOG_DIR, 'mqtt_data.jsonl');

// Ensure log directory exists
if (!fs.existsSync(LOG_DIR)) {
    fs.mkdirSync(LOG_DIR);
}

console.log(`[Logger] Connecting to ${BROKER_URL}...`);
const client = mqtt.connect(BROKER_URL, {
    clientId: 'logger_' + Math.random().toString(16).substr(2, 8)
});

client.on('connect', () => {
    console.log('[Logger] Connected');
    client.subscribe(TOPICS, (err) => {
        if (!err) console.log(`[Logger] Subscribed to: ${TOPICS.join(', ')}`);
    });
});

client.on('message', (topic, message) => {
    const timestamp = new Date().toISOString();
    const payloadStr = message.toString();

    // Create log entry
    const logEntry = {
        timestamp,
        topic,
        payload: payloadStr // Store as string to avoid parsing errors blocking logging
    };

    // Try to parse JSON for cleaner logging if possible
    try {
        logEntry.payload = JSON.parse(payloadStr);
    } catch (e) {
        // Keep as string
    }

    const logLine = JSON.stringify(logEntry) + '\n';

    fs.appendFile(LOG_FILE, logLine, (err) => {
        if (err) console.error('[Logger] Write Error:', err);
    });

    console.log(`[${timestamp}] ${topic}: Data saved.`);
});

client.on('error', (err) => {
    console.error('[Logger] MQTT Error:', err);
});
