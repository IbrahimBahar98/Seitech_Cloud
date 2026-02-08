try {
    require('mqtt');
    console.log('MQTT required successfully');
} catch (e) {
    console.error('Failed to require mqtt:', e.message);
}
