const mqtt = require('mqtt');

const BROKER_URL = 'mqtt://broker.emqx.io:1883';
const TOPICS = [
    'devices/+/telemetry', '/devices/+/telemetry',
    'device/+/telemetry', '/device/+/telemetry'
];

console.log(`[Spy] Connecting to ${BROKER_URL}...`);
const client = mqtt.connect(BROKER_URL, {
    clientId: 'spy_' + Math.random().toString(16).substr(2, 8)
});

client.on('connect', () => {
    console.log('[Spy] Connected. Subscribing to: ' + TOPICS.join(', '));
    client.subscribe(TOPICS);
});

client.on('message', (topic, message) => {
    try {
        const payload = JSON.parse(message.toString());

        // Log EVERYTHING for FlowMeter or Inverter to see cross-talk
        if (topic.toLowerCase().includes('flowmeter') || (payload.DeviceName && payload.DeviceName.includes('FlowMeter'))) {
            console.log(`\n[${topic}] Payload for ${payload.DeviceName || 'Unknown'}:`);
            console.log(JSON.stringify(payload, null, 2));

            if (JSON.stringify(payload).includes('hourly_nonsolar_consumption')) {
                console.error('!!! CONTAMINATION DETECTED !!!');
            }
        }
    } catch (e) {
        // ignore non-json
    }
});
