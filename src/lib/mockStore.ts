// Standalone mock store with full CRUD & localStorage persistence for zero-config demo mode
import { User } from '@supabase/supabase-js';

const DEMO_USER_ID = 'demo-user-123';

export const DEMO_USER: User = {
  id: DEMO_USER_ID,
  app_metadata: { provider: 'email' },
  user_metadata: {
    name: 'Lino Botelho',
    full_name: 'Lino Botelho',
    avatar_url: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?q=80&w=150&auto=format&fit=crop'
  },
  aud: 'authenticated',
  created_at: new Date().toISOString(),
  email: 'lino.demo@saldopositivo.app',
  phone: '',
  role: 'authenticated',
  updated_at: new Date().toISOString(),
};

const now = new Date();
const currentYear = now.getFullYear();
const currentMonth = now.getMonth();
const formatMonthDate = (day: number) => {
  const d = new Date(currentYear, currentMonth, day);
  return d.toISOString().split('T')[0];
};

const INITIAL_DEBTS = [
  {
    id: 'debt-div',
    userId: DEMO_USER_ID,
    name: 'Empréstimo DIV',
    totalAmount: 8507.05,
    remainingAmount: 1320.52,
    installmentAmount: 654.66,
    type: 'variable',
    category: 'loan',
    interestRate: 2.5,
    dueDate: '2026-10-10',
    totalInstallments: 12,
    paidInstallments: 10,
    isPaid: false,
    paymentDate: null,
    isActive: true,
    createdAt: new Date('2026-01-01').toISOString(),
    updatedAt: new Date().toISOString()
  },
  {
    id: 'debt-luz',
    userId: DEMO_USER_ID,
    name: 'Conta de Luz',
    totalAmount: 2626.33,
    remainingAmount: 260.00,
    installmentAmount: 260.00,
    type: 'monthly',
    category: 'monthly_bill',
    interestRate: 1.0,
    dueDate: '2026-11-15',
    totalInstallments: 12,
    paidInstallments: 10,
    isPaid: false,
    paymentDate: null,
    isActive: true,
    createdAt: new Date('2026-01-01').toISOString(),
    updatedAt: new Date().toISOString()
  },
  {
    id: 'debt-agua',
    userId: DEMO_USER_ID,
    name: 'Conta de Água',
    totalAmount: 697.33,
    remainingAmount: 50.00,
    installmentAmount: 50.00,
    type: 'monthly',
    category: 'monthly_bill',
    interestRate: 1.0,
    dueDate: '2026-11-15',
    totalInstallments: 11,
    paidInstallments: 9,
    isPaid: false,
    paymentDate: null,
    isActive: true,
    createdAt: new Date('2026-02-01').toISOString(),
    updatedAt: new Date().toISOString()
  },
  {
    id: 'debt-internet',
    userId: DEMO_USER_ID,
    name: 'Internet Vivo',
    totalAmount: 1128.82,
    remainingAmount: 100.00,
    installmentAmount: 100.00,
    type: 'monthly',
    category: 'monthly_bill',
    interestRate: 1.0,
    dueDate: '2026-11-20',
    totalInstallments: 12,
    paidInstallments: 10,
    isPaid: false,
    paymentDate: null,
    isActive: true,
    createdAt: new Date('2026-01-01').toISOString(),
    updatedAt: new Date().toISOString()
  },
  {
    id: 'debt-celular',
    userId: DEMO_USER_ID,
    name: 'Celular Mensal Linc',
    totalAmount: 92.97,
    remainingAmount: 61.98,
    installmentAmount: 30.99,
    type: 'monthly',
    category: 'monthly_bill',
    interestRate: 1.0,
    dueDate: '2026-11-20',
    totalInstallments: 3,
    paidInstallments: 1,
    isPaid: false,
    paymentDate: null,
    isActive: true,
    createdAt: new Date('2026-10-01').toISOString(),
    updatedAt: new Date().toISOString()
  }
];

const INITIAL_INCOMES = [
  {
    id: 'inc-salario',
    userId: DEMO_USER_ID,
    name: 'Salário Mensal (PAG)',
    amount: 2636.04,
    frequency: 'monthly',
    recurrenceDay: 5,
    isActive: true,
    createdAt: new Date('2026-01-01').toISOString(),
    updatedAt: new Date().toISOString()
  },
  {
    id: 'inc-vale',
    userId: DEMO_USER_ID,
    name: 'Adiantamento Vale (VALE)',
    amount: 1250.00,
    frequency: 'monthly',
    recurrenceDay: 20,
    isActive: true,
    createdAt: new Date('2026-01-01').toISOString(),
    updatedAt: new Date().toISOString()
  }
];

const INITIAL_EXPENSES = [
  {
    id: 'exp-bebidas',
    userId: DEMO_USER_ID,
    name: 'Bebidas (Novembro)',
    amount: 1600.00,
    category: 'food',
    recurrenceDay: 1,
    isActive: true,
    createdAt: new Date('2026-11-01').toISOString(),
    updatedAt: new Date().toISOString()
  },
  {
    id: 'exp-luz-previsao',
    userId: DEMO_USER_ID,
    name: 'Conta de Luz',
    amount: 260.00,
    category: 'utilities',
    recurrenceDay: 15,
    isActive: true,
    createdAt: new Date('2026-01-01').toISOString(),
    updatedAt: new Date().toISOString()
  },
  {
    id: 'exp-agua-previsao',
    userId: DEMO_USER_ID,
    name: 'Conta de Água',
    amount: 50.00,
    category: 'utilities',
    recurrenceDay: 15,
    isActive: true,
    createdAt: new Date('2026-01-01').toISOString(),
    updatedAt: new Date().toISOString()
  },
  {
    id: 'exp-internet-previsao',
    userId: DEMO_USER_ID,
    name: 'Internet Vivo',
    amount: 100.00,
    category: 'utilities',
    recurrenceDay: 20,
    isActive: true,
    createdAt: new Date('2026-01-01').toISOString(),
    updatedAt: new Date().toISOString()
  },
  {
    id: 'exp-celular-previsao',
    userId: DEMO_USER_ID,
    name: 'Celular Mensal Linc',
    amount: 30.99,
    category: 'utilities',
    recurrenceDay: 20,
    isActive: true,
    createdAt: new Date('2026-01-01').toISOString(),
    updatedAt: new Date().toISOString()
  }
];

const INITIAL_DAILY = [
  { id: 'daily-1', userId: DEMO_USER_ID, description: 'Supermercado e Padaria', amount: 85.00, category: 'alimentacao', date: formatMonthDate(2), createdAt: new Date().toISOString() },
  { id: 'daily-2', userId: DEMO_USER_ID, description: 'Transporte e Combustível', amount: 50.00, category: 'transporte', date: formatMonthDate(5), createdAt: new Date().toISOString() },
  { id: 'daily-3', userId: DEMO_USER_ID, description: 'Farmácia', amount: 35.00, category: 'saude', date: formatMonthDate(10), createdAt: new Date().toISOString() }
];

const INITIAL_BUDGETS = [
  { id: 'b-1', userId: DEMO_USER_ID, category: 'utilities', monthlyLimit: 500, month: currentMonth + 1, year: currentYear, isActive: true, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() },
  { id: 'b-2', userId: DEMO_USER_ID, category: 'food', monthlyLimit: 2000, month: currentMonth + 1, year: currentYear, isActive: true, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() }
];

const INITIAL_GOALS = [
  {
    id: 'goal-1',
    userId: DEMO_USER_ID,
    name: 'Quitar Contas em Aberto e Ficar no Verde',
    description: 'Eliminar os saldos restantes de 2026',
    targetAmount: 2202.50,
    currentAmount: 11418.01,
    priority: 'high',
    category: 'emergency',
    deadline: `2026-12-31`,
    isCompleted: false,
    completedAt: null,
    isActive: true,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  }
];

const INITIAL_PAYMENTS = [
  // DIV Pagas (Janeiro a Outubro de 2026 - Verde)
  { id: 'pay-div-1', userId: DEMO_USER_ID, debtId: 'debt-div', debtName: 'Empréstimo DIV', amountPaid: 668.93, paymentDate: '2026-01-10T12:00:00Z', note: 'Parcela Jan/2026 paga', createdAt: '2026-01-10T12:00:00Z' },
  { id: 'pay-div-2', userId: DEMO_USER_ID, debtId: 'debt-div', debtName: 'Empréstimo DIV', amountPaid: 668.61, paymentDate: '2026-02-10T12:00:00Z', note: 'Parcela Fev/2026 paga', createdAt: '2026-02-10T12:00:00Z' },
  { id: 'pay-div-3', userId: DEMO_USER_ID, debtId: 'debt-div', debtName: 'Empréstimo DIV', amountPaid: 693.16, paymentDate: '2026-03-10T12:00:00Z', note: 'Parcela Mar/2026 paga', createdAt: '2026-03-10T12:00:00Z' },
  { id: 'pay-div-4', userId: DEMO_USER_ID, debtId: 'debt-div', debtName: 'Empréstimo DIV', amountPaid: 761.58, paymentDate: '2026-04-10T12:00:00Z', note: 'Parcela Abr/2026 paga', createdAt: '2026-04-10T12:00:00Z' },
  { id: 'pay-div-5', userId: DEMO_USER_ID, debtId: 'debt-div', debtName: 'Empréstimo DIV', amountPaid: 785.00, paymentDate: '2026-05-10T12:00:00Z', note: 'Parcela Mai/2026 paga', createdAt: '2026-05-10T12:00:00Z' },
  { id: 'pay-div-6', userId: DEMO_USER_ID, debtId: 'debt-div', debtName: 'Empréstimo DIV', amountPaid: 785.21, paymentDate: '2026-06-10T12:00:00Z', note: 'Parcela Jun/2026 paga', createdAt: '2026-06-10T12:00:00Z' },
  { id: 'pay-div-7', userId: DEMO_USER_ID, debtId: 'debt-div', debtName: 'Empréstimo DIV', amountPaid: 792.42, paymentDate: '2026-07-10T12:00:00Z', note: 'Parcela Jul/2026 paga', createdAt: '2026-07-10T12:00:00Z' },
  { id: 'pay-div-8', userId: DEMO_USER_ID, debtId: 'debt-div', debtName: 'Empréstimo DIV', amountPaid: 682.29, paymentDate: '2026-08-10T12:00:00Z', note: 'Parcela Ago/2026 paga', createdAt: '2026-08-10T12:00:00Z' },
  { id: 'pay-div-9', userId: DEMO_USER_ID, debtId: 'debt-div', debtName: 'Empréstimo DIV', amountPaid: 682.59, paymentDate: '2026-09-10T12:00:00Z', note: 'Parcela Set/2026 paga', createdAt: '2026-09-10T12:00:00Z' },
  { id: 'pay-div-10', userId: DEMO_USER_ID, debtId: 'debt-div', debtName: 'Empréstimo DIV', amountPaid: 666.74, paymentDate: '2026-10-10T12:00:00Z', note: 'Parcela Out/2026 paga', createdAt: '2026-10-10T12:00:00Z' },

  // Luz Pagas (Janeiro a Outubro de 2026 - Verde)
  { id: 'pay-luz-1', userId: DEMO_USER_ID, debtId: 'debt-luz', debtName: 'Conta de Luz', amountPaid: 149.75, paymentDate: '2026-01-15T12:00:00Z', note: 'Luz Jan paga', createdAt: '2026-01-15T12:00:00Z' },
  { id: 'pay-luz-2', userId: DEMO_USER_ID, debtId: 'debt-luz', debtName: 'Conta de Luz', amountPaid: 144.43, paymentDate: '2026-02-15T12:00:00Z', note: 'Luz Fev paga', createdAt: '2026-02-15T12:00:00Z' },
  { id: 'pay-luz-3', userId: DEMO_USER_ID, debtId: 'debt-luz', debtName: 'Conta de Luz', amountPaid: 167.97, paymentDate: '2026-03-15T12:00:00Z', note: 'Luz Mar paga', createdAt: '2026-03-15T12:00:00Z' },
  { id: 'pay-luz-4', userId: DEMO_USER_ID, debtId: 'debt-luz', debtName: 'Conta de Luz', amountPaid: 140.13, paymentDate: '2026-04-15T12:00:00Z', note: 'Luz Abr paga', createdAt: '2026-04-15T12:00:00Z' },
  { id: 'pay-luz-5', userId: DEMO_USER_ID, debtId: 'debt-luz', debtName: 'Conta de Luz', amountPaid: 273.63, paymentDate: '2026-05-15T12:00:00Z', note: 'Luz Mai paga', createdAt: '2026-05-15T12:00:00Z' },
  { id: 'pay-luz-6', userId: DEMO_USER_ID, debtId: 'debt-luz', debtName: 'Conta de Luz', amountPaid: 207.58, paymentDate: '2026-06-15T12:00:00Z', note: 'Luz Jun paga', createdAt: '2026-06-15T12:00:00Z' },
  { id: 'pay-luz-7', userId: DEMO_USER_ID, debtId: 'debt-luz', debtName: 'Conta de Luz', amountPaid: 259.76, paymentDate: '2026-07-15T12:00:00Z', note: 'Luz Jul paga', createdAt: '2026-07-15T12:00:00Z' },
  { id: 'pay-luz-8', userId: DEMO_USER_ID, debtId: 'debt-luz', debtName: 'Conta de Luz', amountPaid: 256.54, paymentDate: '2026-08-15T12:00:00Z', note: 'Luz Ago paga', createdAt: '2026-08-15T12:00:00Z' },
  { id: 'pay-luz-9', userId: DEMO_USER_ID, debtId: 'debt-luz', debtName: 'Conta de Luz', amountPaid: 258.64, paymentDate: '2026-09-15T12:00:00Z', note: 'Luz Set paga', createdAt: '2026-09-15T12:00:00Z' },
  { id: 'pay-luz-10', userId: DEMO_USER_ID, debtId: 'debt-luz', debtName: 'Conta de Luz', amountPaid: 247.90, paymentDate: '2026-10-15T12:00:00Z', note: 'Luz Out paga', createdAt: '2026-10-15T12:00:00Z' },

  // Água Pagas (Fevereiro a Outubro de 2026 - Verde)
  { id: 'pay-agua-1', userId: DEMO_USER_ID, debtId: 'debt-agua', debtName: 'Conta de Água', amountPaid: 182.33, paymentDate: '2026-02-15T12:00:00Z', note: 'Água Fev paga', createdAt: '2026-02-15T12:00:00Z' },
  { id: 'pay-agua-2', userId: DEMO_USER_ID, debtId: 'debt-agua', debtName: 'Conta de Água', amountPaid: 91.33, paymentDate: '2026-03-15T12:00:00Z', note: 'Água Mar paga', createdAt: '2026-03-15T12:00:00Z' },
  { id: 'pay-agua-3', userId: DEMO_USER_ID, debtId: 'debt-agua', debtName: 'Conta de Água', amountPaid: 109.01, paymentDate: '2026-04-15T12:00:00Z', note: 'Água Abr paga', createdAt: '2026-04-15T12:00:00Z' },
  { id: 'pay-agua-4', userId: DEMO_USER_ID, debtId: 'debt-agua', debtName: 'Conta de Água', amountPaid: 24.60, paymentDate: '2026-05-15T12:00:00Z', note: 'Água Mai paga', createdAt: '2026-05-15T12:00:00Z' },
  { id: 'pay-agua-5', userId: DEMO_USER_ID, debtId: 'debt-agua', debtName: 'Conta de Água', amountPaid: 25.00, paymentDate: '2026-06-15T12:00:00Z', note: 'Água Jun paga', createdAt: '2026-06-15T12:00:00Z' },
  { id: 'pay-agua-6', userId: DEMO_USER_ID, debtId: 'debt-agua', debtName: 'Conta de Água', amountPaid: 37.94, paymentDate: '2026-07-15T12:00:00Z', note: 'Água Jul paga', createdAt: '2026-07-15T12:00:00Z' },
  { id: 'pay-agua-7', userId: DEMO_USER_ID, debtId: 'debt-agua', debtName: 'Conta de Água', amountPaid: 49.20, paymentDate: '2026-08-15T12:00:00Z', note: 'Água Ago paga', createdAt: '2026-08-15T12:00:00Z' },
  { id: 'pay-agua-8', userId: DEMO_USER_ID, debtId: 'debt-agua', debtName: 'Conta de Água', amountPaid: 44.20, paymentDate: '2026-09-15T12:00:00Z', note: 'Água Set paga', createdAt: '2026-09-15T12:00:00Z' },
  { id: 'pay-agua-9', userId: DEMO_USER_ID, debtId: 'debt-agua', debtName: 'Conta de Água', amountPaid: 33.72, paymentDate: '2026-10-15T12:00:00Z', note: 'Água Out paga', createdAt: '2026-10-15T12:00:00Z' },

  // Internet Vivo Pagas (Janeiro a Outubro de 2026 - Verde)
  { id: 'pay-net-1', userId: DEMO_USER_ID, debtId: 'debt-internet', debtName: 'Internet Vivo', amountPaid: 122.90, paymentDate: '2026-01-20T12:00:00Z', note: 'Internet Jan paga', createdAt: '2026-01-20T12:00:00Z' },
  { id: 'pay-net-2', userId: DEMO_USER_ID, debtId: 'debt-internet', debtName: 'Internet Vivo', amountPaid: 122.90, paymentDate: '2026-02-20T12:00:00Z', note: 'Internet Fev paga', createdAt: '2026-02-20T12:00:00Z' },
  { id: 'pay-net-3', userId: DEMO_USER_ID, debtId: 'debt-internet', debtName: 'Internet Vivo', amountPaid: 120.63, paymentDate: '2026-03-20T12:00:00Z', note: 'Internet Mar paga', createdAt: '2026-03-20T12:00:00Z' },
  { id: 'pay-net-4', userId: DEMO_USER_ID, debtId: 'debt-internet', debtName: 'Internet Vivo', amountPaid: 122.90, paymentDate: '2026-04-20T12:00:00Z', note: 'Internet Abr paga', createdAt: '2026-04-20T12:00:00Z' },
  { id: 'pay-net-5', userId: DEMO_USER_ID, debtId: 'debt-internet', debtName: 'Internet Vivo', amountPaid: 122.90, paymentDate: '2026-05-20T12:00:00Z', note: 'Internet Mai paga', createdAt: '2026-05-20T12:00:00Z' },
  { id: 'pay-net-6', userId: DEMO_USER_ID, debtId: 'debt-internet', debtName: 'Internet Vivo', amountPaid: 19.36, paymentDate: '2026-06-20T12:00:00Z', note: 'Internet Jun paga', createdAt: '2026-06-20T12:00:00Z' },
  { id: 'pay-net-7', userId: DEMO_USER_ID, debtId: 'debt-internet', debtName: 'Internet Vivo', amountPaid: 100.00, paymentDate: '2026-07-20T12:00:00Z', note: 'Internet Jul paga', createdAt: '2026-07-20T12:00:00Z' },
  { id: 'pay-net-8', userId: DEMO_USER_ID, debtId: 'debt-internet', debtName: 'Internet Vivo', amountPaid: 100.00, paymentDate: '2026-08-20T12:00:00Z', note: 'Internet Ago paga', createdAt: '2026-08-20T12:00:00Z' },
  { id: 'pay-net-9', userId: DEMO_USER_ID, debtId: 'debt-internet', debtName: 'Internet Vivo', amountPaid: 100.00, paymentDate: '2026-09-20T12:00:00Z', note: 'Internet Set paga', createdAt: '2026-09-20T12:00:00Z' },
  { id: 'pay-net-10', userId: DEMO_USER_ID, debtId: 'debt-internet', debtName: 'Internet Vivo', amountPaid: 97.23, paymentDate: '2026-10-20T12:00:00Z', note: 'Internet Out paga', createdAt: '2026-10-20T12:00:00Z' },

  // Celular Mensal Linc Paga (Outubro de 2026 - Verde)
  { id: 'pay-cel-1', userId: DEMO_USER_ID, debtId: 'debt-celular', debtName: 'Celular Mensal Linc', amountPaid: 30.99, paymentDate: '2026-10-20T12:00:00Z', note: 'Celular Out paga', createdAt: '2026-10-20T12:00:00Z' }
];

const INITIAL_PLANS = [
  {
    id: 'plan-1',
    userId: DEMO_USER_ID,
    strategy: 'snowball',
    monthlyIncome: 8300,
    monthlyExpenses: 4500,
    freeCash: 1640,
    isActive: true,
    createdAt: new Date(Date.now() - 2 * 86400000).toISOString(),
    planContent: `## 📊 RAIO-X FINANCEIRO
- **Receita Mensal Total**: R$ 8.300,00
- **Despesas Fixas**: R$ 4.500,00
- **Parcelas de Dívidas**: R$ 2.160,00
- **Saldo Livre Real Estimado**: R$ 1.640,00
- **Comprometimento de Renda**: 26% com parcelas (Zona de Atenção, abaixo do limite crítico de 35%).

## ✂️ ONDE CORTAR E OTIMIZAR
1. **Lazer e Alimentação Fora de Casa**: Reduzir 15% nos pedidos de delivery gera uma economia imediata de R$ 200/mês.
2. **Cheque Especial Santander**: Juros de 14,2% a.m. são altíssimos. É prioridade zero de amortização.
3. **Cartão Nubank**: Evitar novos parcelamentos até liquidar o saldo remanescente.

## 🎯 PLANO DE ATAQUE: BOLA DE NEVE
1. **Passo 1**: Quite o **Cheque Especial Santander (Saldo: R$ 1.200)** em menos de 1 mês utilizando o Saldo Livre disponível de R$ 1.640.
2. **Passo 2**: Elimine o **Cartão Nubank (Saldo: R$ 3.200)** em 2 meses redirecionando o saldo livre + a parcela que você deixou de pagar no cheque especial.
3. **Passo 3**: Ataque o **Empréstimo Caixa (Saldo: R$ 8.500)** com amortizações antecipadas de parcelas futuras para abater o juro de 4,8% a.m.

## 💡 ECONOMIA ESTIMADA
Ao seguir esta ordem, você economizará mais de **R$ 3.840,00 em juros** e estará 100% livre de dívidas de curto prazo em até 8 meses!

## 🚀 PRÓXIMOS PASSOS (AÇÃO IMEDIATA)
1. Efetue a amortização total do Cheque Especial ainda esta semana.
2. Não utilize o limite de crédito rotativo no próximo mês.
3. Transfira o valor economizado das parcelas para a Reserva de Emergência.`
  }
];

class MockStorage {
  private getStorageKey(table: string): string {
    return `sp_demo_${table}`;
  }

  getItems(table: string): any[] {
    if (typeof window !== 'undefined') {
      const stored = localStorage.getItem('sp_demo_version');
      const CANONICAL = 'v6_demo_canonical';
      // Reset if version mismatch (forces fresh seed on version bump)
      if (!stored || stored !== CANONICAL) {
        this.resetAll();
        localStorage.setItem('sp_demo_version', CANONICAL);
      }
    }

    const raw = localStorage.getItem(this.getStorageKey(table));
    if (raw) {
      try {
        return JSON.parse(raw);
      } catch {
        // Fall back to seed
      }
    }

    let initial: any[] = [];
    switch (table) {
      case 'debts': initial = INITIAL_DEBTS; break;
      case 'incomes': initial = INITIAL_INCOMES; break;
      case 'expenses': initial = INITIAL_EXPENSES; break;
      case 'daily_expenses': initial = INITIAL_DAILY; break;
      case 'budgets': initial = INITIAL_BUDGETS; break;
      case 'financial_goals': initial = INITIAL_GOALS; break;
      case 'payment_logs': initial = INITIAL_PAYMENTS; break;
      case 'ai_plans': initial = INITIAL_PLANS; break;
      case 'custom_categories': initial = []; break;
      default: initial = [];
    }

    this.saveItems(table, initial);
    return initial;
  }

  saveItems(table: string, items: any[]): void {
    localStorage.setItem(this.getStorageKey(table), JSON.stringify(items));
  }

  resetAll(): void {
    const tables = ['debts', 'incomes', 'expenses', 'daily_expenses', 'budgets', 'financial_goals', 'payment_logs', 'ai_plans', 'custom_categories'];
    tables.forEach(t => localStorage.removeItem(this.getStorageKey(t)));
    localStorage.removeItem('sp_demo_version');
  }

  /**
   * Ensures clean demo data is seeded with the canonical demo-user-123 userId.
   * Called when needed to reset to canonical seeded state.
   */
  seedForUser(_userId?: string): void {
    if (typeof window === 'undefined') return;
    const CANONICAL = 'v6_demo_canonical';
    // If already seeded with canonical data, skip
    if (localStorage.getItem('sp_demo_version') === CANONICAL) return;
    // Reset to canonical demo-user-123 data (clear any old user-specific data)
    this.resetAll();
    localStorage.setItem('sp_demo_version', CANONICAL);
    console.log('[MockStore] Canonical demo data seeded (userId: demo-user-123)');
  }
}

export const mockStorage = new MockStorage();

type FilterFn = (item: any) => boolean;

export class MockQueryBuilder implements PromiseLike<{ data: any; error: any }> {
  private tableName: string;
  private filters: FilterFn[] = [];
  private orderCol: string | null = null;
  private orderAsc = true;
  private limitCount: number | null = null;
  private isSingle = false;
  private op: 'select' | 'insert' | 'update' | 'delete' = 'select';
  private insertData: any = null;
  private updateData: any = null;

  constructor(tableName: string) {
    this.tableName = tableName;
  }

  select(_fields?: string): this {
    if (this.op !== 'insert') this.op = 'select';
    return this;
  }

  eq(column: string, value: any): this {
    this.filters.push(item => item[column] === value);
    return this;
  }

  gte(column: string, value: any): this {
    this.filters.push(item => item[column] >= value);
    return this;
  }

  lte(column: string, value: any): this {
    this.filters.push(item => item[column] <= value);
    return this;
  }

  ilike(column: string, pattern: string): this {
    const cleanPattern = pattern.replace(/%/g, '').toLowerCase();
    this.filters.push(item => {
      const val = String(item[column] || '').toLowerCase();
      return val.includes(cleanPattern);
    });
    return this;
  }

  order(column: string, options?: { ascending?: boolean }): this {
    this.orderCol = column;
    this.orderAsc = options?.ascending ?? true;
    return this;
  }

  limit(count: number): this {
    this.limitCount = count;
    return this;
  }

  single(): this {
    this.isSingle = true;
    return this;
  }

  insert(data: any | any[]): this {
    this.op = 'insert';
    this.insertData = Array.isArray(data) ? data : [data];
    return this;
  }

  update(data: any): this {
    this.op = 'update';
    this.updateData = data;
    return this;
  }

  delete(): this {
    this.op = 'delete';
    return this;
  }

  private execute(): { data: any; error: any } {
    let items = mockStorage.getItems(this.tableName);

    if (this.op === 'insert') {
      const insertedList = this.insertData.map((d: any) => ({
        id: d.id || `${this.tableName}-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`,
        userId: d.userId || DEMO_USER_ID,
        createdAt: d.createdAt || new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        ...d,
      }));
      items = [...insertedList, ...items];
      mockStorage.saveItems(this.tableName, items);
      return {
        data: this.isSingle ? insertedList[0] : insertedList,
        error: null,
      };
    }

    if (this.op === 'update') {
      let updatedItem: any = null;
      items = items.map(item => {
        const matches = this.filters.every(f => f(item));
        if (matches) {
          updatedItem = { ...item, ...this.updateData, updatedAt: new Date().toISOString() };
          return updatedItem;
        }
        return item;
      });
      mockStorage.saveItems(this.tableName, items);
      return {
        data: this.isSingle ? updatedItem : (updatedItem ? [updatedItem] : []),
        error: null,
      };
    }

    if (this.op === 'delete') {
      items = items.filter(item => !this.filters.every(f => f(item)));
      mockStorage.saveItems(this.tableName, items);
      return { data: null, error: null };
    }

    // Default SELECT
    let result = items.filter(item => this.filters.every(f => f(item)));

    if (this.orderCol) {
      const col = this.orderCol;
      const asc = this.orderAsc;
      result.sort((a, b) => {
        const valA = a[col];
        const valB = b[col];
        if (valA < valB) return asc ? -1 : 1;
        if (valA > valB) return asc ? 1 : -1;
        return 0;
      });
    }

    if (this.limitCount !== null) {
      result = result.slice(0, this.limitCount);
    }

    return {
      data: this.isSingle ? (result[0] || null) : result,
      error: null,
    };
  }

  then<TResult1 = { data: any; error: any }, TResult2 = never>(
    onfulfilled?: ((value: { data: any; error: any }) => TResult1 | PromiseLike<TResult1>) | null,
    onrejected?: ((reason: any) => TResult2 | PromiseLike<TResult2>) | null
  ): Promise<TResult1 | TResult2> {
    const outcome = this.execute();
    return Promise.resolve(outcome).then(onfulfilled, onrejected);
  }
}
