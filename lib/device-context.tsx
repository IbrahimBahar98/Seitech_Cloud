"use client";

import React, { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { useConfig } from './config-context';

interface DeviceContextType {
    devices: Record<string, number[]>; // typeId -> [1, 2, 3]
    collapsed: Record<string, boolean>; // typeId -> boolean
    addDevice: (typeId: string) => void;
    removeDevice: (typeId: string, deviceId: number) => void;
    toggleSection: (typeId: string) => void;
}

const DeviceContext = createContext<DeviceContextType | undefined>(undefined);

export const DeviceProvider = ({ children }: { children: ReactNode }) => {
    const { deviceTypes } = useConfig();
    const [devices, setDevices] = useState<Record<string, number[]>>({});
    const [collapsed, setCollapsed] = useState<Record<string, boolean>>({});
    const [isLoaded, setIsLoaded] = useState(false);

    // Load from localStorage on mount
    useEffect(() => {
        const savedDevices = localStorage.getItem("seitech-devices");
        if (savedDevices) {
            try {
                setDevices(JSON.parse(savedDevices));
            } catch (e) {
                console.error("Failed to parse saved devices", e);
            }
        } else {
            // Initialize defaults if no save found
            const initialDevices: Record<string, number[]> = {};
            deviceTypes.forEach(t => {
                initialDevices[t.id] = Array.from({ length: t.defaultCount }, (_, i) => i + 1);
            });
            setDevices(initialDevices);
        }

        const savedCollapsed = localStorage.getItem("seitech-sidebar-collapsed");
        if (savedCollapsed) {
            try {
                setCollapsed(JSON.parse(savedCollapsed));
            } catch (e) {
                console.error("Failed to parse collapsed state", e);
            }
        } else {
            // Default open
            const initialCollapsed: Record<string, boolean> = {};
            deviceTypes.forEach(t => initialCollapsed[t.id] = false);
            setCollapsed(initialCollapsed);
        }

        setIsLoaded(true);
    }, []); // Run once on mount. Dependency on deviceTypes for defaults is handled safely? 
    // Actually, if deviceTypes load async or change, we might want to ensure we cover all types.
    // But config-context loads sync defaults first, so it should be fine.

    // Sync with deviceTypes (ensure new types exist in state)
    useEffect(() => {
        if (!isLoaded) return;

        setDevices(prev => {
            const next = { ...prev };
            let changed = false;
            deviceTypes.forEach(t => {
                if (!next[t.id]) {
                    next[t.id] = Array.from({ length: t.defaultCount }, (_, i) => i + 1);
                    changed = true;
                }
            });
            return changed ? next : prev;
        });

        setCollapsed(prev => {
            const next = { ...prev };
            let changed = false;
            deviceTypes.forEach(t => {
                if (next[t.id] === undefined) {
                    next[t.id] = false;
                    changed = true;
                }
            });
            return changed ? next : prev;
        });
    }, [deviceTypes, isLoaded]);


    // Persistence Effects
    useEffect(() => {
        if (isLoaded) {
            localStorage.setItem("seitech-devices", JSON.stringify(devices));
        }
    }, [devices, isLoaded]);

    useEffect(() => {
        if (isLoaded) {
            localStorage.setItem("seitech-sidebar-collapsed", JSON.stringify(collapsed));
        }
    }, [collapsed, isLoaded]);


    const addDevice = (typeId: string) => {
        setDevices(prev => {
            const currentIds = prev[typeId] || [];
            const newId = currentIds.length > 0 ? Math.max(...currentIds) + 1 : 1;
            return {
                ...prev,
                [typeId]: [...currentIds, newId]
            };
        });
    };

    const removeDevice = (typeId: string, deviceId: number) => {
        setDevices(prev => ({
            ...prev,
            [typeId]: (prev[typeId] || []).filter(id => id !== deviceId)
        }));
    };

    const toggleSection = (typeId: string) => {
        setCollapsed(prev => ({
            ...prev,
            [typeId]: !prev[typeId]
        }));
    };

    return (
        <DeviceContext.Provider value={{ devices, collapsed, addDevice, removeDevice, toggleSection }}>
            {children}
        </DeviceContext.Provider>
    );
};

export const useDevices = () => {
    const context = useContext(DeviceContext);
    if (context === undefined) {
        throw new Error('useDevices must be used within a DeviceProvider');
    }
    return context;
};
