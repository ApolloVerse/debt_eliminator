import type { VercelRequest, VercelResponse } from '@vercel/node';
import Groq from 'groq-sdk';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  try {
    const { strategy, debts, incomes, expenses, dailyExpenses } = req.body;

    const apiKey = process.env.GROQ_API_KEY;
    if (!apiKey) {
      return res.status(500).json({ error: "A chave GROQ_API_KEY não foi configurada no ambiente." });
    }

    const groq = new Groq({ apiKey });

    const monthlyIncome = incomes.reduce((acc: number, i: any) => acc + i.amount, 0);
    const monthlyFixedExpenses = expenses.reduce((acc: number, e: any) => acc + e.amount, 0);
    const monthlyDebtPayments = debts.reduce((acc: number, d: any) => acc + d.installmentAmount, 0);
    const dailyTotal = dailyExpenses?.projectedMonthly || 0;
    const dailyAvg = dailyExpenses?.avgDaily || 0;
    const freeCash = monthlyIncome - monthlyFixedExpenses - monthlyDebtPayments - dailyTotal;

    const prompt = `[SYSTEM] Você é um Consultor Financeiro Sênior especializado em Quitação de Dívidas.

REGRAS OBRIGATÓRIAS:
- Responda APENAS em Português do Brasil
- Use APENAS os dados financeiros fornecidos abaixo. NÃO invente valores, nomes de empresas ou informações que não estejam nos dados.
- NÃO mencione barbas, roupas, alimentação específica ou qualquer coisa fora do contexto financeiro.
- Seja objetivo, direto e baseado em números reais.
- Formate sua resposta em Markdown com títulos e emojis.

ESTRUTURA DA RESPOSTA:

## 📊 RAIO-X FINANCEIRO
Analise o fluxo de caixa com os dados reais. Calcule: saldo livre, percentual de comprometimento da renda, nível de endividamento.

## ✂️ ONDE CORTAR
Sugira cortes baseados nas despesas fixas E gastos diários reais do usuário. Use os valores fornecidos.

## 🎯 PLANO DE ATAQUE
Estratégia: ${strategy === 'snowball' ? 'Bola de Neve (menor saldo primeiro)' : 'Avalanche (maior juros primeiro)'}
Crie um plano mês a mês usando os valores reais das dívidas, renda e gastos.

## 💡 ECONOMIA NOS GASTOS DIÁRIOS
Analise as categorias de gastos diários fornecidas. Calcule economia potencial de 10-20%.

## 🚀 PRÓXIMOS PASSOS
3 ações imediatas e práticas.

--- DADOS FINANCEIROS ---
Receita Mensal: R$ ${monthlyIncome.toFixed(2)}
Despesas Fixas: R$ ${monthlyFixedExpenses.toFixed(2)}
Parcelas de Dívidas: R$ ${monthlyDebtPayments.toFixed(2)}
Gastos Diários (média/dia): R$ ${dailyAvg.toFixed(2)}
Gastos Diários (projetado): R$ ${dailyTotal.toFixed(2)}
Saldo Livre: R$ ${freeCash.toFixed(2)}

Receitas:
${incomes.length > 0 ? incomes.map((i: any) => `- ${i.name}: R$ ${Number(i.amount).toFixed(2)}`).join('\n') : 'Nenhuma receita cadastrada'}

Despesas Fixas:
${expenses.length > 0 ? expenses.map((e: any) => `- ${e.name}: R$ ${Number(e.amount).toFixed(2)}`).join('\n') : 'Nenhuma despesa fixa cadastrada'}

Gastos Diários:
${dailyExpenses?.entries?.length > 0 ? dailyExpenses.entries.map((d: any) => `- ${d.description} (${d.category}): R$ ${Number(d.amount).toFixed(2)}`).join('\n') : 'Nenhum gasto diário registrado'}

Dívidas Ativas:
${debts.length > 0 ? debts.map((d: any) => `- ${d.name}: Saldo R$ ${Number(d.remainingAmount).toFixed(2)} | Parcela R$ ${Number(d.installmentAmount).toFixed(2)} | Juros ${Number(d.interestRate).toFixed(2)}% a.m.`).join('\n') : 'Nenhuma dívida cadastrada'}

INSTRUÇÃO: Use APENAS os dados acima nos seus cálculos. Não invente informações.`;

    const chatCompletion = await groq.chat.completions.create({
      messages: [{ role: "user", content: prompt }],
      model: "llama-3.3-70b-versatile",
      temperature: 0.7,
      max_tokens: 2048,
    });

    const planContent = chatCompletion.choices[0]?.message?.content || "Erro ao processar as orientações personalizadas.";

    return res.status(200).json({
      planContent,
      monthlyIncome,
      monthlyExpenses: monthlyFixedExpenses,
      freeCash
    });
  } catch (error: any) {
    console.error("Erro no processar IA:", error);
    return res.status(500).json({ error: error.message || "Erro no motor de IA" });
  }
}
