import React, { useState, useEffect, useCallback } from 'react';
import { geocodeLocation } from '@/services/weatherService';
import './ga_styles.css';

interface LocationAutocompleteProps {
    value: string;
    onChange: (val: string) => void;
}

export const LocationAutocomplete: React.FC<LocationAutocompleteProps> = ({ value, onChange }) => {
    const [inputValue, setInputValue] = useState(value);
    const [suggestions, setSuggestions] = useState<any[]>([]);
    const [isOpen, setIsOpen] = useState(false);
    const [loading, setLoading] = useState(false);

    // Sync internal state with prop
    useEffect(() => {
        setInputValue(value);
    }, [value]);

    const fetchSuggestions = useCallback(async (query: string) => {
        if (query.length < 3) return;
        setLoading(true);
        try {
            const res = await fetch(`https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(query)}&count=5&language=en&format=json`);
            const data = await res.json();
            setSuggestions(data.results || []);
            setIsOpen(true);
        } catch (e) {
            console.error("Geo search failed", e);
        } finally {
            setLoading(false);
        }
    }, []);

    // Debounce logic
    useEffect(() => {
        const timer = setTimeout(() => {
            if (inputValue && inputValue !== value) {
                fetchSuggestions(inputValue);
            }
        }, 300); // 300ms debounce
        return () => clearTimeout(timer);
    }, [inputValue, value, fetchSuggestions]);

    const handleSelect = (lat: number, lon: number, name: string, country: string) => {
        // Format as "Lat,Lon" or simple name depending on app logic, 
        // but parity app expects "Lat, Lon" or similar for geocode usage?
        // Actually existing app takes a string "location" and geocodes it on blur/update.
        // We will just pass the text name for now, or the coordinate string if that's what the backend prefers.
        // Based on "e.g. 2048" placeholder, it likely accepts Postcodes or City names.
        // Let's set the text name.
        const newVal = `${name}, ${country}`;
        onChange(newVal);
        setInputValue(newVal);
        setIsOpen(false);
    };

    return (
        <div className="relative w-full group">
            <div className="relative flex items-center">
                <input
                    type="text"
                    value={inputValue}
                    onChange={(e) => setInputValue(e.target.value)}
                    placeholder="e.g. 2048 or City"
                    className="bg-transparent border-none w-full text-slate-200 font-mono config-input-small focus:ring-0 font-black outline-none p-0 pr-6"
                />
                {inputValue && (
                    <button
                        onClick={() => { setInputValue(''); onChange(''); setIsOpen(false); }}
                        className="absolute right-0 text-[10px] text-slate-500 hover:text-rose-400 transition-colors"
                        title="Clear"
                    >
                        ✕
                    </button>
                )}
            </div>

            {isOpen && suggestions.length > 0 && (
                <div className="absolute top-full left-0 w-[200px] mt-2 glass-panel rounded-lg overflow-hidden z-[100] animate-fade-in">
                    {suggestions.map((s) => (
                        <button
                            key={s.id}
                            onClick={() => handleSelect(s.latitude, s.longitude, s.name, s.country)}
                            className="w-full text-left px-3 py-2 text-[10px] text-slate-300 hover:bg-white/10 transition-colors border-b border-white/5 last:border-0"
                        >
                            <span className="font-bold text-white block">{s.name}</span>
                            <span className="opacity-60">{s.admin1}, {s.country_code}</span>
                        </button>
                    ))}
                </div>
            )}
        </div>
    );
};
