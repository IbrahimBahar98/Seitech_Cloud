import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

// Force this route to be dynamic so it reads fresh files on every request
export const dynamic = 'force-dynamic';

export async function GET() {
    try {
        const logDir = path.join(process.cwd(), 'server_logs');

        // Return empty if directory doesn't exist
        if (!fs.existsSync(logDir)) {
            return NextResponse.json({});
        }

        const files = fs.readdirSync(logDir);
        const telemetry: Record<string, any> = {};

        files.forEach(file => {
            if (file.endsWith('.json')) {
                const filePath = path.join(logDir, file);
                try {
                    const content = fs.readFileSync(filePath, 'utf8');
                    const data = JSON.parse(content);

                    // Use DeviceName from file, or filename as fallback
                    // We structure it exactly as the frontend expects: { DeviceName: ..., data: ... }
                    // The persisted logs are already "merged" states, so we can treat them as the current truth.

                    const deviceName = data.DeviceName || file.replace('.json', '');

                    // Note: The frontend expects { DeviceName, timestamp, data }
                    // The persisted file usually has data properties at the root or under 'data'.
                    // Our reproduction script showed that "mergedState" has properties at the root.
                    // But mqtt-context expects { [DeviceName]: { DeviceName, timestamp, data: ... } }
                    // Let's adapt the structure.

                    // If the file content IS the data (flat structure), wrap it.
                    telemetry[deviceName] = {
                        DeviceName: deviceName,
                        timestamp: data.timestamp || Date.now(), // Use file timestamp if meaningful, or now? 
                        // Actually, 'last_system_update' might be in the file.
                        // Let's assume the whole object IS the 'data' part for the frontend state.
                        data: data
                    };

                } catch (e) {
                    console.error(`Error parsing ${file}:`, e);
                }
            }
        });

        return NextResponse.json(telemetry);
    } catch (error) {
        console.error('API Error:', error);
        return NextResponse.json({ error: 'Failed to fetch telemetry' }, { status: 500 });
    }
}
