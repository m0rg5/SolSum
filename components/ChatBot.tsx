
import React, { useState, useRef, useEffect } from 'react';
import { Chat, GenerateContentResponse, FunctionCall, Part } from "@google/genai";
import ReactMarkdown from 'react-markdown';
import { createChatSession, getDynamicSuggestions } from '../services/geminiService';
import { ChatMessage, PowerItem, SystemTotals, ChargingSource, ChatMode } from '../types';

interface ChatBotProps {
  items: PowerItem[];
  totals: SystemTotals;
  isOpen: boolean;
  modeProp?: ChatMode;
  contextItem?: PowerItem | ChargingSource | null;
  onOpen: () => void;
  onClose: () => void;
  onAddLoadItem?: (item: Omit<PowerItem, 'id'>) => void;
  onAddChargingSource?: (source: Omit<ChargingSource, 'id'>) => void;
}

const QuickSuggestion: React.FC<{ label: string; onClick: () => any }> = ({ label, onClick }) => (
  <button 
    onClick={onClick}
    className="whitespace-nowrap px-3 py-1.5 border text-[10px] font-bold uppercase rounded-full transition-all bg-slate-800 hover:bg-slate-700 border-slate-700 text-slate-300 shadow-sm tracking-widest"
  >
    {label}
  </button>
);

const MessageContent = ({ message }: { message: ChatMessage }) => {
  const [isExpanded, setIsExpanded] = useState(false);
  
  if (message.role === 'model' && (message.summary || message.expanded)) {
    return (
      <div className="prose prose-invert prose-sm max-w-none">
        <div className="text-slate-200 leading-relaxed">
           <ReactMarkdown>{isExpanded ? message.expanded : message.summary}</ReactMarkdown>
        </div>
        {(message.expanded && message.expanded !== message.summary) && (
          <button 
            onClick={() => setIsExpanded(!isExpanded)}
            className="text-blue-400 font-black text-[9px] mt-3 uppercase tracking-[0.2em] hover:text-blue-300 transition-colors"
          >
            {isExpanded ? "LESS..." : "MORE..."}
          </button>
        )}
      </div>
    );
  }

  return (
    <div className="prose prose-invert prose-sm max-w-none whitespace-pre-wrap leading-relaxed">
       <ReactMarkdown>{message.text}</ReactMarkdown>
    </div>
  );
};

const ChatBot: React.FC<ChatBotProps> = ({ 
  items,
  totals,
  modeProp = 'general', 
  isOpen,
  onOpen,
  onClose, 
  contextItem,
  onAddLoadItem, 
  onAddChargingSource 
}) => {
  const [isMaximized, setIsMaximized] = useState(false);
  const [mode, setMode] = useState<ChatMode>('general');
  const [messages, setMessages] = useState<ChatMessage[]>(() => {
    const saved = localStorage.getItem('solsum_chat_history');
    return saved ? JSON.parse(saved) : [];
  });
  const [input, setInput] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [pendingToolCall, setPendingToolCall] = useState<FunctionCall | null>(null);
  const [dynamicQs, setDynamicQs] = useState<string[]>([]);
  const [showMoreSuggestions, setShowMoreSuggestions] = useState(false);
  const lastProcessedContextRef = useRef<string | null>(null);

  const chatSessionRef = useRef<Chat | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    localStorage.setItem('solsum_chat_history', JSON.stringify(messages));
  }, [messages]);

  useEffect(() => {
    if (modeProp && modeProp !== mode) {
        setMode(modeProp);
        chatSessionRef.current = null;
        setPendingToolCall(null);
    }
  }, [modeProp]);

  useEffect(() => {
    if (isOpen) {
        if (!chatSessionRef.current) chatSessionRef.current = createChatSession(mode);
        if (messages.length === 0) {
            const greetingText = mode === 'general' 
                ? "I'm a helpful assistant. Ask me about your system or add items."
                : (mode === 'load' 
                    ? 'Ready to add **Load Items**. Paste a Model Number or Name.' 
                    : 'Ready to add **Sources**. Paste a Panel Model or Specs.');
            setMessages([{ role: 'model', text: greetingText, summary: greetingText, expanded: greetingText, timestamp: new Date(), category: mode }]);
        }
    }
  }, [isOpen, mode]);

  useEffect(() => {
    if (isOpen && contextItem && chatSessionRef.current && lastProcessedContextRef.current !== contextItem.id) {
       lastProcessedContextRef.current = contextItem.id;
       const triggerLookup = async () => {
          // Send internal technical instruction silently without history entry
          await handleSubmit(null, `Technical extraction for: "${contextItem.name}".`, true);
       };
       triggerLookup();
    }
  }, [isOpen, contextItem]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, pendingToolCall, isTyping]);

  const handleMoreQs = async () => {
    setShowMoreSuggestions(!showMoreSuggestions);
    if (!showMoreSuggestions && dynamicQs.length === 0) {
      const summary = `System: ${totals.finalSoC.toFixed(0)}% SoC, ${items.length} loads.`;
      const qs = await getDynamicSuggestions(summary);
      setDynamicQs(qs);
    }
  };

  const handleConfirmAction = async () => {
    if (!pendingToolCall || !chatSessionRef.current) return;
    
    if (pendingToolCall.name === 'addLoadItem' && onAddLoadItem) onAddLoadItem(pendingToolCall.args as any);
    else if (pendingToolCall.name === 'addChargingSource' && onAddChargingSource) onAddChargingSource(pendingToolCall.args as any);

    const toolName = pendingToolCall.name;
    const itemName = String(pendingToolCall.args?.['name'] || 'Item');
    
    setMessages(prev => [...prev, {
        role: 'model', text: `✅ Added **${itemName}** to system.`,
        timestamp: new Date(), category: mode
    }]);

    setPendingToolCall(null);
    try {
      await chatSessionRef.current.sendMessage([{ 
        functionResponse: { name: toolName, response: { result: `Success: ${itemName} added.` } } 
      }]);
    } catch (e) { console.error("Sync error", e); }
  };

  const handleCancelAction = async () => {
     if (!pendingToolCall || !chatSessionRef.current) return;
     setMessages(prev => [...prev, { role: 'user', text: "Cancel.", timestamp: new Date(), category: 'general' }]);
     setPendingToolCall(null);
     try {
       await chatSessionRef.current.sendMessage([{ 
         functionResponse: { name: pendingToolCall.name, response: { result: "User cancelled." } } 
       }]);
     } catch (e) { console.error("Sync error", e); }
  };

  const handleSubmit = async (e: React.FormEvent | null, overrideInput?: string, silent: boolean = false) => {
    if (e) e.preventDefault();
    const textToSend = overrideInput || input;
    if (!textToSend.trim() || !chatSessionRef.current) return;

    if (pendingToolCall) {
        const toolResponse = { functionResponse: { name: pendingToolCall.name, response: { result: `Correction: ${textToSend}` } } };
        setPendingToolCall(null);
        if (!silent) setMessages(prev => [...prev, { role: 'user', text: textToSend, timestamp: new Date() }]);
        setInput('');
        setIsTyping(true);
        try {
            await chatSessionRef.current.sendMessage([toolResponse]);
            setMessages(prev => [...prev, { role: 'model', text: "Action updated.", timestamp: new Date() }]);
        } catch (err) { chatSessionRef.current = null; }
        finally { setIsTyping(false); }
        return;
    }

    if (!silent) setMessages(prev => [...prev, { role: 'user', text: textToSend, timestamp: new Date(), category: 'general' }]);
    setInput('');
    setIsTyping(true);

    try {
        const result = await chatSessionRef.current.sendMessageStream({ message: textToSend });
        let fullRawText = '';
        let toolCall: FunctionCall | null = null;
        
        // Only show "typing" or partial response for non-silent messages
        if (!silent) setMessages(prev => [...prev, { role: 'model', text: '', timestamp: new Date(), category: mode }]);

        for await (const chunk of result) {
            const c = chunk as GenerateContentResponse;
            if (c.functionCalls?.length) {
                toolCall = c.functionCalls[0];
                break;
            }
            if (c.text && !silent) {
                fullRawText += c.text;
                if (mode === 'general') {
                    try {
                        const parsed = JSON.parse(fullRawText);
                        setMessages(prev => {
                            const newMsgs = [...prev];
                            const last = newMsgs[newMsgs.length - 1];
                            if (last && last.role === 'model') {
                                last.summary = parsed.summary;
                                last.expanded = parsed.expanded;
                                last.text = parsed.summary; 
                            }
                            return newMsgs;
                        });
                    } catch {
                        setMessages(prev => {
                            const newMsgs = [...prev];
                            const last = newMsgs[newMsgs.length - 1];
                            if (last && last.role === 'model') last.text = "...";
                            return newMsgs;
                        });
                    }
                } else {
                    setMessages(prev => {
                        const newMsgs = [...prev];
                        const last = newMsgs[newMsgs.length - 1];
                        if (last && last.role === 'model') last.text = fullRawText;
                        return newMsgs;
                    });
                }
            }
        }
        if (toolCall) {
            setPendingToolCall(toolCall);
            if (!silent) setMessages(prev => prev.filter(m => m.text !== ''));
        }
    } catch (error: any) {
        if (!silent) setMessages(prev => [...prev, { role: 'model', text: "Session Reset.", isError: true, timestamp: new Date() }]);
        chatSessionRef.current = null;
    } finally { 
        setIsTyping(false); 
    }
  };

  const isSpecMode = mode !== 'general';
  // Use solid backgrounds, no transparency
  const containerClasses = isMaximized
    ? `fixed inset-4 z-50 rounded-2xl shadow-2xl flex flex-col overflow-hidden border transition-all duration-300 ring-1 ring-white/10 ${isSpecMode ? 'border-indigo-500 bg-indigo-950' : 'border-slate-700 bg-slate-900'}`
    : `fixed bottom-6 right-6 w-[32vw] min-w-[440px] h-[90vh] z-50 rounded-2xl shadow-2xl flex flex-col overflow-hidden border transition-all duration-300 ring-1 ring-white/10 ${isSpecMode ? 'border-2 border-indigo-500 bg-indigo-950 shadow-indigo-500/20' : 'border-slate-700 bg-slate-900'}`;

  return (
    <>
      {!isOpen && (
        <button onClick={onOpen} className="fixed bottom-6 right-6 bg-blue-600 hover:bg-blue-500 text-white p-4 rounded-full shadow-2xl transition-transform hover:scale-110 z-50 ring-4 ring-blue-900/50 flex items-center justify-center">
          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-8 h-8"><path strokeLinecap="round" strokeLinejoin="round" d="M8.625 12a.375.375 0 1 1-.75 0 .375.375 0 0 1 .75 0Zm0 0H8.25m4.125 0a.375.375 0 1 1-.75 0 .375.375 0 0 1 .75 0Zm0 0H12m4.125 0a.375.375 0 1 1-.75 0 .375.375 0 0 1 .75 0Zm0 0h-.375M21 12c0 4.556-4.03 8.25-9 8.25a9.764 9.764 0 0 1-2.555-.337A5.972 5.972 0 0 1 5.41 20.97a5.969 5.969 0 0 1-.474-.065 4.48 4.48 0 0 0 .978-2.025c.09-.457-.133-.901-.467-1.226C3.93 16.178 3 14.189 3 12c0-4.556 4.03-8.25 9-8.25s9 3.694 9 8.25Z" /></svg>
        </button>
      )}

      {isOpen && (
        <div className={containerClasses}>
          <div className={`p-4 flex justify-between items-center border-b shrink-0 relative z-50 ${isSpecMode ? 'bg-indigo-950 border-indigo-500/30' : 'bg-slate-950 border-slate-800'}`}>
            <h3 className="app-header-font flex items-center gap-3 text-[10px] text-slate-300">
              <span className={`w-2.5 h-2.5 rounded-full ${isSpecMode ? 'bg-indigo-400 shadow-[0_0_15px_rgba(129,140,248,0.8)] animate-pulse' : 'bg-blue-500'}`}></span>
              {isSpecMode ? 'SPEC ASST.' : 'SOL SUM AI'}
            </h3>
            <div className="flex items-center gap-2">
                <button onClick={() => setMessages([])} className="text-[10px] text-slate-600 hover:text-rose-400 font-bold uppercase mr-4 transition-colors tracking-widest">Reset</button>
                <button onClick={() => setIsMaximized(!isMaximized)} className="p-1.5 hover:bg-white/10 rounded transition-colors text-slate-400"><svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-4 h-4"><path strokeLinecap="round" strokeLinejoin="round" d="M3.75 3.75v4.5m0-4.5h4.5m-4.5 0L9 9M3.75 20.25v-4.5m0 4.5h4.5m-4.5 0L9 15M20.25 3.75h-4.5m4.5 0v4.5m0-4.5L15 9m5.25 11.25h-4.5m4.5 0v-4.5m0 4.5L15 15" /></svg></button>
                <button onClick={onClose} className="p-1.5 hover:bg-white/10 rounded transition-colors text-slate-400"><svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-5 h-5"><path strokeLinecap="round" strokeLinejoin="round" d="M6 18 18 6M6 6l12 12" /></svg></button>
            </div>
          </div>
          
          <div className={`flex-1 overflow-y-auto p-5 space-y-5 pb-40 scrollbar-thin scrollbar-thumb-slate-700 ${isSpecMode ? 'bg-indigo-950' : 'bg-slate-900'}`}>
            {messages.map((msg, i) => (
                <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'} animate-fade-in`}>
                   <div className={`max-w-[85%] px-5 py-3.5 text-sm shadow-xl rounded-2xl ${msg.role === 'user' ? 'bg-slate-800 text-white rounded-tr-none border border-slate-700' : 'bg-slate-950 border border-slate-800 text-slate-300 rounded-tl-none shadow-black/40'}`}>
                      <MessageContent message={msg} />
                   </div>
                </div>
            ))}
            {pendingToolCall && (
                <div className="mx-2 mt-4 rounded-2xl shadow-[0_0_40px_rgba(99,102,241,0.2)] overflow-hidden border-2 bg-slate-950 border-indigo-500/50 animate-bounce-subtle">
                    <div className="px-4 py-2 bg-indigo-900/20 border-b border-indigo-500/30 text-[9px] font-black text-white uppercase tracking-widest flex items-center gap-2">
                        <span className="w-2 h-2 bg-indigo-500 rounded-full animate-pulse"></span> Spec Found: {String(pendingToolCall.args?.['name'])}
                    </div>
                    <div className="p-5 space-y-4">
                        <div className="bg-black/40 rounded-xl p-4 text-[11px] font-mono border border-indigo-500/10">
                            {Object.entries(pendingToolCall.args || {}).map(([k, v]) => k !== 'name' && <div key={k} className="flex justify-between py-1 border-b border-white/5 last:border-0"><span className="opacity-40 capitalize">{k}:</span><span className="text-indigo-400 font-bold">{String(v)}</span></div>)}
                        </div>
                        <div className="flex gap-3">
                            <button onClick={handleCancelAction} className="flex-1 py-2.5 text-[10px] font-black uppercase text-slate-500 hover:bg-white/5 rounded-lg border border-white/5 transition-all tracking-widest">Discard</button>
                            <button onClick={handleConfirmAction} className="flex-1 py-2.5 text-[10px] font-black uppercase bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg shadow-lg transition-all active:scale-95 tracking-widest">Add Now</button>
                        </div>
                    </div>
                </div>
            )}
            {isTyping && <div className="flex gap-1.5 p-2 px-4 bg-slate-800/30 w-fit rounded-full"><div className="w-1.5 h-1.5 bg-blue-500 rounded-full animate-bounce"></div><div className="w-1.5 h-1.5 bg-blue-500 rounded-full animate-bounce delay-75"></div><div className="w-1.5 h-1.5 bg-blue-500 rounded-full animate-bounce delay-150"></div></div>}
            <div ref={messagesEndRef} />
          </div>

          <div className="bg-slate-950 border-t border-slate-800 p-4 relative z-40 shadow-[0_-20px_50px_rgba(0,0,0,0.5)]">
                <div className="absolute bottom-full left-0 right-0 p-4 flex gap-2 overflow-x-auto bg-gradient-to-t from-slate-950 to-transparent no-scrollbar pointer-events-auto">
                    <QuickSuggestion label="System Audit" onClick={() => handleSubmit(null, "Run System Audit")} />
                    <QuickSuggestion label="Cable Sizing" onClick={() => handleSubmit(null, "What cable sizes for 24V?")} />
                    <QuickSuggestion label="System Status?" onClick={() => handleSubmit(null, "Current system status?")} />
                    <QuickSuggestion label="Load Count?" onClick={() => handleSubmit(null, "How many loads?")} />
                    {showMoreSuggestions && dynamicQs.map(q => <QuickSuggestion key={q} label={q} onClick={() => handleSubmit(null, q)} />)}
                    <button onClick={handleMoreQs} className="px-3 py-1.5 bg-blue-600/10 text-blue-500 rounded-full text-[9px] font-black uppercase border border-blue-600/20 hover:bg-blue-600/20 transition-all tracking-widest">
                      {showMoreSuggestions ? "LESS..." : "MORE..."}
                    </button>
                </div>

                <form onSubmit={(e) => handleSubmit(e)} className="flex gap-3">
                  <input type="text" value={input} onChange={(e) => setInput(e.target.value)} placeholder="Type model name or question..."
                    className="flex-1 bg-slate-900 border border-slate-800 rounded-2xl px-5 py-3.5 text-sm text-white focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500/20 transition-all shadow-inner outline-none font-medium" />
                  <button type="submit" disabled={!input.trim() || isTyping} className="p-4 bg-blue-600 hover:bg-blue-500 rounded-2xl text-white disabled:opacity-50 shadow-xl active:scale-90 transition-all">
                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor" className="w-5 h-5"><path strokeLinecap="round" strokeLinejoin="round" d="M6 12 3.269 3.126A59.768 59.768 0 0 1 21.485 12 59.77 59.77 0 0 1 3.27 20.876L5.999 12Zm0 0h7.5" /></svg>
                  </button>
                </form>
          </div>
        </div>
      )}
    </>
  );
};

export default ChatBot;
