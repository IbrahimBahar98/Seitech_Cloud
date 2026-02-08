const mqtt = require('mqtt');
const fs = require('fs');
const path = require('path');

// Configuration
const BROKER_URL = 'mqtt://broker.emqx.io:1883'; // TCP connection
const TOPIC = 'device/FlowMeter_1/telemetry';

console.log(`[TestSeparation] Connecting to ${BROKER_URL}...`);
const client = mqtt.connect(BROKER_URL, {
    clientId: 'separation_tester_' + Math.random().toString(16).substr(2, 8)
});

// Clean payload - ONLY FlowMeter data
const payload = {
    "DeviceName": "FlowMeter_1",
    "data": {
        "water_pumped_flow_rate_per_hour": 100.5,
        "totalWaterVolume_m3": 500.0,
        "flowmeter_conductivity": 350
    }
};

client.on('connect', () => {
    console.log('[TestSeparation] Connected');

    // Publish clean payload
    console.log(`[TestSeparation] Publishing CLEAN data to ${TOPIC}...`);
    client.publish(TOPIC, JSON.stringify(payload), { qos: 1 }, (err) => {
        if (err) {
            console.error('[TestSeparation] Publish error:', err);
        } else {
            console.log('[TestSeparation] Message published successfully!');
        }

        // Wait a bit for the logger to process it
        setTimeout(() => {
            const logPath = path.join(__dirname, '..', 'server_logs', 'FlowMeter_1.json');
            if (fs.existsSync(logPath)) {
                const content = fs.readFileSync(logPath, 'utf8');
                const data = JSON.parse(content);
                console.log('\n[Verify] Content of FlowMeter_1.json:');
                console.log(content);

                if (data.hourly_nonsolar_consumption) {
                    console.error('\nFAILURE: "hourly_nonsolar_consumption" is present! Contamination persists.');
                } else {
                    console.log('\nSUCCESS: Data is clean. Contamination was likely from external source.');
                }
            } else {
                console.error('Log file not found.');
            }
            client.end();
        }, 2000);
    });
});

client.on('error', (err) => {
    console.error('[TestSeparation] MQTT Error:', err);
    client.end();
});
