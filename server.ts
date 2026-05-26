import express from "express";
import { createServer as createViteServer } from "vite";
import path from "path";
import { fileURLToPath } from "url";
import { GoogleGenAI } from "@google/genai";
import dotenv from "dotenv";

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Lazy-initialized Gemini AI client
let aiClient: GoogleGenAI | null = null;
function getGenAIClient() {
  if (!aiClient) {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      throw new Error("A chave GEMINI_API_KEY não foi configurada. Configure a chave nas configurações.");
    }
    aiClient = new GoogleGenAI({
      apiKey: apiKey,
      httpOptions: {
        headers: {
          'User-Agent': 'aistudio-build',
        }
      }
    });
  }
  return aiClient;
}

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json());

  // API health check
  app.get("/api/health", (req, res) => {
    res.json({ status: "ok" });
  });

  // Secure Server-side API endpoint for AI Plan Generation
  app.post("/api/generate-plan", async (req: express.Request, res: express.Response) => {
    try {
      const { strategy, debts, incomes, expenses } = req.body;

      if (!debts || !Array.isArray(debts) || debts.length === 0) {
        return res.status(400).json({ error: "Nenhuma dívida ativa foi encontrada para gerar o plano estratégico." });
      }

      // Initialize client lazily to avoid startup crashes if key is omitted initially
      const ai = getGenAIClient();

      // Formulate totals
      const monthlyIncome = incomes.reduce((acc: number, i: any) => acc + i.amount, 0);
      const monthlyFixedExpenses = expenses.reduce((acc: number, e: any) => acc + e.amount, 0);
      const monthlyDebtPayments = debts.reduce((acc: number, d: any) => acc + d.installmentAmount, 0);
      const freeCash = monthlyIncome - monthlyFixedExpenses - monthlyDebtPayments;

      const prompt = `[SYSTEM] Você é um estrategista de finanças e inteligência analítica do app "Saldo Positivo". Crie um plano de quitação de dívidas extremamente amigável, acolhedor e focado nas necessidades do usuário.
Você deve responder obrigatoriamente em PORTUGUÊS usando as seguintes seções estruturadas com títulos em Markdown limpo:
1. DIAGNÓSTICO DO CAMINHO
2. CRONOGRAMA DE ATAQUE PERSONALIZADO
3. DICAS PRÁTICAS DO CONSULTOR IA
4. MENSAGEM DE PODER E LIBERDADE

Dados reais do usuário:
Receita mensal total: R$ ${monthlyIncome}
Despesas fixas mensais: R$ ${monthlyFixedExpenses}
Parcelas mensais de dívidas: R$ ${monthlyDebtPayments}
Saldo livre disponível para quitação: R$ ${freeCash}
Estratégia selecionada: ${strategy === 'snowball' ? 'Bola de Neve (pagar menor valor primeiro)' : 'Avalanche (pagar maior juros primeiro)'}
Dívidas cadastradas: ${debts.map((d: any) => `\n- ${d.name}: Saldo R$ ${d.remainingAmount}, Juros ${d.interestRate}%/m, Parcela mensal de R$ ${d.installmentAmount}`).join('')}`;

      const response = await ai.models.generateContent({
        model: "gemini-3.5-flash",
        contents: prompt,
      });

      const planContent = response.text || "Erro ao processar as orientações personalizadas do consultor virtual.";

      return res.json({
        planContent,
        monthlyIncome,
        monthlyExpenses: monthlyFixedExpenses,
        freeCash
      });
    } catch (error: any) {
      console.error("Erro no processar IA:", error);
      return res.status(500).json({ error: error.message || "Erro no motor do consultor virtual de IA" });
    }
  });

  // Note: Since we are using Firebase for everything (Auth + DB) and 
  // Gemini on the client (per system rules), the server mostly 
  // serves as a host for the SPA in this specific environment.
  // We keep it full-stack to satisfy the prompt's request for a 
  // custom server setup if they want to expand it.

  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://0.0.0.0:${PORT}`);
  });
}

startServer();
