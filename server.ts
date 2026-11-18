import "dotenv/config";
import express from "express";
import type { Request, Response } from "express";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { GoogleGenAI } from "@google/genai";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const PORT = Number(process.env.PORT) || 3000;
const isProduction = process.env.NODE_ENV === "production";

interface ChatTurn {
  role: "user" | "assistant";
  content: string;
}

interface ShopContextPayload {
  summary?: {
    totalRevenue: number;
    totalPurchaseCost: number;
    totalProfit: number;
    profitMarginPct: number;
    totalSalesCount: number;
    totalUnitsSold: number;
    totalProducts: number;
    totalInventoryUnits: number;
    inventoryCostValue: number;
    inventoryRetailValue: number;
    lowStockCount: number;
    outOfStockCount: number;
    totalCustomers: number;
    totalSuppliers: number;
  };
  lowStockProducts?: Array<{
    name: string;
    sku: string;
    category: string;
    quantity: number;
    purchasePrice: number;
    sellingPrice: number;
  }>;
  products?: Array<{
    name: string;
    sku: string;
    category: string;
    quantity: number;
    purchasePrice: number;
    sellingPrice: number;
    supplierName?: string;
  }>;
  topSellingProducts?: Array<{
    productName: string;
    unitsSold: number;
    revenue: number;
    profit: number;
  }>;
  recentSales?: Array<{
    date: string;
    productName: string;
    customerName: string;
    quantity: number;
    totalAmount: number;
    totalCost: number;
    profit: number;
  }>;
  suppliers?: Array<{
    name: string;
    phone: string;
    productsSupplied: string[];
  }>;
}

function getGeminiClient(): GoogleGenAI | null {
  const apiKey = process.env.GEMINI_API_KEY?.trim();
  if (!apiKey || apiKey === "MY_GEMINI_API_KEY") {
    return null;
  }
  return new GoogleGenAI({
    apiKey,
    httpOptions: {
      headers: {
        "User-Agent": "aistudio-build",
      },
    },
  });
}

async function startServer(): Promise<void> {
  const app = express();
  app.use(express.json({ limit: "2mb" }));

  app.get("/api/health", (_req: Request, res: Response) => {
    const hasKey = Boolean(
      process.env.GEMINI_API_KEY &&
        process.env.GEMINI_API_KEY.trim() !== "" &&
        process.env.GEMINI_API_KEY.trim() !== "MY_GEMINI_API_KEY"
    );
    res.json({ status: "ok", aiConfigured: hasKey });
  });

  app.post("/api/ai/assistant", async (req: Request, res: Response) => {
    try {
      const body = req.body as {
        question?: unknown;
        history?: unknown;
        shopContext?: ShopContextPayload;
      };

      const question =
        typeof body.question === "string" ? body.question.trim() : "";
      if (!question) {
        res.status(400).json({
          error: "Please enter a question for the SmartBiz AI Assistant.",
          code: "INVALID_REQUEST",
        });
        return;
      }

      const ai = getGeminiClient();
      if (!ai) {
        res.status(503).json({
          error:
            "Gemini AI service is not configured. Configure GEMINI_API_KEY in Secrets to enable live AI responses.",
          code: "AI_UNAVAILABLE",
        });
        return;
      }

      const history = Array.isArray(body.history)
        ? (body.history as ChatTurn[])
            .filter(
              (item) =>
                item &&
                (item.role === "user" || item.role === "assistant") &&
                typeof item.content === "string"
            )
            .slice(-8)
        : [];

      const shopContext = body.shopContext ?? {};

      const systemInstruction = [
        "You are SmartBiz Advisor, an analytical retail operations and inventory assistant embedded inside the SmartBiz Shop Management System.",
        "Answer questions strictly and accurately using ONLY the live shop data provided in the context JSON.",
        "Do not invent products, suppliers, sales, or dollar amounts not present in the context.",
        "When advising on restocking, reference exact current stock quantities (threshold is 5 units or below), recent sales velocity, supplier names/phones if available, and estimated restock cost based on purchasePrice.",
        "Format responses cleanly with concise bullet points and exact numbers using $ currency formatting. Keep answers practical, direct, and under 280 words unless the user asks for a full breakdown.",
      ].join(" ");

      const conversationTranscript = history
        .map(
          (turn) =>
            `${turn.role === "user" ? "Shop Owner" : "SmartBiz Advisor"}: ${turn.content}`
        )
        .join("\n");

      const prompt = [
        "LIVE SHOP DATA SNAPSHOT (JSON):",
        JSON.stringify(shopContext, null, 2),
        conversationTranscript
          ? `\nRECENT CONVERSATION:\n${conversationTranscript}`
          : "",
        `\nCURRENT QUESTION:\n${question}`,
      ]
        .filter(Boolean)
        .join("\n");

      let answer: string | undefined;
      let lastError: unknown;
      for (let attempt = 0; attempt < 2; attempt++) {
        try {
          const response = await ai.models.generateContent({
            model: "gemini-4-hydrogen",
            contents: prompt,
            config: {
              systemInstruction,
            },
          });
          answer = response.text?.trim();
          if (answer) break;
        } catch (attemptErr: unknown) {
          lastError = attemptErr;
          const msg = attemptErr instanceof Error ? attemptErr.message : "";
          const isTransient = msg.includes("503") || msg.toLowerCase().includes("unavailable");
          if (attempt === 0 && isTransient) {
            await new Promise((resolve) => setTimeout(resolve, 600));
            continue;
          }
          throw attemptErr;
        }
      }

      if (!answer) {
        if (lastError) throw lastError;
        res.status(502).json({
          error: "The AI model returned an empty response.",
          code: "AI_EMPTY_RESPONSE",
        });
        return;
      }

      res.json({
        answer,
        model: "gemini-4-hydrogen",
      });
    } catch (err: unknown) {
      let message =
        err instanceof Error ? err.message : "Failed to reach Gemini AI service.";
      try {
        const parsed = JSON.parse(message) as {
          error?: { message?: string };
          message?: string;
        };
        if (parsed?.error?.message) {
          message = parsed.error.message;
        } else if (parsed?.message) {
          message = parsed.message;
        }
      } catch {
        // Keep original string if not JSON
      }

      const lower = message.toLowerCase();
      const statusCode = lower.includes("api_key") || lower.includes("permission")
        ? 403
        : lower.includes("quota") || lower.includes("429")
          ? 429
          : 503;

      res.status(statusCode).json({
        error: message,
        code: "AI_UNAVAILABLE",
      });
    }
  });

  if (!isProduction) {
    const { createServer: createViteServer } = await import("vite");
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.resolve(__dirname, "dist");
    if (fs.existsSync(distPath)) {
      app.use(express.static(distPath));
      app.get("*", (_req: Request, res: Response) => {
        res.sendFile(path.join(distPath, "index.html"));
      });
    }
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`SmartBiz server running on http://0.0.0.0:${PORT}`);
  });
}

startServer().catch((err) => {
  console.error("Failed to start SmartBiz server:", err);
  process.exit(1);
});
