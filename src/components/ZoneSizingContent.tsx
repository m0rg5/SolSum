import React, { useState, useMemo, useEffect } from 'react';
import { PowerItem, ChargingSource, ZoneSizingSection } from '../types';

const ZapIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-yellow-500"><path d="M4 14.71 13.14 4 11 10.29h9L10.86 21 13 14.71z" /></svg>
);

interface ZoneSizingContentProps {
    items: PowerItem[];
    sources: ChargingSource[];
    initialSection?: ZoneSizingSection;
    systemVoltage: number;
}

interface WireSizeResult {
    awg: string;
    mm2: number;
    maxAmps: number;
    voltageDrop: number;
    percentageDrop: number;
    recommended: boolean;
}

// Virtual section tags and their display names
const SECTION_TAGS: { key: ZoneSizingSection; tag: string; label: string }[] = [
    { key: 'generation', tag: '#generation', label: 'Generation' },
    { key: 'systemMgmt', tag: '#systemmgmt', label: 'System Mgmt' },
    { key: 'ac', tag: '#ac', label: 'AC Loads' },
    { key: 'dc', tag: '#dc', label: 'DC Loads' },
];

export const ZoneSizingContent: React.FC<ZoneSizingContentProps> = ({
    items,
    sources,
    initialSection = null,
    systemVoltage = 24
}) => {
    const [selectedTag, setSelectedTag] = useState<string>('');
    const [lengthCheck, setLengthCheck] = useState<number>(5);
    const [activeSection, setActiveSection] = useState<ZoneSizingSection>(initialSection);

    // Extract all unique user-defined tags
    const userTags = useMemo(() => {
        const tags = new Set<string>();
        const processNotes = (notes?: string) => {
            const matches = (notes || '').match(/#[\w\-\/]+/g);
            if (matches) matches.forEach(m => tags.add(m));
        };
        items.forEach(i => processNotes(i.notes));
        sources.forEach(s => processNotes(s.notes));
        return Array.from(tags).sort();
    }, [items, sources]);

    // Combine section tags with user tags
    const allTags = useMemo(() => {
        const sectionTagValues = SECTION_TAGS.map(s => s.tag);
        return [...sectionTagValues, ...userTags.filter(t => !sectionTagValues.includes(t))];
    }, [userTags]);

    // Set initial tag based on section or first available
    useEffect(() => {
        if (initialSection) {
            const sectionTag = SECTION_TAGS.find(s => s.key === initialSection);
            if (sectionTag) {
                setSelectedTag(sectionTag.tag);
                setActiveSection(initialSection);
            }
        } else if (!selectedTag && allTags.length > 0) {
            setSelectedTag(allTags[0]);
        }
    }, [initialSection, allTags]);

    // Calculate zone stats based on selected tag
    const zoneStats = useMemo(() => {
        if (!selectedTag) return null;

        let zoneItems: PowerItem[] = [];
        let zoneSources: ChargingSource[] = [];

        // Check if it's a section tag
        const sectionTag = SECTION_TAGS.find(s => s.tag === selectedTag);
        if (sectionTag) {
            switch (sectionTag.key) {
                case 'generation':
                    zoneSources = sources.filter(s => s.enabled !== false);
                    break;
                case 'systemMgmt':
                    zoneItems = items.filter(i => i.category === 'System Mgmt' && i.enabled !== false);
                    break;
                case 'ac':
                    zoneItems = items.filter(i => i.category === 'AC Loads (Inverter)' && i.enabled !== false);
                    break;
                case 'dc':
                    zoneItems = items.filter(i => i.category === 'DC Loads (Native/DCDC)' && i.enabled !== false);
                    break;
            }
        } else {
            // Regular user tag - filter by notes containing the tag
            zoneItems = items.filter(i => (i.notes || '').includes(selectedTag) && i.enabled !== false);
            zoneSources = sources.filter(s => (s.notes || '').includes(selectedTag) && s.enabled !== false);
        }

        const totalLoadCurrent = zoneItems.reduce((sum, item) => {
            const amps = (Number(item.watts) * (Number(item.quantity) || 1)) / systemVoltage;
            return sum + amps;
        }, 0);

        const totalChargeCurrent = zoneSources.reduce((sum, source) => {
            return sum + (source.type === 'solar'
                ? (Number(source.input)) / systemVoltage
                : (Number(source.input)));
        }, 0);

        const maxCurrent = Math.max(totalLoadCurrent, totalChargeCurrent);

        return {
            items: zoneItems.length,
            sources: zoneSources.length,
            loadAmps: totalLoadCurrent,
            chargeAmps: totalChargeCurrent,
            maxCurrent,
            power: maxCurrent * systemVoltage
        };
    }, [selectedTag, items, sources, systemVoltage]);

    const calculateWireSize = (current: number, length: number): WireSizeResult[] => {
        const wires = [
            { mm: 1.5, awg: '16', amps: 25 },
            { mm: 2.5, awg: '14', amps: 35 },
            { mm: 4, awg: '12', amps: 45 },
            { mm: 6, awg: '10', amps: 55 },
            { mm: 10, awg: '8', amps: 70 },
            { mm: 16, awg: '6', amps: 95 },
            { mm: 25, awg: '4', amps: 120 },
            { mm: 35, awg: '2', amps: 160 },
            { mm: 50, awg: '1/0', amps: 210 },
            { mm: 70, awg: '2/0', amps: 270 },
            { mm: 95, awg: '3/0', amps: 330 },
            { mm: 120, awg: '4/0', amps: 390 }
        ];

        return wires.map(wire => {
            const resistance = (0.01724 * (length * 2)) / wire.mm;
            const vDrop = current * resistance;
            const vDropPercent = (vDrop / systemVoltage) * 100;
            const isAmpacitySafe = wire.amps >= current * 1.25;

            return {
                awg: wire.awg,
                mm2: wire.mm,
                maxAmps: wire.amps,
                voltageDrop: vDrop,
                percentageDrop: vDropPercent,
                recommended: isAmpacitySafe && vDropPercent <= 3
            };
        });
    };

    const results = useMemo(() => {
        if (!zoneStats || zoneStats.maxCurrent === 0) return [];
        return calculateWireSize(zoneStats.maxCurrent, lengthCheck);
    }, [zoneStats, lengthCheck, systemVoltage]);

    const isSectionTag = SECTION_TAGS.some(s => s.tag === selectedTag);

    return (
        <div className="flex flex-col h-full overflow-hidden">
            {/* Header */}
            <div className="px-5 py-3 border-b border-slate-800 shrink-0 flex items-center justify-between">
                <h3 className="text-[10px] text-slate-500 font-bold uppercase tracking-widest">Cable Gauge Guide</h3>
                <p className="text-[9px] text-slate-500 uppercase tracking-widest font-black opacity-60">
                    ISO 10133 / ABYC E-11 • {systemVoltage}V System
                </p>
            </div>

            {/* Content */}
            <div className="flex-1 overflow-y-auto p-5 space-y-5 scrollbar-thin scrollbar-thumb-slate-700">

                {/* Unified Tags Row */}
                <div className="flex flex-wrap items-center gap-x-4 gap-y-2 py-1">
                    <div className="flex flex-wrap gap-2 items-center">
                        <span className="text-[9px] text-slate-600 uppercase font-black tracking-widest mr-1">Sections:</span>
                        {SECTION_TAGS.map(section => (
                            <button
                                key={section.key}
                                onClick={() => { setSelectedTag(section.tag); setActiveSection(section.key); }}
                                className={`px-2.5 py-1 rounded text-[9px] font-black uppercase tracking-wider transition-all ${selectedTag === section.tag
                                    ? 'bg-rose-500 text-white shadow-lg shadow-rose-900/30 ring-1 ring-rose-400/50'
                                    : 'bg-slate-800 text-slate-500 hover:bg-slate-700 border border-slate-700'
                                    }`}
                            >
                                {section.label}
                            </button>
                        ))}
                    </div>

                    {userTags.length > 0 && <span className="text-slate-800 font-bold">|</span>}

                    {userTags.length > 0 && (
                        <div className="flex flex-wrap gap-2 items-center">
                            <span className="text-[9px] text-slate-600 uppercase font-black tracking-widest mr-1">Tags:</span>
                            {userTags.map(tag => (
                                <button
                                    key={tag}
                                    onClick={() => { setSelectedTag(tag); setActiveSection(null); }}
                                    className={`px-2.5 py-1 rounded text-[9px] font-black tracking-wider transition-all ${selectedTag === tag
                                        ? 'bg-rose-500 text-white shadow-lg shadow-rose-900/30'
                                        : 'bg-slate-800 text-slate-500 hover:bg-slate-700 border border-slate-700'
                                        }`}
                                >
                                    {tag}
                                </button>
                            ))}
                        </div>
                    )}
                </div>

                {/* Stats & Length Row - Maximized */}
                {zoneStats && (
                    <div className="bg-slate-950/40 rounded-xl p-4 border border-slate-800/60 shadow-inner flex items-center justify-between gap-6">
                        <div className="flex-1 flex flex-col items-center">
                            <label className="text-[9px] text-slate-600 uppercase font-black tracking-widest mb-1.5">Length (m)</label>
                            <input
                                type="number"
                                value={lengthCheck}
                                onChange={(e) => setLengthCheck(Math.max(0.1, parseFloat(e.target.value) || 0.1))}
                                className="bg-slate-900/50 border border-slate-800 rounded px-2 py-1 w-16 text-center text-xl font-black text-rose-400 focus:outline-none focus:border-rose-500/50"
                            />
                        </div>

                        <div className="h-10 w-px bg-slate-800/50"></div>

                        <div className="flex-1 flex flex-col items-center">
                            <label className="text-[9px] text-slate-600 uppercase font-black tracking-widest mb-1.5">Load</label>
                            <div className="text-xl font-black text-slate-300">{zoneStats.loadAmps.toFixed(1)}A</div>
                        </div>

                        <div className="h-10 w-px bg-slate-800/50"></div>

                        <div className="flex-1 flex flex-col items-center">
                            <label className="text-[9px] text-slate-600 uppercase font-black tracking-widest mb-1.5">Charge</label>
                            <div className="text-xl font-black text-emerald-500/80">{zoneStats.chargeAmps.toFixed(1)}A</div>
                        </div>

                        <div className="h-10 w-px bg-slate-800/50"></div>

                        <div className="flex-1 flex flex-col items-center">
                            <label className="text-[9px] text-slate-600 uppercase font-black tracking-widest mb-1.5">Target</label>
                            <div className="text-xl font-black text-rose-400">{zoneStats.maxCurrent.toFixed(1)}A</div>
                        </div>
                    </div>
                )}

                {/* Wire Size Table */}
                {results.length > 0 && (
                    <div className="space-y-3">
                        <h4 className="text-[10px] font-bold text-slate-400 uppercase tracking-widest flex items-center gap-2">
                            <ZapIcon />
                            Recommended Wire Sizes
                        </h4>
                        <div className="border border-slate-700 rounded-xl overflow-hidden">
                            <table className="w-full text-xs">
                                <thead className="bg-slate-800/80 text-slate-500">
                                    <tr>
                                        <th className="px-3 py-2 text-left font-bold text-[9px] uppercase tracking-wider">mm²</th>
                                        <th className="px-3 py-2 text-left font-bold text-[9px] uppercase tracking-wider">AWG</th>
                                        <th className="px-3 py-2 text-left font-bold text-[9px] uppercase tracking-wider">V Drop</th>
                                        <th className="px-3 py-2 text-right font-bold text-[9px] uppercase tracking-wider">Status</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-800">
                                    {results.slice(0, 8).map((r, i) => (
                                        <tr key={i} className={`${r.recommended ? 'bg-emerald-900/20' : 'hover:bg-slate-800/30'} transition-colors`}>
                                            <td className="px-3 py-2 font-mono font-bold text-slate-300">{r.mm2}</td>
                                            <td className="px-3 py-2 text-slate-500">{r.awg}</td>
                                            <td className="px-3 py-2">
                                                <span className={`font-bold ${r.percentageDrop <= 3 ? 'text-emerald-400' : r.percentageDrop <= 10 ? 'text-yellow-400' : 'text-red-400'}`}>
                                                    {r.percentageDrop.toFixed(1)}%
                                                </span>
                                                <span className="text-slate-600 text-[10px] ml-1">({r.voltageDrop.toFixed(2)}V)</span>
                                            </td>
                                            <td className="px-3 py-2 text-right">
                                                {r.recommended ? (
                                                    <span className="inline-flex items-center gap-1 text-emerald-400 font-black text-[9px] bg-emerald-900/40 px-2 py-0.5 rounded-full border border-emerald-700/50">
                                                        ✓ OK
                                                    </span>
                                                ) : r.maxAmps < (zoneStats?.maxCurrent || 0) * 1.25 ? (
                                                    <span className="text-red-400 text-[9px]">Undersized</span>
                                                ) : (
                                                    <span className="text-yellow-400 text-[9px]">High Drop</span>
                                                )}
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>
                )}

                {/* Info note */}
                {isSectionTag && (
                    <div className="text-[10px] text-slate-600 italic bg-slate-800/30 rounded-lg p-3 border border-slate-800">
                        💡 Section tags ({selectedTag}) show totals for all items in this section. Use custom #tags in Notes for more specific zone groupings.
                    </div>
                )}
            </div>
        </div>
    );
};

export default ZoneSizingContent;
