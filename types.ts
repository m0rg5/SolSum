export enum LoadCategory {
    DC_LOADS = "DC Loads (Native/DCDC)",
    AC_LOADS = "AC Loads (Inverter)",
    SYSTEM_MGMT = "System Mgmt"
}

export interface PowerItem {
    id: string;
    name: string;
    watts: number | string;
    hours: number | string;
    category: LoadCategory;
    enabled?: boolean;
    dutyCycle?: number | string;
    quantity?: number | string;
    notes?: string;
    zone?: string; // New field for Zone Sizing Feature
}

export interface ChargingSource {
    id: string;
    name: string;
    type: 'solar' | 'alternator' | 'shore';
    input: number | string;     // Watts (Solar) or Amps (Alt/Shore)
    hours: number | string;
    manualHours?: number | string; // Legacy support
    autoSolar?: boolean;
    enabled?: boolean;
    efficiency?: number | string;
    quantity?: number | string;
    notes?: string;
}

export interface BatteryState {
    voltage: number | string;
    capacityAh: number | string;
    initialSoC: number | string;
    location?: string;
    forecastMode?: 'now' | 'monthAvg';
    forecastMonth?: string;
    forecast?: SolarForecastData;
}

export interface SolarForecastData {
    loading: boolean;
    fetched: boolean;
    error?: string | null;
    sunnyHours?: number;
    cloudyHours?: number;
    nowHours?: number;
    timestamp?: number;
}

export interface SystemTotals {
    dailyWhConsumed: number;
    dailyAhConsumed: number;
    dailyWhGenerated: number;
    dailyAhGenerated: number;
    netWh: number;
    netAh: number;
    finalSoC: number;
}

export type ChatMode = 'general' | 'load' | 'source' | 'zoneSizing';

export type ZoneSizingSection = 'generation' | 'systemMgmt' | 'ac' | 'dc' | null;

export interface ChatMessage {
    role: 'user' | 'model';
    text: string;
    isError?: boolean;
    timestamp: Date;
    summary?: string;
    expanded?: string;
    category?: ChatMode;
    functionCalls?: any[]; // For debugging
}
