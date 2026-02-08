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
    updateDeviceType: (type: DeviceType) => void;
    removeDeviceType: (id: string) => void;
    renameDevice: (typeId: string, deviceId: string, name: string) => void;
    getCustomName: (typeId: string, deviceId: string) => string;
    addDeviceAttribute: (typeId: string, attribute: DeviceAttribute) => void;
    removeDeviceAttribute: (typeId: string, attributeKey: string) => void;
    brokerUrl: string;
    setBrokerUrl: (url: string) => void;
}

const ConfigContext = createContext<ConfigContextType | undefined>(undefined);

const CONFIG_VERSION = "2.2"; // Bumped to force update of Device Keys

export const ConfigProvider = ({ children }: { children: React.ReactNode }) => {
    // Default to defaults first
    const [deviceTypes, setDeviceTypes] = useState<DeviceType[]>(DEVICE_TYPES);
    const [customNames, setCustomNames] = useState<Record<string, string>>({});
    // Store custom attributes separately for persistence: typeId -> Attribute[]
    const [customAttributes, setCustomAttributes] = useState<Record<string, DeviceAttribute[]>>({});
    const [brokerUrl, setBrokerUrlState] = useState('wss://broker.emqx.io:8084/mqtt');
    const [isLoaded, setIsLoaded] = useState(false);

    // Load from localStorage on mount
    useEffect(() => {
        setIsLoaded(true);

        // Version Check: Auto-reset if version changed (e.g. key updates)
        const savedVersion = localStorage.getItem("seitech-config-version");
        if (savedVersion !== CONFIG_VERSION) {
            console.log(`Config version mismatch (${savedVersion} vs ${CONFIG_VERSION}). Resetting to defaults.`);
            localStorage.removeItem("seitech-custom-categories"); // Clear old types
            localStorage.removeItem("seitech-custom-attributes"); // Clear old attributes
            localStorage.removeItem("seitech-device-names"); // Clear old names
            localStorage.setItem("seitech-config-version", CONFIG_VERSION);
            // We don't return here, we let it flow to load defaults (which are already in state)
            // But we must NOT load the OLD "seitech-device-types" if we just cleared it.
        }

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
                loadedTypes = parsed.map((d: any) => {
                    let IconComp = Activity;
                    if (d.iconName && AVAILABLE_ICONS[d.iconName as keyof typeof AVAILABLE_ICONS]) {
                        IconComp = AVAILABLE_ICONS[d.iconName as keyof typeof AVAILABLE_ICONS];
                    } else {
                        // Fallback to default icon for this ID if possible
                        const defaultDef = DEVICE_TYPES.find(def => def.id === d.id);
                        if (defaultDef) IconComp = defaultDef.icon;
                    }
                    return { ...d, icon: IconComp };
                });
            } catch (e) { console.error(e) }
        }
        // Load Broker URL
        const savedBroker = localStorage.getItem("seitech-broker-url");
        if (savedBroker) {
            // Auto-fix port 1883 (TCP) to 8084 (WSS)
            if (savedBroker.includes(':1883')) {
                const fixedUrl = savedBroker.replace(':1883', ':8084').replace('http', 'ws').replace('tcp', 'ws');
                // Ensure wss if 8084
                const finalUrl = fixedUrl.includes(':8084') && !fixedUrl.startsWith('wss') ? fixedUrl.replace('ws://', 'wss://') : fixedUrl;

                console.log("Auto-fixed Broker URL:", finalUrl);
                setBrokerUrlState(finalUrl);
                localStorage.setItem("seitech-broker-url", finalUrl);
            } else {
                setBrokerUrlState(savedBroker);
            }
        }

        // Merge Everything: Defaults + Custom Types + Custom Attributes
        setDeviceTypes(prev => {
            // 1. Create a map of defaults for easy lookup
            const typeMap = new Map<string, DeviceType>();
            DEVICE_TYPES.forEach(t => typeMap.set(t.id, t));

            // 2. Apply loaded types (overwriting defaults if they exist)
            if (loadedTypes.length > 0) {
                loadedTypes.forEach(customType => {
                    typeMap.set(customType.id, customType);
                });
            }

            let merged = Array.from(typeMap.values());

            // 3. Merge custom attributes into their respective types
            merged = merged.map(type => {
                const extras = loadedAttrs[type.id] || [];
                // Prevent duplicates if code already has them (though code update might duplicate if key same)
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

            if (merged.length === 0) {
                console.warn("Merged config is empty, falling back to defaults");
                return DEVICE_TYPES;
            }

            return merged;
        });

        setIsLoaded(true);
    }, []);

    // Save changes
    useEffect(() => {
        localStorage.setItem("seitech-device-names", JSON.stringify(customNames));
    }, [customNames]);

    useEffect(() => {
        localStorage.setItem("seitech-custom-attributes", JSON.stringify(customAttributes));
    }, [customAttributes]);

    useEffect(() => {
        if (!isLoaded) return;

        // Save ALL types including modified defaults
        const typesToSave = deviceTypes.map(d => ({
            ...d,
            icon: undefined,
            iconName: (d as any).iconName
        }));
        localStorage.setItem("seitech-custom-categories", JSON.stringify(typesToSave));
    }, [deviceTypes, isLoaded]);

    const setBrokerUrl = (url: string) => {
        setBrokerUrlState(url);
        localStorage.setItem("seitech-broker-url", url);
    };


    const addDeviceType = (newType: DeviceType) => {
        setDeviceTypes(prev => [...prev, newType]);
    };

    const updateDeviceType = (updatedType: DeviceType) => {
        setDeviceTypes(prev => prev.map(t => t.id === updatedType.id ? updatedType : t));
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
            deviceTypes, customNames, addDeviceType, updateDeviceType, removeDeviceType,
            renameDevice, getCustomName, addDeviceAttribute, removeDeviceAttribute,
            brokerUrl, setBrokerUrl
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
