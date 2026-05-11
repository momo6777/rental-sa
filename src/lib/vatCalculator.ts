const VAT_RATE = 0.15;

// الإيجار السكني → معفى من VAT
// الإيجار التجاري → خاضع لـ VAT 15%
export function calcVAT(amount: number, isCommercial: boolean) {
  if (!isCommercial) {
    return { base: amount, vat: 0, total: amount };
  }
  
  const vat = amount * VAT_RATE;
  return { base: amount, vat, total: amount + vat };
}

export function calculateVAT(amount: number, isCommercial: boolean): { base: number; vat: number; total: number } {
  return calcVAT(amount, isCommercial);
}

export function isVATApplicable(isCommercial: boolean): boolean {
  return isCommercial;
}