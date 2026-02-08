"use client";

import { useEffect } from 'react';
import { DeviceDashboard } from "@/components/DeviceDashboard";
import { DEVICE_TYPES } from "@/lib/device-config";

export default function DevicePage({ params }: { params: { type: string; id: string } }) {
    // Check if type exists in config
    const isValidType = DEVICE_TYPES.some(d => d.id === params.type);

    if (!isValidType) {
        return <div className="flex h-screen items-center justify-center text-gray-500">Invalid Device Type</div>;
    }

    return (
        <>
            {/* Dynamic background effect */}
            <div className="absolute top-0 left-0 w-full h-[500px] bg-primary/5 rounded-full blur-[120px] -translate-y-1/2 pointer-events-none" />

            <DeviceDashboard type={params.type} id={params.id} />
        </>
    );
}
