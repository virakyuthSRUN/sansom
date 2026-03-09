import { useState, useEffect, useRef } from 'react';
import { Sparkles, Send } from 'lucide-react';

const RESPONSES: Record<string, string> = {
  default: "Based on your profile, I'd suggest reviewing your Shopee spending — it's up 34% this month. Want a detailed breakdown?",
  spend: "This month you've spent RM 620 total. Your biggest category is Shopping (RM 90), followed by Food (RM 43). You're on track but watch the BNPL payments!",
  debt: "Your current debt risk score is 52/100 — MEDIUM. You have 2 active BNPL plans totaling RM 450. I recommend closing one before adding more credit.",
  save: "For a Bali trip at RM 2,000, saving RM 200/month gets you there in 10 months. I can auto-allocate RM 200 from your monthly income automatically.",
  bnpl: "BNPL (Buy Now Pay Later) feels free but charges 18–24% interest if you miss payments. Your 2 active plans cost you RM 450 total. Pay them off before adding new ones!",
};

const SUGGESTIONS = ["How's my spending this month?", "Am I at risk of debt?", "How do I save for a trip?", "What's BNPL risk?"];

interface Msg {
  role: 'user' | 'ai';
  text: string;
}

const ChatPage = () => {
  const [msgs, setMsgs] = useState<Msg[]>([
    { role: 'ai', text: "Hi! I'm FINA, your AI financial advisor 💚 I can help you budget, track spending, or check if you can afford something. What's on your mind?" },
    { role: 'user', text: "Can I afford to buy AirPods this month? They cost RM 899." },
    { role: 'ai', text: "Based on your current spending, you've used RM 620 of your RM 900 budget — leaving RM 280 free.\n\nRM 899 is RM 619 over your remaining budget. ❌ I'd recommend against it this month.\n\n💡 If you save RM 200/month, you can get them in 4.5 months without debt. Want me to set up a savings goal?" },
  ]);
  const [input, setInput] = useState('');
  const [typing, setTyping] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);

  const send = (text: string) => {
    if (!text.trim()) return;
    setMsgs(prev => [...prev, { role: 'user', text }]);
    setInput('');
    setTyping(true);
    setTimeout(() => {
      const lower = text.toLowerCase();
      const reply = lower.includes('spend') ? RESPONSES.spend
        : lower.includes('debt') || lower.includes('risk') ? RESPONSES.debt
        : lower.includes('save') || lower.includes('trip') || lower.includes('bali') ? RESPONSES.save
        : lower.includes('bnpl') ? RESPONSES.bnpl
        : RESPONSES.default;
      setMsgs(p => [...p, { role: 'ai', text: reply }]);
      setTyping(false);
    }, 1200);
  };

  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [msgs, typing]);

  return (
    <div className="flex flex-col h-full animate-fade-in">
      {/* Header */}
      <div className="pb-3 border-b border-border mb-3">
        <div className="flex items-center gap-2.5">
          <div className="w-10 h-10 rounded-xl gradient-primary flex items-center justify-center">
            <Sparkles className="w-5 h-5 text-primary-foreground" />
          </div>
          <div>
            <p className="text-[15px] font-bold text-foreground">FINA AI Advisor</p>
            <p className="text-[11px] text-primary font-medium">● Online · Powered by AI</p>
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
                <div key={i} className="w-1.5 h-1.5 rounded-full bg-muted-foreground/50" style={{ animation: `pulse-dot 1s ${i * 0.2}s infinite` }} />
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
            placeholder="Ask FINA anything..."
            className="flex-1 px-3.5 py-3 rounded-xl border-[1.5px] border-border text-sm text-foreground outline-none focus:border-primary transition-colors bg-card"
          />
          <button
            onClick={() => send(input)}
            className="gradient-primary text-primary-foreground rounded-xl px-4 py-3 font-semibold text-sm shadow-primary hover:shadow-primary-hover transition-all flex-shrink-0"
          >
            <Send className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
};

export default ChatPage;
