const fs = require('fs');
const path = require('path');

// Simulate the logic from mqtt-device-state.js
const simulateMerge = () => {
    const existingState = {
        "DeviceName": "Inverter_Test",
        "timestamp": 123456789,
        "frequency": 50,
        "power": 100,
        "StartCommandMode": {
            "id": "0x8200",
            "value": "KeypadControl"
        }
    };

    console.log("Initial State:", JSON.stringify(existingState, null, 2));

    // Case 1: Partial update with flat values
    // "others are not sent" (e.g. power is missing, StartCommandMode is missing)
    const payload1 = {
        "DeviceName": "Inverter_Test",
        "data": {
            "frequency": 50.1
        }
    };

    let newData = payload1.data || payload1;
    let mergedState = { ...existingState };

    if (typeof newData === 'object' && newData !== null) {
        Object.keys(newData).forEach(key => {
            const val = newData[key];
            if (val !== null && val !== undefined) {
                mergedState[key] = val;
            }
        });
    }

    console.log("\n--- After Partial Update (Frequency only) ---");
    console.log(JSON.stringify(mergedState, null, 2));

    // Check if other fields are preserved
    if (mergedState.power === 100 && mergedState.StartCommandMode.value === "KeypadControl") {
        console.log("SUCCESS: 'power' and 'StartCommandMode' preserved.");
    } else {
        console.error("FAILURE: internal state lost.");
    }

    // Case 2: Update replacing object with primitive? (Unlikely based on user report of '--', but checking)
    // Case 3: Update with nulls (should be ignored)
    const payload2 = {
        "DeviceName": "Inverter_Test",
        "data": {
            "power": null
        }
    };

    newData = payload2.data || payload2;
    // mergedState carries over from previous step
    let mergedState2 = { ...mergedState };

    if (typeof newData === 'object' && newData !== null) {
        Object.keys(newData).forEach(key => {
            const val = newData[key];
            if (val !== null && val !== undefined) {
                mergedState[key] = val; // Should not execute for null
                mergedState2[key] = val;
            }
        });
    }

    console.log("\n--- After Null Update (Power = null) ---");
    console.log(JSON.stringify(mergedState2, null, 2));

    if (mergedState2.power === 100) {
        console.log("SUCCESS: 'power' preserved (null ignored).");
    } else {
        console.error("FAILURE: 'power' overwritten by null/undefined.");
    }
};

simulateMerge();
