"use client";

import React, { useState, useMemo } from 'react';
import { AlertTriangle, Info, XCircle, Filter } from 'lucide-react';
import { db } from '@/lib/db';
import { useLiveQuery } from 'dexie-react-hooks';
import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

interface AlertLoggerProps {
    deviceName?: string;
    filterType?: 'Alarm' | 'Event' | 'All';
}

export const AlertLogger = ({ deviceName, filterType = 'All' }: AlertLoggerProps) => {
    // Live Query from DB
    const alerts = useLiveQuery(
        () => db.alarms
            .reverse() // Newest first
            .limit(100)
            .toArray(),
        []
    ) || [];

    // DEBUG: Trace Alarms
    // console.log('[AlertLogger] Alerts from DB:', alerts);

    const [activeTab, setActiveTab] = useState<string>("All");

    // Extract unique device names for tabs
    const deviceTabs = useMemo(() => {
        if (deviceName) return [];
        // Extract from DB records (stored in 'data' field or top level depending on how we saved it)
        // In mqtt-context we saved { deviceName, ..., data: alertObject }
        // Let's assume we map it back to a flat structure for display
        const devices = new Set(alerts.map(a => a.deviceName));
        return ["All", ...Array.from(devices).sort()];
    }, [alerts, deviceName]);

    // Filter alerts
    const filteredAlerts = useMemo(() => {
        let result = alerts.map(a => ({ ...a.data, timestamp: a.timestamp })); // Flatten for display

        if (deviceName) {
            result = result.filter(a => a.DeviceName === deviceName);
        } else if (activeTab !== "All") {
            result = result.filter(a => a.DeviceName === activeTab);
        }

        if (filterType !== 'All') {
            result = result.filter(a => {
                // Use category if available, otherwise fallback to rough type string match or assume Alarm if invalid
                if (a.category) return a.category === filterType;

                // Fallback for old data:
                // Events usually have 'Event' in type or are specific. Alarms usually have 'Alarm' or 'Fault'
                // But simplified: if we are asking for Events, check if type includes 'Event'
                if (filterType === 'Event') return a.type?.toLowerCase().includes('event');
                if (filterType === 'Alarm') return !a.type?.toLowerCase().includes('event');
                return true;
            });
        }

        return result;
    }, [alerts, activeTab, deviceName, filterType]);

    return (
        <div className="glass-panel p-6 h-[500px] flex flex-col animate-in fade-in zoom-in duration-500">
            <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-3">
                    <div className="p-2 rounded-lg bg-orange-500/10 text-orange-500">
                        <AlertTriangle size={20} />
                    </div>
                    <h2 className="text-lg font-semibold text-white">System Alerts</h2>
                </div>
                <div className="text-xs text-gray-400 px-3 py-1 rounded-full bg-white/5 border border-white/10">
                    {filteredAlerts.length} Events
                </div>
            </div>

            {/* Tabs */}
            <div className="flex gap-2 overflow-x-auto pb-4 mb-2 custom-scrollbar">
                {deviceTabs.map(tab => (
                    <button
                        key={tab}
                        onClick={() => setActiveTab(tab)}
                        className={clsx(
                            "px-4 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap transition-all",
                            activeTab === tab
                                ? "bg-primary text-white shadow-lg shadow-primary/25"
                                : "bg-white/5 text-gray-400 hover:bg-white/10 hover:text-white"
                        )}
                    >
                        {tab}
                    </button>
                ))}
            </div>

            {/* Alert List */}
            <div className="flex-1 overflow-y-auto space-y-3 pr-2 custom-scrollbar">
                {filteredAlerts.length === 0 ? (
                    <div className="h-full flex flex-col items-center justify-center text-gray-500 gap-2">
                        <Info size={32} className="opacity-50" />
                        <span className="text-sm">No alerts received</span>
                    </div>
                ) : (
                    filteredAlerts.map((alert, idx) => (
                        <div
                            key={`${alert.timestamp}-${idx}`}
                            className="group flex gap-4 p-4 rounded-xl bg-white/5 border border-white/5 hover:bg-white/10 hover:border-primary/30 transition-all duration-300"
                        >
                            <div className={clsx(
                                "w-1 shrink-0 rounded-full",
                                alert.severity >= 3 ? "bg-red-500" : alert.severity === 2 ? "bg-orange-500" : "bg-blue-500"
                            )} />

                            <div className="flex-1 min-w-0">
                                <div className="flex items-center justify-between mb-1">
                                    <span className="text-xs font-bold text-gray-400 uppercase tracking-wider">
                                        {alert.DeviceName}
                                    </span>
                                    <span className="text-[10px] text-gray-500 font-mono">
                                        {new Date(alert.timestamp).toLocaleTimeString()}
                                    </span>
                                </div>
                                <h4 className="text-sm font-medium text-white group-hover:text-primary transition-colors">
                                    {alert.title}
                                </h4>
                                <p className="text-xs text-gray-400 mt-1">
                                    Type: {alert.type} | Status: {alert.status}
                                </p>
                            </div>
                        </div>
                    ))
                )}
            </div>
        </div>
    );
};
