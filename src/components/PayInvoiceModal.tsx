import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { Modal } from './Modal';
import { BrutalButton, BrutalInput, BrutalLabel } from './BrutalUI';
import { formatCurrency, parseCurrency } from '../lib/utils';
import { getBankInfo } from '../pages/Expenses';
import { CheckCircle2, AlertCircle, Sparkles, CreditCard, Landmark, ArrowRight, Wallet } from 'lucide-react';
import { toast } from 'sonner';

export interface PayTargetItem {
  id: string;
  name: string;
  amount: number;             // Remaining due balance
  originalAmount?: number;     // Original invoice amount before partial payments
  paidAmount?: number;         // Amount already paid
  extraCredit?: number;        // Existing excess credit
  category?: string;
  bank?: string;
  dueDate?: string;
  cardLimit?: number;
  isExpense?: boolean;         // true for expenses table, false for debts table
  paidInstallments?: number;
}

interface PayInvoiceModalProps {
  isOpen: boolean;
  onClose: () => void;
  item: PayTargetItem | null;
  onSuccess: () => Promise<void> | void;
}

export const PayInvoiceModal: React.FC<PayInvoiceModalProps> = ({
  isOpen,
  onClose,
  item,
  onSuccess,
}) => {
  const [payAmountStr, setPayAmountStr] = useState<string>('');
  const [payDate, setPayDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [note, setNote] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (item) {
      // Pre-fill with remaining amount formatted
      setPayAmountStr(item.amount ? item.amount.toFixed(2).replace('.', ',') : '0,00');
      setPayDate(new Date().toISOString().split('T')[0]);
      setNote('');
    }
  }, [item, isOpen]);

  if (!item) return null;

  const dueAmount = Number(item.amount) || 0;
  const currentPaid = Number(item.paidAmount) || 0;
  const originalTotal = Number(item.originalAmount) || (dueAmount + currentPaid);
  const paidVal = parseCurrency(payAmountStr) || 0;
  const bankInfo = getBankInfo(item.bank);

  const isOverpayment = paidVal > dueAmount;
  const isPartial = paidVal > 0 && paidVal < dueAmount;
  const isFull = paidVal === dueAmount;
  const excess = isOverpayment ? paidVal - dueAmount : 0;
  const remaining = isPartial ? dueAmount - paidVal : 0;

  const handleQuickSet = (val: number) => {
    setPayAmountStr(val.toFixed(2).replace('.', ','));
  };

  const handleConfirmPayment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (paidVal <= 0) {
      toast.error('Informe um valor de pagamento maior que zero.');
      return;
    }

    const { data: { session } } = await supabase.auth.getSession();
    const user = session?.user;
    if (!user) {
      toast.error('Usuário não autenticado.');
      return;
    }

    setIsSubmitting(true);
    try {
      const nowIso = new Date().toISOString();
      const pDate = payDate || nowIso.split('T')[0];

      if (item.isExpense) {
        // EXPENSES TABLE UPDATE
        if (paidVal >= dueAmount) {
          // Full payoff or overpayment
          const newExtra = (Number(item.extraCredit) || 0) + excess;
          const newTotalPaid = currentPaid + paidVal;

          const meta = {
            paidAmount: newTotalPaid,
            originalAmount: originalTotal,
            extraCredit: newExtra,
          };

          await supabase.from('expenses').update({
            isPaid: true,
            paymentDate: pDate,
            paidAmount: newTotalPaid,
            extraCredit: newExtra,
            originalAmount: originalTotal,
            type: JSON.stringify(meta),
            updatedAt: nowIso,
          }).eq('id', item.id);

          // Payment log
          await supabase.from('payment_logs').insert([{
            userId: user.id,
            debtId: item.id,
            debtName: item.name,
            amountPaid: paidVal,
            extraCredit: newExtra,
            paymentDate: pDate,
            note: excess > 0 
              ? (note ? `${note} (Com excedente de +${formatCurrency(excess)})` : `Pagamento com excedente (+${formatCurrency(excess)} de crédito no limite)`)
              : (note || 'Pagamento integral de fatura'),
            createdAt: nowIso,
          }]);

          if (excess > 0) {
            toast.success(`🎉 Fatura quitada e +${formatCurrency(excess)} inserido como crédito extra no limite!`);
          } else {
            toast.success(`✅ Fatura quitada! +${formatCurrency(paidVal)} restaurados ao crédito do limite.`);
          }
        } else {
          // Partial payment
          const newTotalPaid = currentPaid + paidVal;

          const meta = {
            paidAmount: newTotalPaid,
            originalAmount: originalTotal,
            extraCredit: 0,
          };

          await supabase.from('expenses').update({
            amount: remaining,
            isPaid: false,
            paidAmount: newTotalPaid,
            originalAmount: originalTotal,
            type: JSON.stringify(meta),
            updatedAt: nowIso,
          }).eq('id', item.id);

          await supabase.from('payment_logs').insert([{
            userId: user.id,
            debtId: item.id,
            debtName: item.name,
            amountPaid: paidVal,
            paymentDate: pDate,
            note: note ? `${note} (Parcial, resta ${formatCurrency(remaining)})` : `Pagamento parcial (Resta ${formatCurrency(remaining)})`,
            createdAt: nowIso,
          }]);

          toast.success(`💳 Pagamento parcial registrado! +${formatCurrency(paidVal)} restaurados ao crédito do limite. Restam ${formatCurrency(remaining)}.`);
        }
      } else {
        // DEBTS TABLE UPDATE
        if (paidVal >= dueAmount) {
          const newExtra = (Number(item.extraCredit) || 0) + excess;
          await supabase.from('debts').update({
            remainingAmount: 0,
            isPaid: true,
            paymentDate: pDate,
            extraCredit: newExtra,
            paidInstallments: (item.paidInstallments || 0) + 1,
            updatedAt: nowIso,
          }).eq('id', item.id);

          await supabase.from('payment_logs').insert([{
            userId: user.id,
            debtId: item.id,
            debtName: item.name,
            amountPaid: paidVal,
            extraCredit: newExtra,
            paymentDate: pDate,
            note: excess > 0 ? `Pagamento com excedente (+${formatCurrency(excess)} de crédito)` : (note || 'Quitação de dívida'),
            createdAt: nowIso,
          }]);

          if (excess > 0) {
            toast.success(`🎉 Dívida quitada! Excedente de +${formatCurrency(excess)} registrado como crédito.`);
          } else {
            toast.success(`✅ Dívida quitada com sucesso!`);
          }
        } else {
          await supabase.from('debts').update({
            remainingAmount: remaining,
            isPaid: false,
            updatedAt: nowIso,
          }).eq('id', item.id);

          await supabase.from('payment_logs').insert([{
            userId: user.id,
            debtId: item.id,
            debtName: item.name,
            amountPaid: paidVal,
            paymentDate: pDate,
            note: note || `Amortização parcial (Resta ${formatCurrency(remaining)})`,
            createdAt: nowIso,
          }]);

          toast.success(`💳 Pagamento parcial registrado! Restam ${formatCurrency(remaining)}.`);
        }
      }

      onClose();
      await onSuccess();
    } catch (err) {
      console.error(err);
      toast.error('Erro ao registrar o pagamento.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const isCardOrLimit = item.category === 'credit_card' || item.category === 'overdraft';

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Pagar Fatura / Limite de Crédito">
      <form onSubmit={handleConfirmPayment} className="space-y-4">
        {/* Header Summary Box */}
        <div className="bg-slate-50 border border-slate-200 rounded-2xl p-3.5">
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-1.5 flex-wrap">
              {bankInfo && (
                <span className={`text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded-md flex items-center gap-1 ${bankInfo.badge}`}>
                  <CreditCard className="w-3 h-3" />
                  {bankInfo.name}
                </span>
              )}
              <span className="text-[10px] font-extrabold text-slate-500 uppercase">
                {item.category === 'overdraft' ? 'Cheque Especial / Limite' : item.category === 'credit_card' ? 'Cartão de Crédito' : 'Fatura'}
              </span>
            </div>
            {item.dueDate && (
              <span className="text-[11px] font-semibold text-slate-500">
                Vence em: {new Date(item.dueDate + 'T12:00:00').toLocaleDateString('pt-BR')}
              </span>
            )}
          </div>

          <h4 className="text-base font-black text-slate-900 mt-1 truncate">
            {item.name}
          </h4>

          <div className="mt-2 pt-2 border-t border-slate-200/70 flex items-center justify-between text-xs">
            <span className="font-bold text-slate-600">Valor em Aberto / Fatura:</span>
            <span className="font-black text-rose-600 text-base">{formatCurrency(dueAmount)}</span>
          </div>

          {currentPaid > 0 && (
            <div className="mt-1 flex items-center justify-between text-[11px] text-emerald-700 font-bold bg-emerald-50 px-2 py-0.5 rounded">
              <span>Já pago anteriormente:</span>
              <span>{formatCurrency(currentPaid)}</span>
            </div>
          )}

          {item.cardLimit && item.cardLimit > 0 && (
            <div className="mt-1 flex items-center justify-between text-[11px] text-slate-600 font-semibold">
              <span>Limite cadastrado:</span>
              <span className="font-bold">{formatCurrency(item.cardLimit)}</span>
            </div>
          )}
        </div>

        {/* Amount Input */}
        <div>
          <div className="flex items-center justify-between mb-1">
            <BrutalLabel>Quanto você deseja pagar? (R$)</BrutalLabel>
            <span className="text-[10px] font-extrabold text-purple-700 uppercase tracking-wider">
              Qualquer valor permitido
            </span>
          </div>

          <div className="relative">
            <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-sm font-bold text-slate-400">
              R$
            </span>
            <BrutalInput
              type="text"
              value={payAmountStr}
              onChange={e => setPayAmountStr(e.target.value)}
              className="pl-10 text-lg font-black text-slate-900"
              placeholder="0,00"
              autoFocus
            />
          </div>

          {/* Quick Amount Pills */}
          <div className="flex items-center gap-1.5 mt-2 flex-wrap">
            <button
              type="button"
              onClick={() => handleQuickSet(dueAmount)}
              className={`text-[11px] font-bold px-2.5 py-1 rounded-lg border transition-all cursor-pointer ${
                isFull 
                  ? 'bg-purple-600 text-white border-purple-600 shadow-xs' 
                  : 'bg-white text-slate-700 border-slate-200 hover:border-purple-300'
              }`}
            >
              Total ({formatCurrency(dueAmount)})
            </button>

            {dueAmount > 50 && (
              <button
                type="button"
                onClick={() => handleQuickSet(dueAmount / 2)}
                className={`text-[11px] font-bold px-2.5 py-1 rounded-lg border transition-all cursor-pointer ${
                  paidVal === dueAmount / 2
                    ? 'bg-purple-600 text-white border-purple-600 shadow-xs' 
                    : 'bg-white text-slate-700 border-slate-200 hover:border-purple-300'
                }`}
              >
                50% ({formatCurrency(dueAmount / 2)})
              </button>
            )}

            <button
              type="button"
              onClick={() => handleQuickSet(dueAmount + 100)}
              className="text-[11px] font-bold px-2.5 py-1 rounded-lg border border-purple-200 bg-purple-50 text-purple-700 hover:bg-purple-100 transition-all cursor-pointer flex items-center gap-1"
              title="Adicionar R$ 100 de crédito excedente"
            >
              <Sparkles className="w-3 h-3 text-purple-600" />
              +R$ 100 (Excedente)
            </button>
          </div>
        </div>

        {/* Real-time Impact Feedback Card */}
        {paidVal > 0 && (
          <div className={`p-3 rounded-xl border text-xs space-y-1.5 transition-all ${
            isOverpayment 
              ? 'bg-purple-50 border-purple-200 text-purple-950' 
              : isPartial 
                ? 'bg-amber-50 border-amber-200 text-amber-950' 
                : 'bg-emerald-50 border-emerald-200 text-emerald-950'
          }`}>
            <div className="flex items-center gap-1.5 font-black text-xs">
              {isOverpayment ? (
                <>
                  <Sparkles className="w-4 h-4 text-purple-600 shrink-0" />
                  <span>Quitação Integral + Crédito Excedente a Favor!</span>
                </>
              ) : isPartial ? (
                <>
                  <AlertCircle className="w-4 h-4 text-amber-600 shrink-0" />
                  <span>Pagamento Parcial da Fatura</span>
                </>
              ) : (
                <>
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                  <span>Quitação Integral da Fatura</span>
                </>
              )}
            </div>

            <p className="text-[11px] leading-relaxed">
              {isOverpayment ? (
                <>
                  A fatura de <b>{formatCurrency(dueAmount)}</b> será 100% quitada. O valor excedente de{' '}
                  <strong className="text-purple-700 underline font-black">+{formatCurrency(excess)}</strong> entrará
                  diretamente como <b>crédito extra / saldo positivo</b> no limite do seu cartão/banco!
                </>
              ) : isPartial ? (
                <>
                  Você está pagando <b>{formatCurrency(paidVal)}</b>. Esse valor entrará imediatamente de volta como{' '}
                  <b>crédito disponível</b> no seu limite, e restará um saldo em aberto de{' '}
                  <strong className="text-rose-600 font-bold">{formatCurrency(remaining)}</strong> nesta fatura.
                </>
              ) : (
                <>
                  A fatura será quitada integralmente. O valor total pago de{' '}
                  <strong className="text-emerald-700 font-black">{formatCurrency(paidVal)}</strong> será 100%
                  restituído ao crédito disponível do seu cartão/banco.
                </>
              )}
            </p>

            {isCardOrLimit && (
              <div className="pt-1 border-t border-black/5 flex items-center gap-1.5 text-[10px] font-black uppercase tracking-wider text-slate-700">
                <Wallet className="w-3 h-3 text-purple-600" />
                <span>Impacto no Limite: <b>+{formatCurrency(paidVal)}</b> disponíveis após o pagamento</span>
              </div>
            )}
          </div>
        )}

        {/* Date and Note */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <BrutalLabel>Data do Pagamento</BrutalLabel>
            <BrutalInput
              type="date"
              value={payDate}
              onChange={e => setPayDate(e.target.value)}
              className="text-xs"
            />
          </div>

          <div>
            <BrutalLabel>Observação (Opcional)</BrutalLabel>
            <BrutalInput
              type="text"
              value={note}
              onChange={e => setNote(e.target.value)}
              placeholder="Ex: Pago via PIX"
              className="text-xs"
            />
          </div>
        </div>

        {/* Modal Actions */}
        <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-2">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-100 rounded-xl transition-all cursor-pointer"
          >
            Cancelar
          </button>

          <BrutalButton
            type="submit"
            disabled={isSubmitting || paidVal <= 0}
            className="py-2.5 px-5 text-xs flex items-center gap-1.5"
          >
            {isSubmitting ? (
              'Processando...'
            ) : (
              <>
                <CheckCircle2 className="w-4 h-4" />
                Confirmar Pagamento de {formatCurrency(paidVal)}
              </>
            )}
          </BrutalButton>
        </div>
      </form>
    </Modal>
  );
};
