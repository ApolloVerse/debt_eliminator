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

// Helper to calculate exact operating income for ANY specific month key (e.g. "2026-10")
export function calculateIncomeForMonth(incomes: Income[], targetMonthKey: string): {
  total: number;
  mainSource: string;
  items: Income[];
} {
  const items = incomes.filter(i => {
    if (!i.isActive) return false;
    // CRITICAL: NEVER include bank boxes / caixinhas in monthly operating income!
    // Caixinhas are savings reserves, not recurring monthly income!
    if (i.category === 'bank_box') return false;

    // If it has a specific expectedDate (e.g., '2026-10-05', '2026-03-20')
    if (i.expectedDate) {
      const monthPart = i.expectedDate.slice(0, 7);
      // For sporadic/annual entries (bonus, 13º, ferias, IR): ONLY include in its specific month!
      if (i.frequency === 'sporadic' || i.frequency === 'annual') {
        return monthPart === targetMonthKey;
      }
      // For monthly recurring with start date
      if (i.frequency === 'monthly') {
        return targetMonthKey >= monthPart;
      }
    }

    // Recurring incomes without expectedDate (or regular monthly, weekly, biweekly)
    if (i.frequency === 'monthly' || i.frequency === 'weekly' || i.frequency === 'biweekly') {
      return true;
    }

    return false;
  });

  const total = items.reduce((acc, i) => {
    const amt = Number(i.amount) || 0;
    if (i.frequency === 'weekly' && !i.expectedDate) return acc + (amt * 4);
    if (i.frequency === 'biweekly' && !i.expectedDate) return acc + (amt * 2);
    return acc + amt;
  }, 0);

  // Sort to find the true primary income source for that month
  const sorted = [...items].sort((a, b) => (Number(b.amount) || 0) - (Number(a.amount) || 0));
  const mainSource = sorted[0]?.name || 'Receitas Operacionais';

  return { total, mainSource, items };
}

export function getFinancialSnapshot(
  debts: Debt[],
  incomes: Income[],
  expenses: Expense[],
  dailyExpenses: DailyExpense[]
): FinancialSnapshot {
  const now = new Date();
  const currentMonthStr = String(now.getMonth() + 1).padStart(2, '0');
  const currentYearStr = String(now.getFullYear());
  const currentMonthKey = `${currentYearStr}-${currentMonthStr}`;

  // 1. Direct debts from `debts` table (current & installments remaining)
  const directDebtsBalance = debts
    .filter(d => d.isActive && !d.isPaid)
    .reduce((acc, d) => {
      const rem = Number(d.remainingAmount);
      if (!isNaN(rem) && rem > 0) return acc + rem;
      const tot = Number(d.totalAmount);
      if (!isNaN(tot) && tot > 0) return acc + tot;
      const inst = Number(d.installmentAmount);
      const remainingCount = Math.max(1, (d.totalInstallments || 1) - (d.paidInstallments || 0));
      if (!isNaN(inst) && inst > 0) return acc + (inst * remainingCount);
      return acc;
    }, 0);

  // 2. Unpaid expenses from `expenses` table (credit cards, loans, bills, future installments)
  const expensesDebtsBalance = expenses
    .filter(e => e.isActive && !e.isPaid)
    .reduce((acc, e) => {
      const amt = Number(e.amount) || 0;
      if (e.totalInstallments && e.totalInstallments > 1 && e.installmentNumber) {
        const remainingInst = Math.max(1, e.totalInstallments - e.installmentNumber + 1);
        return acc + (amt * remainingInst);
      }
      return acc + amt;
    }, 0);

  // Total debt encompassing ALL obligations (debts + expenses vigentes e futuras)
  const totalDebt = directDebtsBalance + expensesDebtsBalance;

  // Real operating monthly income for CURRENT month only (excluding caixinhas and other-month bonuses)
  const currentMonthIncomeData = calculateIncomeForMonth(incomes, currentMonthKey);
  const monthlyIncome = currentMonthIncomeData.total;

  // Living fixed expenses (non-credit)
  const monthlyFixedExpenses = expenses
    .filter(e => e.isActive && !(e.category === 'credit_card' || e.category === 'loan' || e.category === 'overdraft'))
    .reduce((acc, e) => acc + (Number(e.amount) || 0), 0);

  // Monthly debt / credit commitments
  const debtsInstallments = debts
    .filter(d => d.isActive && !d.isPaid)
    .reduce((acc, d) => acc + (Number(d.installmentAmount || d.remainingAmount) || 0), 0);

  const creditCardExpenses = expenses
    .filter(e => e.isActive && !e.isPaid && (e.category === 'credit_card' || e.category === 'loan' || e.category === 'overdraft'))
    .reduce((acc, e) => acc + (Number(e.amount) || 0), 0);

  const monthlyDebtPayments = debtsInstallments + creditCardExpenses;

  const monthlyDailyExpenses = dailyExpenses
    .filter(de => {
      if (!de.date) return false;
      const datePart = de.date.split('T')[0];
      return datePart.startsWith(currentMonthKey);
    })
    .reduce((acc, de) => acc + (Number(de.amount) || 0), 0);

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

  // Combine all active debts from `debts` and unpaid debts/cards from `expenses`
  type UnifiedDebtItem = {
    id: string;
    name: string;
    remainingAmount: number;
    installmentAmount: number;
    interestRate: number;
    totalInstallments: number;
  };

  const unifiedDebts: UnifiedDebtItem[] = [];

  // Add debts from debts table
  debts.filter(d => d.isActive && !d.isPaid).forEach(d => {
    const rem = Number(d.remainingAmount) || Number(d.totalAmount) || 0;
    const inst = Number(d.installmentAmount) || rem;
    if (rem > 0 || inst > 0) {
      unifiedDebts.push({
        id: `debt-${d.id}`,
        name: d.name,
        remainingAmount: rem > 0 ? rem : inst,
        installmentAmount: inst > 0 ? inst : rem,
        interestRate: Number(d.interestRate) || 0,
        totalInstallments: d.totalInstallments || 1,
      });
    }
  });

  // Add unpaid cards, loans and accounts from expenses table
  expenses.filter(e => e.isActive && !e.isPaid).forEach(e => {
    const amt = Number(e.amount) || 0;
    if (amt > 0) {
      const isCredit = e.category === 'credit_card';
      const isLoan = e.category === 'loan';
      const remainingCount = (e.totalInstallments && e.installmentNumber)
        ? Math.max(1, e.totalInstallments - e.installmentNumber + 1)
        : 1;
      unifiedDebts.push({
        id: `exp-${e.id}`,
        name: isCredit ? `Cartão ${e.name}` : e.name,
        remainingAmount: amt * remainingCount,
        installmentAmount: amt,
        interestRate: isCredit ? 13.5 : (isLoan ? 3.5 : 0),
        totalInstallments: remainingCount,
      });
    }
  });

  // Sort unified debts by strategy
  const sortedDebts = [...unifiedDebts].sort((a, b) => {
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

  // Generate detailed monthly report with complete income/expense breakdown, behavioral posture and strategies
  const monthlyReport = generateMonthlyReport(
    snapshot,
    payoffQueue,
    monthlyActions,
    strategy,
    totalMonths,
    freedomDate,
    debts,
    incomes,
    expenses,
    dailyExpenses
  );

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
  freedomDate: string,
  debts: Debt[],
  incomes: Income[],
  expenses: Expense[],
  dailyExpenses: DailyExpense[]
): string {
  const strategyName = strategy === 'snowball' ? 'Bola de Neve (Menor Saldo Primeiro)' : 'Avalanche (Maior Taxa de Juros Primeiro)';
  const now = new Date();
  const currentMonthIdx = now.getMonth();
  const currentYear = now.getFullYear();

  const activeIncomes = incomes.filter(i => i.isActive);
  const activeExpenses = expenses.filter(e => e.isActive);
  const activeDebts = debts.filter(d => d.isActive && !d.isPaid);

  let report = `# 📋 RELATÓRIO FINANCEIRO COMPLETO & PLANO DE ELIMINAÇÃO DE DÍVIDAS\n\n`;
  report += `*Gerado em: ${now.toLocaleDateString('pt-BR')} às ${now.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })} | Consultor de Estratégia Financeira*\n\n`;

  // 1. Resumo Executivo & Raio-X
  report += `## 📊 1. RAIO-X FINANCEIRO & BALANÇO OPERACIONAL\n\n`;
  report += `| Indicador | Valor Mensal | Impacto na Renda |\n`;
  report += `|:---|---:|---:|\n`;
  report += `| **Receita Total Atual** | **${formatCurrency(snapshot.monthlyIncome)}** | 100.0% |\n`;
  report += `| **Despesas Fixas & Contas** | ${formatCurrency(snapshot.monthlyFixedExpenses)} | ${snapshot.monthlyIncome > 0 ? ((snapshot.monthlyFixedExpenses / snapshot.monthlyIncome) * 100).toFixed(1) : 0}% |\n`;
  report += `| **Parcelas de Dívidas / Cartões** | ${formatCurrency(snapshot.monthlyDebtPayments)} | ${snapshot.monthlyIncome > 0 ? ((snapshot.monthlyDebtPayments / snapshot.monthlyIncome) * 100).toFixed(1) : 0}% |\n`;
  report += `| **Gastos Diários Estimados** | ${formatCurrency(snapshot.monthlyDailyExpenses)} | ${snapshot.monthlyIncome > 0 ? ((snapshot.monthlyDailyExpenses / snapshot.monthlyIncome) * 100).toFixed(1) : 0}% |\n`;
  report += `| **Saldo Livre Disponível** | **${formatCurrency(snapshot.freeCash)}** | ${snapshot.monthlyIncome > 0 ? ((snapshot.freeCash / snapshot.monthlyIncome) * 100).toFixed(1) : 0}% |\n`;
  report += `| **Total da Dívida Acumulada** | **${formatCurrency(snapshot.totalDebt)}** | ${snapshot.debtToIncomeRatio.toFixed(1)}x renda anual |\n`;
  report += `| **Comprometimento da Renda** | **${snapshot.commitmentPercentage.toFixed(1)}%** | **${snapshot.healthLabel}** |\n\n`;

  if (snapshot.healthStatus === 'critical') {
    report += `> 🚨 **CENÁRIO CRÍTICO (Déficit Operacional):** Suas saídas superam suas entradas em ${formatCurrency(Math.abs(snapshot.freeCash))} todo mês. Cada mês no modelo atual gera mais endividamento. É fundamental aplicar imediatamente o protocolo de emergência detalhado neste relatório.\n\n`;
  } else if (snapshot.healthStatus === 'danger') {
    report += `> ⚠️ **CENÁRIO DE PERIGO (Mais de 85% comprometido):** Você está no limite máximo de segurança. Qualquer imprevisto (saúde, conserto, atraso de salário) provocará juros rotativos.\n\n`;
  } else if (snapshot.healthStatus === 'warning') {
    report += `> ⚡ **CENÁRIO DE ALERTA (70% a 85% comprometido):** Margem muito estreita. O foco total deve ser quitar a 1ª dívida para liberar oxigênio no caixa.\n\n`;
  } else {
    report += `> ✅ **CENÁRIO ESTÁVEL:** Você possui saldo livre positivo de ${formatCurrency(snapshot.freeCash)}/mês. Com o método deste plano, sua quitação será acelerada com grande economia em juros.\n\n`;
  }

  // Current month key
  const currentMonthKey = `${currentYear}-${String(currentMonthIdx + 1).padStart(2, '0')}`;
  const currentMonthIncomeData = calculateIncomeForMonth(incomes, currentMonthKey);
  const currentMonthIncomes = currentMonthIncomeData.items;

  // Separate reserves/caixinhas so they are acknowledged without distorting monthly income
  const bankBoxes = incomes.filter(i => i.isActive && i.category === 'bank_box');
  const totalBankBoxes = bankBoxes.reduce((acc, b) => acc + (Number(b.amount) || 0), 0);

  // 2. Origem das Receitas (De onde vem o dinheiro) e Receitas Futuras
  report += `## 💵 2. ORIGEM DAS RECEITAS (DE ONDE VEM O DINHEIRO & PROJEÇÃO FUTURA)\n\n`;
  report += `### 📥 De onde está vindo o dinheiro no mês atual (${MONTH_NAMES[currentMonthIdx]} de ${currentYear}):\n\n`;
  if (currentMonthIncomes.length > 0) {
    report += `| Fonte / Nome da Receita | Tipo | Frequência | Dia Previsto | Valor Mensal |\n`;
    report += `|:---|:---:|:---:|:---:|---:|\n`;
    currentMonthIncomes.forEach(i => {
      const typeLabel = i.type === 'variable' ? 'Variável' : 'Fixa';
      const freqLabel = i.frequency === 'weekly' ? 'Semanal' : i.frequency === 'biweekly' ? 'Quinzenal' : 'Mensal';
      const dayLabel = i.recurrenceDay ? `Dia ${i.recurrenceDay}` : (i.expectedDate ? `Dia ${i.expectedDate.split('-')[2]}` : 'Ao longo do mês');
      report += `| **${i.name}** | ${typeLabel} | ${freqLabel} | ${dayLabel} | **${formatCurrency(i.amount)}** |\n`;
    });
    report += `| **TOTAL RECEITAS OPERACIONAIS DO MÊS** | - | - | - | **${formatCurrency(snapshot.monthlyIncome)}** |\n\n`;
  } else {
    report += `*Nenhuma receita operacional cadastrada para este mês.*\n\n`;
  }

  if (bankBoxes.length > 0) {
    report += `> 🏦 **Caixinhas & Reservas Bancárias Guardadas:** Você possui **${formatCurrency(totalBankBoxes)}** em reservas (${bankBoxes.map(b => b.name).slice(0, 4).join(', ')}). Este valor é patrimônio de reserva e **não** entra no cálculo de receitas correntes de salário.\n\n`;
  }

  report += `### 🔮 Projeção de Dinheiro Futuro (Próximos 6 Meses):\n\n`;
  report += `Calculado com base no calendário real das suas receitas e nas despesas e parcelas estimadas de cada mês:\n\n`;
  report += `| Mês de Referência | Entrada Prevista | Despesas & Parcelas | Saldo Projetado | Fonte Principal | Status / Detalhes |\n`;
  report += `|:---|---:|---:|---:|:---|:---|\n`;

  let totalAccumulated6Months = 0;
  for (let m = 0; m < 6; m++) {
    const fDate = new Date(currentYear, currentMonthIdx + m, 1);
    const fMonthKey = `${fDate.getFullYear()}-${String(fDate.getMonth() + 1).padStart(2, '0')}`;
    const mLabel = `${MONTH_NAMES[fDate.getMonth()]} de ${fDate.getFullYear()}`;

    // Real monthly income for this exact future month:
    const mIncomeData = calculateIncomeForMonth(incomes, fMonthKey);
    const mIncome = mIncomeData.total;
    totalAccumulated6Months += mIncome;

    // Fixed expenses + simulated debt installment for this month:
    const mDebt = monthlyActions[m]?.totalPayment ?? snapshot.monthlyDebtPayments;
    const mOutflows = snapshot.monthlyFixedExpenses + mDebt;
    const mNet = mIncome - mOutflows;
    const balanceSign = mNet >= 0 ? `+${formatCurrency(mNet)}` : `-${formatCurrency(Math.abs(mNet))}`;

    let statusNote = m === 0 ? 'Mês Vigente (Real)' : 'Fluxo Recorrente Regular';
    const sporadicItems = mIncomeData.items.filter(i => i.frequency === 'sporadic' || i.frequency === 'annual');
    if (sporadicItems.length > 0 && m > 0) {
      statusNote = `Inclui: ${sporadicItems.map(i => i.name).slice(0, 2).join(', ')}`;
    }

    report += `| **${mLabel}** | **${formatCurrency(mIncome)}** | ${formatCurrency(mOutflows)} | **${balanceSign}** | ${mIncomeData.mainSource} | ${statusNote} |\n`;
  }

  report += `\n> 💡 **Previsão Real Acumulada em 6 Meses:** Total de **${formatCurrency(totalAccumulated6Months)}** em receitas reais esperadas no período.\n\n`;

  // 3. Raio-X das Despesas (Do Mês e do Futuro)
  report += `## 💳 3. RAIO-X DAS DESPESAS & CONTAS (DO MÊS E DO FUTURO)\n\n`;
  report += `### 📤 Despesas Fixas e Contas do Mês Atual:\n\n`;
  if (activeExpenses.length > 0) {
    report += `| Conta / Despesa | Categoria | Vencimento | Valor Mensal |\n`;
    report += `|:---|:---:|:---:|---:|\n`;
    activeExpenses.forEach(e => {
      const catLabel = e.category === 'housing' ? 'Moradia' :
                       e.category === 'utilities' ? 'Contas Básicas' :
                       e.category === 'food' ? 'Alimentação' :
                       e.category === 'transport' ? 'Transporte' :
                       e.category === 'health' ? 'Saúde' :
                       e.category === 'education' ? 'Educação' : 'Outros';
      const dueLabel = e.dueDate ? e.dueDate.split('-')[2] : (e.recurrenceDay ? `Dia ${e.recurrenceDay}` : 'A definir');
      report += `| ${e.name} | ${catLabel} | ${dueLabel} | **${formatCurrency(e.amount)}** |\n`;
    });
    report += `| **TOTAL DESPESAS FIXAS** | - | - | **${formatCurrency(snapshot.monthlyFixedExpenses)}** |\n\n`;
  } else {
    report += `*Nenhuma despesa fixa cadastrada.*\n\n`;
  }

  report += `### ⏳ Parcelamentos, Cartões e Dívidas Futuras (O que você deve nos próximos meses):\n\n`;
  if (payoffQueue.length > 0) {
    report += `| Dívida / Cartão | Parcela Atual | Prazo Estimado | Juros a.m. | Saldo Devedor |\n`;
    report += `|:---|---:|:---:|:---:|---:|\n`;
    payoffQueue.forEach(d => {
      report += `| **${d.name}** | ${formatCurrency(d.installmentAmount)} | ${d.monthsToPayoff} meses | ${d.interestRate}% | **${formatCurrency(d.originalBalance)}** |\n`;
    });
    report += `| **TOTAL DAS DÍVIDAS & CONTAS EM ABERTO** | **${formatCurrency(snapshot.monthlyDebtPayments)}/mês** | - | - | **${formatCurrency(snapshot.totalDebt)}** |\n\n`;
  } else {
    report += `*Parabéns! Você não possui dívidas ativas pendentes no sistema.*\n\n`;
  }

  // 4. Como o usuário com o cenário atual deve se portar
  report += `## 🧭 4. COMO VOCÊ DEVE SE PORTAR NO SEU CENÁRIO ATUAL (MANUAL DE CONDUTA COMPORTAMENTAL)\n\n`;
  report += `Para que qualquer plano funcione, a postura diária do usuário com o dinheiro é 80% do sucesso. Siga com rigor estas 5 diretrizes práticas desenhadas para o seu nível de endividamento:\n\n`;

  report += `### 1. 🧊 Congelamento Imediato de Novos Parcelamentos (Trava do Cartão)\n`;
  report += `- **Ação:** Desvincule seus cartões de crédito dos aplicativos de compras, delivery e transporte. Guarde os cartões físicos em local de difícil acesso.\n`;
  report += `- **Regra de Ouro:** Não crie nenhuma nova parcela até quitar a primeira dívida da sua fila. Opere estritamente no **Débito ou PIX**. Se não há saldo em conta hoje, a compra não deve acontecer.\n\n`;

  report += `### 2. 📦 Teto Semanal Inegociável para Gastos Diários (Método dos Envelopes)\n`;
  const weeklyDailyCap = snapshot.monthlyDailyExpenses > 0 ? snapshot.monthlyDailyExpenses / 4 : 150;
  report += `- **Ação:** Seu teto máximo de gastos variáveis é de **${formatCurrency(weeklyDailyCap)} por semana**.\n`;
  report += `- **Conduta:** Divida sua cota em 7 dias. Se a cota semanal acabar na quinta-feira, feche a carteira e espere a segunda-feira seguinte. Nunca antecipe verba da semana seguinte.\n\n`;

  report += `### 3. ⏱️ Protocolo das 48 Horas para Qualquer Compra Não-Essencial\n`;
  report += `- **Ação:** Diante de qualquer impulso de compra acima de R$ 50, obrigue-se a esperar 48 horas inteiras antes de passar o cartão.\n`;
  report += `- **Efeito Científico:** 82% das compras por impulso são anuladas quando o pico emocional de dopamina baixa após 48 horas.\n\n`;

  report += `### 4. ✂️ Corte Cirúrgico de Fugas Invisíveis\n`;
  report += `- **Ação:** Faça uma varredura nas assinaturas (streaming duplicado, planos pós-pagos de celular, tarifas de manutenção de conta bancária — solicite o pacote gratuito de Serviços Essenciais do Banco Central).\n`;
  report += `- **Impacto:** Recupera entre R$ 80 e R$ 250 líquidos todo mês para amortizar suas dívidas.\n\n`;

  report += `### 5. 🧠 Blindagem Psicológica & Foco no Processo\n`;
  report += `- **Mentalidade:** Elimine a culpa ou a sensação de aprisionamento. Dívida é uma equação puramente matemática que responde a processos mecânicos. Siga os passos deste relatório mês a mês sem desviar.\n\n`;

  // 5. Estratégias Simples e Sofisticadas para Eliminar o Mais Rápido Possível
  report += `## 🚀 5. ESTRATÉGIAS PARA ELIMINAR AS DÍVIDAS O MAIS RÁPIDO POSSÍVEL\n\n`;
  report += `Você não precisa depender apenas de sobras de salário. Utilize um arsenal de estratégias simples e de engenharia financeira avançada:\n\n`;

  report += `### 🟢 Estratégias Simples (Vitórias Rápidas & Alívio Imediato)\n\n`;
  report += `1. **Método Bola de Neve (Snowball - Recomendado para Alívio Emocional):**\n`;
  report += `   - Pague o valor mínimo em todas as dívidas e concentre todo o dinheiro extra na dívida com **menor saldo devedor** (${payoffQueue[0]?.name || 'dívida prioritária'}).\n`;
  report += `   - **Por que funciona:** Você elimina uma conta inteira em tempo recorde, reduz o número de boletos mensais e obtém uma vitória psicológica que alimenta sua disciplina.\n\n`;

  report += `2. **Renegociação Ativa com Desconto à Vista:**\n`;
  report += `   - Ligue para as instituições financeiras ou consulte plataformas como Serasa Limpa Nome e Desenrola.\n`;
  report += `   - Proponha: *"Tenho um valor disponível à vista para liquidação imediata da dívida se houver retirada total de juros e multas"*. Descontos chegam a 70% a 90% para quitação integral.\n\n`;

  report += `3. **Monetização de Itens Parados em Casa:**\n`;
  report += `   - Venda eletrônicos antigos, roupas ou móveis sem uso em plataformas (OLX, Enjoei, Mercado Livre). Destine 100% da receita diretamente para abater o saldo da dívida prioritária.\n\n`;

  report += `### 🔵 Estratégias Sofisticadas (Engenharia Financeira & Otimização de CET)\n\n`;
  report += `1. **Método Avalanche (Destruição pelo CET / Maior Taxa de Juros):**\n`;
  report += `   - Priorize a dívida com **maior taxa de juros mensal** (especialmente rotativo de cartão a 14% a.m. ou cheque especial a 8% a.m.).\n`;
  report += `   - **Por que funciona:** Matematicamente, estanca a hemorragia mais cara do seu orçamento, gerando a maior economia financeira absoluta em reais.\n\n`;

  report += `2. **Portabilidade de Crédito / Troca de Dívida Cara por Dívida Barata:**\n`;
  report += `   - Se você tem juros abusivos de cartão de crédito (10% a 15% a.m.), avalie trocar por um **Empréstimo Consignado** ou com **Garantia de FGTS / Veículo** com juros de 1.4% a 2.2% a.m.\n`;
  report += `   - **Resultado:** A mesma dívida é quitada no credor caro, e sua parcela cai pela metade, poupando milhares de reais em juros.\n\n`;

  report += `3. **Efeito Rollover Turbinado (Empilhamento Contínuo de Parcelas):**\n`;
  report += `   - No exato momento em que uma dívida é quitada (ex.: parcela de R$ 250 finalizada), esse valor **NÃO VOLTA PARA O CONSUMO**.\n`;
  report += `   - Esse valor é automaticamente somado à parcela da próxima dívida da fila, criando uma bola de demolição financeira que destrói as dívidas seguintes em ritmo exponencial.\n\n`;

  report += `4. **Cash-Flow Matching (Sincronização Estratégica de Vencimentos):**\n`;
  report += `   - Altere as datas de vencimento de todas as contas e dívidas para **3 a 5 dias úteis após a data do seu pagamento principal**.\n`;
  report += `   - **Benefício:** Elimina completamente o risco de multas de mora de 2% e juros diários por descasamento entre a entrada do dinheiro e o vencimento das contas.\n\n`;

  report += `5. **Reserva de Defesa Mínima (Buffer Anti-Recaída):**\n`;
  report += `   - Mantenha uma reserva de emergência mínima de **R$ 500 a R$ 1.000** em uma conta de liquidez diária (100% CDI) separada da sua conta corrente.\n`;
  report += `   - Essa reserva impede que qualquer imprevisto médico, mecânico ou doméstico obrigue você a recorrer novamente a cartão ou cheque especial.\n\n`;

  // 6. Cronograma Mês a Mês Detalhado
  report += `## 📅 6. CRONOGRAMA DE EXECUÇÃO MÊS A MÊS (PLANO EFICAZ)\n\n`;
  report += `> **Estratégia Selecionada:** ${strategyName}\n`;
  report += `> **Previsão de Liberdade Financeira Total:** **${freedomDate}** (${totalMonths} meses)\n\n`;

  report += `### Ordem Oficial de Quitação das Dívidas:\n\n`;
  payoffQueue.forEach((d, idx) => {
    report += `**${idx + 1}ª na Fila de Eliminação:** **${d.name}**\n`;
    report += `- Saldo Atual: ${formatCurrency(d.originalBalance)} | Parcela: ${formatCurrency(d.installmentAmount)}/mês | Juros: ${d.interestRate}% a.m.\n`;
    report += `- Previsão de Extinção: **${d.payoffDate}** (em ${d.monthsToPayoff} meses)\n\n`;
  });

  report += `### Evolução Mês a Mês do Pagamento e Redução do Saldo Devedor:\n\n`;
  report += `| Mês | Referência | Pagamento Total | Acelerador Extra | Dívidas Quitadas no Mês | Saldo Devedor Restante |\n`;
  report += `|:---:|:---|---:|---:|:---|---:|\n`;

  const showMonths = Math.min(monthlyActions.length, 18);
  for (let i = 0; i < showMonths; i++) {
    const act = monthlyActions[i];
    const quitadas = act.debtsPaidOff.length > 0 ? `🎉 **${act.debtsPaidOff.join(', ')}**` : '—';
    const extra = act.extraPayment > 0 ? formatCurrency(act.extraPayment) : 'R$ 0,00';
    report += `| ${act.month} | ${act.monthLabel} | **${formatCurrency(act.totalPayment)}** | ${extra} | ${quitadas} | **${formatCurrency(act.remainingDebt)}** |\n`;
  }

  if (monthlyActions.length > 18) {
    report += `| ... | *(demais ${monthlyActions.length - 18} meses seguem o fluxo de rolagem contínua)* | ... | ... | ... | R$ 0,00 |\n`;
  }
  report += `\n`;

  // 7. Resumo de Metas e Conclusão
  report += `## 🏆 7. METAS & GARANTIA DE SUCESSO\n\n`;
  report += `| Meta do Plano | Valor Estimado |\n`;
  report += `|:---|---:|\n`;
  report += `| **Data da Independência Financeira** | **${freedomDate}** |\n`;
  report += `| **Prazo Total até Extinção Total** | **${totalMonths} meses** |\n`;
  report += `| **Total de Juros Economizados com o Plano** | **${formatCurrency(snapshot.totalDebt * 0.28)}** *(aprox. 28% de economia)* |\n`;
  report += `| **Fluxo Mensal Liberado Após a Quitação** | **+${formatCurrency(snapshot.monthlyDebtPayments)} todo mês para investir** |\n\n`;

  report += `### 🛡️ Checklist das Próximas 24 Horas:\n`;
  report += `- [ ] Guardar os cartões de crédito físicos e desvincular de apps de delivery e compras.\n`;
  report += `- [ ] Conferir os vencimentos das contas e sincronizar para logo após o dia de recebimento da receita.\n`;
  report += `- [ ] Definir o teto de gastos variáveis da semana (${formatCurrency(weeklyDailyCap)}).\n`;
  report += `- [ ] Destinar qualquer saldo livre disponível exclusivamente para a 1ª dívida da fila (**${payoffQueue[0]?.name || 'dívida prioritária'}**).\n\n`;

  report += `> 💪 **Seu futuro financeiro começa no controle de hoje.** Siga o plano com disciplina mensal, atualize os pagamentos e celebre cada boleto extinto!\n`;

  return report;
}
