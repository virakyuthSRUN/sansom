import { useQuery, useQueryClient } from "@tanstack/react-query";

const API_BASE_URL = import.meta.env.VITE_API_URL || "http://localhost:3000";

// Type for formatted transaction
interface FormattedTransaction {
  id: string;
  name: string;
  amount: number;
  cat: string;
  date: string;
  icon: string;
  color: string;
  bank?: string;

  pending?: boolean;
}

interface BankData {
  transactions: FormattedTransaction[];
  bankName: string;
  needsConnect: boolean;
}
const CAT_ICONS: Record<string, { icon: string; color: string }> = {
  Food: { icon: "UtensilsCrossed", color: "#ff6b35" },
  Transport: { icon: "Car", color: "#3b82f6" },
  Shopping: { icon: "ShoppingBag", color: "#f97316" },
  Entertainment: { icon: "Gamepad2", color: "#8b5cf6" },
  BNPL: { icon: "CreditCard", color: "#ff4757" },
  Bills: { icon: "FileText", color: "#ef4444" },
  Income: { icon: "TrendingUp", color: "#00c896" },
  Transfer: { icon: "Send", color: "#6b7280" },
  Cash: { icon: "DollarSign", color: "#10b981" },
  Other: { icon: "Wallet", color: "#6b7280" },
  default: { icon: "AlertCircle", color: "#6b7280" },
};
// Fetch function
const fetchBankTransactions = async (userId: string): Promise<BankData> => {
  const response = await fetch(
    `${API_BASE_URL}/api/teller/transactions/${userId}`,
  );

  if (!response.ok) {
    throw new Error("Failed to fetch transactions");
  }

  const data = await response.json();

  if (data.needsConnect) {
    return {
      transactions: [],
      bankName: "",
      needsConnect: true,
    };
  }

  if (data.success) {
    // Format transactions for display
    const formatted = data.transactions.map((t: any) => ({
      id: t.id,
      name: t.description,
      amount: t.amount,
      cat: t.category || "Other",
      date: new Date(t.date).toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
      }),
      icon: CAT_ICONS[t.category || "Other"]?.icon || "Wallet",
      color: CAT_ICONS[t.category || "Other"]?.color || "#6b7280",
      bank: t.bank,
      pending: t.pending,
    }));

    return {
      transactions: formatted,
      bankName: data.bankName,
      needsConnect: false,
    };
  }

  return {
    transactions: [],
    bankName: "",
    needsConnect: true,
  };
};

// Custom hook
export const useBankTransactions = (userId: string) => {
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: ["bankTransactions", userId],
    queryFn: () => fetchBankTransactions(userId),
    staleTime: 5 * 60 * 1000, // 5 minutes
    gcTime: 10 * 60 * 1000, // 10 minutes
  });

  // Manual refresh function
  const refresh = () => {
    return queryClient.invalidateQueries({
      queryKey: ["bankTransactions", userId],
    });
  };

  return {
    ...query,
    refresh,
    transactions: query.data?.transactions || [],
    bankName: query.data?.bankName || "",
    needsConnect: query.data?.needsConnect || false,
  };
};
