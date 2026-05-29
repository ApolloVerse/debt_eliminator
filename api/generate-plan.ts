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

    const prompt = `[SYSTEM] Você é um Consultor Financeiro Sênior e Especialista em Quitação de Dívidas atuando no app "Debt Eliminator". Seu objetivo é criar uma estratégia matemática e comportamental real para que o usuário saia das dívidas o mais rápido possível e pague o mínimo de juros.

Aja com empatia, mas seja direto, realista e pragmático. Mostre exatamente o que ele deve fazer com o dinheiro dele este mês e nos próximos.

Você deve responder obrigatoriamente em PORTUGUÊS usando as seguintes seções estruturadas com títulos em Markdown limpo (use emojis e formatação profissional):

1. 📊 RAIO-X FINANCEIRO
(Analise o fluxo de caixa dele. Inclua os gastos diários no cálculo. O saldo livre é positivo ou negativo? O nível de endividamento é perigoso? O comprometimento da renda com dívidas e gastos do dia a dia está alto?)

2. ✂️ ONDE CORTAR E COMO OTIMIZAR
(Analise a lista de despesas fixas E os gastos diários por categoria. Sugira cortes reais. Se o saldo for negativo, esta etapa é urgente. Indique renegociação de dívidas específicas se a taxa de juros for abusiva).

3. 🎯 PLANO DE ATAQUE (${strategy === 'snowball' ? 'Bola de Neve - Foco no menor saldo' : 'Avalanche - Foco no maior juros'})
(Crie um plano passo a passo. Diga EXATAMENTE qual dívida ele deve pagar com o "Saldo Livre" extra. Explique matematicamente como direcionar os valores mês a mês).

4. 💡 ANÁLISE DOS GASTOS DIÁRIOS
(Analise os gastos diários do usuário. Identifique padrões, categorias com mais gastos e sugira reduções específicas. Mostre quanto ele poderia economizar se cortasse 10-20% dos gastos em cada categoria).

5. 🚀 PRÓXIMOS PASSOS (AÇÃO IMEDIATA)
(Dê 3 passos claros e práticos para ele executar amanhã mesmo).

DADOS FINANCEIROS REAIS DO USUÁRIO:
💰 Receita Mensal Total: R$ ${monthlyIncome.toFixed(2)}
📉 Despesas Fixas Mensais: R$ ${monthlyFixedExpenses.toFixed(2)}
💳 Parcelas Mensais de Dívidas: R$ ${monthlyDebtPayments.toFixed(2)}
🛒 Gastos Diários (média/dia): R$ ${dailyAvg.toFixed(2)}
🛒 Gastos Diários (projetado mês): R$ ${dailyTotal.toFixed(2)}
💵 Saldo Livre Real (após tudo): R$ ${freeCash.toFixed(2)}

Fontes de Renda:
${incomes.length > 0 ? incomes.map((i: any) => `- ${i.name}: R$ ${Number(i.amount).toFixed(2)}`).join('\n') : '- Nenhuma renda cadastrada'}

Despesas Fixas:
${expenses.length > 0 ? expenses.map((e: any) => `- ${e.name} (${e.category || 'Geral'}): R$ ${Number(e.amount).toFixed(2)}`).join('\n') : '- Nenhuma despesa fixa cadastrada'}

Gastos Diários Recentes:
${dailyExpenses?.entries?.length > 0 ? dailyExpenses.entries.map((d: any) => `- ${d.description} (${d.category}): R$ ${Number(d.amount).toFixed(2)} em ${d.date}`).join('\n') : '- Nenhum gasto diário registrado'}

Dívidas Ativas:
${debts.length > 0 ? debts.map((d: any) => `- ${d.name}: Saldo R$ ${Number(d.remainingAmount).toFixed(2)} | Parcela R$ ${Number(d.installmentAmount).toFixed(2)} | Juros ${Number(d.interestRate).toFixed(2)}% a.m.`).join('\n') : '- Nenhuma dívida cadastrada'}

INSTRUÇÃO FINAL: Use os NÚMEROS fornecidos para fazer cálculos reais. Se o "Saldo Livre" for negativo, o plano deve focar 100% em sobrevivência e corte de gastos. Considere os gastos diários como uma categoria importante de corte.`;

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
