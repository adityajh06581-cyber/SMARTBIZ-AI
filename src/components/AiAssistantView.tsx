import { useEffect, useRef, useState, type FormEvent } from "react";
import { AlertCircle, Bot, Loader2, Send, Trash2 } from "lucide-react";
import type { ChatMessage, Customer, Product, Sale, Supplier } from "../types/shop";
import {
  buildShopContextPayload,
  generateLocalFallbackAnswer,
} from "../utils/aiContext";
import { formatCurrency, generateId } from "../utils/format";

interface AiAssistantViewProps {
  products: Product[];
  sales: Sale[];
  customers: Customer[];
  suppliers: Supplier[];
}

const SUGGESTED_PROMPTS = [
  "Which products need restocking urgently and what is the estimated cost?",
  "Summarize my total revenue, purchase costs, and profit margin.",
  "What are my top 3 best-selling products by revenue and profit?",
  "Which suppliers should I contact for my low-stock items?",
];

export function AiAssistantView({
  products,
  sales,
  customers,
  suppliers,
}: AiAssistantViewProps) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [aiStatus, setAiStatus] = useState<"checking" | "online" | "fallback">(
    "checking"
  );
  const scrollRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    let active = true;
    fetch("/api/health")
      .then((res) => res.json())
      .then((data: { aiConfigured?: boolean }) => {
        if (!active) return;
        setAiStatus(data.aiConfigured ? "online" : "fallback");
      })
      .catch(() => {
        if (!active) return;
        setAiStatus("fallback");
      });
    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, loading]);

  const askQuestion = async (questionText: string) => {
    const trimmed = questionText.trim();
    if (!trimmed || loading) return;

    const userMsg: ChatMessage = {
      id: generateId("msg"),
      role: "user",
      content: trimmed,
      timestamp: new Date().toLocaleTimeString([], {
        hour: "2-digit",
        minute: "2-digit",
      }),
    };

    const nextHistory = [...messages, userMsg];
    setMessages(nextHistory);
    setInput("");
    setLoading(true);

    const shopContext = buildShopContextPayload({
      products,
      sales,
      customers,
      suppliers,
    });

    try {
      const response = await fetch("/api/ai/assistant", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          question: trimmed,
          history: messages.slice(-6).map((m) => ({
            role: m.role,
            content: m.content,
          })),
          shopContext,
        }),
      });

      const data = (await response.json()) as {
        answer?: string;
        error?: string;
        code?: string;
      };

      if (!response.ok || !data.answer) {
        setAiStatus("fallback");
        const fallbackText = generateLocalFallbackAnswer(trimmed, {
          products,
          sales,
          customers,
          suppliers,
        });
        setMessages((prev) => [
          ...prev,
          {
            id: generateId("msg"),
            role: "assistant",
            content: fallbackText,
            timestamp: new Date().toLocaleTimeString([], {
              hour: "2-digit",
              minute: "2-digit",
            }),
            isFallback: true,
            fallbackReason:
              data.error ||
              "Live Gemini AI service is currently unavailable. Showing deterministic analytics from your live shop data.",
          },
        ]);
        return;
      }

      const answerText = data.answer;
      setAiStatus("online");
      setMessages((prev) => [
        ...prev,
        {
          id: generateId("msg"),
          role: "assistant",
          content: answerText,
          timestamp: new Date().toLocaleTimeString([], {
            hour: "2-digit",
            minute: "2-digit",
          }),
        },
      ]);
    } catch {
      setAiStatus("fallback");
      const fallbackText = generateLocalFallbackAnswer(trimmed, {
        products,
        sales,
        customers,
        suppliers,
      });
      setMessages((prev) => [
        ...prev,
        {
          id: generateId("msg"),
          role: "assistant",
          content: fallbackText,
          timestamp: new Date().toLocaleTimeString([], {
            hour: "2-digit",
            minute: "2-digit",
          }),
          isFallback: true,
          fallbackReason:
            "Unable to reach the AI endpoint. Showing deterministic analytics from your live shop data.",
        },
      ]);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    void askQuestion(input);
  };

  const liveSnapshot = buildShopContextPayload({
    products,
    sales,
    customers,
    suppliers,
  });

  return (
    <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
      {/* Main Chat Panel */}
      <section className="flex h-[640px] flex-col rounded-xl border border-slate-200 bg-white lg:col-span-8">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 px-6 py-4">
          <div className="flex items-center gap-2.5">
            <Bot className="h-5 w-5 text-blue-700" />
            <div>
              <h2 className="text-base font-semibold text-slate-900">
                SmartBiz Advisor
              </h2>
              <p className="text-xs text-slate-500">
                {aiStatus === "online"
                  ? "Connected to live Gemini AI · Reads real inventory, sales & P&L data"
                  : aiStatus === "fallback"
                    ? "Live AI unavailable · Local Shop Analytics Fallback active"
                    : "Checking AI service availability..."}
              </p>
            </div>
          </div>

          {messages.length > 0 && (
            <button
              type="button"
              onClick={() => setMessages([])}
              className="inline-flex h-9 items-center gap-1.5 rounded-lg border border-slate-200 px-3 text-xs font-medium text-slate-600 hover:bg-slate-50"
            >
              <Trash2 className="h-3.5 w-3.5" />
              Clear Chat
            </button>
          )}
        </div>

        {/* Message Feed */}
        <div ref={scrollRef} className="flex-1 space-y-4 overflow-y-auto p-6">
          {messages.length === 0 ? (
            <div className="mx-auto max-w-xl py-8">
              <h3 className="text-base font-semibold text-slate-900">
                Ask about your stock, sales, or restock plan
              </h3>
              <p className="mt-1 text-sm text-slate-500">
                SmartBiz Advisor inspects your current inventory quantities, purchase costs,
                sales history, and supplier contacts before answering.
              </p>

              <div className="mt-5 grid grid-cols-1 gap-2.5 sm:grid-cols-2">
                {SUGGESTED_PROMPTS.map((prompt) => (
                  <button
                    key={prompt}
                    type="button"
                    onClick={() => void askQuestion(prompt)}
                    className="rounded-lg border border-slate-200 bg-slate-50 p-3.5 text-left text-xs font-medium leading-relaxed text-slate-700 transition-colors hover:border-blue-300 hover:bg-blue-50/50 hover:text-slate-900"
                  >
                    {prompt}
                  </button>
                ))}
              </div>
            </div>
          ) : (
            messages.map((msg) => (
              <div
                key={msg.id}
                className={`flex flex-col ${
                  msg.role === "user" ? "items-end" : "items-start"
                }`}
              >
                <div
                  className={`max-w-[85%] rounded-xl px-4 py-3 text-sm leading-relaxed ${
                    msg.role === "user"
                      ? "bg-blue-700 text-white"
                      : "border border-slate-200 bg-slate-50 text-slate-800"
                  }`}
                >
                  {msg.isFallback && msg.fallbackReason && (
                    <div className="mb-2.5 flex items-start gap-2 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-800">
                      <AlertCircle className="mt-0.5 h-3.5 w-3.5 shrink-0 text-amber-600" />
                      <span>{msg.fallbackReason}</span>
                    </div>
                  )}
                  <div className="whitespace-pre-wrap">{msg.content}</div>
                </div>
                <span className="mt-1 font-mono text-[11px] text-slate-400">
                  {msg.role === "user" ? "You" : msg.isFallback ? "Local Fallback" : "SmartBiz AI"} ·{" "}
                  {msg.timestamp}
                </span>
              </div>
            ))
          )}

          {loading && (
            <div className="flex items-center gap-2 text-sm text-slate-500">
              <Loader2 className="h-4 w-4 animate-spin text-blue-600" />
              <span>Analyzing live shop metrics...</span>
            </div>
          )}
        </div>

        {/* Input Form */}
        <form
          onSubmit={handleSubmit}
          className="flex items-center gap-2.5 border-t border-slate-200 p-4"
        >
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Ask a question about inventory, sales trends, or restocking..."
            disabled={loading}
            className="h-11 flex-1 rounded-lg border border-slate-200 px-3.5 text-sm text-slate-900 placeholder:text-slate-400 focus:border-blue-600 focus:outline-none disabled:bg-slate-50"
          />
          <button
            type="submit"
            disabled={loading || !input.trim()}
            className="inline-flex h-11 items-center gap-2 rounded-lg bg-blue-700 px-4 text-sm font-medium text-white transition-colors hover:bg-blue-800 disabled:cursor-not-allowed disabled:bg-slate-300 whitespace-nowrap shrink-0"
          >
            <Send className="h-4 w-4" />
            Ask
          </button>
        </form>
      </section>

      {/* Live Context Summary Sidebar */}
      <aside className="space-y-4 lg:col-span-4">
        <div className="rounded-xl border border-slate-200 bg-white p-5">
          <h3 className="text-sm font-semibold text-slate-900">
            Live Data Context Included
          </h3>
          <p className="mt-1 text-xs text-slate-500">
            Every question automatically uses your up-to-date store records:
          </p>
          <dl className="mt-4 divide-y divide-slate-100 text-xs">
            <div className="flex items-center justify-between py-2.5">
              <dt className="text-slate-500">Tracked Products</dt>
              <dd className="font-mono font-medium text-slate-900 tabular-nums">
                {liveSnapshot.summary.totalProducts} SKUs ({liveSnapshot.summary.totalInventoryUnits} units)
              </dd>
            </div>
            <div className="flex items-center justify-between py-2.5">
              <dt className="text-slate-500">Low Stock Items (≤5)</dt>
              <dd className="font-mono font-medium text-amber-700 tabular-nums">
                {liveSnapshot.summary.lowStockCount}
              </dd>
            </div>
            <div className="flex items-center justify-between py-2.5">
              <dt className="text-slate-500">Total Revenue</dt>
              <dd className="font-mono font-medium text-slate-900 tabular-nums">
                {formatCurrency(liveSnapshot.summary.totalRevenue)}
              </dd>
            </div>
            <div className="flex items-center justify-between py-2.5">
              <dt className="text-slate-500">Gross Profit</dt>
              <dd className="font-mono font-medium text-emerald-700 tabular-nums">
                {formatCurrency(liveSnapshot.summary.totalProfit)}
              </dd>
            </div>
            <div className="flex items-center justify-between py-2.5">
              <dt className="text-slate-500">Directory</dt>
              <dd className="font-mono font-medium text-slate-900 tabular-nums">
                {liveSnapshot.summary.totalCustomers} customers · {liveSnapshot.summary.totalSuppliers} suppliers
              </dd>
            </div>
          </dl>
        </div>

        <div className="rounded-xl border border-slate-200 bg-white p-5">
          <h3 className="text-sm font-semibold text-slate-900">
            Try Asking Follow-ups
          </h3>
          <div className="mt-3 space-y-2">
            {SUGGESTED_PROMPTS.map((prompt) => (
              <button
                key={prompt}
                type="button"
                disabled={loading}
                onClick={() => void askQuestion(prompt)}
                className="w-full rounded-lg border border-slate-200 px-3 py-2 text-left text-xs text-slate-700 transition-colors hover:bg-slate-50 disabled:opacity-50"
              >
                {prompt}
              </button>
            ))}
          </div>
        </div>
      </aside>
    </div>
  );
}
