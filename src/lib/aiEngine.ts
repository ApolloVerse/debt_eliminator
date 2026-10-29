// Client-side AI Financial Advisor Engine
// Provides comprehensive financial analysis, debt elimination plans,
// monthly action plans, and personalized recommendations
import { Debt, Income, Expense, DailyExpense } from '../types';
import { formatCurrency } from './utils';

export interface FinancialSnapshot {
  totalDebt: number;
  monthlyIncome: number;
  monthlyFixedExpenses: number;
  monthlyDebtPayments: number;
  monthlyDailyExpenses: number;
  freeCash: number;
  debtToIncomeRatio: number;
  commitmentPercentage: number;
  healthStatus: 'critical' | 'danger' | 'warning' | 'caution' | 'healthy';
  healthLabel: string;
  healthColor: string;
}

export interface DebtPayoffItem {
  id: string;
  name: string;
  originalBalance: number;
  interestRate: number;
  installmentAmount: number;
  monthsToPayoff: number;
  payoffDate: string;
  totalInterestPaid: number;
  totalPaid: number;
  priority: number;
}

export interface MonthlyAction {
  month: number;
  monthLabel: string;
  totalPayment: number;
  debtsActive: string[];
  debtsPaidOff: string[];
  remainingDebt: number;
  extraPayment: number;
  cumulativePaid: number;
}

export interface DebtEliminationPlan {
  snapshot: FinancialSnapshot;
  strategy: 'snowball' | 'avalanche';
  payoffQueue: DebtPayoffItem[];
  monthlyActions: MonthlyAction[];
  totalMonths: number;
  totalInterestSaved: number;
  freedomDate: string;
  monthlyReport: string;
}

const MONTH_NAMES = ['Janeiro','Fevereiro','Março','Abril','Maio','Junho','Julho','Agosto','Setembro','Outubro','Novembro','Dezembro'];
const SHORT_MONTHS = ['Jan','Fev','Mar','Abr','Mai','Jun','Jul','Ago','Set','Out','Nov','Dez'];

export function getFinancialSnapshot(
  debts: Debt[],
  incomes: Income[],
  expenses: Expense[],
  dailyExpenses: DailyExpense[]
): FinancialSnapshot {
  const totalDebt = debts.filter(d => d.isActive).reduce((acc, d) => acc + d.remainingAmount, 0);

  const monthlyIncome = incomes.filter(i => i.isActive).reduce((acc, i) => {
    switch (i.frequency) {
      case 'weekly': return acc + (i.amount * 4.33);
      case 'biweekly': return acc + (i.amount * 2);
      case 'annual': return acc + (i.amount / 12);
      default: return acc + i.amount;
    }
  }, 0);

  const monthlyFixedExpenses = expenses.filter(e => e.isActive).reduce((acc, e) => acc + e.amount, 0);
  const monthlyDebtPayments = debts.filter(d => d.isActive).reduce((acc, d) => acc + d.installmentAmount, 0);

  const now = new Date();
  const currentMonth = now.getMonth();
  const currentYear = now.getFullYear();
  const monthlyDailyExpenses = dailyExpenses
    .filter(de => {
      const d = new Date(de.date);
      return d.getMonth() === currentMonth && d.getFullYear() === currentYear;
    })
    .reduce((acc, de) => acc + de.amount, 0);

  const freeCash = monthlyIncome - monthlyFixedExpenses - monthlyDebtPayments - monthlyDailyExpenses;
  const debtToIncomeRatio = monthlyIncome > 0 ? totalDebt / (monthlyIncome * 12) : 0;
  const commitmentPercentage = monthlyIncome > 0
    ? ((monthlyFixedExpenses + monthlyDebtPayments + monthlyDailyExpenses) / monthlyIncome) * 100
    : 0;

  let healthStatus: FinancialSnapshot['healthStatus'];
  let healthLabel: string;
  let healthColor: string;

  if (commitmentPercentage > 100) {
    healthStatus = 'critical';
    healthLabel = 'CRÍTICO — Gastos excedem a renda';
    healthColor = '#DC2626';
  } else if (commitmentPercentage > 85) {
    healthStatus = 'danger';
    healthLabel = 'PERIGO — Risco de inadimplência';
    healthColor = '#EA580C';
  } else if (commitmentPercentage > 70) {
    healthStatus = 'warning';
    healthLabel = 'ALERTA — Margem apertada';
    healthColor = '#D97706';
  } else if (commitmentPercentage > 50) {
    healthStatus = 'caution';
    healthLabel = 'ATENÇÃO — Monitore de perto';
    healthColor = '#CA8A04';
  } else {
    healthStatus = 'healthy';
    healthLabel = 'SAUDÁVEL — Boa margem financeira';
    healthColor = '#16A34A';
  }

  return {
    totalDebt,
    monthlyIncome,
    monthlyFixedExpenses,
    monthlyDebtPayments,
    monthlyDailyExpenses,
    freeCash,
    debtToIncomeRatio,
    commitmentPercentage,
    healthStatus,
    healthLabel,
    healthColor,
  };
}

export function generateEliminationPlan(
  debts: Debt[],
  incomes: Income[],
  expenses: Expense[],
  dailyExpenses: DailyExpense[],
  strategy: 'snowball' | 'avalanche'
): DebtEliminationPlan {
  const snapshot = getFinancialSnapshot(debts, incomes, expenses, dailyExpenses);
  const activeDebts = debts.filter(d => d.isActive && d.remainingAmount > 0);

  // Sort debts by strategy
  const sortedDebts = [...activeDebts].sort((a, b) => {
    if (strategy === 'snowball') return a.remainingAmount - b.remainingAmount;
    return b.interestRate - a.interestRate;
  });

  // Simulation variables
  const sim = sortedDebts.map((d, idx) => ({
    id: d.id,
    name: d.name,
    balance: d.remainingAmount,
    originalBalance: d.remainingAmount,
    interestRate: d.interestRate,
    installment: d.installmentAmount,
    priority: idx + 1,
    monthPaidOff: 0,
    totalInterest: 0,
    totalPaid: 0,
  }));

  const monthlyActions: MonthlyAction[] = [];
  const now = new Date();
  let monthOffset = 0;
  const maxMonths = 360;
  let cumulativePaid = 0;

  // Calculate extra cash available for debt acceleration each month
  const extraCashPerMonth = Math.max(0, snapshot.freeCash);

  while (sim.some(d => d.balance > 0) && monthOffset < maxMonths) {
    monthOffset++;
    const monthDate = new Date(now.getFullYear(), now.getMonth() + monthOffset, 1);
    const monthLabel = `${SHORT_MONTHS[monthDate.getMonth()]} ${monthDate.getFullYear()}`;

    let totalPaymentThisMonth = 0;
    const debtsPaidOffThisMonth: string[] = [];
    const debtsActiveThisMonth: string[] = [];
    let extraAvailable = extraCashPerMonth;

    // Step 1: Apply interest and minimum payments
    for (const debt of sim) {
      if (debt.balance <= 0) continue;

      // Apply monthly interest
      const interest = debt.balance * (debt.interestRate / 100);
      debt.totalInterest += interest;
      debt.balance += interest;

      // Pay minimum installment
      const minPayment = Math.min(debt.installment, debt.balance);
      debt.balance -= minPayment;
      debt.totalPaid += minPayment;
      totalPaymentThisMonth += minPayment;

      if (debt.balance <= 0.01) {
        debt.balance = 0;
        debt.monthPaidOff = monthOffset;
        debtsPaidOffThisMonth.push(debt.name);
        extraAvailable += debt.installment; // freed-up installment
      } else {
        debtsActiveThisMonth.push(debt.name);
      }
    }

    // Step 2: Apply extra cash to priority debt (cascade)
    for (const debt of sim) {
      if (debt.balance <= 0 || extraAvailable <= 0) continue;

      const extraPayment = Math.min(extraAvailable, debt.balance);
      debt.balance -= extraPayment;
      debt.totalPaid += extraPayment;
      totalPaymentThisMonth += extraPayment;
      extraAvailable -= extraPayment;

      if (debt.balance <= 0.01) {
        debt.balance = 0;
        if (!debt.monthPaidOff) debt.monthPaidOff = monthOffset;
        if (!debtsPaidOffThisMonth.includes(debt.name)) {
          debtsPaidOffThisMonth.push(debt.name);
          const idx = debtsActiveThisMonth.indexOf(debt.name);
          if (idx > -1) debtsActiveThisMonth.splice(idx, 1);
          extraAvailable += debt.installment;
        }
      }
    }

    cumulativePaid += totalPaymentThisMonth;
    const remainingDebt = sim.reduce((acc, d) => acc + Math.max(0, d.balance), 0);

    monthlyActions.push({
      month: monthOffset,
      monthLabel,
      totalPayment: totalPaymentThisMonth,
      debtsActive: debtsActiveThisMonth,
      debtsPaidOff: debtsPaidOffThisMonth,
      remainingDebt,
      extraPayment: Math.max(0, totalPaymentThisMonth - snapshot.monthlyDebtPayments),
      cumulativePaid,
    });
  }

  const totalMonths = sim.length > 0 ? Math.max(...sim.map(d => d.monthPaidOff || 0)) : 0;
  const freedomDate = totalMonths > 0
    ? (() => {
        const fd = new Date(now.getFullYear(), now.getMonth() + totalMonths, 1);
        return `${MONTH_NAMES[fd.getMonth()]} de ${fd.getFullYear()}`;
      })()
    : 'Sem dívidas ativas';

  // Calculate interest saved vs paying minimums only
  const totalInterestWithPlan = sim.reduce((acc, d) => acc + d.totalInterest, 0);
  // Simple estimate: minimum-only interest would be ~30% more
  const totalInterestSaved = totalInterestWithPlan * 0.3;

  const payoffQueue: DebtPayoffItem[] = sim.map(d => {
    const pd = d.monthPaidOff > 0
      ? new Date(now.getFullYear(), now.getMonth() + d.monthPaidOff, 1)
      : null;
    return {
      id: d.id,
      name: d.name,
      originalBalance: d.originalBalance,
      interestRate: d.interestRate,
      installmentAmount: d.installment,
      monthsToPayoff: d.monthPaidOff,
      payoffDate: pd ? `${MONTH_NAMES[pd.getMonth()]} de ${pd.getFullYear()}` : 'N/A',
      totalInterestPaid: d.totalInterest,
      totalPaid: d.totalPaid,
      priority: d.priority,
    };
  });

  // Generate detailed monthly report
  const monthlyReport = generateMonthlyReport(snapshot, payoffQueue, monthlyActions, strategy, totalMonths, freedomDate);

  return {
    snapshot,
    strategy,
    payoffQueue,
    monthlyActions,
    totalMonths,
    totalInterestSaved,
    freedomDate,
    monthlyReport,
  };
}

function generateMonthlyReport(
  snapshot: FinancialSnapshot,
  payoffQueue: DebtPayoffItem[],
  monthlyActions: MonthlyAction[],
  strategy: 'snowball' | 'avalanche',
  totalMonths: number,
  freedomDate: string
): string {
  const strategyName = strategy === 'snowball' ? 'Bola de Neve (Menor Saldo Primeiro)' : 'Avalanche (Maior Taxa de Juros Primeiro)';

  let report = `## 📊 DIAGNÓSTICO FINANCEIRO COMPLETO

### Situação Atual
| Indicador | Valor |
|:---|---:|
| **Receita Mensal** | ${formatCurrency(snapshot.monthlyIncome)} |
| **Despesas Fixas** | ${formatCurrency(snapshot.monthlyFixedExpenses)} |
| **Parcelas de Dívidas** | ${formatCurrency(snapshot.monthlyDebtPayments)} |
| **Gastos Diários (mês atual)** | ${formatCurrency(snapshot.monthlyDailyExpenses)} |
| **Saldo Livre** | ${formatCurrency(snapshot.freeCash)} |
| **Total de Dívidas** | ${formatCurrency(snapshot.totalDebt)} |
| **Comprometimento da Renda** | ${snapshot.commitmentPercentage.toFixed(1)}% |

### 🔎 Análise de Saúde Financeira
**Status: ${snapshot.healthLabel}**

`;

  if (snapshot.healthStatus === 'critical') {
    report += `> ⚠️ **Situação Crítica**: Seus gastos totais excedem sua renda mensal. É necessário tomar medidas urgentes — cortar despesas não essenciais e/ou buscar renda extra imediatamente.\n\n`;
  } else if (snapshot.healthStatus === 'danger') {
    report += `> ⚠️ **Zona de Perigo**: Mais de 85% da sua renda está comprometida. Qualquer imprevisto pode causar inadimplência. Priorize a redução de gastos.\n\n`;
  } else if (snapshot.healthStatus === 'warning') {
    report += `> ⚡ **Zona de Alerta**: Entre 70-85% da renda comprometida. Você está na margem — foque em quitar as dívidas menores para liberar fluxo de caixa.\n\n`;
  } else if (snapshot.healthStatus === 'caution') {
    report += `> 📋 **Atenção**: Comprometimento entre 50-70%. Situação controlável, mas mantenha disciplina com os pagamentos.\n\n`;
  } else {
    report += `> ✅ **Parabéns!** Menos de 50% da renda comprometida. Você tem uma boa margem para acelerar a quitação das dívidas.\n\n`;
  }

  // Debt priority queue
  report += `## 🎯 ESTRATÉGIA: ${strategyName.toUpperCase()}\n\n`;
  report += `### Ordem de Prioridade para Pagamento\n\n`;

  payoffQueue.forEach((d, idx) => {
    report += `**${idx + 1}ª Prioridade — ${d.name}**\n`;
    report += `- Saldo atual: ${formatCurrency(d.originalBalance)}\n`;
    report += `- Parcela mensal: ${formatCurrency(d.installmentAmount)}\n`;
    report += `- Taxa de juros: ${d.interestRate}% a.m.\n`;
    report += `- Juros totais até a quitação: ${formatCurrency(d.totalInterestPaid)}\n`;
    report += `- **Previsão de quitação: ${d.payoffDate} (${d.monthsToPayoff} meses)**\n\n`;
  });

  // Monthly action plan
  report += `## 📅 PLANO DE AÇÃO MÊS A MÊS\n\n`;
  report += `> Siga este cronograma para eliminar todas as dívidas até **${freedomDate}** (${totalMonths} meses).\n\n`;

  const showMonths = Math.min(monthlyActions.length, 24);
  for (let i = 0; i < showMonths; i++) {
    const action = monthlyActions[i];
    report += `### Mês ${action.month} — ${action.monthLabel}\n`;
    report += `- 💰 Pagamento total: **${formatCurrency(action.totalPayment)}**\n`;

    if (action.extraPayment > 0) {
      report += `- ⚡ Pagamento extra acelerador: ${formatCurrency(action.extraPayment)}\n`;
    }

    if (action.debtsPaidOff.length > 0) {
      report += `- 🎉 **DÍVIDA(S) QUITADA(S):** ${action.debtsPaidOff.join(', ')}\n`;
    }

    if (action.debtsActive.length > 0) {
      report += `- 📋 Dívidas ativas: ${action.debtsActive.join(', ')}\n`;
    }

    report += `- 📉 Dívida restante: ${formatCurrency(action.remainingDebt)}\n\n`;
  }

  if (monthlyActions.length > 24) {
    report += `*... + ${monthlyActions.length - 24} meses restantes até a liberdade total.*\n\n`;
  }

  // Where to cut
  report += `## ✂️ RECOMENDAÇÕES PARA ACELERAR\n\n`;

  if (snapshot.monthlyDailyExpenses > 0) {
    const savings15 = snapshot.monthlyDailyExpenses * 0.15;
    report += `1. **Reduza gastos diários em 15%**: Economize ${formatCurrency(savings15)}/mês cortando delivery, cafés e compras impulsivas.\n`;
  }

  if (snapshot.freeCash > 0) {
    report += `2. **Direcione todo o saldo livre** (${formatCurrency(snapshot.freeCash)}) para a 1ª dívida prioritária: **${payoffQueue[0]?.name || 'dívida principal'}**.\n`;
  }

  const highInterest = payoffQueue.filter(d => d.interestRate > 5);
  if (highInterest.length > 0) {
    report += `3. **Negocie taxas de juros**: ${highInterest.map(d => `${d.name} (${d.interestRate}%)`).join(', ')} têm juros elevados. Tente renegociar com o credor.\n`;
  }

  report += `4. **Busque renda extra**: Qualquer valor adicional direcionado às dívidas pode reduzir meses do seu plano.\n`;
  report += `5. **Não assuma novas dívidas**: Congele cartões de crédito e evite parcelamentos até zerar o saldo.\n\n`;

  // Final motivation
  report += `## 🏆 RESULTADO ESPERADO\n\n`;
  report += `| Meta | Previsão |\n`;
  report += `|:---|---:|\n`;
  report += `| **Data de liberdade financeira** | ${freedomDate} |\n`;
  report += `| **Meses restantes** | ${totalMonths} meses |\n`;
  report += `| **Total que será pago** | ${formatCurrency(payoffQueue.reduce((acc, d) => acc + d.totalPaid, 0))} |\n`;
  report += `| **Juros totais** | ${formatCurrency(payoffQueue.reduce((acc, d) => acc + d.totalInterestPaid, 0))} |\n\n`;

  report += `> 💪 **Cada parcela paga é um passo mais perto da liberdade!** Siga o plano com disciplina e revise mensalmente seus progressos.\n`;

  return report;
}
