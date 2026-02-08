import { Zap, Droplets, Activity, LucideIcon } from 'lucide-react';

export interface DeviceAttribute {
    key: string;       // JSON data key
    label: string;     // Display Label
    unit?: string;     // Unit
    iconStr?: string;  // Icon name string (e.g. 'Activity') for rendering
}

export interface DeviceType {
    id: string; // 'inv', 'fm', 'em'
    label: string; // 'Inverters', 'Flow Meters', etc. (Plural for sections)
    singularLabel: string; // 'Inverter', 'Flow Meter'
    deviceNamePrefix: string; // 'Inv', 'FlowMeter' - used for MQTT topic matching
    icon: LucideIcon;
    defaultCount: number; // Initial number of devices to show
    attributes: DeviceAttribute[]; // Configurable data points
}

export const DEVICE_TYPES: DeviceType[] = [
    {
        id: 'inv',
        label: 'Inverters',
        singularLabel: 'Inverter',
        deviceNamePrefix: 'Inverter', // Reverted to match 'EnergyMeter' pattern
        icon: Zap,
        defaultCount: 5,
        attributes: [
            { key: 'frequency', label: 'Running Frequency', unit: 'Hz', iconStr: 'Activity' },
            { key: 'pump_power', label: 'Output Power', unit: 'kW', iconStr: 'Zap' },
            { key: 'bus_voltage', label: 'Bus Voltage', unit: 'V', iconStr: 'Activity' },
            { key: 'pump_current', label: 'Output Current', unit: 'A', iconStr: 'Activity' },
            { key: 'pump_voltage', label: 'Pump Voltage', unit: 'V', iconStr: 'Activity' },
            { key: 'inverter_temperature', label: 'Temperature', unit: '°C', iconStr: 'Activity' },
            { key: 'motor_speed', label: 'Motor Speed', unit: 'RPM', iconStr: 'Activity' },
            { key: 'inverter_direction', label: 'Direction', unit: '', iconStr: 'Activity' },
            { key: 'pump_status', label: 'Pump Status', unit: '', iconStr: 'Activity' },
            { key: 'inverter_status', label: 'Inverter Status', unit: '', iconStr: 'Activity' },
            { key: 'inverter_supply_source', label: 'Supply Source', unit: '', iconStr: 'Activity' },
            { key: 'accumulated_nonsolar_consumption', label: 'Non-Solar Consumption', unit: 'kWh', iconStr: 'Activity' },
            { key: 'accumulated_solar_consumption', label: 'Solar Consumption', unit: 'kWh', iconStr: 'Activity' },
            { key: 'daily_solar_consumption', label: 'Daily Solar', unit: 'kWh', iconStr: 'Activity' },
            { key: 'daily_nonsolar_consumption', label: 'Daily Non-Solar', unit: 'kWh', iconStr: 'Activity' },
            { key: 'hourly_solar_consumption', label: 'Hourly Solar', unit: 'kWh', iconStr: 'Activity' },
            { key: 'hourly_nonsolar_consumption', label: 'Hourly Non-Solar', unit: 'kWh', iconStr: 'Activity' },
            { key: 'pump_energy_consumption', label: 'Pump Energy', unit: 'kWh', iconStr: 'Activity' },
            { key: 'money_saved', label: 'Money Saved', unit: '', iconStr: 'Activity' },
            { key: 'TotalCO2Mitigated', label: 'CO2 Mitigated', unit: 'kg', iconStr: 'Activity' },
            { key: 'StartCommandMode', label: 'Command Mode', unit: '', iconStr: 'Activity' },
            { key: 'Last_InvUpdate', label: 'Last Update', unit: '', iconStr: 'Activity' }
        ]
    },
    {
        id: 'fm',
        label: 'Flow Meters',
        singularLabel: 'Flow Meter',
        deviceNamePrefix: 'FlowMeter', // Reverted to match 'EnergyMeter' pattern
        icon: Droplets,
        defaultCount: 2,
        attributes: [
            { key: 'water_pumped_flow_rate_per_hour', label: 'Flow Rate', unit: 'm3/h', iconStr: 'GaugeIcon' },
            { key: 'totalWaterVolume_m3', label: 'Total Volume', unit: 'm3', iconStr: 'Activity' },
            { key: 'flowmeter_conductivity', label: 'Conductivity', unit: 'uS/cm', iconStr: 'Activity' },
            { key: 'hourly_nonsolar_consumption', label: 'Hourly Non-Solar', unit: 'kWh', iconStr: 'Activity' }
        ]
    },
    {
        id: 'em',
        label: 'Energy Meters',
        singularLabel: 'Energy Meter',
        deviceNamePrefix: 'EnergyMeter', // Keeping as is, but could be 'EM'
        icon: Activity,
        defaultCount: 5,
        attributes: [
            { key: 'em_voltage_a', label: 'Voltage (A)', unit: 'V', iconStr: 'Zap' },
            { key: 'em_current_a', label: 'Current (A)', unit: 'A', iconStr: 'Activity' },
            { key: 'em_power_factor', label: 'Power Factor', unit: '', iconStr: 'Activity' },
            { key: 'em_frequency', label: 'Frequency', unit: 'Hz', iconStr: 'Activity' },
            { key: 'em_energy_total', label: 'Total Energy', unit: 'kWh', iconStr: 'Activity' },
            { key: 'daily_nonsolar_consumption', label: 'Daily Non-Solar', unit: 'kWh', iconStr: 'Activity' }
        ]
    }
];
