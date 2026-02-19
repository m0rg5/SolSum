import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import React, { useState, useEffect, useMemo } from 'react';
import { getEffectiveSolarHours, normalizeAutoSolarHours } from '@/services/powerLogic';
import SmartNotesInput from './SmartNotesInput';
const isMgmt = (source) => source.type === 'mppt' ||
    source.name.toLowerCase().includes('mppt') ||
    source.name.toLowerCase().includes('rover') ||
    source.name.toLowerCase().includes('inverter');
const NumberInput = ({ value, onChange, className, step = "any", disabled = false, placeholder = "" }) => {
    const [localStr, setLocalStr] = useState(Number.isFinite(value) ? String(value) : '');
    useEffect(() => {
        if (Number.isFinite(value)) {
            const next = String(value);
            if (localStr !== next)
                setLocalStr(next);
        }
        else {
            if (localStr !== '')
                setLocalStr('');
        }
    }, [value]);
    const handleChange = (e) => {
        const val = e.target.value;
        setLocalStr(val);
        const parsed = parseFloat(val);
        if (!isNaN(parsed))
            onChange(parsed);
    };
    return (_jsx("input", { type: "number", step: step, placeholder: placeholder, className: `bg-transparent text-right text-white focus:outline-none w-full pr-0.5 font-medium placeholder-slate-600 ${className} ${disabled ? 'opacity-30' : ''}`, value: localStr, onChange: handleChange, disabled: disabled, onFocus: (e) => !disabled && e.target.select(), onKeyDown: (e) => e.key === 'Enter' && e.currentTarget.blur() }));
};
const SortHeader = ({ label, sortKey, currentSort, onSort, className, widthClass }) => {
    const isActive = currentSort?.key === sortKey;
    const handleClick = () => onSort(sortKey, isActive && currentSort.dir === 'desc' ? 'asc' : 'desc');
    return (_jsx("th", { className: `px-2 py-2 cursor-pointer hover:text-white transition-colors group select-none whitespace-nowrap ${className} ${widthClass}`, onClick: handleClick, children: _jsxs("div", { className: `flex items-center gap-1 ${className?.includes('right') ? 'justify-end' : ''}`, children: [label, _jsxs("span", { className: `text-[9px] flex flex-col leading-none ml-0.5 ${isActive ? 'text-blue-400' : 'text-slate-700 group-hover:text-slate-500'}`, children: [_jsx("span", { className: `${isActive && currentSort.dir === 'asc' ? 'opacity-100' : 'opacity-40'}`, children: "\u25B2" }), _jsx("span", { className: `${isActive && currentSort.dir === 'desc' ? 'opacity-100' : 'opacity-40'}`, children: "\u25BC" })] })] }) }));
};
const ChargingTable = ({ sources, battery, highlightedId, onUpdateSource, onDeleteSource, onAddSource, onAIAddSource, onZoneSizing, onUpdateBattery, onReorder, onSort }) => {
    const [draggedId, setDraggedId] = useState(null);
    const [sortState, setSortState] = useState(null);

    // Derive all existing tags for autocomplete (charging sources only for now)
    const allTags = useMemo(() => {
        const tags = new Set<string>();
        sources.forEach(i => {
            const matches = (i.notes || '').match(/#[\w\-\/]+/g);
            if (matches) matches.forEach(m => tags.add(m.replace('#', '')));
        });
        return Array.from(tags).sort();
    }, [sources]);

    const sortedSources = useMemo(() => {
        if (!sortState)
            return sources;
        const { key, dir } = sortState;
        return [...sources].sort((a, b) => {
            let valA = a[key];
            let valB = b[key];
            if (key === 'dailyWh') {
                const hA = getEffectiveSolarHours(a, battery);
                const hB = getEffectiveSolarHours(b, battery);
                // Watts Only Logic
                valA = (a.input * hA * a.efficiency * a.quantity);
                valB = (b.input * hB * b.efficiency * b.quantity);
            }
            if (typeof valA === 'string')
                return dir === 'asc' ? valA.localeCompare(valB) : valB.localeCompare(valA);
            return dir === 'asc' ? (Number(valA) || 0) - (Number(valB) || 0) : (Number(valB) || 0) - (Number(valA) || 0);
        });
    }, [sources, sortState, battery]);
    const handleSort = (key, dir) => {
        setSortState({ key, dir });
        onSort(key, dir);
    };
    return (_jsx("div", {
        className: "bg-slate-900 rounded-lg shadow-2xl border border-slate-800 overflow-hidden ring-1 ring-white/5", children: _jsxs("table", {
            className: "w-full text-left text-[12px] text-slate-300 table-auto border-collapse border-spacing-0", children: [_jsx("thead", { className: "bg-slate-950 text-[12px] uppercase text-slate-500 font-black tracking-widest border-b border-slate-800", children: _jsxs("tr", { children: [_jsx("th", { className: "w-6" }), _jsx(SortHeader, { label: "Charging Source", sortKey: "name", currentSort: sortState, onSort: handleSort, widthClass: "min-w-[180px]" }), _jsx("th", { className: "w-6 text-center", children: "\u2713" }), _jsx("th", { className: "px-1 py-2 text-center whitespace-nowrap w-[18px]", children: "@" }), _jsx(SortHeader, { label: "Input (W)", sortKey: "input", currentSort: sortState, onSort: handleSort, className: "text-right", widthClass: "w-[58px]" }), _jsx("th", { className: "px-1 py-2 text-center whitespace-nowrap w-[30px]", children: "\u2600\uFE0F Auto" }), _jsx(SortHeader, { label: "Hrs/Day", sortKey: "hours", currentSort: sortState, onSort: handleSort, className: "text-right", widthClass: "w-[46px]" }), _jsx(SortHeader, { label: "Efficiency", sortKey: "efficiency", currentSort: sortState, onSort: handleSort, className: "text-right", widthClass: "w-[38px]" }), _jsx(SortHeader, { label: "Daily Wh", sortKey: "dailyWh", currentSort: sortState, onSort: handleSort, className: "text-right", widthClass: "w-[45px]" }), _jsx("th", { className: "px-2 py-2 whitespace-nowrap uppercase w-full", children: "Notes" }), _jsx("th", { className: "px-2 py-2 w-8" })] }) }), _jsxs("tbody", {
                className: "divide-y divide-slate-800/50", children: [sortedSources.map(source => {
                    const managementItem = isMgmt(source);
                    const rawEffectiveHours = getEffectiveSolarHours(source, battery);
                    // Limit to 1 decimal place (e.g. 7.1) for cleaner display
                    const effectiveHours = Math.round(rawEffectiveHours * 10) / 10;
                    const efficiency = Number(source.efficiency) || 0.85;
                    const inputVal = Number(source.input) || 0;
                    const qty = Number(source.quantity) || 1;
                    // WATTS ONLY LOGIC
                    const dailyWh = managementItem ? 0 : (inputVal * rawEffectiveHours * efficiency * qty);
                    const isHighlighted = highlightedId === source.id;
                    const isDisabled = source.enabled === false;
                    const norm = normalizeAutoSolarHours(battery);
                    const isAutoErr = source.autoSolar && (norm.status === 'invalid' || norm.status === 'nodata');
                    return (_jsxs("tr", {
                        className: `hover:bg-slate-800/40 transition-all duration-700 group ${draggedId === source.id ? 'opacity-20 scale-[0.98]' : ''} ${managementItem ? 'bg-slate-900/40 opacity-60' : ''} ${isHighlighted ? 'bg-purple-900/40 border-purple-500/50 shadow-[inset_0_0_20px_rgba(168,85,247,0.1)] ring-1 ring-purple-500/30' : ''} ${isDisabled ? 'opacity-40 grayscale' : ''}`, draggable: true, onDragStart: (e) => {
                            setDraggedId(source.id);
                            e.dataTransfer.effectAllowed = 'move';
                            e.dataTransfer.setData("text/plain", source.id);
                        }, onDragEnd: () => setDraggedId(null), onDragOver: (e) => {
                            e.preventDefault();
                            e.dataTransfer.dropEffect = 'move';
                        }, onDragEnter: (e) => {
                            e.preventDefault();
                            if (draggedId && draggedId !== source.id) {
                                onReorder(draggedId, source.id);
                            }
                        }, children: [_jsx("td", { className: "pl-2 pr-0 py-1 w-6 text-center cursor-move text-slate-700 group-hover:text-slate-400 select-none", children: "\u22EE\u22EE" }), _jsx("td", { className: "px-2 py-1 whitespace-nowrap", children: _jsx("input", { type: "text", value: source.name, onChange: (e) => onUpdateSource(source.id, 'name', e.target.value), onKeyDown: (e) => e.key === 'Enter' && e.target.blur(), className: `bg-transparent border-b border-transparent hover:border-slate-600 focus:border-blue-500 w-full text-slate-200 transition-colors text-[12px] font-medium outline-none ${managementItem ? 'italic' : ''}` }) }), _jsx("td", { className: "text-center w-6", children: _jsx("input", { type: "checkbox", checked: source.enabled !== false, onChange: (e) => onUpdateSource(source.id, 'enabled', e.target.checked), className: "rounded border-slate-700 bg-slate-800/50 text-blue-500 focus:ring-0 w-3 h-3 cursor-pointer" }) }), _jsx("td", { className: "px-1 py-1 text-right", children: _jsx("div", { className: "inline-flex items-center justify-center w-[18px] bg-slate-850 border border-slate-700 rounded px-1 py-0.5 focus-within:border-blue-500 transition-colors", children: _jsx(NumberInput, { value: source.quantity || 1, onChange: (val) => onUpdateSource(source.id, 'quantity', Math.max(1, val)), placeholder: "1", className: "text-center pr-0" }) }) }), _jsx("td", { className: "px-1 py-1 text-right", children: !managementItem ? (_jsxs("div", { className: "inline-flex items-center justify-end w-[46px] bg-slate-850 border border-slate-700 rounded px-1 py-0.5 focus-within:border-blue-500 transition-colors", children: [_jsx(NumberInput, { value: source.input, onChange: (val) => onUpdateSource(source.id, 'input', val) }), _jsx("span", { className: "text-[9px] text-slate-500 font-black uppercase shrink-0 pr-0.5 pl-1", children: "W" })] })) : (_jsx("span", { className: "text-slate-600 italic text-[12px]", children: "Internal" })) }), _jsx("td", { className: "px-2 py-1 text-center", children: source.type === 'solar' && (_jsx("input", { type: "checkbox", checked: source.autoSolar, onChange: (e) => onUpdateSource(source.id, 'autoSolar', e.target.checked), className: "w-3 h-3 rounded bg-slate-800 border-slate-700 text-blue-600 focus:ring-blue-500/20" })) }), _jsxs("td", { className: "px-1 py-1 text-right relative", children: [_jsxs("div", { className: `inline-flex items-center justify-end w-[38px] bg-slate-850 border border-slate-700 rounded px-1 py-0.5 focus-within:border-blue-500 transition-colors ${source.autoSolar ? 'opacity-50' : ''}`, children: [_jsx(NumberInput, { value: effectiveHours, onChange: (val) => onUpdateSource(source.id, 'hours', val), step: "0.1", disabled: source.autoSolar || managementItem }), _jsx("span", { className: "text-[9px] text-slate-500 font-black uppercase shrink-0", children: "H" })] }), isAutoErr && (_jsx("div", { className: "absolute -top-1 right-0.5 bg-rose-500 text-white text-[5px] font-black px-1 rounded animate-pulse", children: "AUTO ERR" }))] }), _jsx("td", { className: "px-1 py-1 text-right", children: _jsx("div", { className: "inline-flex items-center justify-end w-[32px] bg-slate-850 border border-slate-700 rounded px-1 py-0.5 focus-within:border-blue-500 transition-colors", children: _jsx(NumberInput, { value: efficiency, onChange: (val) => onUpdateSource(source.id, 'efficiency', val), step: "0.01", disabled: managementItem }) }) }), _jsx("td", { className: "px-2 py-1 text-right font-mono text-emerald-400 font-bold text-[12px] whitespace-nowrap", children: dailyWh.toFixed(0) }), _jsx("td", { className: "px-2 py-1 whitespace-nowrap text-[12px]", children: _jsx(SmartNotesInput, { value: source.notes || '', onChange: (val) => onUpdateSource(source.id, 'notes', val), availableTags: allTags, className: "w-full" }) }), _jsx("td", { className: "px-2 py-1 text-center w-8", children: _jsx("button", { onClick: () => onDeleteSource(source.id), className: "text-slate-400 hover:text-red-400 opacity-60 hover:opacity-100 transition-all p-0.5 group/del", children: _jsx("svg", { xmlns: "http://www.w3.org/2000/svg", fill: "none", viewBox: "0 0 24 24", strokeWidth: 2.5, stroke: "currentColor", className: "w-4 h-4 group-hover/del:scale-110 transition-transform", children: _jsx("path", { strokeLinecap: "round", strokeLinejoin: "round", d: "M6 18 18 6M6 6l12 12" }) }) }) })]
                    }, source.id));
                }), _jsx("tr", { children: _jsx("td", { colSpan: 11, className: "px-2 py-1", children: _jsxs("div", { className: "flex gap-1.5", children: [_jsx("button", { onClick: onAddSource, className: "w-[10%] flex-none flex items-center justify-center gap-2 py-1 border border-dashed border-slate-700 rounded hover:bg-slate-800 text-slate-500 text-sm font-medium transition-all", children: "\u2795" }), _jsx("button", { onClick: onAIAddSource, className: "flex-1 flex items-center justify-center gap-2 py-1 border border-dashed border-blue-900/50 bg-blue-950/20 rounded hover:bg-blue-900/40 text-blue-400/80 text-[12px] font-black uppercase tracking-widest transition-all", children: "\uD83E\uDD16 \u2795" }), _jsx("button", { onClick: () => onZoneSizing && onZoneSizing(), className: "w-[10%] flex-none flex items-center justify-center gap-2 py-1 border border-dashed border-rose-900/50 bg-rose-950/20 rounded hover:bg-rose-900/40 text-rose-400/80 text-[12px] font-black uppercase tracking-widest transition-all", children: "mm\u00B2" })] }) }) })]
            })]
        })
    }));
};
export default ChargingTable;
