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
    id: 'debt-1',
    userId: DEMO_USER_ID,
    name: 'Cartão de Crédito Nubank',
    totalAmount: 4800,
    remainingAmount: 3200,
    installmentAmount: 450,
    type: 'variable',
    interestRate: 12.5,
    dueDate: '10',
    totalInstallments: 12,
    paidInstallments: 4,
    isActive: true,
    createdAt: new Date(Date.now() - 60 * 86400000).toISOString(),
    updatedAt: new Date().toISOString()
  },
  {
    id: 'debt-2',
    userId: DEMO_USER_ID,
    name: 'Empréstimo Pessoal Caixa',
    totalAmount: 12000,
    remainingAmount: 8500,
    installmentAmount: 620,
    type: 'fixed',
    interestRate: 4.8,
    dueDate: '15',
    totalInstallments: 24,
    paidInstallments: 7,
    isActive: true,
    createdAt: new Date(Date.now() - 120 * 86400000).toISOString(),
    updatedAt: new Date().toISOString()
  },
  {
    id: 'debt-3',
    userId: DEMO_USER_ID,
    name: 'Financiamento Veículo',
    totalAmount: 35000,
    remainingAmount: 22000,
    installmentAmount: 890,
    type: 'fixed',
    interestRate: 1.9,
    dueDate: '25',
    totalInstallments: 48,
    paidInstallments: 18,
    isActive: true,
    createdAt: new Date(Date.now() - 240 * 86400000).toISOString(),
    updatedAt: new Date().toISOString()
  },
  {
    id: 'debt-4',
    userId: DEMO_USER_ID,
    name: 'Cheque Especial Santander',
    totalAmount: 1500,
    remainingAmount: 1200,
    installmentAmount: 200,
    type: 'overdraft',
    interestRate: 14.2,
    dueDate: '05',
    totalInstallments: 6,
    paidInstallments: 1,
    isActive: true,
    createdAt: new Date(Date.now() - 30 * 86400000).toISOString(),
    updatedAt: new Date().toISOString()
  }
];

const INITIAL_INCOMES = [
  {
    id: 'inc-1',
    userId: DEMO_USER_ID,
    name: 'Salário Principal CLT',
    amount: 6500,
    frequency: 'monthly',
    recurrenceDay: 5,
    isActive: true,
    createdAt: new Date(Date.now() - 90 * 86400000).toISOString(),
    updatedAt: new Date().toISOString()
  },
  {
    id: 'inc-2',
    userId: DEMO_USER_ID,
    name: 'Projetos Freelance',
    amount: 1800,
    frequency: 'monthly',
    recurrenceDay: 20,
    isActive: true,
    createdAt: new Date(Date.now() - 60 * 86400000).toISOString(),
    updatedAt: new Date().toISOString()
  }
];

const INITIAL_EXPENSES = [
  {
    id: 'exp-1',
    userId: DEMO_USER_ID,
    name: 'Aluguel + Condomínio',
    amount: 1950,
    category: 'housing',
    recurrenceDay: 10,
    isActive: true,
    createdAt: new Date(Date.now() - 90 * 86400000).toISOString(),
    updatedAt: new Date().toISOString()
  },
  {
    id: 'exp-2',
    userId: DEMO_USER_ID,
    name: 'Supermercado Básico',
    amount: 1200,
    category: 'food',
    recurrenceDay: 5,
    isActive: true,
    createdAt: new Date(Date.now() - 90 * 86400000).toISOString(),
    updatedAt: new Date().toISOString()
  },
  {
    id: 'exp-3',
    userId: DEMO_USER_ID,
    name: 'Energia Elétrica e Água',
    amount: 320,
    category: 'utilities',
    recurrenceDay: 15,
    isActive: true,
    createdAt: new Date(Date.now() - 90 * 86400000).toISOString(),
    updatedAt: new Date().toISOString()
  },
  {
    id: 'exp-4',
    userId: DEMO_USER_ID,
    name: 'Internet Fibra e Celular',
    amount: 180,
    category: 'utilities',
    recurrenceDay: 12,
    isActive: true,
    createdAt: new Date(Date.now() - 90 * 86400000).toISOString(),
    updatedAt: new Date().toISOString()
  },
  {
    id: 'exp-5',
    userId: DEMO_USER_ID,
    name: 'Plano de Saúde',
    amount: 450,
    category: 'health',
    recurrenceDay: 8,
    isActive: true,
    createdAt: new Date(Date.now() - 90 * 86400000).toISOString(),
    updatedAt: new Date().toISOString()
  },
  {
    id: 'exp-6',
    userId: DEMO_USER_ID,
    name: 'Combustível / Transporte',
    amount: 400,
    category: 'transport',
    recurrenceDay: 1,
    isActive: true,
    createdAt: new Date(Date.now() - 90 * 86400000).toISOString(),
    updatedAt: new Date().toISOString()
  }
];

const INITIAL_DAILY = [
  { id: 'daily-1', userId: DEMO_USER_ID, description: 'Almoço Restaurante', amount: 48.50, category: 'alimentacao', date: formatMonthDate(2), createdAt: new Date().toISOString() },
  { id: 'daily-2', userId: DEMO_USER_ID, description: 'Abastecimento Posto', amount: 120.00, category: 'transporte', date: formatMonthDate(4), createdAt: new Date().toISOString() },
  { id: 'daily-3', userId: DEMO_USER_ID, description: 'Farmácia Medicamentos', amount: 65.30, category: 'saude', date: formatMonthDate(6), createdAt: new Date().toISOString() },
  { id: 'daily-4', userId: DEMO_USER_ID, description: 'Cinema e Pipoca', amount: 82.00, category: 'lazer', date: formatMonthDate(8), createdAt: new Date().toISOString() },
  { id: 'daily-5', userId: DEMO_USER_ID, description: 'Padaria Café da Manhã', amount: 24.50, category: 'alimentacao', date: formatMonthDate(11), createdAt: new Date().toISOString() },
  { id: 'daily-6', userId: DEMO_USER_ID, description: 'Uber Reunião', amount: 34.90, category: 'transporte', date: formatMonthDate(14), createdAt: new Date().toISOString() },
  { id: 'daily-7', userId: DEMO_USER_ID, description: 'Compras Mercado Rápido', amount: 145.20, category: 'compras', date: formatMonthDate(17), createdAt: new Date().toISOString() },
  { id: 'daily-8', userId: DEMO_USER_ID, description: 'Jantar Delivery', amount: 78.00, category: 'alimentacao', date: formatMonthDate(20), createdAt: new Date().toISOString() },
];

const INITIAL_BUDGETS = [
  { id: 'b-1', userId: DEMO_USER_ID, category: 'alimentacao', monthlyLimit: 1500, month: currentMonth + 1, year: currentYear, isActive: true, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() },
  { id: 'b-2', userId: DEMO_USER_ID, category: 'transporte', monthlyLimit: 600, month: currentMonth + 1, year: currentYear, isActive: true, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() },
  { id: 'b-3', userId: DEMO_USER_ID, category: 'lazer', monthlyLimit: 400, month: currentMonth + 1, year: currentYear, isActive: true, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() },
  { id: 'b-4', userId: DEMO_USER_ID, category: 'compras', monthlyLimit: 500, month: currentMonth + 1, year: currentYear, isActive: true, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() },
  { id: 'b-5', userId: DEMO_USER_ID, category: 'saude', monthlyLimit: 500, month: currentMonth + 1, year: currentYear, isActive: true, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() },
  { id: 'b-6', userId: DEMO_USER_ID, category: 'outros', monthlyLimit: 300, month: currentMonth + 1, year: currentYear, isActive: true, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() },
];

const INITIAL_GOALS = [
  {
    id: 'goal-1',
    userId: DEMO_USER_ID,
    name: 'Reserva de Emergência (6 meses)',
    description: 'Fundo para cobrir imprevistos com segurança',
    targetAmount: 20000,
    currentAmount: 6400,
    priority: 'high',
    category: 'emergency',
    deadline: `${currentYear}-12-31`,
    isCompleted: false,
    completedAt: null,
    isActive: true,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  },
  {
    id: 'goal-2',
    userId: DEMO_USER_ID,
    name: 'Viagem de Férias',
    description: 'Férias em família no final do ano',
    targetAmount: 5000,
    currentAmount: 2100,
    priority: 'medium',
    category: 'travel',
    deadline: `${currentYear + 1}-01-20`,
    isCompleted: false,
    completedAt: null,
    isActive: true,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  }
];

const INITIAL_PAYMENTS = [
  {
    id: 'pay-1',
    userId: DEMO_USER_ID,
    debtId: 'debt-1',
    debtName: 'Cartão de Crédito Nubank',
    amountPaid: 450,
    paymentDate: new Date(Date.now() - 25 * 86400000).toISOString(),
    note: 'Parcela 4/12 paga em dia',
    createdAt: new Date().toISOString()
  },
  {
    id: 'pay-2',
    userId: DEMO_USER_ID,
    debtId: 'debt-2',
    debtName: 'Empréstimo Pessoal Caixa',
    amountPaid: 620,
    paymentDate: new Date(Date.now() - 15 * 86400000).toISOString(),
    note: 'Amortização mensal',
    createdAt: new Date().toISOString()
  },
  {
    id: 'pay-3',
    userId: DEMO_USER_ID,
    debtId: 'debt-4',
    debtName: 'Cheque Especial Santander',
    amountPaid: 300,
    paymentDate: new Date(Date.now() - 5 * 86400000).toISOString(),
    note: 'Amortização extraordinária para reduzir juros altos',
    createdAt: new Date().toISOString()
  }
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
      default: initial = [];
    }

    this.saveItems(table, initial);
    return initial;
  }

  saveItems(table: string, items: any[]): void {
    localStorage.setItem(this.getStorageKey(table), JSON.stringify(items));
  }

  resetAll(): void {
    const tables = ['debts', 'incomes', 'expenses', 'daily_expenses', 'budgets', 'financial_goals', 'payment_logs', 'ai_plans'];
    tables.forEach(t => localStorage.removeItem(this.getStorageKey(t)));
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
