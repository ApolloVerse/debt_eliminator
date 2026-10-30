// Standalone mock store with full CRUD & localStorage persistence for zero-config mode
import { User } from '@supabase/supabase-js';

const DEMO_USER_ID = 'demo-user-123';

export const DEMO_USER: User = {
  id: DEMO_USER_ID,
  app_metadata: { provider: 'email' },
  user_metadata: {
    name: 'Meu Usuário',
    full_name: 'Meu Usuário',
    avatar_url: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?q=80&w=150&auto=format&fit=crop'
  },
  aud: 'authenticated',
  created_at: new Date().toISOString(),
  email: 'usuario@saldopositivo.app',
  phone: '',
  role: 'authenticated',
  updated_at: new Date().toISOString(),
};

// Initial state is completely clean for manual user entry
const INITIAL_DEBTS: any[] = [];
const INITIAL_INCOMES: any[] = [];
const INITIAL_EXPENSES: any[] = [];
const INITIAL_DAILY: any[] = [];
const INITIAL_BUDGETS: any[] = [];
const INITIAL_GOALS: any[] = [];
const INITIAL_PAYMENTS: any[] = [];
const INITIAL_PLANS: any[] = [];

class MockStorage {
  private getStorageKey(table: string): string {
    return `sp_demo_${table}`;
  }

  getItems(table: string): any[] {
    if (typeof window !== 'undefined') {
      const stored = localStorage.getItem('sp_demo_version');
      const CANONICAL = 'v8_clean_manual_data';
      // Reset if version mismatch (forces fresh clean state on version bump)
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
   * Ensures clean data state with canonical empty storage for manual entry.
   */
  seedForUser(_userId?: string): void {
    if (typeof window === 'undefined') return;
    const CANONICAL = 'v8_clean_manual_data';
    if (localStorage.getItem('sp_demo_version') === CANONICAL) return;
    this.resetAll();
    localStorage.setItem('sp_demo_version', CANONICAL);
    console.log('[MockStore] Clean manual storage ready (v8_clean_manual_data)');
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
