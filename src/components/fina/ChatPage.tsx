import { useState, useEffect, useRef } from 'react';
import { Sparkles, Send } from 'lucide-react';

// Define the API response type
interface ChatResponse {
  success: boolean;
  response: string;
}

interface Msg {
  role: 'user' | 'ai';
  text: string;
}

const SUGGESTIONS = ["How's my spending?", "Am I at risk of debt?", "How do I save for a trip?", "What's BNPL risk?"];

// Dummy welcome message
const WELCOME_MESSAGE = "Hi Dara! I'm SANSOM, your AI financial advisor. I can help you budget, track spending, or check if you can afford something. What's on your mind?";

const ChatPage = () => {
  const [msgs, setMsgs] = useState<Msg[]>([
    { role: 'ai', text: WELCOME_MESSAGE },
  ]);
  const [input, setInput] = useState('');
  const [typing, setTyping] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);

  const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000';

  const send = async (text: string) => {
    if (!text.trim()) return;
    
    setMsgs(prev => [...prev, { role: 'user', text }]);
    setInput('');
    setTyping(true);

    try {
      const response = await fetch(`${API_BASE_URL}/api/chat`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          userId: 'student-123',
          message: text
        })
      });

      const data: ChatResponse = await response.json();
      
      if (data.success) {
        setMsgs(prev => [...prev, { role: 'ai', text: data.response }]);
      } else {
        setMsgs(prev => [...prev, { 
          role: 'ai', 
          text: "I'm having trouble connecting right now. Please try again in a moment." 
        }]);
      }
    } catch (error) {
      console.error('Chat error:', error);
      setMsgs(prev => [...prev, { 
        role: 'ai', 
        text: "Network error. Please check your connection and try again." 
      }]);
    } finally {
      setTyping(false);
    }
  };

  useEffect(() => { 
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' }); 
  }, [msgs, typing]);

  return (
    <div className="flex flex-col h-full animate-fade-in">
      {/* Header */}
      <div className="pb-3 border-b border-border mb-3">
        <div className="flex items-center gap-2.5">
          <div className="w-10 h-10 rounded-xl gradient-primary flex items-center justify-center">
            <Sparkles className="w-5 h-5 text-primary-foreground" />
          </div>
          <div>
            <p className="text-[15px] font-bold text-foreground">SANSOM AI Advisor</p>
            <p className="text-[11px] text-primary font-medium">● Online · Powered by SANSOM AI</p>
          </div>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto flex flex-col gap-2.5 pb-2">
        {msgs.map((m, i) => (
          <div key={i} className={`flex animate-slide-up ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
            {m.role === 'ai' && (
              <div className="w-7 h-7 rounded-lg bg-accent flex items-center justify-center mr-1.5 flex-shrink-0 self-end">
                <Sparkles className="w-3.5 h-3.5 text-primary" />
              </div>
            )}
            <div
              className={`max-w-[80%] rounded-2xl px-3.5 py-2.5 text-[13px] leading-relaxed whitespace-pre-line ${
                m.role === 'user'
                  ? 'gradient-primary text-primary-foreground rounded-br-sm'
                  : 'bg-muted text-foreground border border-border rounded-bl-sm'
              }`}
            >
              {m.text}
            </div>
          </div>
        ))}
        {typing && (
          <div className="flex items-center gap-1.5">
            <div className="w-7 h-7 rounded-lg bg-accent flex items-center justify-center">
              <Sparkles className="w-3.5 h-3.5 text-primary" />
            </div>
            <div className="bg-muted border border-border rounded-2xl rounded-bl-sm px-4 py-3 flex gap-1">
              {[0, 1, 2].map(i => (
                <div key={i} className="w-1.5 h-1.5 rounded-full bg-muted-foreground/50 animate-pulse" 
                  style={{ animationDelay: `${i * 0.2}s` }} 
                />
              ))}
            </div>
          </div>
        )}
        <div ref={bottomRef} />
      </div>

      {/* Input */}
      <div className="border-t border-border pt-3">
        <div className="flex gap-1.5 flex-wrap mb-2.5">
          {SUGGESTIONS.map(s => (
            <button
              key={s}
              onClick={() => send(s)}
              className="text-[10px] px-2.5 py-1 rounded-full border border-border bg-card text-muted-foreground hover:border-primary hover:text-primary transition-colors"
            >
              {s}
            </button>
          ))}
        </div>
        <div className="flex gap-2">
          <input
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && send(input)}
            placeholder="Ask SANSOM anything..."
            className="flex-1 px-3.5 py-3 rounded-xl border-[1.5px] border-border text-sm text-foreground outline-none focus:border-primary transition-colors bg-card"
          />
          <button
            onClick={() => send(input)}
            disabled={typing}
            className="gradient-primary text-primary-foreground rounded-xl px-4 py-3 font-semibold text-sm shadow-primary hover:shadow-primary-hover transition-all flex-shrink-0 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Send className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
};

export default ChatPage;