"use client";

import React, { useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { useMQTT } from '@/lib/mqtt-context';
import { useConfig } from '@/lib/config-context';
import { Activity, Zap, Droplets, Server, Wifi, AlertTriangle } from 'lucide-react';
import { clsx } from 'clsx';
import { ResponsiveContainer, PieChart, Pie, Cell, Tooltip } from 'recharts';

export default function Dashboard() {
    const { deviceTypes, getCustomName } = useConfig();
    const { telemetry, isConnected } = useMQTT();
    const router = useRouter();

    // 1. Aggregate Data
    const stats = useMemo(() => {
        let totalDevices = 0;
        let onlineDevices = 0;
        let totalPower = 0;
        let totalFlow = 0;
        let activeAlarms = 0; // Placeholder for now

        const devices: any[] = [];

        deviceTypes.forEach(type => {
            // We need to know HOW MANY of each type exist. 
            // Currently `defaultCount` in config is the source of truth for "configured" devices 
            // until we have a true device registry.
            // For the checklist, we'll iterate up to defaultCount.

            for (let i = 1; i <= type.defaultCount; i++) {
                totalDevices++;
                const id = i.toString();
                const mqttName = `${type.deviceNamePrefix || type.singularLabel.replace(' ', '')}_${id}`;
                const data = telemetry[mqttName];
                const lastSeen = data ? Date.now() - data.timestamp : Infinity;
                const isOnline = lastSeen < 60000; // Online if data < 1 min old

                if (isOnline) onlineDevices++;

                // Extract key metrics
                let mainMetric = 0;
                let unit = '';

                if (type.id === 'inv') {
                    mainMetric = Number(data?.data?.pump_power?.value || 0);
                    totalPower += mainMetric;
                    unit = 'kW';
                } else if (type.id === 'fm') {
                    mainMetric = Number(data?.data?.water_pumped_flow_rate_per_hour?.value || 0);
                    totalFlow += mainMetric;
                    unit = 'm3/h';
                } else if (type.id === 'em') {
                    mainMetric = Number(data?.data?.total_active_power?.value || 0);
                    totalPower += mainMetric; // Add EM power? Or separate? Let's add for now.
                    unit = 'kW';
                }

                devices.push({
                    type: type.id,
                    id,
                    name: getCustomName(type.id, id) || `${type.singularLabel} ${id}`,
                    mqttName,
                    status: isOnline ? 'Online' : 'Offline',
                    lastSeen: data?.timestamp,
                    mainValue: mainMetric,
                    unit,
                    icon: type.icon
                });
            }
        });

        return { totalDevices, onlineDevices, totalPower, totalFlow, devices };
    }, [deviceTypes, telemetry, getCustomName]);

    return (
        <div className="max-w-7xl mx-auto space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700 p-6 md:p-12">

            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h1 className="text-3xl font-bold text-gray-900 dark:text-white flex items-center gap-3">
                        <Server className="text-primary" />
                        System Overview
                    </h1>
                    <p className="text-gray-500 mt-1">Real-time status of all connected devices</p>
                </div>
                <div className={clsx(
                    "px-4 py-2 rounded-full border text-sm font-medium flex items-center gap-2 w-fit",
                    isConnected
                        ? "bg-green-500/10 text-green-600 border-green-500/20"
                        : "bg-red-500/10 text-red-600 border-red-500/20"
                )}>
                    <Wifi size={16} />
                    {isConnected ? "System Online" : "Disconnected"}
                </div>
            </div>

            {/* KPI Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                <KPICard
                    title="Total Devices"
                    value={stats.totalDevices}
                    icon={Server}
                    subtext={`${stats.onlineDevices} Online`}
                    trend="neutral"
                />
                <KPICard
                    title="Active Power"
                    value={stats.totalPower.toFixed(1)}
                    unit="kW"
                    icon={Zap}
                    trend="up" // Mock
                />
                <KPICard
                    title="Total Flow"
                    value={stats.totalFlow.toFixed(1)}
                    unit="m3/h"
                    icon={Droplets}
                    trend="down" // Mock
                />
                <KPICard
                    title="System Health"
                    value={Math.round((stats.onlineDevices / (stats.totalDevices || 1)) * 100)}
                    unit="%"
                    icon={Activity}
                    trend="neutral"
                />
            </div>

            {/* Device List */}
            <div className="glass-panel border border-gray-200 dark:border-white/10 overflow-hidden">
                <div className="p-6 border-b border-gray-200 dark:border-white/10 flex justify-between items-center">
                    <h2 className="font-semibold text-lg">Connected Devices</h2>
                </div>
                <div className="overflow-x-auto">
                    <table className="w-full text-left text-sm">
                        <thead className="bg-gray-50 dark:bg-white/5 text-gray-500 font-medium">
                            <tr>
                                <th className="px-6 py-4">Device Name</th>
                                <th className="px-6 py-4">System ID</th>
                                <th className="px-6 py-4">Status</th>
                                <th className="px-6 py-4">Last Seen</th>
                                <th className="px-6 py-4 text-right">Primary Metric</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-200 dark:divide-white/5">
                            {stats.devices.map((device) => (
                                <tr
                                    key={device.mqttName}
                                    onClick={() => router.push(`/device/${device.type}/${device.id}`)}
                                    className="group hover:bg-gray-50 dark:hover:bg-white/5 cursor-pointer transition-colors"
                                >
                                    <td className="px-6 py-4 font-medium text-gray-900 dark:text-white flex items-center gap-3">
                                        <div className="p-2 rounded-lg bg-gray-100 dark:bg-white/10 text-gray-500 group-hover:text-primary transition-colors">
                                            <device.icon size={18} />
                                        </div>
                                        {device.name}
                                    </td>
                                    <td className="px-6 py-4 text-gray-500 font-mono text-xs">{device.mqttName}</td>
                                    <td className="px-6 py-4">
                                        <span className={clsx(
                                            "px-2 py-1 rounded-full text-xs font-medium border",
                                            device.status === 'Online'
                                                ? "bg-green-500/10 text-green-600 border-green-500/20"
                                                : "bg-gray-100 text-gray-500 border-gray-200 dark:bg-white/5 dark:text-gray-400 dark:border-white/10"
                                        )}>
                                            {device.status}
                                        </span>
                                    </td>
                                    <td className="px-6 py-4 text-gray-500">
                                        {device.lastSeen
                                            ? new Date(device.lastSeen).toLocaleTimeString()
                                            : '--:--'}
                                    </td>
                                    <td className="px-6 py-4 text-right font-medium text-gray-900 dark:text-white">
                                        {device.mainValue > 0 ? device.mainValue.toFixed(1) : '--'} <span className="text-gray-500 text-xs ml-1">{device.unit}</span>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
}

const KPICard = ({ title, value, unit, icon: Icon, subtext, trend }: any) => (
    <div className="glass-panel p-6 border border-gray-200 dark:border-white/10 relative overflow-hidden group">
        <div className="absolute top-0 right-0 p-3 opacity-10 group-hover:opacity-20 transition-opacity">
            <Icon size={64} />
        </div>
        <div className="flex items-center gap-3 mb-4">
            <div className="p-2 rounded-lg bg-primary/10 text-primary">
                <Icon size={20} />
            </div>
            <h3 className="text-gray-500 font-medium text-sm">{title}</h3>
        </div>
        <div className="flex items-baseline gap-1">
            <span className="text-3xl font-bold text-gray-900 dark:text-white">{value}</span>
            {unit && <span className="text-sm text-gray-500 font-medium">{unit}</span>}
        </div>
        {subtext && <p className="text-xs text-gray-500 mt-2">{subtext}</p>}
    </div>
);
