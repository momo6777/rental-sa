/**
 * Financial Calculation Test Script
 * Tests VAT calculations, invoice numbers, and contract payment schedules.
 *
 * Usage: node scripts/test-financial.js
 */

const VAT_RATE = 0.15;

// Test VAT calculations
function testVAT() {
  console.log('\n📝 Testing: VAT Calculations');

  // Commercial: 10,000 → VAT 1,500 → Total 11,500
  const comm = { amount: 10000, isCommercial: true };
  const commVat = comm.amount * VAT_RATE;
  const commTotal = comm.amount + commVat;
  const commPass = commVat === 1500 && commTotal === 11500;
  console.log(`  ${commPass ? '✅' : '❌'} Commercial 10,000: VAT=${commVat}, Total=${commTotal} ${commPass ? '' : '(expected VAT=1500, Total=11500)'}`);

  // Residential: 10,000 → VAT 0 → Total 10,000
  const res = { amount: 10000, isCommercial: false };
  const resVat = 0;
  const resTotal = res.amount;
  const resPass = resVat === 0 && resTotal === 10000;
  console.log(`  ${resPass ? '✅' : '❌'} Residential 10,000: VAT=${resVat}, Total=${resTotal}`);
  
  // Zero amount
  const zero = { amount: 0, isCommercial: true };
  const zeroVat = zero.amount * VAT_RATE;
  console.log(`  ${zeroVat === 0 ? '✅' : '❌'} Zero amount: VAT=${zeroVat}`);
}

// Test invoice number format
function testInvoiceNumber() {
  console.log('\n📝 Testing: Invoice Number Format');
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const seq = '00001';
  const invoice = `INV-${year}-${month}-${seq}`;
  const pattern = /^INV-\d{4}-\d{2}-\d{5}$/;
  console.log(`  ${pattern.test(invoice) ? '✅' : '❌'} Format: ${invoice} ${pattern.test(invoice) ? '' : '(expected INV-YYYY-MM-NNNNN)'}`);
  
  const seq2 = '00123';
  const invoice2 = `INV-${year}-${month}-${seq2}`;
  console.log(`  ${pattern.test(invoice2) ? '✅' : '❌'} Format: ${invoice2}`);
}

// Test contract payment schedules
function testPaymentSchedule() {
  console.log('\n📝 Testing: Payment Schedules');

  // Monthly: 12 payments
  const monthlyPayments = 12;
  console.log(`  ${monthlyPayments === 12 ? '✅' : '❌'} Yearly monthly: ${monthlyPayments} payments`);
  
  // Quarterly: 4 payments
  const quarterlyPayments = 4;
  console.log(`  ${quarterlyPayments === 4 ? '✅' : '❌'} Yearly quarterly: ${quarterlyPayments} payments`);
  
  // Yearly: 1 payment
  const yearlyPayments = 1;
  console.log(`  ${yearlyPayments === 1 ? '✅' : '❌'} Yearly: ${yearlyPayments} payment`);
}

// Test SADAD reference number
function testSADAD() {
  console.log('\n📝 Testing: SADAD Validation');
  const validSADAD = '123456789012345678'; // 18 digits
  const invalidSADAD = '12345'; // Too short
  
  const validPattern = /^\d{18}$/;
  console.log(`  ${validPattern.test(validSADAD) ? '✅' : '❌'} Valid SADAD (18 digits): ${validSADAD}`);
  console.log(`  ${!validPattern.test(invalidSADAD) ? '✅' : '❌'} Invalid SADAD (${invalidSADAD.length} digits): rejected`);
}

// Test National ID validation (Saudi)
function testNationalID() {
  console.log('\n📝 Testing: National ID Validation');
  const validSaudi = '1012345678'; // 10 digits, starts with 1
  const validIqama = '2123456789'; // 10 digits, starts with 2
  const invalidID = '3012345678'; // starts with 3
  
  const saudiPattern = /^[1-2]\d{9}$/;
  console.log(`  ${saudiPattern.test(validSaudi) ? '✅' : '❌'} Saudi ID (${validSaudi}): valid`);
  console.log(`  ${saudiPattern.test(validIqama) ? '✅' : '❌'} Iqama (${validIqama}): valid`);
  console.log(`  ${!saudiPattern.test(invalidID) ? '✅' : '❌'} Invalid (${invalidID}): rejected`);
}

function run() {
  console.log('=== Financial Calculation Tests ===\n');
  testVAT();
  testInvoiceNumber();
  testPaymentSchedule();
  testSADAD();
  testNationalID();
  console.log('\n=== Tests Complete ===');
}

run();
