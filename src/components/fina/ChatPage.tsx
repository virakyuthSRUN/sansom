import { useState, useEffect, useRef } from 'react';
import { Sparkles, Send, Trash2 } from 'lucide-react';
import { useFinancialData } from '@/contexts/FinancialDataContext';
import { useUserProfile } from '@/contexts/UserProfileContext';

// Define the API response type
interface ChatResponse {
  success: boolean;
  response: string;
}

interface Msg {
  role: 'user' | 'ai';
  text: string;
  timestamp?: number;
}

const SUGGESTIONS = ["How's my spending?", "Am I at risk of debt?", "How do I save for a trip?", "What's BNPL risk?"];

// Generate welcome message with personalized data
const generateWelcomeMessage = (name: string, monthlySpent: number, monthlyBudget: number, debtRisk: string) => {
  const spentPct = Math.round((monthlySpent / monthlyBudget) * 100);
  
  return `Hi ${name}! I'm SANSOM, your AI financial advisor. 

Here's your current snapshot:
• You've spent ${formatCurrency(monthlySpent)} this month (${spentPct}% of your $${monthlyBudget} budget)
• Your debt risk level is ${debtRisk}

I can help you budget, track spending, or check if you can afford something. What's on your mind?`;
};

// Helper function for formatting (since we can't use hooks outside components)
const formatCurrency = (amount: number): string => {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
};

const CHAT_STORAGE_KEY = 'sansom-chat-history';

// Generate a random 3-digit number for the user ID (same as TrackerPage)
const generateRandomUserId = () => {
  const randomNum = Math.floor(Math.random() * 900) + 100;
  return `student-${randomNum}`;
};

// Store the generated ID in localStorage to persist across sessions
const getOrCreateUserId = () => {
  const STORAGE_KEY = 'chat_user_id';
  let userId = localStorage.getItem(STORAGE_KEY);
  
  if (!userId) {
    userId = generateRandomUserId();
    localStorage.setItem(STORAGE_KEY, userId);
    console.log('🆕 Generated new chat user ID:', userId);
  }
  
  return userId;
};

const ChatPage = () => {
  const { data: financialData } = useFinancialData();
  const { profile } = useUserProfile();
  
  const [msgs, setMsgs] = useState<Msg[]>([]);
  const [input, setInput] = useState('');
  const [typing, setTyping] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);
  
  // Use the same user ID system as TrackerPage
  const [userId] = useState(() => getOrCreateUserId());

  const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000';

  // Generate personalized welcome message based on actual data
  const getPersonalizedWelcome = () => {
    const name = profile?.full_name?.split(' ')[0] || 'User';
    return generateWelcomeMessage(
      name,
      financialData.monthlySpent,
      financialData.monthlyBudget,
      financialData.debtRisk
    );
  };

  // Load chat history from localStorage on mount
  useEffect(() => {
    const savedChats = localStorage.getItem(`${CHAT_STORAGE_KEY}-${userId}`);
    if (savedChats) {
      try {
        const parsed = JSON.parse(savedChats);
        setMsgs(parsed);
      } catch (e) {
        console.error('Failed to parse saved chat history:', e);
        setMsgs([{ role: 'ai', text: getPersonalizedWelcome(), timestamp: Date.now() }]);
      }
    } else {
      setMsgs([{ role: 'ai', text: getPersonalizedWelcome(), timestamp: Date.now() }]);
    }
  }, [userId, financialData.monthlySpent, financialData.monthlyBudget, financialData.debtRisk]); // Re-run if financial data changes

  // Save to localStorage whenever messages change
  useEffect(() => {
    if (msgs.length > 0) {
      localStorage.setItem(`${CHAT_STORAGE_KEY}-${userId}`, JSON.stringify(msgs));
    }
  }, [msgs, userId]);

  const send = async (text: string) => {
    if (!text.trim()) return;
    
    const userMsg: Msg = { role: 'user', text, timestamp: Date.now() };
    setMsgs(prev => [...prev, userMsg]);
    setInput('');
    setTyping(true);

    try {
      // Include financial context in the request
      const response = await fetch(`${API_BASE_URL}/api/chat`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          userId: userId,
          message: text,
          context: {
            monthlySpent: financialData.monthlySpent,
            monthlyBudget: financialData.monthlyBudget,
            debtRisk: financialData.debtRisk,
            bnplCount: financialData.bnplCount,
            recentTransactions: financialData.transactions.slice(0, 5),
            goals: financialData.goals,
          }
        })
      });

      const data: ChatResponse = await response.json();
      
      const aiMsg: Msg = { 
        role: 'ai', 
        text: data.success ? data.response : "I'm having trouble connecting right now. Please try again in a moment.",
        timestamp: Date.now()
      };
      
      setMsgs(prev => [...prev, aiMsg]);
    } catch (error) {
      console.error('Chat error:', error);
      setMsgs(prev => [...prev, { 
        role: 'ai', 
        text: "Network error. Please check your connection and try again.",
        timestamp: Date.now()
      }]);
    } finally {
      setTyping(false);
    }
  };

  const clearHistory = () => {
    if (confirm('Are you sure you want to clear all chat history?')) {
      const welcomeMsg: Msg = { role: 'ai', text: getPersonalizedWelcome(), timestamp: Date.now() };
      setMsgs([welcomeMsg]);
      localStorage.setItem(`${CHAT_STORAGE_KEY}-${userId}`, JSON.stringify([welcomeMsg]));
    }
  };

  useEffect(() => { 
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' }); 
  }, [msgs, typing]);

  return (
    <div className="flex flex-col h-full animate-fade-in">
      {/* Header */}
      <div className="pb-3 border-b border-border mb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-xl gradient-primary flex items-center justify-center">
              <Sparkles className="w-5 h-5 text-primary-foreground" />
            </div>
            <div>
              <p className="text-[15px] font-bold text-foreground">SANSOM AI Advisor</p>
              <p className="text-[11px] text-primary font-medium">● Online · Powered by SANSOM AI</p>
            </div>
          </div>
          
          {msgs.length > 1 && (
            <button
              onClick={clearHistory}
              className="w-8 h-8 rounded-lg bg-muted flex items-center justify-center hover:bg-destructive/10 transition-colors group"
              title="Clear chat history"
            >
              <Trash2 className="w-4 h-4 text-muted-foreground group-hover:text-destructive" />
            </button>
          )}
        </div>
        {/* Show current financial snapshot in header */}
        <div className="mt-2 flex gap-2 text-[10px] text-muted-foreground">
          <span>Budget: {formatCurrency(financialData.monthlySpent)} / {formatCurrency(financialData.monthlyBudget)}</span>
          <span>•</span>
          <span>Debt Risk: {financialData.debtRisk}</span>
          <span>•</span>
          <span>User: {userId}</span>
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
              {m.timestamp && (
                <div className="text-[8px] mt-1 opacity-50">
                  {new Date(m.timestamp).toLocaleTimeString()}
                </div>
              )}
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

      {/* Chat Stats */}
      {msgs.length > 1 && (
        <div className="px-2 py-1">
          <p className="text-[9px] text-muted-foreground text-right">
            {Math.floor(msgs.length / 2)} conversations · History saved
          </p>
        </div>
      )}

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