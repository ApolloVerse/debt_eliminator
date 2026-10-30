import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatCurrency(value: number) {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  }).format(value);
}

export function formatPercent(value: number) {
  return new Intl.NumberFormat('pt-BR', {
    style: 'percent',
    minimumFractionDigits: 1,
    maximumFractionDigits: 1,
  }).format(value / 100);
}

export function parseCurrency(val: any): number {
  if (typeof val === 'string') {
    val = val.replace(/[R$\s]/g, '').trim();
    if (val.includes('.') && val.includes(',')) {
      val = val.replace(/\./g, '');
      val = val.replace(',', '.');
    } else if (val.includes(',')) {
      val = val.replace(',', '.');
    }
    return Number(val) || 0;
  }
  return Number(val) || 0;
}

export function getDebtBaseType(typeString: string): string {
  try {
    if (typeString?.startsWith('{')) {
      const parsed = JSON.parse(typeString);
      return parsed.baseType || 'fixed';
    }
  } catch (e) {}
  return typeString || 'fixed';
}

export function getFutureBills(typeString: string): { amount: string }[] {
  try {
    if (typeString?.startsWith('{')) {
      const parsed = JSON.parse(typeString);
      return parsed.futureBills || [];
    }
  } catch (e) {}
  return [];
}

export function addMonthsToDate(dateStr: string, monthsToAdd: number): string {
  if (!dateStr) return '';
  const parts = dateStr.split('T')[0].split('-');
  if (parts.length < 3) return dateStr;
  const year = parseInt(parts[0], 10);
  const month = parseInt(parts[1], 10) - 1;
  const day = parseInt(parts[2], 10);

  const targetDate = new Date(year, month + monthsToAdd, 1);
  const targetYear = targetDate.getFullYear();
  const targetMonth = targetDate.getMonth();
  const daysInTargetMonth = new Date(targetYear, targetMonth + 1, 0).getDate();
  const clampedDay = Math.min(day, daysInTargetMonth);

  const yStr = String(targetYear);
  const mStr = String(targetMonth + 1).padStart(2, '0');
  const dStr = String(clampedDay).padStart(2, '0');
  return `${yStr}-${mStr}-${dStr}`;
}

