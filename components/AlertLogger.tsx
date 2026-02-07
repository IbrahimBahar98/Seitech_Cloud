"use client";

import React, { useState, useMemo } from 'react';
import { AlertTriangle, Info, XCircle, Filter } from 'lucide-react';
import { useMQTT, AlertData } from '@/lib/mqtt-context';
import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

interface AlertLoggerProps {
    deviceName?: string;
    filterType?: 'Alarm' | 'Event' | 'All';
}

export const AlertLogger = ({ deviceName, filterType = 'All' }: AlertLoggerProps) => {
    const { alerts } = useMQTT();
    const [activeTab, setActiveTab] = useState<string>("All");

    // Extract unique device names for tabs - Only if deviceName is NOT provided
    const deviceTabs = useMemo(() => {
        if (deviceName) return [];
        const devices = new Set(alerts.map(a => a.DeviceName));
        return ["All", ...Array.from(devices).sort()];
    }, [alerts, deviceName]);

    // Filter alerts based on active tab AND props
    const filteredAlerts = useMemo(() => {
        let result = alerts;

        // 1. Filter by Prop (if provided, ignore internal tab state for device)
        if (deviceName) {
            result = result.filter(a => a.DeviceName === deviceName);
        } else if (activeTab !== "All") {
            result = result.filter(a => a.DeviceName === activeTab);
        }

        // 2. Filter by Type
        if (filterType !== 'All') {
            result = result.filter(a => a.type === filterType); // Assuming payload 'type' matches 'Alarm'/'Event' case roughly
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
