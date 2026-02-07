"use client";

import React, { useState } from 'react';
import { useConfig, AVAILABLE_ICONS } from '@/lib/config-context';
import { Trash2, Plus, Save } from 'lucide-react';
import { DeviceType } from '@/lib/device-config';

export default function SettingsPage() {
    const { deviceTypes, addDeviceType, removeDeviceType } = useConfig();
    const [isAdding, setIsAdding] = useState(false);
    const [newCategory, setNewCategory] = useState<Partial<DeviceType>>({
        defaultCount: 1
    });
    const [selectedIcon, setSelectedIcon] = useState<string>('Zap');

    const handleSave = () => {
        if (!newCategory.label || !newCategory.singularLabel || !newCategory.deviceNamePrefix) return;

        const id = newCategory.label.toLowerCase().replace(/\s+/g, '-');
        const IconComponent = AVAILABLE_ICONS[selectedIcon as keyof typeof AVAILABLE_ICONS];

        addDeviceType({
            id,
            label: newCategory.label,
            singularLabel: newCategory.singularLabel,
            deviceNamePrefix: newCategory.deviceNamePrefix,
            defaultCount: newCategory.defaultCount || 1,
            icon: IconComponent,
            // @ts-ignore - storing name for persistence logic enhancement later
            iconName: selectedIcon
        });

        setIsAdding(false);
        setNewCategory({ defaultCount: 1 });
    };

    return (
        <div className="max-w-4xl mx-auto space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
            <div>
                <h1 className="text-3xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-primary to-purple-400">
                    Settings
                </h1>
                <p className="text-gray-500 mt-1">Manage device categories and configurations</p>
            </div>

            {/* Category Management */}
            <div className="glass-panel p-6">
                <div className="flex items-center justify-between mb-6">
                    <h2 className="text-xl font-semibold text-gray-200">Device Categories</h2>
                    <button
                        onClick={() => setIsAdding(true)}
                        className="flex items-center gap-2 px-4 py-2 bg-primary hover:bg-primary/90 text-white rounded-lg transition-colors"
                    >
                        <Plus size={18} />
                        Add Category
                    </button>
                </div>

                <div className="space-y-4">
                    {deviceTypes.map((type) => (
                        <div key={type.id} className="flex items-center justify-between p-4 rounded-xl bg-white/5 border border-white/10">
                            <div className="flex items-center gap-4">
                                <div className="p-2.5 rounded-lg bg-blue-500/20 text-blue-400">
                                    <type.icon size={20} />
                                </div>
                                <div>
                                    <h3 className="font-medium text-white">{type.label}</h3>
                                    <p className="text-sm text-gray-500">
                                        Prefix: <span className="font-mono text-xs bg-white/10 px-1.5 py-0.5 rounded">{type.deviceNamePrefix}</span>
                                        <span className="mx-2">•</span>
                                        ID: {type.id}
                                    </p>
                                </div>
                            </div>

                            {/* Prevent deleting core types if desired, but allowing it for flexibility */}
                            <button
                                onClick={() => removeDeviceType(type.id)}
                                className="p-2 text-gray-400 hover:text-red-400 hover:bg-red-500/10 rounded-lg transition-colors"
                                title="Remove Category"
                            >
                                <Trash2 size={18} />
                            </button>
                        </div>
                    ))}
                </div>

                {isAdding && (
                    <div className="mt-6 p-6 rounded-xl bg-white/5 border border-primary/30 space-y-4 animate-in fade-in zoom-in-95">
                        <h3 className="font-semibold text-primary">New Category Details</h3>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div className="space-y-1">
                                <label className="text-xs text-gray-400 ml-1">Category Name (Plural)</label>
                                <input
                                    type="text"
                                    placeholder="e.g. Temperature Sensors"
                                    className="w-full bg-black/20 border border-white/10 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-primary"
                                    value={newCategory.label || ''}
                                    onChange={e => setNewCategory({ ...newCategory, label: e.target.value })}
                                />
                            </div>
                            <div className="space-y-1">
                                <label className="text-xs text-gray-400 ml-1">Device Label (Singular)</label>
                                <input
                                    type="text"
                                    placeholder="e.g. Sensor"
                                    className="w-full bg-black/20 border border-white/10 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-primary"
                                    value={newCategory.singularLabel || ''}
                                    onChange={e => setNewCategory({ ...newCategory, singularLabel: e.target.value })}
                                />
                            </div>
                            <div className="space-y-1">
                                <label className="text-xs text-gray-400 ml-1">MQTT Topic Prefix</label>
                                <input
                                    type="text"
                                    placeholder="e.g. TempSensor"
                                    className="w-full bg-black/20 border border-white/10 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-primary"
                                    value={newCategory.deviceNamePrefix || ''}
                                    onChange={e => setNewCategory({ ...newCategory, deviceNamePrefix: e.target.value })}
                                />
                            </div>
                            <div className="space-y-1">
                                <label className="text-xs text-gray-400 ml-1">Initial Device Count</label>
                                <input
                                    type="number"
                                    className="w-full bg-black/20 border border-white/10 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-primary"
                                    value={newCategory.defaultCount || 1}
                                    onChange={e => setNewCategory({ ...newCategory, defaultCount: parseInt(e.target.value) })}
                                />
                            </div>
                        </div>

                        <div className="space-y-2">
                            <label className="text-xs text-gray-400 ml-1">Select Icon</label>
                            <div className="flex gap-2 flex-wrap">
                                {Object.keys(AVAILABLE_ICONS).map((iconKey) => {
                                    // @ts-ignore
                                    const Icon = AVAILABLE_ICONS[iconKey];
                                    return (
                                        <button
                                            key={iconKey}
                                            onClick={() => setSelectedIcon(iconKey)}
                                            className={`p-3 rounded-lg border transition-all ${selectedIcon === iconKey ? 'bg-primary text-white border-primary' : 'bg-black/20 border-white/10 text-gray-400 hover:text-white'}`}
                                        >
                                            <Icon size={20} />
                                        </button>
                                    );
                                })}
                            </div>
                        </div>

                        <div className="flex justify-end gap-3 pt-4 border-t border-white/10">
                            <button
                                onClick={() => setIsAdding(false)}
                                className="px-4 py-2 text-gray-400 hover:text-white transition-colors"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={handleSave}
                                className="flex items-center gap-2 px-6 py-2 bg-primary hover:bg-primary/90 text-white rounded-lg transition-all"
                            >
                                <Save size={18} />
                                Save Category
                            </button>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
