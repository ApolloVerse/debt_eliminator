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

    const prompt = `[SYSTEM] Você é um Consultor Financeiro Sênior e Especialista em Engenharia Financeira e Eliminação de Dívidas.

REGRAS OBRIGATÓRIAS:
- Responda APENAS em Português do Brasil.
- Use APENAS os dados financeiros reais fornecidos abaixo. Não invente números fora da realidade informada.
- Seja objetivo, didático, encorajador e altamente estratégico.
- Formate sua resposta em Markdown rico com tabelas, marcadores e emojis.

ESTRUTURA OBRIGATÓRIA DA SUA RESPOSTA:

# 📋 RELATÓRIO FINANCEIRO COMPLETO & PLANO DE ELIMINAÇÃO DE DÍVIDAS

## 📊 1. RAIO-X FINANCEIRO & BALANÇO OPERACIONAL
- Resumo do fluxo de caixa: Receita Mensal, Despesas Fixas, Parcelas de Dívidas, Gastos Diários, Saldo Livre Disponível.
- Percentual de comprometimento da renda e diagnóstico do cenário (se há déficit ou saldo positivo).

## 💵 2. ORIGEM DAS RECEITAS (DE ONDE VEM O DINHEIRO & PROJEÇÃO FUTURA)
- Discrimine as receitas atuais: de onde está vindo cada centavo (fontes, valores, recorrência).
- Apresente a projeção de dinheiro futuro para os próximos 6 meses (fluxo recorrente de entradas acumuladas).

## 💳 3. RAIO-X DAS DESPESAS & CONTAS (DO MÊS E DO FUTURO)
- Discrimine as contas fixas e variáveis do mês atual (moradia, contas básicas, alimentação, etc.).
- Detalhe os parcelamentos e dívidas futuras (cartões, empréstimos, quantas parcelas restam e quando serão extintas).

## 🧭 4. COMO O USUÁRIO DEVE SE PORTAR NO CENÁRIO ATUAL (MANUAL DE CONDUTA COMPORTAMENTAL)
- Manual de conduta prático para o nível de endividamento do usuário:
  1. Trava/congelamento dos cartões de crédito (usar apenas débito/PIX para sentir a dor do pagamento).
  2. Teto semanal inegociável para gastos diários (método dos 4 envelopes semanais).
  3. Protocolo das 48 horas para evitar qualquer compra por impulso.
  4. Corte cirúrgico de fugas invisíveis (tarifas bancárias, assinaturas duplicadas, renegociação de planos).
  5. Blindagem psicológica: foco na matemática do algoritmo sem sentimento de culpa.

## 🚀 5. ESTRATÉGIAS PARA ELIMINAR AS DÍVIDAS O MAIS RÁPIDO POSSÍVEL
Apresente tanto estratégias simples quanto sofisticadas:
- **Estratégias Simples (Vitórias Rápidas & Emocionais):**
  - Método Bola de Neve (Snowball - menor saldo primeiro para dopamina e alívio rápido).
  - Renegociação ativa com desconto à vista (Serasa Limpa Nome/Desenrola com até 80-90% de desconto em juros).
  - Venda de itens parados em casa e renda extra pontual com destino 100% para amortização.
- **Estratégias Sofisticadas (Engenharia Financeira & CET):**
  - Método Avalanche (Destruição pelo CET / Maior taxa de juros para estancar a hemorragia mais cara).
  - Portabilidade de crédito / Troca de dívida cara (rotativo/cartão de 14% a.m.) por barata (consignado/garantia a 1.5% a.m.).
  - Efeito Rollover Turbinado: No momento em que uma dívida é quitada, sua parcela NÃO volta para gastos, é empilhada na dívida seguinte.
  - Cash-Flow Matching: Sincronizar datas de vencimento de todas as contas para 3 a 5 dias após o recebimento do salário principal para zerar multas e juros de mora.
  - Reserva de Defesa Mínima (Buffer Anti-Recaída de R$ 500 a R$ 1.000 para emergências reais não forçarem novo endividamento).

## 📅 6. CRONOGRAMA DE EXECUÇÃO MÊS A MÊS (PLANO EFICAZ)
- Estratégia em execução: ${strategy === 'snowball' ? 'Bola de Neve (Menor Saldo Primeiro)' : 'Avalanche (Maior Taxa de Juros Primeiro)'}.
- Ordem oficial de quitação das dívidas.
- Cronograma mês a mês mostrando pagamento, amortização e redução do saldo devedor até zerar.
- Previsão da data exata de liberdade financeira.

## 🛡️ 7. CHECKLIST DAS PRÓXIMAS 24 HORAS & GARANTIA DE SUCESSO
- 4 ações imediatas e práticas para iniciar hoje.

--- DADOS FINANCEIROS REAIS DO USUÁRIO ---
Receita Mensal Total: R$ ${monthlyIncome.toFixed(2)}
Despesas Fixas Totais: R$ ${monthlyFixedExpenses.toFixed(2)}
Parcelas Mensais de Dívidas: R$ ${monthlyDebtPayments.toFixed(2)}
Gastos Diários Projetados: R$ ${dailyTotal.toFixed(2)} (Média R$ ${dailyAvg.toFixed(2)}/dia)
Saldo Livre Líquido: R$ ${freeCash.toFixed(2)}

Fontes de Receitas:
${incomes.length > 0 ? incomes.map((i: any) => `- ${i.name} (${i.type || 'Fixa'}, ${i.frequency || 'mensal'}): R$ ${Number(i.amount).toFixed(2)}${i.recurrenceDay ? ` (dia ${i.recurrenceDay})` : ''}`).join('\n') : 'Nenhuma receita ativa cadastrada'}

Despesas Fixas e Contas:
${expenses.length > 0 ? expenses.map((e: any) => `- ${e.name} (${e.category || 'Fixa'}): R$ ${Number(e.amount).toFixed(2)}${e.dueDate ? ` (venc: ${e.dueDate})` : ''}`).join('\n') : 'Nenhuma despesa fixa cadastrada'}

Gastos Diários:
${dailyExpenses?.entries?.length > 0 ? dailyExpenses.entries.map((d: any) => `- ${d.description} (${d.category}): R$ ${Number(d.amount).toFixed(2)}`).join('\n') : 'Nenhum gasto diário registrado'}

Dívidas e Cartões Ativos:
${debts.length > 0 ? debts.map((d: any) => `- ${d.name}: Saldo Devedor R$ ${Number(d.remainingAmount).toFixed(2)} | Parcela R$ ${Number(d.installmentAmount).toFixed(2)}/mês | Juros ${Number(d.interestRate).toFixed(2)}% a.m. | Total parcelas: ${d.totalInstallments || 'N/A'}`).join('\n') : 'Nenhuma dívida ativa cadastrada'}

INSTRUÇÃO: Use todos os dados acima para produzir um relatório memorável, profundo, 100% em português do Brasil e focado no sucesso total da libertação das dívidas.`;

    const chatCompletion = await groq.chat.completions.create({
      messages: [{ role: "user", content: prompt }],
      model: "llama-3.3-70b-versatile",
      temperature: 0.6,
      max_tokens: 3500,
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
