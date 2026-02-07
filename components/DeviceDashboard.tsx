"use client";

import React, { useState, useEffect, useMemo } from 'react';
import { useMQTT } from '@/lib/mqtt-context';
import { Activity, Zap, Settings, X, Gauge as GaugeIcon, Check, Plus } from 'lucide-react';
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts';
import { clsx } from 'clsx';
import { AlertLogger } from './AlertLogger';
import { useConfig } from '@/lib/config-context';
import { Table, Terminal, Bell, AlertCircle } from 'lucide-react'; // Added icons


interface DeviceDashboardProps {
    type: string; // 'inv' or 'fm'
    id: string; // '1', '2', etc.
}

// Helper to map URL params to DeviceName using config
// We now use ConfigContext inside component

export const DeviceDashboard = ({ type, id }: DeviceDashboardProps) => {
    const { deviceTypes, getCustomName, renameDevice, addDeviceAttribute, removeDeviceAttribute } = useConfig();
    const { telemetry } = useMQTT();
    const [editMode, setEditMode] = useState(false);
    const [isRenaming, setIsRenaming] = useState(false);
    const [newName, setNewName] = useState("");

    // Add Card State
    const [isAddingCard, setIsAddingCard] = useState(false);
    const [newCard, setNewCard] = useState({ key: '', label: '', unit: '', iconStr: 'Activity' });
    const [activeTab, setActiveTab] = useState<'overview' | 'telemetry' | 'alarms' | 'events'>('overview');

    const handleAddCard = () => {
        if (newCard.key && newCard.label) {
            addDeviceAttribute(type, newCard);
            setNewCard({ key: '', label: '', unit: '', iconStr: 'Activity' });
            setIsAddingCard(false);
        }
    };

    const deviceType = deviceTypes.find(d => d.id === type);
    const [visibleCards, setVisibleCards] = useState<Record<string, boolean>>({});

    // Initialize/Update visible cards when type changes
    useEffect(() => {
        if (deviceType) {
            const initial: Record<string, boolean> = {
                graph: true,
                alerts: true
            };
            deviceType.attributes.forEach(attr => {
                initial[attr.key] = true;
            });
            setVisibleCards(initial);
        }
    }, [deviceType]);
    // Use stored custom name or fallback to default rule
    const customName = getCustomName(type, id);
    const defaultName = deviceType ? `${deviceType.singularLabel} ${id}` : `${type} ${id}`;
    const displayName = customName || defaultName;

    // Use prefix for MQTT matching
    const mqttDeviceName = deviceType ? `${deviceType.deviceNamePrefix || deviceType.singularLabel.replace(' ', '')}_${id}` : `${type}_${id}`;
    const deviceData = telemetry[mqttDeviceName];

    // Mock historical data for graph (in real app, accumulate this in context or fetch from API)
    const [graphData, setGraphData] = useState<any[]>([]);

    useEffect(() => {
        if (deviceData) {
            setGraphData(prev => {
                let val = 0;
                if (type === 'inv') val = Number(deviceData.data?.pump_power?.value || 0);
                else if (type === 'fm') val = Number(deviceData.data?.water_pumped_flow_rate_per_hour?.value || 0);
                else if (type === 'em') val = Number(deviceData.data?.total_active_power?.value || 0);

                const newData = {
                    time: new Date(deviceData.timestamp).toLocaleTimeString(),
                    value: val,
                };
                const newArr = [...prev, newData];
                if (newArr.length > 20) newArr.shift();
                return newArr;
            });
        }
    }, [deviceData, type]);

    // Telemetry History
    const [history, setHistory] = useState<any[]>([]);
    useEffect(() => {
        if (deviceData) {
            setHistory(prev => {
                const newItem = {
                    timestamp: deviceData.timestamp,
                    data: deviceData.data
                };
                // Keep last 100 entries
                const newArr = [newItem, ...prev];
                if (newArr.length > 100) newArr.pop();
                return newArr;
            });
        }
    }, [deviceData]);

    const handleRename = () => {
        if (newName.trim()) {
            renameDevice(type, id, newName);
            setIsRenaming(false);
        }
    };

    const toggleCard = (key: string) => {
        setVisibleCards(prev => ({ ...prev, [key]: !prev[key] }));
    };

    const ValueCard = ({ title, value, unit, id, icon: Icon }: any) => {
        // Default to visible if key is undefined (newly added cards)
        if (visibleCards[id] === false && !editMode) return null;

        return (
            <div className={clsx(
                "glass-panel p-6 relative group transition-all duration-300 dark:bg-white/5 bg-white shadow-sm border border-gray-200 dark:border-white/10",
                editMode && visibleCards[id] === false ? "opacity-40 grayscale" : "hover:border-primary/50"
            )}>
                {editMode && (
                    <button
                        onClick={() => toggleCard(id)}
                        className="absolute top-2 right-2 p-1.5 rounded-full bg-black/10 dark:bg-white/10 hover:bg-black/20 dark:hover:bg-white/20 text-gray-500 dark:text-white z-10"
                    >
                        {visibleCards[id] !== false ? <X size={14} /> : <div className="w-3.5 h-3.5 rounded-full border border-gray-400 dark:border-white" />}
                    </button>
                )}

                <div className="flex items-center gap-3 mb-4">
                    <div className="p-2.5 rounded-xl bg-blue-500/10 text-primary">
                        <Icon size={20} />
                    </div>
                    <h3 className="text-gray-500 dark:text-gray-400 font-medium text-sm">{title}</h3>
                </div>

                <div className="flex items-end gap-2">
                    <span className="text-3xl font-bold text-gray-900 dark:text-white tracking-tight">
                        {value ?? '--'}
                    </span>
                    <span className="text-sm text-gray-500 mb-1.5 font-medium">{unit}</span>
                </div>
            </div>
        );
    };

    const graphLabel = type === 'inv' ? "Power" : type === 'fm' ? "Flow Rate" : "Active Power";

    return (
        <div className="max-w-7xl mx-auto space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    {isRenaming ? (
                        <div className="flex items-center gap-2">
                            <input
                                type="text"
                                autoFocus
                                className="bg-transparent border-b border-primary text-3xl font-bold text-gray-900 dark:text-white focus:outline-none"
                                value={newName}
                                onChange={(e) => setNewName(e.target.value)}
                                onKeyDown={(e) => e.key === 'Enter' && handleRename()}
                                onBlur={() => setIsRenaming(false)}
                                placeholder={displayName}
                            />
                            <button onClick={handleRename} className="p-1 text-green-500"><Settings size={20} /></button>
                        </div>
                    ) : (
                        <h1
                            className="text-3xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-gray-900 to-gray-500 dark:from-white dark:to-gray-400 cursor-pointer hover:opacity-80 flex items-center gap-3"
                            onClick={() => {
                                setNewName(displayName);
                                setIsRenaming(true);
                            }}
                            title="Click to rename"
                        >
                            {displayName}
                            <span className="opacity-0 group-hover:opacity-100 text-xs text-gray-500 font-normal border border-gray-500/30 px-2 py-0.5 rounded">
                                {mqttDeviceName}
                            </span>
                        </h1>
                    )}
                    <p className="text-gray-500 mt-1">Real-time monitoring dashboard</p>
                </div>

                <button
                    onClick={() => setEditMode(!editMode)}
                    className={clsx(
                        "flex items-center gap-2 px-4 py-3 rounded-xl border transition-all duration-300",
                        editMode
                            ? "bg-primary text-white border-primary shadow-lg shadow-primary/25"
                            : "bg-white/5 border-gray-200 dark:border-white/10 text-gray-400 hover:bg-black/5 dark:hover:bg-white/10"
                    )}
                >
                    <Settings size={18} className={clsx(editMode && "animate-spin-slow")} />
                    <span className="text-sm font-medium">{editMode ? 'Done Editing' : 'Customize View'}</span>
                </button>
            </div>

            {/* Tab Navigation */}
            <div className="flex items-center gap-8 border-b border-gray-200 dark:border-white/10 overflow-x-auto mb-6">
                <button
                    onClick={() => setActiveTab('overview')}
                    className={clsx(
                        "pb-4 text-sm font-medium transition-colors relative",
                        activeTab === 'overview' ? "text-primary border-b-2 border-primary" : "text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
                    )}
                >
                    <div className="flex items-center gap-2">
                        <Activity size={16} />
                        OVERVIEW
                    </div>
                </button>
                <button
                    onClick={() => setActiveTab('telemetry')}
                    className={clsx(
                        "pb-4 text-sm font-medium transition-colors relative",
                        activeTab === 'telemetry' ? "text-primary border-b-2 border-primary" : "text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
                    )}
                >
                    <div className="flex items-center gap-2">
                        <Terminal size={16} />
                        TELEMETRIES
                    </div>
                </button>
                <button
                    onClick={() => setActiveTab('alarms')}
                    className={clsx(
                        "pb-4 text-sm font-medium transition-colors relative",
                        activeTab === 'alarms' ? "text-primary border-b-2 border-primary" : "text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
                    )}
                >
                    <div className="flex items-center gap-2">
                        <Bell size={16} />
                        ALARMS
                    </div>
                </button>
                <button
                    onClick={() => setActiveTab('events')}
                    className={clsx(
                        "pb-4 text-sm font-medium transition-colors relative",
                        activeTab === 'events' ? "text-primary border-b-2 border-primary" : "text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
                    )}
                >
                    <div className="flex items-center gap-2">
                        <AlertCircle size={16} />
                        EVENTS
                    </div>
                </button>
            </div>

            {/* Tab: Overview */}
            {activeTab === 'overview' && (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 animate-in fade-in slide-in-from-bottom-2 duration-500">
                    {/* Telemetry Cards - Dynamic Rendering */}
                    {deviceType?.attributes.map((attr) => {
                        const val = deviceData?.data?.[attr.key];
                        // Handle value being an object {value: ..., id: ...} or direct scalar
                        const displayVal = (typeof val === 'object' && val !== null && 'value' in val)
                            ? val.value
                            : val;

                        // Icon mapping
                        const IconComp = attr.iconStr === 'Zap' ? Zap
                            : attr.iconStr === 'Droplets' ? Activity
                                : attr.iconStr === 'GaugeIcon' ? GaugeIcon
                                    : Activity;

                        return (
                            <ValueCard
                                key={attr.key}
                                id={attr.key}
                                title={attr.label}
                                value={displayVal}
                                unit={attr.unit}
                                icon={IconComp}
                            />
                        );
                    })}

                    {/* Add Card Button / Form */}
                    {editMode && (
                        <div className="glass-panel p-6 border-2 border-dashed border-gray-700 dark:border-white/20 hover:border-primary/50 flex flex-col items-center justify-center min-h-[140px] transition-colors relative">
                            {isAddingCard ? (
                                <div className="w-full space-y-3">
                                    <h3 className="font-semibold text-sm text-center mb-2">New Card</h3>
                                    <input
                                        className="w-full bg-black/20 rounded px-2 py-1.5 text-xs text-white border border-white/10 focus:border-primary focus:outline-none"
                                        placeholder="JSON Key (e.g. power)"
                                        value={newCard.key}
                                        onChange={e => setNewCard({ ...newCard, key: e.target.value })}
                                    />
                                    <input
                                        className="w-full bg-black/20 rounded px-2 py-1.5 text-xs text-white border border-white/10 focus:border-primary focus:outline-none"
                                        placeholder="Label (e.g. Pump Power)"
                                        value={newCard.label}
                                        onChange={e => setNewCard({ ...newCard, label: e.target.value })}
                                    />
                                    <div className="flex gap-2">
                                        <input
                                            className="w-2/3 bg-black/20 rounded px-2 py-1.5 text-xs text-white border border-white/10 focus:border-primary focus:outline-none"
                                            placeholder="Unit (e.g. kW)"
                                            value={newCard.unit}
                                            onChange={e => setNewCard({ ...newCard, unit: e.target.value })}
                                        />
                                        <button
                                            onClick={handleAddCard}
                                            className="flex-1 bg-green-500/20 text-green-400 rounded hover:bg-green-500/30 flex items-center justify-center"
                                        >
                                            <Check size={16} />
                                        </button>
                                        <button
                                            onClick={() => setIsAddingCard(false)}
                                            className="w-8 bg-red-500/20 text-red-400 rounded hover:bg-red-500/30 flex items-center justify-center"
                                        >
                                            <X size={16} />
                                        </button>
                                    </div>
                                </div>
                            ) : (
                                <button
                                    onClick={() => setIsAddingCard(true)}
                                    className="flex flex-col items-center gap-2 text-gray-500 hover:text-primary transition-colors"
                                >
                                    <div className="w-10 h-10 rounded-full bg-white/5 flex items-center justify-center">
                                        <Plus size={24} />
                                    </div>
                                    <span className="font-medium text-sm">Add New Card</span>
                                </button>
                            )}
                        </div>
                    )}

                    {/* Graph (Spans 2 cols) */}
                    {(visibleCards['graph'] || editMode) && (
                        <div className={clsx(
                            "col-span-1 md:col-span-2 lg:col-span-2 glass-panel p-6 relative transition-opacity",
                            editMode && !visibleCards['graph'] && "opacity-40 grayscale"
                        )}>
                            {editMode && (
                                <button onClick={() => toggleCard('graph')} className="absolute top-2 right-2 text-white bg-white/10 rounded-full p-1.5 z-10">
                                    {visibleCards['graph'] ? <X size={14} /> : <div className="w-3.5 h-3.5 border rounded-full" />}
                                </button>
                            )}
                            <h3 className="text-gray-400 font-medium text-sm mb-6 flex items-center gap-2">
                                <Activity size={16} className="text-primary" />
                                Live Trend ({graphLabel})
                            </h3>
                            <div className="h-[200px] w-full">
                                <ResponsiveContainer width="100%" height="100%">
                                    <LineChart data={graphData}>
                                        <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" vertical={false} />
                                        <XAxis dataKey="time" stroke="#6b7280" fontSize={10} tickLine={false} axisLine={false} />
                                        <YAxis stroke="#6b7280" fontSize={10} tickLine={false} axisLine={false} />
                                        <Tooltip
                                            contentStyle={{ backgroundColor: '#0f172a', borderColor: 'rgba(255,255,255,0.1)', borderRadius: '8px' }}
                                            itemStyle={{ color: '#fff' }}
                                        />
                                        <Line
                                            type="monotone"
                                            dataKey="value"
                                            stroke="#3b82f6"
                                            strokeWidth={3}
                                            dot={{ fill: '#3b82f6', strokeWidth: 0, r: 4 }}
                                            activeDot={{ r: 6, stroke: 'white', strokeWidth: 2 }}
                                            isAnimationActive={false}
                                        />
                                    </LineChart>
                                </ResponsiveContainer>
                            </div>
                        </div>
                    )}
                </div>
            )}

            {/* Tab: Telemetries */}
            {activeTab === 'telemetry' && (
                <div className="glass-panel overflow-hidden animate-in fade-in slide-in-from-bottom-2 duration-500">
                    <div className="overflow-x-auto">
                        <table className="w-full text-left text-sm">
                            <thead className="bg-gray-50 dark:bg-white/5 text-gray-500 font-medium border-b border-gray-200 dark:border-white/10">
                                <tr>
                                    <th className="px-6 py-4">Timestamp</th>
                                    <th className="px-6 py-4">Data Payload</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-200 dark:divide-white/5">
                                {history.length === 0 ? (
                                    <tr>
                                        <td colSpan={2} className="px-6 py-8 text-center text-gray-500">
                                            No telemetry data received yet in this session.
                                        </td>
                                    </tr>
                                ) : (
                                    history.map((item, idx) => (
                                        <tr key={idx} className="hover:bg-gray-50 dark:hover:bg-white/5">
                                            <td className="px-6 py-3 font-mono text-gray-400 whitespace-nowrap">
                                                {new Date(item.timestamp).toLocaleTimeString()}
                                            </td>
                                            <td className="px-6 py-3">
                                                <pre className="text-xs font-mono text-gray-600 dark:text-gray-300 overflow-x-auto max-w-full">
                                                    {JSON.stringify(item.data, null, 2)}
                                                </pre>
                                            </td>
                                        </tr>
                                    ))
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}

            {/* Tab: Alarms */}
            {activeTab === 'alarms' && (
                <div className="animate-in fade-in slide-in-from-bottom-2 duration-500">
                    <AlertLogger deviceName={mqttDeviceName} filterType="Alarm" />
                </div>
            )}

            {/* Tab: Events */}
            {activeTab === 'events' && (
                <div className="animate-in fade-in slide-in-from-bottom-2 duration-500">
                    <AlertLogger deviceName={mqttDeviceName} filterType="Event" />
                </div>
            )}
        </div>
    );
};
