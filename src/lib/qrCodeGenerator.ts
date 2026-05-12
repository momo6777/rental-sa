import QR_CODE from 'qrcode';

// ZATCA TLV tags for e-Invoice QR code
const TAGS = {
  SELLER_NAME: 0x01,
  VAT_NUMBER: 0x02,
  INVOICE_DATETIME: 0x03,
  TOTAL_AMOUNT: 0x04,
  VAT_AMOUNT: 0x05,
};

/**
 * Encode a value in ZATCA TLV (Tag-Length-Value) format
 */
function encodeTLV(tag: number, value: string): Buffer {
  const valueBuffer = Buffer.from(value, 'utf8');
  const lengthBuffer = Buffer.from([valueBuffer.length]);
  const tagBuffer = Buffer.from([tag]);
  return Buffer.concat([tagBuffer, lengthBuffer, valueBuffer]);
}

/**
 * Generate ZATCA-compliant QR code data URL for commercial invoices.
 * Encodes: seller name, VAT number, invoice datetime, total amount, VAT amount.
 */
export async function generateInvoiceQRCode(params: {
  sellerName: string;
  vatNumber: string;
  invoiceDatetime: string; // ISO 8601
  totalAmount: number;
  vatAmount: number;
}): Promise<string> {
  const { sellerName, vatNumber, invoiceDatetime, totalAmount, vatAmount } = params;

  const tlvBuffer = Buffer.concat([
    encodeTLV(TAGS.SELLER_NAME, sellerName),
    encodeTLV(TAGS.VAT_NUMBER, vatNumber),
    encodeTLV(TAGS.INVOICE_DATETIME, invoiceDatetime),
    encodeTLV(TAGS.TOTAL_AMOUNT, totalAmount.toFixed(2)),
    encodeTLV(TAGS.VAT_AMOUNT, vatAmount.toFixed(2)),
  ]);

  try {
    const dataUrl = await QR_CODE.toDataURL(tlvBuffer, {
      errorCorrectionLevel: 'M',
      type: 'image/png',
      width: 150,
      margin: 1,
    });
    return dataUrl;
  } catch {
    // Fallback: encode as JSON string if TLV encoding fails
    const jsonData = JSON.stringify({
      sellerName,
      vatNumber,
      invoiceDatetime,
      totalAmount: totalAmount.toFixed(2),
      vatAmount: vatAmount.toFixed(2),
    });
    return QR_CODE.toDataURL(jsonData, {
      errorCorrectionLevel: 'M',
      type: 'image/png',
      width: 150,
      margin: 1,
    });
  }
}