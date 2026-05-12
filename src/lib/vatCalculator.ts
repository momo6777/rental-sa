// الإيجار السكني → معفى من VAT
// الإيجار التجاري → خاضع لـ VAT
export function calcVAT(amount: number, isCommercial: boolean, vatRate: number = 0.15) {
  if (!isCommercial) {
    return { base: amount, vat: 0, total: amount };
  }

  const vat = amount * vatRate;
  return { base: amount, vat, total: amount + vat };
}

export function calculateVAT(amount: number, isCommercial: boolean, vatRate?: number): { base: number; vat: number; total: number } {
  return calcVAT(amount, isCommercial, vatRate);
}

export function isVATApplicable(isCommercial: boolean): boolean {
  return isCommercial;
}