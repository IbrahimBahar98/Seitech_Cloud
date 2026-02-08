const mqtt = require('mqtt');

// Configuration
const BROKER_URL = 'mqtt://broker.emqx.io:1883'; // TCP connection
const TOPIC = 'device/Inverter_1/event'; // Changed to event

console.log(`[EventTest] Connecting to ${BROKER_URL}...`);
const client = mqtt.connect(BROKER_URL, {
    clientId: 'event_tester_' + Math.random().toString(16).substr(2, 8)
});

const payload = [
    { "DeviceName": "Inverter_1", "propagate": false, "title": "Inverter-1: is Protected", "type": "Inverter protection status" },
    { "DeviceName": "Inverter_1", "propagate": true, "title": "Inverter-1: Over Temperature current Setpoint is 50 °C.", "type": "SetPointTemp" },
    { "DeviceName": "Inverter_1", "propagate": true, "title": "Inverter-1: No Set Password", "type": "No Set Password" }
];

client.on('connect', () => {
    console.log('[EventTest] Connected');

    // Publish the event payload
    console.log(`[EventTest] Publishing to ${TOPIC}...`);
    client.publish(TOPIC, JSON.stringify(payload), { qos: 1 }, (err) => {
        if (err) {
            console.error('[EventTest] Publish error:', err);
        } else {
            console.log('[EventTest] Message published successfully to ' + TOPIC);
        }
        client.end();
    });
});

client.on('error', (err) => {
    console.error('[EventTest] MQTT Error:', err);
    client.end();
});
