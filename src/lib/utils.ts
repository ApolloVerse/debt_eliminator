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
