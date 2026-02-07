"use client";

import React, { createContext, useContext, useEffect, useState } from "react";
import { DEVICE_TYPES, DeviceType, DeviceAttribute } from "./device-config";
import { Zap, Droplets, Activity, CircuitBoard, Cpu, Radio, Router, Server, Wifi, Gauge as GaugeIcon } from "lucide-react";

// Available icons for new categories
export const AVAILABLE_ICONS = {
    Zap, Droplets, Activity, CircuitBoard, Cpu, Radio, Router, Server, Wifi, GaugeIcon
};

interface ConfigContextType {
    deviceTypes: DeviceType[];
    customNames: Record<string, string>; // key: "${typeId}_${deviceId}" -> "Custom Name"
    addDeviceType: (type: DeviceType) => void;
    removeDeviceType: (id: string) => void;
    renameDevice: (typeId: string, deviceId: string, name: string) => void;
    getCustomName: (typeId: string, deviceId: string) => string;
    addDeviceAttribute: (typeId: string, attribute: DeviceAttribute) => void;
    removeDeviceAttribute: (typeId: string, attributeKey: string) => void;
}

const ConfigContext = createContext<ConfigContextType | undefined>(undefined);

export function ConfigProvider({ children }: { children: React.ReactNode }) {
    const [deviceTypes, setDeviceTypes] = useState<DeviceType[]>(DEVICE_TYPES);
    const [customNames, setCustomNames] = useState<Record<string, string>>({});
    // Store custom attributes separately for persistence: typeId -> Attribute[]
    const [customAttributes, setCustomAttributes] = useState<Record<string, DeviceAttribute[]>>({});

    // Load from localStorage on mount
    useEffect(() => {
        // Load Custom Names
        const savedNames = localStorage.getItem("seitech-device-names");
        if (savedNames) {
            try {
                setCustomNames(JSON.parse(savedNames));
            } catch (e) { console.error(e) }
        }

        // Load Custom Attributes
        const savedAttributes = localStorage.getItem("seitech-custom-attributes");
        let loadedAttrs: Record<string, DeviceAttribute[]> = {};
        if (savedAttributes) {
            try {
                loadedAttrs = JSON.parse(savedAttributes);
                setCustomAttributes(loadedAttrs);
            } catch (e) { console.error(e) }
        }

        // Load Custom Categories (Simplified)
        const savedCategories = localStorage.getItem("seitech-custom-categories");
        let loadedTypes: DeviceType[] = [];
        if (savedCategories) {
            try {
                const parsed = JSON.parse(savedCategories);
                loadedTypes = parsed.map((d: any) => ({
                    ...d,
                    icon: AVAILABLE_ICONS[d.iconName as keyof typeof AVAILABLE_ICONS] || Activity
                }));
            } catch (e) { console.error(e) }
        }

        // Merge Everything: Defaults + Custom Types + Custom Attributes
        setDeviceTypes(prev => {
            // 1. Start with defaults
            let merged = [...DEVICE_TYPES];

            // 2. Add custom types
            // (Filter out any that might conflict with defaults if needed, but assuming unique IDs for now)
            loadedTypes.forEach(customType => {
                if (!merged.find(m => m.id === customType.id)) {
                    merged.push(customType);
                }
            });

            // 3. Merge custom attributes into their respective types
            merged = merged.map(type => {
                const extras = loadedAttrs[type.id] || [];
                // Prevent duplicates if code already has them (though code update might duplicate if key same)
                // We'll append extras that aren't in default attributes
                const existingKeys = new Set(type.attributes.map(a => a.key));
                const uniqueExtras = extras.filter(a => !existingKeys.has(a.key));

                if (uniqueExtras.length > 0) {
                    return {
                        ...type,
                        attributes: [...type.attributes, ...uniqueExtras]
                    };
                }
                return type;
            });

            return merged;
        });

    }, []);

    // Save changes
    useEffect(() => {
        localStorage.setItem("seitech-device-names", JSON.stringify(customNames));
    }, [customNames]);

    useEffect(() => {
        localStorage.setItem("seitech-custom-attributes", JSON.stringify(customAttributes));
    }, [customAttributes]);

    useEffect(() => {
        // Save custom types (filtering out defaults)
        const customTypes = deviceTypes.filter(d => !DEVICE_TYPES.find(def => def.id === d.id)).map(d => ({
            ...d,
            icon: undefined,
            iconName: (d as any).iconName
        }));
        localStorage.setItem("seitech-custom-categories", JSON.stringify(customTypes));
    }, [deviceTypes]);


    const addDeviceType = (newType: DeviceType) => {
        setDeviceTypes(prev => [...prev, newType]);
    };

    const removeDeviceType = (id: string) => {
        setDeviceTypes(prev => prev.filter(t => t.id !== id));
    };

    const renameDevice = (typeId: string, deviceId: string, name: string) => {
        setCustomNames(prev => ({
            ...prev,
            [`${typeId}_${deviceId}`]: name
        }));
    };

    const getCustomName = (typeId: string, deviceId: string) => {
        return customNames[`${typeId}_${deviceId}`];
    };

    const addDeviceAttribute = (typeId: string, attribute: DeviceAttribute) => {
        // 1. Update State
        setDeviceTypes(prev => prev.map(type => {
            if (type.id === typeId) {
                return {
                    ...type,
                    attributes: [...type.attributes, attribute]
                };
            }
            return type;
        }));

        // 2. Update Persistence State
        setCustomAttributes(prev => ({
            ...prev,
            [typeId]: [...(prev[typeId] || []), attribute]
        }));
    };

    const removeDeviceAttribute = (typeId: string, attributeKey: string) => {
        setDeviceTypes(prev => prev.map(type => {
            if (type.id === typeId) {
                return {
                    ...type,
                    attributes: type.attributes.filter(a => a.key !== attributeKey)
                };
            }
            return type;
        }));

        setCustomAttributes(prev => ({
            ...prev,
            [typeId]: (prev[typeId] || []).filter(a => a.key !== attributeKey)
        }));
    };

    return (
        <ConfigContext.Provider value={{
            deviceTypes, customNames, addDeviceType, removeDeviceType,
            renameDevice, getCustomName, addDeviceAttribute, removeDeviceAttribute
        }}>
            {children}
        </ConfigContext.Provider>
    );
}

export const useConfig = () => {
    const context = useContext(ConfigContext);
    if (!context) throw new Error("useConfig must be used within ConfigProvider");
    return context;
};
