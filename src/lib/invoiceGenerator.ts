// Simple invoice number generator
// Format: INV-{YYYY}-{MM}-{sequence:5d}

let sequence = 1; // In a real app, this would come from database

export function generateInvoiceNumber(): string {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const seq = String(sequence++).padStart(5, '0');
  
  return `INV-${year}-${month}-${seq}`;
}

// Reset sequence at month change (simplified)
export function resetSequenceIfNewMonth(): void {
  const now = new Date();
  // In a real implementation, we'd check the last invoice date from DB
  // For demo purposes, we'll just increment
}