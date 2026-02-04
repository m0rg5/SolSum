import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import React from 'react';
import { calculateAutonomy } from '@/services/powerLogic';
const SummaryPanel = ({ totals, systemVoltage, items, battery, charging }) => {
    const socColor = totals.finalSoC > 50 ? 'text-emerald-400' : totals.finalSoC > 20 ? 'text-amber-400' : 'text-red-400';
    const renderAutonomyRow = (label, scenario, icon) => {
        // Projections use forecast PSH if available (mapped to specific scenarios)
        const forecast = battery.forecast ? {
            sunny: battery.forecast.sunnyHours,
            cloudy: battery.forecast.cloudyHours,
            now: battery.forecast.nowHours
        } : undefined;
        // Pass totals.finalSoC to ensure autonomy is calculated from the CURRENT state, not the start of the day.
        const { days, hours } = calculateAutonomy(items, charging, battery, scenario, forecast, totals.finalSoC);
        let text = "";
        let textColor = "text-slate-400";
        if (days === Infinity || days > 30) {
            text = "∞";
            textColor = "text-emerald-400";
        }
        else {
            if (days > 1) {
                text = `${days.toFixed(1)} d`;
                textColor = days > 3 ? "text-emerald-400" : "text-amber-400";
            }
            else {
                text = `${hours.toFixed(1)} h`;
                textColor = "text-rose-400";
            }
        }
        return (_jsxs("div", { className: "flex items-start gap-3 w-full group/row py-0.5", children: [_jsx("span", { className: "text-base grayscale group-hover/row:grayscale-0 transition-all shrink-0 mt-0.5 w-4 h-4 flex items-center justify-center", children: typeof icon === 'string' ? icon : icon }), _jsxs("div", { className: "flex flex-col items-start flex-1 border-l border-slate-800/50 pl-2", children: [_jsx("div", { className: "flex items-center gap-1.5", children: _jsx("span", { className: "text-[9px] font-bold text-slate-500 uppercase tracking-tight", children: label }) }), _jsx("span", { className: `font-mono font-black text-[12px] leading-tight mt-0.5 ${textColor}`, children: text === '∞' ? _jsx("span", { className: "text-lg", children: "\u221E" }) : text })] })] }));
    };
    return (_jsxs("div", { className: "flex flex-col items-center gap-4 w-full text-center py-1 px-1", children: [_jsxs("div", { className: "w-full bg-slate-950 p-3 rounded-xl border border-slate-800 shadow-2xl flex flex-col items-center relative overflow-hidden group", children: [_jsx("div", { className: "absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-blue-500/20 to-transparent" }), _jsx("h3", { className: "app-header-font text-[9px] text-slate-600 mb-1.5 uppercase tracking-wider", children: "24H SOC" }), _jsxs("div", { className: `app-header-font text-3xl mb-2 drop-shadow-lg transition-all duration-500 ${socColor}`, children: [totals.finalSoC.toFixed(0), "%"] }), _jsx("div", { className: "w-full bg-slate-800 h-1 rounded-full overflow-hidden mb-3 border border-slate-700/50 shadow-inner max-w-[100px]", children: _jsx("div", { className: `h-full transition-all duration-1000 relative ${totals.finalSoC > 50 ? 'bg-emerald-500' : 'bg-amber-500'}`, style: { width: `${totals.finalSoC}%` }, children: _jsx("div", { className: "absolute inset-0 bg-gradient-to-t from-white/10 to-transparent" }) }) }), _jsxs("div", { className: "flex flex-col gap-1.5 w-full max-w-[90px]", children: [_jsxs("div", { className: "bg-slate-900 p-1 rounded-lg border border-slate-800 shadow-md flex flex-col items-center group/box hover:border-cyan-500/30 transition-colors", children: [_jsx("span", { className: "text-[6px] text-slate-600 uppercase font-black mb-0.5 tracking-widest leading-none", children: "Input" }), _jsxs("span", { className: "font-mono text-cyan-400 font-black text-[9px] tracking-tight", children: ["+", totals.dailyAhGenerated.toFixed(0), "Ah"] })] }), _jsxs("div", { className: "bg-slate-900 p-1 rounded-lg border border-slate-800 shadow-md flex flex-col items-center group/box hover:border-rose-500/30 transition-colors", children: [_jsx("span", { className: "text-[6px] text-slate-600 uppercase font-black mb-0.5 tracking-widest leading-none", children: "Output" }), _jsxs("span", { className: "font-mono text-rose-400 font-black text-[9px] tracking-tight", children: ["-", totals.dailyAhConsumed.toFixed(0), "Ah"] })] })] })] }), _jsxs("div", { className: "w-full bg-slate-950 p-4 rounded-xl border border-slate-800 shadow-2xl flex flex-col items-center relative overflow-hidden", children: [_jsx("div", { className: "absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-emerald-500/20 to-transparent" }), _jsx("h3", { className: "app-header-font text-[9px] text-slate-600 mb-4 uppercase tracking-wider", children: "Battery Life" }), _jsxs("div", { className: "w-full space-y-2.5 px-1 max-w-[160px]", children: [renderAutonomyRow("Realistic", "current", (_jsx("svg", { xmlns: "http://www.w3.org/2000/svg", viewBox: "0 0 24 24", fill: "currentColor", className: "w-3.5 h-3.5 text-slate-400", children: _jsx("path", { d: "M18.375 2.25c-1.035 0-1.875.84-1.875 1.875v15.75c0 1.035.84 1.875 1.875 1.875h.75c1.035 0 1.875-.84 1.875-1.875V4.125c0-1.035-.84-1.875-1.875-1.875h-.75ZM9.75 8.625c-1.035 0-1.875.84-1.875 1.875v9.375c0 1.035.84 1.875 1.875 1.875h.75c1.035 0 1.875-.84 1.875-1.875V10.5c0-1.035-.84-1.875-1.875-1.875h-.75ZM3 13.125c0-1.035.84-1.875 1.875-1.875h.75c1.035 0 1.875.84 1.875 1.875v4.875c0 1.035-.84 1.875-1.875 1.875H4.875c-1.035 0-1.875-.84-1.875-1.875v-4.875Z" }) }))), renderAutonomyRow("Cloud", "cloud", "⛅"), renderAutonomyRow("0%", "zero", "🌑")] })] })] }));
};
export default SummaryPanel;
