const mqtt = require('mqtt');

// Configuration
const BROKER_URL = 'wss://broker.emqx.io:8084/mqtt';

// Device Definitions
const DEVICES = [
    {
        id: 'Inverter_1',
        topic: '/device/Inverter_1/telemetry',
        topic_alarm: '/device/Inverter_1/alarm',
        type: 'inv',
        data: () => ({
            pump_power: (Math.random() * 10 + 10).toFixed(2),      // 10-20 kW
            frequency: (Math.random() * 2 + 49).toFixed(1),        // 49-51 Hz
            bus_voltage: (Math.random() * 20 + 540).toFixed(0),    // 540-560 V
            pump_current: (Math.random() * 2 + 7).toFixed(1),      // 7-9 A
            accumulated_nonsolar_consumption: (Math.random() * 1000).toFixed(1),
            accumulated_solar_consumption: (Math.random() * 5000).toFixed(1),
            money_saved: (Math.random() * 500).toFixed(2),
            TotalCO2Mitigated: (Math.random() * 1000).toFixed(1),
            StartCommandMode: "AUTO"
        })
    },
    {
        id: 'FlowMeter_1',
        topic: '/device/FlowMeter_1/telemetry',
        topic_alarm: '/device/FlowMeter_1/alarm',
        type: 'fm',
        data: () => ({
            water_pumped_flow_rate_per_hour: (Math.random() * 50 + 100).toFixed(1), // 100-150 m3/h
            totalWaterVolume_m3: (Math.random() * 10000).toFixed(1),
            flowmeter_conductivity: (Math.random() * 100 + 400).toFixed(0), // 400-500 uS/cm
            hourly_nonsolar_consumption: (Math.random() * 10).toFixed(2)
        })
    },
    {
        id: 'EnergyMeter_1',
        topic: '/device/EnergyMeter_1/telemetry',
        topic_alarm: '/device/EnergyMeter_1/alarm',
        type: 'em',
        data: () => ({
            total_active_power: (Math.random() * 20 + 5).toFixed(2),  // 5-25 kW
            em_voltage_a: (Math.random() * 5 + 225).toFixed(1),       // 225-230 V
            em_current_a: (Math.random() * 10 + 20).toFixed(1),       // 20-30 A
            em_power_factor: (Math.random() * 0.1 + 0.9).toFixed(2),  // 0.9-1.0
            em_frequency: (Math.random() * 0.2 + 49.9).toFixed(2),    // 49.9-50.1 Hz
            em_energy_total: (Math.random() * 10000).toFixed(1),
            daily_nonsolar_consumption: (Math.random() * 50).toFixed(1)
        })
    }
];

console.log(`Connecting to ${BROKER_URL}...`);

const client = mqtt.connect(BROKER_URL, {
    clientId: `simulator_${Math.random().toString(16).slice(2, 8)}`,
    clean: true
});

client.on('connect', () => {
    console.log('Connected!');
    console.log(`Simulating ${DEVICES.map(d => d.id).join(', ')}`);
    console.log('Press Ctrl+C to stop.');

    // Publish Telemetry for all devices every 1 second
    setInterval(publishAllTelemetry, 1000);

    // Publish random Alarm every 30 seconds
    setInterval(publishRandomAlarm, 30000);
});

client.on('error', (err) => {
    console.error('Connection error:', err);
    client.end();
});

function publishAllTelemetry() {
    DEVICES.forEach(device => {
        // Generate data payload
        // Ensure values are numbers where appropriate for the dashboard graph
        const rawData = device.data();
        const cleanData = {};
        for (const [key, val] of Object.entries(rawData)) {
            cleanData[key] = isNaN(val) ? val : Number(val);
        }

        const payload = {
            DeviceName: device.id,
            data: cleanData
        };

        client.publish(device.topic, JSON.stringify(payload));
        console.log(`[${device.id}] Sent telemetry:`, Object.keys(cleanData).length, 'attributes');
    });
}

function publishRandomAlarm() {
    const device = DEVICES[Math.floor(Math.random() * DEVICES.length)];
    const payload = {
        DeviceName: device.id,
        data: {
            title: "Simulated Alert",
            type: Math.random() > 0.5 ? "Alarm" : "Event",
            severity: Math.floor(Math.random() * 3) + 1, // 1-3
            status: 1
        }
    };

    client.publish(device.topic_alarm, JSON.stringify(payload));
    console.log(`[${device.id}] Sent ${payload.data.type}`);
}
