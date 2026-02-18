import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import React, { useState, useMemo, useCallback, useEffect, useRef } from 'react';
import { INITIAL_DATA, INITIAL_CHARGING, INITIAL_BATTERY } from './constants';
import { LoadCategory, ChatMode, ZoneSizingSection } from './types';
import { calculateSystemTotals } from './services/powerLogic';
import { geocodeLocation, fetchNowSolarPSH, fetchMonthAvgSolarPSH } from './services/weatherService';
import EnergyTable from './components/EnergyTable';
import ChargingTable from './components/ChargingTable';
import SummaryPanel from './components/SummaryPanel';
import ChatBot from './components/ChatBot';
import HeaderGraph from './components/HeaderGraph';
import { LocationAutocomplete } from './components/LocationAutocomplete';
const STORAGE_KEY = "solsum_state_v2_1";
const STORAGE_SCHEMA_VERSION = "2.1";
const FORECAST_TTL_MS = 6 * 60 * 60 * 1000; // 6 hours
const App = () => {
  const fileInputRef = useRef(null);
  const [hasHydrated, setHasHydrated] = useState(false);

  const getSavedData = () => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed.data)
          return parsed.data;
      }
    }
    catch (e) {
      console.warn("Failed to load saved state", e);
    }
    return null;
  };
  const savedData = useMemo(() => getSavedData(), []);
  const [items, setItems] = useState(() => {
    const rawData = savedData?.items || INITIAL_DATA;
    const data = Array.isArray(rawData) ? rawData : INITIAL_DATA;
    return data
      .filter(i => i && typeof i === 'object')
      .map((i) => ({ ...i, enabled: i.enabled ?? true, id: i.id || Math.random().toString(36).substr(2, 9) }));
  });
  const [charging, setCharging] = useState(() => {
    const rawData = savedData?.charging || INITIAL_CHARGING;
    const data = Array.isArray(rawData) ? rawData : INITIAL_CHARGING;
    return data
      .filter(c => c && typeof c === 'object')
      .map((c) => ({ ...c, enabled: c.enabled ?? true, id: c.id || Math.random().toString(36).substr(2, 9) }));
  });
  const [battery, setBattery] = useState(() => {
    const now = new Date();
    const defaultMonth = `${now.getFullYear()}-${(now.getMonth() + 1).toString().padStart(2, '0')}-${now.getDate().toString().padStart(2, '0')}`;
    const savedBat = savedData?.battery;
    if (!savedBat)
      return {
        ...INITIAL_BATTERY,
        forecastMode: 'now',
        forecastMonth: defaultMonth
      };
    const merged = {
      ...INITIAL_BATTERY,
      forecastMode: 'now',
      forecastMonth: defaultMonth,
      ...savedBat
    };
    if (merged.forecastMonth && merged.forecastMonth.split('-').length === 2) {
      merged.forecastMonth = `${merged.forecastMonth}-15`;
    }
    if (merged.forecast) {
      merged.forecast.loading = false;
      const updatedAt = merged.forecast.updatedAt ? new Date(merged.forecast.updatedAt).getTime() : 0;
      const isFresh = (Date.now() - updatedAt) < FORECAST_TTL_MS;
      merged.forecast.fetched = isFresh ? (merged.forecast.fetched || false) : false;
    }
    return merged;
  });
  const [chatOpen, setChatOpen] = useState(false);
  const [chatMode, setChatMode] = useState<ChatMode>('general');
  const [zoneSection, setZoneSection] = useState<ZoneSizingSection>(null);
  const [highlightedRow, setHighlightedRow] = useState(null);

  useEffect(() => {
    const timer = setTimeout(() => setHasHydrated(true), 100);
    return () => clearTimeout(timer);
  }, []);
  useEffect(() => {
    if (!hasHydrated)
      return;
    const state = {
      version: STORAGE_SCHEMA_VERSION,
      savedAt: Date.now(),
      data: { items, charging, battery }
    };
    if (items.length === 0 && charging.length === 0)
      return;
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  }, [items, charging, battery, hasHydrated]);

  const totals = useMemo(() => calculateSystemTotals(items, charging, battery), [items, charging, battery]);
  useEffect(() => {
    const updateForecast = async () => {
      if (!battery.location || battery.location.length < 1)
        return;
      setBattery(prev => ({
        ...prev,
        forecast: {
          ...(prev.forecast || { fetched: false }),
          loading: true,
          error: undefined
        }
      }));
      try {
        const geo = await geocodeLocation(battery.location);
        if (!geo)
          throw new Error("Location not found");
        const apiMonth = (battery.forecastMonth || '').split('-').slice(0, 2).join('-');
        // ALWAYS fetch the monthly context (Sunny/Cloudy averages)
        // This gives us the "Location Profile" (e.g. London vs Sydney)
        const monthPSH = await fetchMonthAvgSolarPSH(geo.lat, geo.lon, apiMonth);

        let forecastData: any = {
          sunnyHours: monthPSH.sunny,
          cloudyHours: monthPSH.cloudy
        };

        if (battery.forecastMode === 'now') {
          const nowPSH = await fetchNowSolarPSH(geo.lat, geo.lon);
          forecastData.nowHours = nowPSH;
        }
        setBattery(prev => ({
          ...prev,
          forecast: {
            ...(prev.forecast || { fetched: false }),
            ...forecastData,
            lat: geo.lat,
            lon: geo.lon,
            loading: false,
            fetched: true,
            updatedAt: new Date().toISOString()
          }
        }));
      }
      catch (e) {
        setBattery(prev => ({
          ...prev,
          forecast: {
            ...(prev.forecast || { fetched: false }),
            loading: false,
            error: e.message
          }
        }));
      }
    };
    const timer = setTimeout(updateForecast, 1000);
    return () => clearTimeout(timer);
  }, [battery.location, battery.forecastMode, battery.forecastMonth]);
  const handleUpdateItem = useCallback((id, field, value) => {
    setItems(prev => prev.map(item => item.id === id ? { ...item, [field]: value } : item));
  }, []);
  const handleDeleteItem = useCallback((id) => {
    setItems(prev => prev.filter(item => item.id !== id));
  }, []);
  const handleAddItem = useCallback((category) => {
    setItems(prev => [...prev, {
      id: Math.random().toString(36).substr(2, 9),
      category,
      name: 'New Item',
      quantity: 1,
      watts: 0,
      hours: 1,
      dutyCycle: 100,
      notes: '',
      zone: '', // Initialize new items with empty zone
      enabled: true
    }]);
  }, []);
  const handleReorderItems = useCallback((fromId, toId) => {
    setItems(prev => {
      const fromIndex = prev.findIndex(i => i.id === fromId);
      const toIndex = prev.findIndex(i => i.id === toId);
      if (fromIndex === -1 || toIndex === -1)
        return prev;
      const newItems = [...prev];
      const [movedItem] = newItems.splice(fromIndex, 1);
      newItems.splice(toIndex, 0, movedItem);
      return newItems;
    });
  }, []);
  const handleAIAddLoad = useCallback((itemProps) => {
    const id = Math.random().toString(36).substr(2, 9);
    setItems(prev => [...prev, {
      id, quantity: 1, watts: 0, dutyCycle: 100, notes: '', ...itemProps,
      hours: itemProps.hours === 0 ? 0 : (Number(itemProps.hours) || 1),
      category: itemProps.category, enabled: true
    }]);
    setHighlightedRow({ id, kind: 'load' });
    setTimeout(() => setHighlightedRow(null), 2500);
  }, []);
  const handleAIAddSource = useCallback((sourceProps) => {
    const id = Math.random().toString(36).substr(2, 9);
    setCharging(prev => [...prev, {
      id, quantity: 1, input: 0, efficiency: 0.85, ...sourceProps,
      hours: sourceProps.hours === 0 ? 0 : (Number(sourceProps.hours) || 5),
      enabled: true, notes: ''
    }]);
    setHighlightedRow({ id, kind: 'source' });
    setTimeout(() => setHighlightedRow(null), 2500);
  }, []);
  const handleUpdateSource = useCallback((id, field, value) => {
    setCharging(prev => prev.map(s => s.id === id ? { ...s, [field]: value } : s));
  }, []);
  const handleReorderSources = useCallback((fromId, toId) => {
    setCharging(prev => {
      const fromIndex = prev.findIndex(i => i.id === fromId);
      const toIndex = prev.findIndex(i => i.id === toId);
      if (fromIndex === -1 || toIndex === -1)
        return prev;
      const newSources = [...prev];
      const [movedSource] = newSources.splice(fromIndex, 1);
      newSources.splice(toIndex, 0, movedSource);
      return newSources;
    });
  }, []);
  const handleUpdateBattery = useCallback((field, value) => {
    setBattery(prev => ({ ...prev, [field]: value }));
  }, []);
  const handleExport = () => {
    // Sanitize data before export to prevent malformed files
    const sanitizedItems = items
      .filter(i => i && typeof i === 'object')
      .map(i => ({
        ...i,
        enabled: i.enabled ?? true,
        id: i.id || Math.random().toString(36).substr(2, 9)
      }));

    const sanitizedCharging = charging
      .filter(c => c && typeof c === 'object')
      .map(c => ({
        ...c,
        unit: 'W', // Standardize to Watts for internal consistency
        autoSolar: c.autoSolar ?? false,
        enabled: c.enabled ?? true,
        id: c.id || Math.random().toString(36).substr(2, 9)
      }));

    const sanitizedBattery = { ...battery };
    if (sanitizedBattery.forecast && sanitizedBattery.forecast.error) {
      // Clear zombie forecast data if there's an error
      sanitizedBattery.forecast = {
        ...sanitizedBattery.forecast,
        nowHours: undefined,
        sunnyHours: undefined,
        cloudyHours: undefined
      };
    }

    const data = {
      version: STORAGE_SCHEMA_VERSION,
      items: sanitizedItems,
      charging: sanitizedCharging,
      battery: sanitizedBattery
    };

    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `solsum_v${STORAGE_SCHEMA_VERSION}_${new Date().toISOString().split('T')[0]}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };
  const handleTriggerImport = () => {
    fileInputRef.current?.click();
  };
  const handleImport = (e) => {
    const file = e.target.files?.[0];
    if (!file)
      return;
    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const data = JSON.parse(String(event.target?.result));
        if (data.items && Array.isArray(data.items)) {
          setItems(data.items
            .filter(i => i && typeof i === 'object')
            .map((i) => ({ ...i, enabled: i.enabled ?? true, id: i.id || Math.random().toString(36).substr(2, 9) })));
        }
        if (data.charging && Array.isArray(data.charging)) {
          setCharging(data.charging
            .filter(c => c && typeof c === 'object')
            .map((c) => ({ ...c, enabled: c.enabled ?? true, id: c.id || Math.random().toString(36).substr(2, 9) })));
        }
        if (data.battery && typeof data.battery === 'object') {
          const now = new Date();
          const defaultMonth = `${now.getFullYear()}-${(now.getMonth() + 1).toString().padStart(2, '0')}-${now.getDate().toString().padStart(2, '0')}`;

          let mergedBat = {
            ...INITIAL_BATTERY,
            forecastMode: 'now',
            forecastMonth: defaultMonth,
            ...data.battery
          };

          // Compatibility fix for month-only strings
          if (mergedBat.forecastMonth && mergedBat.forecastMonth.split('-').length === 2) {
            mergedBat.forecastMonth = `${mergedBat.forecastMonth}-15`;
          }

          setBattery(mergedBat);
        }
        alert(`Config v${data.version || '?'} imported.`);
      }
      catch (err) {
        console.error("Import failed:", err);
        alert("Import failed: Invalid JSON or incompatible format.");
      }
    };
    reader.readAsText(file);
    e.target.value = '';
  };
  const netKwh = totals.netWh / 1000;
  return (_jsxs("div", {
    className: "min-h-screen bg-slate-900 text-slate-100 flex flex-col font-sans app-root", children: [_jsx("header", { className: "bg-slate-950 border-b border-slate-800 sticky top-0 z-40 shadow-2xl pb-3 pt-2.5", children: _jsxs("div", { className: "max-w-[98%] mx-auto flex flex-col lg:flex-row items-center justify-between px-6 gap-6", children: [_jsxs("div", { className: "flex items-center gap-3 shrink-0", children: [_jsx("div", { className: "text-[40px] leading-none", children: "\u2600\uFE0F" }), _jsxs("div", { children: [_jsx("h1", { className: "app-header-font text-[1.6rem] text-white", children: "Sol Sum" }), _jsx("p", { className: "text-slate-500 text-[8px] font-semibold uppercase tracking-[0.1em] mt-0.5", children: "Solar & Elec Planner v2.9" })] })] }), _jsx("div", { className: "hidden md:block flex-1 max-w-xl px-8", children: _jsx(HeaderGraph, { items: items, systemVoltage: battery.voltage }) }), _jsxs("div", { className: "text-right", children: [_jsxs("div", { className: `app-header-font text-4xl flex items-baseline justify-end gap-1.5 ${netKwh >= 0 ? 'text-emerald-400' : 'text-rose-400'}`, children: [_jsxs("span", { children: [netKwh >= 0 ? '+' : '', netKwh.toFixed(1)] }), _jsx("span", { className: "text-[10px] text-slate-600 font-black uppercase tracking-tighter", children: "kWh" })] }), _jsx("div", { className: "text-[8px] text-slate-700 font-black uppercase tracking-[0.2em] mt-1", children: "24HR POWER" })] })] }) }), _jsxs("main", {
      className: "max-w-[98%] mx-auto w-full p-6 grid grid-cols-1 lg:grid-cols-[1fr_minmax(150px,12%)] gap-8", children: [_jsxs("div", {
        className: "space-y-6 min-w-0", children: [_jsx("section", {
          className: "pb-0", children: _jsxs("div", {
            className: "flex flex-wrap md:flex-nowrap gap-2.5 items-stretch", children: [_jsxs("div", { className: "flex-1 min-w-[110px] bg-slate-900 p-[7px] rounded-lg border border-slate-800 ring-1 ring-white/5 shadow-inner flex flex-col justify-center", children: [_jsx("label", { className: "config-label-small uppercase text-slate-600 font-black block mb-0.5 tracking-widest", children: "LOCATION" }), _jsx(LocationAutocomplete, { value: battery.location || '', onChange: (val) => handleUpdateBattery('location', val) })] }), _jsxs("div", {
              className: "flex-1 min-w-[90px] bg-slate-900 p-[7px] rounded-lg border border-slate-800 ring-1 ring-white/5 shadow-inner flex flex-col justify-center relative group", children: [_jsxs("div", { className: "flex justify-between items-center mb-0.5 relative z-20", children: [_jsx("label", { className: "config-label-small uppercase text-slate-600 font-black tracking-widest", children: "DATE (MM/YY)" }), _jsxs("label", { className: "flex items-center gap-1 cursor-pointer group/toggle", title: "Toggle Real-time Forecast", children: [_jsx("span", { className: `text-[6px] font-black uppercase transition-colors ${battery.forecastMode === 'now' ? 'text-blue-400' : 'text-slate-600 group-hover/toggle:text-slate-400'}`, children: "Now" }), _jsx("input", { type: "checkbox", checked: battery.forecastMode === 'now', onChange: (e) => handleUpdateBattery('forecastMode', e.target.checked ? 'now' : 'monthAvg'), className: "w-2.5 h-2.5 rounded bg-slate-800 border-slate-700 text-blue-600 focus:ring-0 cursor-pointer" })] })] }), _jsxs("div", {
                className: `flex items-center gap-1 h-6 w-full ${battery.forecastMode === 'now' ? 'opacity-30 pointer-events-none' : 'opacity-100'} transition-opacity`, children: [_jsx("input", {
                  type: "text", placeholder: "MM", maxLength: 2, value: battery.forecastMonth?.split('-')[1] || '', onChange: (e) => {
                    const val = e.target.value.replace(/\D/g, '');
                    if (val.length <= 2) {
                      const cur = battery.forecastMonth || `${new Date().getFullYear()}-01-01`;
                      const parts = cur.split('-');
                      handleUpdateBattery('forecastMonth', `${parts[0]}-${val}-${parts[2] || '01'}`);
                    }
                  }, onBlur: (e) => {
                    let val = e.target.value;
                    if (val.length === 1)
                      val = '0' + val;
                    if (val === '00' || val === '')
                      val = '01';
                    if (Number(val) > 12)
                      val = '12';
                    const cur = battery.forecastMonth || `${new Date().getFullYear()}-01-01`;
                    const parts = cur.split('-');
                    handleUpdateBattery('forecastMonth', `${parts[0]}-${val}-${parts[2] || '01'}`);
                  }, className: "bg-transparent text-slate-200 font-mono config-input-small font-black w-[24px] text-center focus:outline-none focus:text-blue-400 placeholder-slate-700 p-0"
                }), _jsx("span", { className: "text-slate-600 font-black select-none", children: "/" }), _jsx("input", {
                  type: "text", placeholder: "YY", maxLength: 2, value: battery.forecastMonth?.split('-')[0].slice(2) || '', onChange: (e) => {
                    const val = e.target.value.replace(/\D/g, '');
                    if (val.length <= 2) {
                      const cur = battery.forecastMonth || `${new Date().getFullYear()}-01-01`;
                      const parts = cur.split('-');
                      handleUpdateBattery('forecastMonth', `20${val}-${parts[1] || '01'}-${parts[2] || '01'}`);
                    }
                  }, onBlur: (e) => {
                    let val = e.target.value;
                    if (val.length === 1)
                      val = '0' + val;
                    if (val === '')
                      val = new Date().getFullYear().toString().slice(2);
                    const cur = battery.forecastMonth || `${new Date().getFullYear()}-01-01`;
                    const parts = cur.split('-');
                    handleUpdateBattery('forecastMonth', `20${val}-${parts[1] || '01'}-${parts[2] || '01'}`);
                  }, className: "bg-transparent text-slate-200 font-mono config-input-small font-black w-[24px] text-center focus:outline-none focus:text-blue-400 placeholder-slate-700 p-0"
                }), battery.forecast?.loading && _jsx("div", { className: "ml-auto w-1.5 h-1.5 rounded-full bg-blue-400 animate-bounce" })]
              })]
            }), _jsxs("div", { className: "flex-1 min-w-[70px] bg-slate-900 p-[7px] rounded-lg border border-slate-800 ring-1 ring-white/5 shadow-inner flex flex-col justify-center", children: [_jsx("label", { className: "config-label-small uppercase text-slate-600 font-black block mb-0.5 tracking-widest", children: "VOLTAGE" }), _jsxs("select", { value: battery.voltage, onChange: (e) => handleUpdateBattery('voltage', Number(e.target.value)), className: "bg-transparent border-none w-full text-slate-200 font-mono config-input-small focus:ring-0 font-black outline-none p-0 cursor-pointer", children: [_jsx("option", { value: 12, className: "bg-slate-900 text-slate-200", children: "12V" }), _jsx("option", { value: 24, className: "bg-slate-900 text-slate-200", children: "24V" }), _jsx("option", { value: 48, className: "bg-slate-900 text-slate-200", children: "48V" })] })] }), _jsxs("div", { className: "flex-1 min-w-[70px] bg-slate-900 p-[7px] rounded-lg border border-slate-800 ring-1 ring-white/5 shadow-inner flex flex-col justify-center", children: [_jsx("label", { className: "config-label-small uppercase text-slate-600 font-black block mb-0.5 tracking-widest", children: "BATTERY AH" }), _jsx("input", { type: "number", value: battery.capacityAh, onChange: (e) => handleUpdateBattery('capacityAh', Number(e.target.value)), className: "bg-transparent border-none w-full text-slate-200 font-mono config-input-small focus:ring-0 font-black outline-none p-0" })] }), _jsxs("div", { className: "flex-1 min-w-[70px] bg-slate-900 p-[7px] rounded-lg border border-slate-800 ring-1 ring-white/5 shadow-inner flex flex-col justify-center", children: [_jsx("label", { className: "config-label-small uppercase text-slate-600 font-black block mb-0.5 tracking-widest", children: "INITIAL SOC (%)" }), _jsx("input", { type: "number", value: battery.initialSoC, onChange: (e) => handleUpdateBattery('initialSoC', Math.min(100, Number(e.target.value))), className: "bg-transparent border-none w-full text-slate-200 font-mono config-input-small focus:ring-0 font-black outline-none p-0" })] }), _jsxs("div", { className: "w-[40px] flex flex-col gap-1 self-stretch", children: [_jsx("button", { onClick: handleExport, className: "flex-1 bg-slate-800 hover:bg-slate-700 rounded-lg border border-slate-700 transition-colors flex items-center justify-center group", title: "Export JSON", children: _jsx("svg", { xmlns: "http://www.w3.org/2000/svg", fill: "none", viewBox: "0 0 24 24", strokeWidth: 2.5, stroke: "currentColor", className: "w-3 h-3 text-slate-400 group-hover:text-blue-400 transition-colors", children: _jsx("path", { strokeLinecap: "round", strokeLinejoin: "round", d: "M3 16.5v2.25A2.25 2.25 0 0 0 5.25 21h13.5A2.25 2.25 0 0 0 21 18.75V16.5m-13.5-9L12 3m0 0 4.5 4.5M12 3v13.5" }) }) }), _jsxs("button", { onClick: handleTriggerImport, className: "flex-1 bg-slate-800 hover:bg-slate-700 rounded-lg border border-slate-700 transition-colors flex items-center justify-center group", title: "Import JSON", children: [_jsx("svg", { xmlns: "http://www.w3.org/2000/svg", fill: "none", viewBox: "0 0 24 24", strokeWidth: 2.5, stroke: "currentColor", className: "w-3 h-3 text-slate-400 group-hover:text-emerald-400 transition-colors", children: _jsx("path", { strokeLinecap: "round", strokeLinejoin: "round", d: "M3 16.5v2.25A2.25 2.25 0 0 0 5.25 21h13.5A2.25 2.25 0 0 0 21 18.75V16.5M16.5 12 12 16.5m0 0L7.5 12m4.5 4.5V3" }) }), _jsx("input", { type: "file", ref: fileInputRef, accept: ".json", onChange: handleImport, className: "hidden" })] })] })]
          })
        }), _jsxs("section", {
          children: [_jsx("h2", { className: "text-[10px] text-slate-500 font-bold mb-4 uppercase tracking-widest", children: "Generation (Power In)" }), _jsx(ChargingTable, {
            sources: charging,
            battery: battery,
            highlightedId: highlightedRow?.kind === 'source' ? highlightedRow.id : null,
            onUpdateSource: handleUpdateSource,
            onDeleteSource: (id) => setCharging(p => p.filter(s => s.id !== id)),
            onAddSource: () => setCharging(p => [...p, { id: Math.random().toString(36).substr(2, 9), name: 'New Source', quantity: 1, input: 0, unit: 'W', efficiency: 0.9, type: 'solar', hours: 5, autoSolar: false, enabled: true }]),
            onAIAddSource: () => { setChatMode('source'); setChatOpen(true); },
            onZoneSizing: () => {
              setZoneSection('generation');
              setChatMode('zoneSizing');
              setChatOpen(true);
            },
            onUpdateBattery: handleUpdateBattery,
            onReorder: handleReorderSources,
            onSort: () => { }
          })]
        }), _jsxs("section", {
          children: [_jsx("h2", { className: "text-[10px] text-slate-500 font-bold mb-4 uppercase tracking-widest", children: "System Mgmt" }), _jsx(EnergyTable, {
            items: items,
            systemVoltage: battery.voltage,
            highlightedId: highlightedRow?.kind === 'load' ? highlightedRow.id : null,
            onUpdateItem: handleUpdateItem,
            onDeleteItem: handleDeleteItem,
            onAddItem: handleAddItem,
            onAIAddItem: () => { setChatMode('load'); setChatOpen(true); },
            onZoneSizing: () => {
              setZoneSection('systemMgmt');
              setChatMode('zoneSizing');
              setChatOpen(true);
            },
            visibleCategories: [LoadCategory.SYSTEM_MGMT],
            onReorder: handleReorderItems,
            onSort: () => { }
          })]
        }), _jsxs("section", {
          children: [_jsx("h2", { className: "text-[10px] text-slate-500 font-bold mb-4 uppercase tracking-widest", children: "AC (VIA INVERTER)" }), _jsx(EnergyTable, {
            items: items,
            systemVoltage: battery.voltage,
            highlightedId: highlightedRow?.kind === 'load' ? highlightedRow.id : null,
            onUpdateItem: handleUpdateItem,
            onDeleteItem: handleDeleteItem,
            onAddItem: handleAddItem,
            onAIAddItem: () => { setChatMode('load'); setChatOpen(true); },
            onZoneSizing: () => {
              setZoneSection('ac');
              setChatMode('zoneSizing');
              setChatOpen(true);
            },
            visibleCategories: [LoadCategory.AC_LOADS],
            onReorder: handleReorderItems,
            onSort: () => { }
          })]
        }), _jsxs("section", {
          children: [_jsx("h2", { className: "text-[10px] text-slate-500 font-bold mb-4 uppercase tracking-widest", children: "DC (NATIVE &/OR VIA CONVERTER)" }), _jsx(EnergyTable, {
            items: items,
            systemVoltage: battery.voltage,
            highlightedId: highlightedRow?.kind === 'load' ? highlightedRow.id : null,
            onUpdateItem: handleUpdateItem,
            onDeleteItem: handleDeleteItem,
            onAddItem: handleAddItem,
            onAIAddItem: () => { setChatMode('load'); setChatOpen(true); },
            onZoneSizing: () => {
              setZoneSection('dc');
              setChatMode('zoneSizing');
              setChatOpen(true);
            },
            visibleCategories: [LoadCategory.DC_LOADS],
            onReorder: handleReorderItems,
            onSort: () => { }
          })]
        })]
      }), _jsx("div", { className: "w-full space-y-8", children: _jsx("div", { className: "lg:sticky lg:top-32", children: _jsx(SummaryPanel, { items: items, totals: totals, systemVoltage: battery.voltage, battery: battery, charging: charging }) }) })]
    }), _jsx(ChatBot, {
      items: items,
      totals: totals,
      battery: battery,
      charging: charging,
      isOpen: chatOpen,
      modeProp: chatMode,
      zoneSizingSection: zoneSection,
      onOpen: () => { setChatMode('general'); setZoneSection(null); setChatOpen(true); },
      onClose: () => setChatOpen(false),
      onAddLoadItem: handleAIAddLoad,
      onAddChargingSource: handleAIAddSource
    })]
  }));
};
export default App;
