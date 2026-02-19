import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import React, { useState, useEffect, useMemo } from 'react';
import { LoadCategory } from '@/types';
import { calculateItemEnergy } from '@/services/powerLogic';
import SmartNotesInput from './SmartNotesInput';
const isMgmt = (item) => item.name.toLowerCase().includes('inverter') ||
    item.name.toLowerCase().includes('controller') ||
    item.category === LoadCategory.SYSTEM_MGMT;
const NumberInput = ({ value, onChange, className, step = "any", disabled = false, placeholder = "0" }) => {
    const [localStr, setLocalStr] = useState(value?.toString() || '');
    useEffect(() => {
        const v = Number(value) || 0;
        const parsed = parseFloat(localStr);
        if (Math.abs(parsed - v) > 0.0001 || isNaN(parsed))
            setLocalStr(value?.toString() || '');
    }, [value]);
    const handleChange = (e) => {
        const val = e.target.value;
        setLocalStr(val);
        const parsed = parseFloat(val);
        if (!isNaN(parsed))
            onChange(parsed);
        else if (val === '')
            onChange(0);
    };
    return (_jsx("input", { type: "number", step: step, disabled: disabled, placeholder: placeholder, className: `bg-transparent text-right text-white focus:outline-none w-full pr-0.5 font-medium placeholder-slate-600 ${className} ${disabled ? 'opacity-30' : ''}`, value: localStr, onChange: handleChange, onFocus: (e) => !disabled && e.target.select(), onKeyDown: (e) => e.key === 'Enter' && e.currentTarget.blur() }));
};
const SortHeader = ({ label, sortKey, currentSort, onSort, className, widthClass }) => {
    const isActive = currentSort?.key === sortKey;
    const handleClick = () => onSort(sortKey, isActive && currentSort.dir === 'desc' ? 'asc' : 'desc');
    return (_jsx("th", { className: `px-2 py-2 cursor-pointer hover:text-white transition-colors group select-none whitespace-nowrap ${className} ${widthClass}`, onClick: handleClick, children: _jsxs("div", { className: `flex items-center gap-1 ${className?.includes('right') ? 'justify-end' : ''}`, children: [label, _jsxs("span", { className: `text-[9px] flex flex-col leading-none ml-0.5 ${isActive ? 'text-blue-400' : 'text-slate-700 group-hover:text-slate-500'}`, children: [_jsx("span", { className: `${isActive && currentSort.dir === 'asc' ? 'opacity-100' : 'opacity-40'}`, children: "\u25B2" }), _jsx("span", { className: `${isActive && currentSort.dir === 'desc' ? 'opacity-100' : 'opacity-40'}`, children: "\u25BC" })] })] }) }));
};
const EnergyTable = ({ items, systemVoltage, highlightedId, onUpdateItem, onDeleteItem, onAddItem, onAIAddItem, onZoneSizing, onReorder, onSort, visibleCategories }) => {
    const [draggedId, setDraggedId] = useState(null);
    const [sortState, setSortState] = useState(null);
    const filteredItems = useMemo(() => {
        return items.filter(i => visibleCategories.includes(i.category));
    }, [items, visibleCategories]);

    // Derive all existing tags for autocomplete
    const allTags = useMemo(() => {
        const tags = new Set<string>();
        items.forEach(i => {
            const matches = (i.notes || '').match(/#[\w\-\/]+/g);
            if (matches) matches.forEach(m => tags.add(m.replace('#', '')));
        });
        return Array.from(tags).sort();
    }, [items]);

    const sortedItems = useMemo(() => {
        if (!sortState)
            return filteredItems;
        const { key, dir } = sortState;
        return [...filteredItems].sort((a, b) => {
            let valA = a[key];
            let valB = b[key];
            if (key === 'wh' || key === 'ah') {
                const energyA = calculateItemEnergy(a, systemVoltage);
                const energyB = calculateItemEnergy(b, systemVoltage);
                valA = energyA[key];
                valB = energyB[key];
            }
            if (typeof valA === 'string')
                return dir === 'asc' ? valA.localeCompare(valB) : valB.localeCompare(valA);
            return dir === 'asc' ? (Number(valA) || 0) - (Number(valB) || 0) : (Number(valB) || 0) - (Number(valA) || 0);
        });
    }, [filteredItems, sortState, systemVoltage]);
    const handleSortChange = (key, dir) => {
        setSortState({ key, dir });
        onSort(key, dir);
    };
    const showQtyInput = visibleCategories.length === 1 && visibleCategories[0] !== LoadCategory.AC_LOADS;
    return (_jsx("div", {
        className: "overflow-hidden bg-slate-900 rounded-lg shadow-2xl border border-slate-800 ring-1 ring-white/5", children: _jsxs("table", {
            className: "w-full text-left text-[12px] text-slate-300 table-auto border-collapse", children: [_jsx("thead", { className: "bg-slate-950 text-[12px] uppercase text-slate-500 font-black tracking-widest border-b border-slate-800", children: _jsxs("tr", { children: [_jsx("th", { className: "w-6" }), _jsx(SortHeader, { label: "Item", sortKey: "name", currentSort: sortState, onSort: handleSortChange, widthClass: "min-w-[140px]" }), _jsx("th", { className: "w-6 text-center", children: "\u2713" }), _jsx("th", { className: "px-1 py-2 text-center whitespace-nowrap w-[18px]", children: "@" }), _jsx(SortHeader, { label: "POWER (W)", sortKey: "watts", currentSort: sortState, onSort: handleSortChange, className: "text-right", widthClass: "w-[50px]" }), _jsx(SortHeader, { label: "HRS/DAY", sortKey: "hours", currentSort: sortState, onSort: handleSortChange, className: "text-right", widthClass: "w-[46px]" }), _jsx("th", { className: "px-1 py-2 text-right whitespace-nowrap w-[42px]", children: "DUTY %" }), _jsx(SortHeader, { label: "DAILY WH", sortKey: "wh", currentSort: sortState, onSort: handleSortChange, className: "text-right", widthClass: "w-[45px]" }), _jsx(SortHeader, { label: "AH TOTAL", sortKey: "ah", currentSort: sortState, onSort: handleSortChange, className: "text-right", widthClass: "w-[45px]" }), _jsx("th", { className: "px-2 py-2 whitespace-nowrap uppercase w-full", children: "Notes" }), _jsx("th", { className: "px-2 py-2 w-8" })] }) }), _jsx("tbody", {
                className: "divide-y divide-slate-800/50", children: sortedItems.map(item => {
                    const { wh, ah } = calculateItemEnergy(item, systemVoltage);
                    const isSuspicious = ah > 100 && (item.dutyCycle === undefined || item.dutyCycle === 100);
                    const managementItem = isMgmt(item);
                    const isHighlighted = highlightedId === item.id;
                    const isDisabled = item.enabled === false;
                    return (_jsxs("tr", {
                        className: `border-b border-slate-800 hover:bg-slate-800/40 transition-all duration-700 group ${draggedId === item.id ? 'opacity-20 scale-[0.98]' : ''} ${managementItem ? 'bg-slate-900/40' : ''} ${isHighlighted ? 'bg-purple-900/40 border-purple-500/50 shadow-[inset_0_0_20px_rgba(168,85,247,0.1)] ring-1 ring-purple-500/30' : ''} ${isDisabled ? 'opacity-40 grayscale' : ''}`, draggable: true, onDragStart: (e) => {
                            setDraggedId(item.id);
                            e.dataTransfer.effectAllowed = 'move';
                            e.dataTransfer.setData("text/plain", item.id);
                        }, onDragEnd: () => setDraggedId(null), onDragOver: (e) => {
                            e.preventDefault();
                            e.dataTransfer.dropEffect = 'move';
                        }, onDragEnter: (e) => {
                            e.preventDefault();
                            if (draggedId && draggedId !== item.id) {
                                onReorder(draggedId, item.id);
                            }
                        }, children: [_jsx("td", { className: "pl-2 pr-0 py-1 w-6 text-center cursor-move text-slate-700 group-hover:text-slate-400 select-none", children: "\u22EE\u22EE" }), _jsx("td", { className: "px-2 py-1 whitespace-nowrap min-w-[140px]", children: _jsx("input", { type: "text", value: item.name, onChange: (e) => onUpdateItem(item.id, 'name', e.target.value), onKeyDown: (e) => e.key === 'Enter' && e.target.blur(), className: `bg-transparent border-b border-transparent hover:border-slate-600 focus:border-blue-500 w-full text-slate-200 transition-colors text-[12px] font-medium outline-none ${managementItem ? 'italic' : ''}` }) }), _jsx("td", { className: "text-center w-6", children: _jsx("input", { type: "checkbox", checked: item.enabled !== false, onChange: (e) => onUpdateItem(item.id, 'enabled', e.target.checked), className: "rounded border-slate-700 bg-slate-800/50 text-blue-500 focus:ring-0 w-3 h-3 cursor-pointer" }) }), _jsx("td", { className: "px-1 py-1 text-right", children: showQtyInput ? (_jsx("div", { className: "inline-flex items-center justify-center w-[18px] bg-slate-850 border border-slate-700 rounded px-1 py-0.5 focus-within:border-blue-500 transition-colors", children: _jsx(NumberInput, { value: item.quantity || 1, onChange: (val) => onUpdateItem(item.id, 'quantity', Math.max(1, val)), placeholder: "1", className: "text-center pr-0" }) })) : (_jsx("div", { className: "w-[18px] h-5 flex items-center justify-center opacity-20 text-slate-600 font-mono text-[12px]", children: "-" })) }), _jsx("td", { className: "px-1 py-1 text-right", children: _jsxs("div", { className: `inline-flex items-center justify-end w-[41px] bg-slate-850 border border-slate-700 rounded px-1 py-0.5 focus-within:border-blue-500 transition-colors`, children: [_jsx(NumberInput, { value: item.watts, onChange: (val) => onUpdateItem(item.id, 'watts', val) }), _jsx("span", { className: "text-[9px] text-slate-500 font-black uppercase shrink-0", children: "W" })] }) }), _jsx("td", { className: "px-1 py-1 text-right", children: _jsxs("div", { className: `inline-flex items-center justify-end w-[36px] bg-slate-850 border border-slate-700 rounded px-1 py-0.5 focus-within:border-blue-500 transition-colors`, children: [_jsx(NumberInput, { value: item.hours, onChange: (val) => onUpdateItem(item.id, 'hours', val), step: "0.1" }), _jsx("span", { className: "text-[9px] text-slate-500 font-black uppercase shrink-0", children: "H" })] }) }), _jsx("td", { className: "px-1 py-1 text-right", children: _jsxs("div", { className: `inline-flex items-center justify-end w-[33px] bg-slate-850 border border-slate-700 rounded px-1 py-0.5 focus-within:border-blue-500 transition-colors`, children: [_jsx(NumberInput, { value: item.dutyCycle || 100, onChange: (val) => onUpdateItem(item.id, 'dutyCycle', Math.min(100, Math.max(1, val))), className: item.dutyCycle < 100 ? 'text-amber-400' : '' }), _jsx("span", { className: "text-[9px] text-slate-500 font-black uppercase shrink-0", children: "%" })] }) }), _jsx("td", { className: "px-2 py-1 text-right font-mono text-emerald-400 font-bold text-[12px] whitespace-nowrap", children: (wh || 0).toFixed(0) }), _jsx("td", { className: "px-2 py-1 text-right font-mono text-amber-400 font-bold text-[12px] whitespace-nowrap relative", children: _jsxs("div", { className: "flex items-center justify-end gap-1", children: [(ah || 0).toFixed(1), isSuspicious && _jsx("div", { className: "text-amber-500 animate-pulse", children: _jsx("svg", { viewBox: "0 0 20 20", fill: "currentColor", className: "w-3 h-3", children: _jsx("path", { fillRule: "evenodd", d: "M8.485 2.495c.673-1.167 2.357-1.167 3.03 0l6.28 10.875c.673 1.167-.17 2.625-1.516 2.625H3.72c-1.347 0-2.189-1.458-1.515-2.625L8.485 2.495ZM10 5a.75.75 0 0 1 .75.75v3.5a.75.75 0 0 1-1.5 0v-3.5A.75.75 0 0 1 10 5Zm0 9a1 1 0 1 0 0-2 1 1 0 0 0 0 2Z", clipRule: "evenodd" }) }) })] }) }), _jsx("td", { className: "px-2 py-1 whitespace-nowrap text-[12px]", children: _jsx(SmartNotesInput, { value: item.notes || '', onChange: (val) => onUpdateItem(item.id, 'notes', val), availableTags: allTags, className: "w-full" }) }), _jsx("td", { className: "px-2 py-1 text-center w-8", children: _jsx("button", { onClick: () => onDeleteItem(item.id), className: "text-slate-400 hover:text-red-400 opacity-60 hover:opacity-100 transition-all p-0.5 group/del", children: _jsx("svg", { xmlns: "http://www.w3.org/2000/svg", fill: "none", viewBox: "0 0 24 24", strokeWidth: 2.5, stroke: "currentColor", className: "w-3 h-3 group-hover/del:scale-110 transition-transform", children: _jsx("path", { strokeLinecap: "round", strokeLinejoin: "round", d: "M6 18 18 6M6 6l12 12" }) }) }) })]
                    }, item.id));
                })
            }), _jsx("tfoot", { children: _jsx("tr", { children: _jsx("td", { colSpan: 12, className: "px-2 py-1", children: _jsxs("div", { className: "flex gap-1.5", children: [_jsx("button", { onClick: () => onAddItem(visibleCategories[0]), className: "w-[10%] flex-none flex items-center justify-center gap-2 py-1 border border-dashed border-slate-700 rounded hover:bg-slate-800 text-slate-500 text-sm font-medium transition-all", children: "\u2795" }), _jsx("button", { onClick: () => onAIAddItem(visibleCategories[0]), className: "flex-1 flex items-center justify-center gap-2 py-1 border border-dashed border-blue-900/50 bg-blue-950/20 rounded hover:bg-blue-900/40 text-blue-400/80 text-[12px] font-black uppercase tracking-widest transition-all", children: "\uD83E\uDD16 \u2795" }), _jsx("button", { onClick: () => onZoneSizing && onZoneSizing(visibleCategories[0]), className: "w-[10%] flex-none flex items-center justify-center gap-2 py-1 border border-dashed border-rose-900/50 bg-rose-950/20 rounded hover:bg-rose-900/40 text-rose-400/80 text-[12px] font-black uppercase tracking-widest transition-all", children: "mm\u00B2" })] }) }) }) })]
        })
    }));
};
export default EnergyTable;
