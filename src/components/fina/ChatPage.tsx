import { useState, useEffect, useRef } from "react";
import { Send, Trash2 } from "lucide-react";
import { useFinancialData } from "@/contexts/FinancialDataContext";
import { useUserProfile } from "@/contexts/UserProfileContext";
import { useCurrency } from "@/contexts/CurrencyContext";
import { getOrCreateChatUserId } from "@/lib/userId";

interface ChatResponse {
  success: boolean;
  response: string;
}

interface Msg {
  role: "user" | "ai";
  text: string;
  timestamp?: number;
}

const SUGGESTIONS = [
  "How's my spending?",
  "Am I at risk of debt?",
  "How do I save for a trip?",
  "What's BNPL risk?",
  "Can I afford a new purchase?",
  "Review my budget",
];

// Generate welcome message with personalized real data
const generateWelcomeMessage = (
  name: string,
  monthlySpent: number,
  monthlyBudget: number,
  debtRisk: string,
  formatCurrency: (amount: number) => string,
) => {
  const spentPct = Math.round((monthlySpent / monthlyBudget) * 100);
  const remaining = monthlyBudget - monthlySpent;

  return `Hi ${name}! 👋 I'm SAMSOM, your AI financial advisor.

Here's your current financial snapshot:
• You've spent ${formatCurrency(monthlySpent)} this month (${spentPct}% of your ${formatCurrency(monthlyBudget)} budget)
• Remaining budget: ${formatCurrency(remaining)}
• Debt risk level: ${debtRisk}

I can help you with:
- Budget tracking and analysis
- Spending insights
- Debt management advice
- Savings goals
- BNPL risk assessment

What specific financial question can I help you with today?`;
};

const CHAT_STORAGE_KEY = "sansom-chat-history";

const ChatPage = () => {
  const { data: financialData } = useFinancialData();
  const { profile } = useUserProfile();
  const { format: formatCurrency, currency } = useCurrency();

  const [msgs, setMsgs] = useState<Msg[]>([]);
  const [input, setInput] = useState("");
  const [typing, setTyping] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);
  const [userId] = useState(() => getOrCreateChatUserId());

  const API_BASE_URL = import.meta.env.VITE_API_URL || "http://localhost:3000";

  // Get personalized welcome with real data
  const getPersonalizedWelcome = () => {
    const name = profile?.full_name?.split(" ")[0] || "Student";
    return generateWelcomeMessage(
      name,
      financialData.monthlySpent,
      financialData.monthlyBudget,
      financialData.debtRisk,
      formatCurrency,
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
        console.error("Failed to parse saved chat history:", e);
        setMsgs([
          { role: "ai", text: getPersonalizedWelcome(), timestamp: Date.now() },
        ]);
      }
    } else {
      setMsgs([
        { role: "ai", text: getPersonalizedWelcome(), timestamp: Date.now() },
      ]);
    }
  }, [userId]);

  // Update welcome message if financial data changes significantly
  useEffect(() => {
    if (msgs.length === 1 && msgs[0].role === "ai") {
      setMsgs([
        { role: "ai", text: getPersonalizedWelcome(), timestamp: Date.now() },
      ]);
    }
  }, [financialData.monthlySpent, financialData.monthlyBudget]);

  // Save to localStorage whenever messages change
  useEffect(() => {
    if (msgs.length > 0) {
      localStorage.setItem(
        `${CHAT_STORAGE_KEY}-${userId}`,
        JSON.stringify(msgs),
      );
    }
  }, [msgs, userId]);

  const getRealFinancialData = () => {
    try {
      const trackerUserId = localStorage.getItem("tracker_user_id");
      console.log("🔍 Tracker User ID from localStorage:", trackerUserId);

      if (trackerUserId) {
        const storedData = localStorage.getItem(
          `financial-data-${trackerUserId}`,
        );
        console.log("💾 Raw stored data:", storedData);

        if (storedData) {
          const data = JSON.parse(storedData);
          console.log("📊 Parsed tracker data:", data);

          // The tracker stores totalSpent, but make sure it's the correct value
          const totalSpent = data.totalSpent || 0;
          const monthlyBudget = profile?.monthly_budget || 10500;

          console.log("💰 Calculated values:", {
            totalSpent,
            monthlyBudget,
            balance: monthlyBudget - totalSpent,
          });

          return {
            monthlySpent: totalSpent,
            monthlyBudget: monthlyBudget,
            balance: monthlyBudget - totalSpent,
          };
        }
      }
    } catch (error) {
      console.error("Error reading tracker data:", error);
    }

    // Fallback to context data
    console.log("⚠️ Using fallback context data:", {
      monthlySpent: financialData.monthlySpent,
      monthlyBudget: financialData.monthlyBudget,
      balance: financialData.balance,
    });

    return {
      monthlySpent: financialData.monthlySpent,
      monthlyBudget: financialData.monthlyBudget,
      balance: financialData.balance,
    };
  };

  const send = async (text: string) => {
    if (!text.trim() || typing) return;

    const userMsg: Msg = { role: "user", text, timestamp: Date.now() };
    setMsgs((prev) => [...prev, userMsg]);
    setInput("");
    setTyping(true);

    try {
      // Calculate BNPL total from real data
      const bnplTotal =
        financialData.bnpls?.reduce((sum, plan) => sum + plan.amount, 0) || 0;

      const requestBody = {
        userId: userId,
        message: text,
        currency: {
          code: currency.code, // Send currency code (MYR, USD, KHR, IDR)
          symbol: currency.symbol, // Send currency symbol (RM, $, ៛, Rp)
        },
        context: {
          monthlySpent: financialData.monthlySpent, // This is in MYR
          monthlyBudget: financialData.monthlyBudget, // This is in MYR
          debtRisk: financialData.debtRisk,
          bnplCount: financialData.bnplCount || 0,
          bnplTotal: bnplTotal, // This is in MYR
          balance: financialData.balance, // This is in MYR
          recentTransactions: financialData.transactions?.slice(0, 10) || [],
          goals: financialData.goals || [],
        },
      };

      console.log(
        "📤 Sending to backend:",
        JSON.stringify(requestBody, null, 2),
      );

      const response = await fetch(`${API_BASE_URL}/api/chat`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(requestBody),
      });

      const data: ChatResponse = await response.json();
      console.log("📥 Received from backend:", data);

      const aiMsg: Msg = {
        role: "ai",
        text: data.success
          ? data.response
          : "I'm having trouble connecting right now. Please try again in a moment.",
        timestamp: Date.now(),
      };

      setMsgs((prev) => [...prev, aiMsg]);
    } catch (error) {
      console.error("Chat error:", error);
      setMsgs((prev) => [
        ...prev,
        {
          role: "ai",
          text: "Network error. Please check your connection and try again.",
          timestamp: Date.now(),
        },
      ]);
    } finally {
      setTyping(false);
    }
  };

  const clearHistory = () => {
    if (confirm("Are you sure you want to clear all chat history?")) {
      const welcomeMsg: Msg = {
        role: "ai",
        text: getPersonalizedWelcome(),
        timestamp: Date.now(),
      };
      setMsgs([welcomeMsg]);
      localStorage.setItem(
        `${CHAT_STORAGE_KEY}-${userId}`,
        JSON.stringify([welcomeMsg]),
      );
    }
  };

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [msgs, typing]);

  return (
    <div className="flex flex-col h-full animate-fade-in">
      {/* Header */}
      <div className="pb-3 border-b border-border mb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-xl flex items-center justify-center">
              <img
                src="public/favicon.ico"
                alt="Logo"
                className="w-7 h-7 object-contain"
              />
            </div>
            <div>
              <p className="text-[15px] font-bold text-foreground">
                SAMSOM AI Advisor
              </p>
              <p className="text-[11px] text-primary font-medium">
                ● Online · Powered by AI
              </p>
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

        {/* Real-time financial snapshot */}
        <div className="mt-2 flex gap-3 text-[10px] text-muted-foreground flex-wrap">
          <span>
            Spent: {formatCurrency(financialData.monthlySpent)} /{" "}
            {formatCurrency(financialData.monthlyBudget)}
          </span>
          <span>•</span>
          <span>
            Remaining:{" "}
            {formatCurrency(
              financialData.monthlyBudget - financialData.monthlySpent,
            )}
          </span>
          <span>•</span>
          <span
            className={
              financialData.debtRisk === "HIGH"
                ? "text-destructive"
                : "text-primary"
            }
          >
            Risk: {financialData.debtRisk}
          </span>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto flex flex-col gap-2.5 pb-2">
        {msgs.map((m, i) => (
          <div
            key={i}
            className={`flex animate-slide-up ${m.role === "user" ? "justify-end" : "justify-start"}`}
          >
            {m.role === "ai" && (
              <div className="w-7 h-7 rounded-lg bg-accent flex items-center justify-center mr-1.5 flex-shrink-0 self-end">
                <img
                  src="public/favicon.ico"
                  alt="Logo"
                  className="w-5 h-5 object-contain"
                />
              </div>
            )}
            <div
              className={`max-w-[80%] rounded-2xl px-3.5 py-2.5 text-[13px] leading-relaxed whitespace-pre-line ${
                m.role === "user"
                  ? "gradient-primary text-primary-foreground rounded-br-sm"
                  : "bg-muted text-foreground border border-border rounded-bl-sm"
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
            <div className="w-7 h-7 rounded-lg bg-accent flex items-center justify-center mr-1.5 flex-shrink-0 self-end">
              <img
                src="public/favicon.ico"
                alt="Logo"
                className="w-5 h-5 object-contain"
              />
            </div>
            <div className="bg-muted border border-border rounded-2xl rounded-bl-sm px-4 py-3 flex gap-1">
              {[0, 1, 2].map((i) => (
                <div
                  key={i}
                  className="w-1.5 h-1.5 rounded-full bg-muted-foreground/50 animate-pulse"
                  style={{ animationDelay: `${i * 0.2}s` }}
                />
              ))}
            </div>
          </div>
        )}
        <div ref={bottomRef} />
      </div>

      {/* Suggestions */}
      <div className="border-t border-border pt-3">
        <div className="flex gap-1.5 flex-wrap mb-2.5">
          {SUGGESTIONS.map((s) => (
            <button
              key={s}
              onClick={() => send(s)}
              className="text-[10px] px-2.5 py-1 rounded-full border border-border bg-card text-muted-foreground hover:border-primary hover:text-primary transition-colors"
            >
              {s}
            </button>
          ))}
        </div>

        {/* Input */}
        <div className="flex gap-2">
          <input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && send(input)}
            placeholder="Ask SAMSOM about your finances..."
            className="flex-1 px-3.5 py-3 rounded-xl border-[1.5px] border-border text-sm text-foreground outline-none focus:border-primary transition-colors bg-card"
          />
          <button
            onClick={() => send(input)}
            disabled={typing || !input.trim()}
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
