import { describe, it, expect } from 'vitest';
import { formatCurrency, parseCurrency, cn } from './utils';

describe('formatCurrency', () => {
  it('should format positive numbers correctly', () => {
    const result = formatCurrency(100);
    expect(result).toMatch(/R\$\s*100,00/);
    expect(formatCurrency(1234.56)).toMatch(/R\$\s*1\.234,56/);
    expect(formatCurrency(0)).toMatch(/R\$\s*0,00/);
  });

  it('should format negative numbers correctly', () => {
    expect(formatCurrency(-100)).toMatch(/-R\$\s*100,00/);
    expect(formatCurrency(-1234.56)).toMatch(/-R\$\s*1\.234,56/);
  });

  it('should handle decimal numbers', () => {
    expect(formatCurrency(100.5)).toMatch(/R\$\s*100,50/);
    expect(formatCurrency(100.99)).toMatch(/R\$\s*100,99/);
  });
});

describe('parseCurrency', () => {
  it('should parse formatted currency strings', () => {
    expect(parseCurrency('R$ 100,00')).toBe(100);
    expect(parseCurrency('R$ 1.234,56')).toBe(1234.56);
  });

  it('should parse plain numbers', () => {
    expect(parseCurrency('100')).toBe(100);
    expect(parseCurrency('1234.56')).toBe(1234.56);
  });
});

describe('cn', () => {
  it('should merge class names', () => {
    expect(cn('foo', 'bar')).toBe('foo bar');
    expect(cn('foo', { bar: true })).toBe('foo bar');
    expect(cn('foo', { bar: false })).toBe('foo');
  });

  it('should handle conditional classes', () => {
    const result = cn('base', { 'active': true, 'disabled': false });
    expect(result).toContain('base');
    expect(result).toContain('active');
    expect(result).not.toContain('disabled');
  });
});
