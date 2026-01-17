import React, { useState, useEffect, useRef, useMemo } from 'react';

interface SmartNotesInputProps {
    value: string;
    onChange: (value: string) => void;
    availableTags?: string[];
    placeholder?: string;
    className?: string;
}

const SmartNotesInput: React.FC<SmartNotesInputProps> = ({
    value,
    onChange,
    availableTags = [],
    placeholder = "Notes... #tag",
    className
}) => {
    const [focused, setFocused] = useState(false);
    const [showSuggestions, setShowSuggestions] = useState(false);
    const [suggestionQuery, setSuggestionQuery] = useState('');
    const [cursorPos, setCursorPos] = useState(0);
    const inputRef = useRef<HTMLInputElement>(null);

    // Render text with highlighted tags for the background layer
    const renderHighlightedText = () => {
        if (!value) return <span className="opacity-40 italic">{placeholder}</span>;

        // Split by space to find tags, but preserve spaces
        const parts = value.split(/(\s+|#[\w\-\/]+)/g);

        return parts.map((part, i) => {
            if (part.match(/^#[\w\-\/]+$/)) {
                return (
                    <span key={i} className="inline-block bg-blue-900/60 text-blue-300 rounded px-1 mx-0.5 text-[9px] font-bold border border-blue-800/50 shadow-sm translate-y-[-1px]">
                        {part}
                    </span>
                );
            }
            return <span key={i}>{part}</span>;
        });
    };

    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const newVal = e.target.value;
        onChange(newVal);

        const pos = e.target.selectionStart || 0;
        setCursorPos(pos);

        const textBeforeCursor = newVal.slice(0, pos);
        const words = textBeforeCursor.split(/\s+/);
        const currentWord = words[words.length - 1];

        if (currentWord.startsWith('#')) {
            setSuggestionQuery(currentWord);
            setShowSuggestions(true);
        } else {
            setShowSuggestions(false);
        }
    };

    const handleSelectSuggestion = (tag: string) => {
        const textBeforeCursor = value.slice(0, cursorPos);
        const textAfterCursor = value.slice(cursorPos);

        const wordsBefore = textBeforeCursor.split(/\s+/);
        wordsBefore.pop();

        const newValue = [...wordsBefore, `#${tag}`, textAfterCursor].join(' ').trim();
        onChange(newValue);
        setShowSuggestions(false);

        if (inputRef.current) {
            inputRef.current.focus();
        }
    };

    const filteredSuggestions = useMemo(() => {
        if (!suggestionQuery) return [];
        const query = suggestionQuery.toLowerCase().replace('#', '');
        return availableTags
            .filter(t => t.toLowerCase().includes(query) && t.toLowerCase() !== query)
            .slice(0, 5);
    }, [availableTags, suggestionQuery]);

    // Shared styles for perfect alignment
    const sharedStyles: React.CSSProperties = {
        fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace',
        fontSize: '10px',
        lineHeight: '1',
        letterSpacing: 'normal',
        paddingLeft: '8px',
        paddingRight: '8px',
        paddingTop: '4px',
        paddingBottom: '4px',
    };

    return (
        <div className={`relative group ${className}`}>
            {/* Background Layer */}
            <div
                className={`absolute inset-0 pointer-events-none flex items-center whitespace-pre overflow-hidden ${!value ? 'opacity-50' : ''}`}
                aria-hidden="true"
                style={sharedStyles}
            >
                {renderHighlightedText()}
            </div>

            {/* Input Layer */}
            <input
                ref={inputRef}
                type="text"
                value={value}
                onChange={handleInputChange}
                onFocus={() => setFocused(true)}
                onBlur={() => { setFocused(false); setTimeout(() => setShowSuggestions(false), 200); }}
                className="relative z-10 w-full bg-transparent border-b border-transparent hover:border-slate-600 focus:border-blue-500 text-transparent caret-white placeholder-transparent transition-colors outline-none block"
                style={sharedStyles}
                spellCheck={false}
            />

            {/* Suggestions */}
            {showSuggestions && filteredSuggestions.length > 0 && (
                <div className="absolute bottom-full left-0 z-50 bg-slate-900 border border-slate-700 rounded-lg shadow-xl mb-1 w-48 overflow-hidden transform translate-y-[-4px]">
                    <div className="text-[8px] uppercase bg-slate-950 text-slate-500 px-2 py-1 font-black tracking-widest border-b border-slate-800">
                        Suggestions
                    </div>
                    {filteredSuggestions.map(tag => (
                        <button
                            key={tag}
                            onClick={() => handleSelectSuggestion(tag)}
                            className="w-full text-left px-3 py-1.5 text-[10px] text-slate-300 hover:bg-blue-900/50 hover:text-white transition-colors flex items-center gap-2"
                        >
                            <span className="text-blue-500 font-bold">#</span>
                            {tag}
                        </button>
                    ))}
                </div>
            )}
        </div>
    );
};

export default SmartNotesInput;
