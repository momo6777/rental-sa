import React, { useEffect, useState } from 'react';
import { Document, Page, Text, View, StyleSheet, PDFDownloadLink, Image, Font } from '@react-pdf/renderer';
import { Button } from 'antd';
import { DownloadOutlined } from '@ant-design/icons';
import { generateInvoiceQRCode } from '../lib/qrCodeGenerator';
import { getCompanySettings, CompanySettings } from '../lib/companySettings';

Font.register({ family: 'Amiri', src: '/fonts/Amiri-Regular.ttf' });

const styles = StyleSheet.create({
  page: {
    padding: 40,
    fontFamily: 'Amiri',
    direction: 'rtl',
  },
  header: {
    marginBottom: 30,
    borderBottomWidth: 2,
    borderBottomColor: '#1a237e',
    borderBottomStyle: 'solid',
    paddingBottom: 15,
  },
  title: {
    fontSize: 24,
    textAlign: 'center',
    marginBottom: 5,
  },
  invoiceNumberText: {
    fontSize: 12,
    textAlign: 'center',
    color: '#666',
  },
  section: {
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 14,
    backgroundColor: '#f5f5f5',
    padding: 5,
    paddingLeft: 10,
    paddingRight: 10,
    marginBottom: 10,
    textAlign: 'right',
  },
  row: {
    flexDirection: 'row-reverse',
    marginBottom: 4,
  },
  label: {
    fontSize: 11,
    width: 120,
    color: '#666',
    textAlign: 'right',
  },
  value: {
    fontSize: 11,
    textAlign: 'right',
  },
  table: {
    marginTop: 10,
    borderWidth: 1,
    borderColor: '#ddd',
    borderStyle: 'solid',
  },
  tableHeader: {
    flexDirection: 'row-reverse',
    backgroundColor: '#1a237e',
  },
  tableHeaderCell: {
    fontSize: 10,
    color: 'white',
    width: '25%',
    textAlign: 'center',
    paddingTop: 8,
    paddingBottom: 8,
  },
  tableRow: {
    flexDirection: 'row-reverse',
    borderBottomWidth: 1,
    borderBottomColor: '#ddd',
    borderBottomStyle: 'solid',
  },
  tableCell: {
    fontSize: 10,
    width: '25%',
    textAlign: 'center',
    paddingTop: 8,
    paddingBottom: 8,
  },
  summary: {
    marginTop: 20,
    width: '50%',
  },
  summaryRow: {
    flexDirection: 'row-reverse',
    justifyContent: 'space-between',
    paddingTop: 4,
    paddingBottom: 4,
    paddingLeft: 10,
    paddingRight: 10,
  },
  totalRow: {
    flexDirection: 'row-reverse',
    justifyContent: 'space-between',
    paddingTop: 8,
    paddingBottom: 8,
    paddingLeft: 10,
    paddingRight: 10,
    backgroundColor: '#1a237e',
  },
  totalLabel: {
    fontSize: 12,
    color: 'white',
  },
  totalValue: {
    fontSize: 12,
    color: 'white',
  },
  qrSection: {
    marginTop: 20,
    alignItems: 'flex-end',
  },
  qrImage: {
    width: 100,
    height: 100,
  },
  footer: {
    position: 'absolute',
    bottom: 30,
    left: 40,
    right: 40,
    textAlign: 'center',
    borderTopWidth: 1,
    borderTopColor: '#ddd',
    borderTopStyle: 'solid',
    paddingTop: 10,
    fontSize: 9,
    color: '#999',
  },
  metadataRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 10,
  },
  metadataItem: {
    fontSize: 10,
    color: '#666',
    textAlign: 'right',
  },
});

type Props = {
  payment: any;
};

export const PaymentInvoicePDF: React.FC<Props> = ({ payment }) => {
  const [qrCodeDataUrl, setQrCodeDataUrl] = useState<string | null>(null);
  const [qrReady, setQrReady] = useState(false);
  const [settings, setSettings] = useState<CompanySettings>(DEFAULT_SETTINGS);

  const contract = payment.contract;
  const unit = contract?.unit;
  const property = unit?.property;
  const tenant = contract?.tenant;
  const isCommercial = unit?.is_commercial;

  useEffect(() => {
    let cancelled = false;

    async function init() {
      const s = await getCompanySettings();
      if (cancelled) return;
      setSettings(s);

      if (isCommercial) {
        try {
          const dataUrl = await generateInvoiceQRCode({
            sellerName: s.company_name_ar,
            vatNumber: s.vat_number,
            invoiceDatetime: payment.created_at || new Date().toISOString(),
            totalAmount: payment.total_amount,
            vatAmount: payment.vat_amount,
          });
          if (!cancelled) setQrCodeDataUrl(dataUrl);
        } catch (e) {
          console.warn('QR generation skipped:', e);
        }
      }
      if (!cancelled) setQrReady(true);
    }

    init();
    return () => { cancelled = true; };
  }, [payment, isCommercial]);

  const formatDate = (dateStr: string) => {
    if (!dateStr) return '-';
    return new Date(dateStr).toLocaleDateString('ar-SA');
  };

  const InvoiceDocument = (
    <Document>
      <Page size="A4" style={styles.page}>
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.title}>فاتورة ضريبية</Text>
          <Text style={styles.invoiceNumberText}>{payment.invoice_number || '-'}</Text>
          <View style={styles.metadataRow}>
            <Text style={styles.metadataItem}>تاريخ الفاتورة: {formatDate(payment.created_at)}</Text>
            <Text style={styles.metadataItem}>تاريخ الاستحقاق: {formatDate(payment.due_date)}</Text>
          </View>
        </View>

        {/* Company Info */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>بيانات المؤجر</Text>
          <View style={styles.row}>
            <Text style={styles.label}>الاسم:</Text>
            <Text style={styles.value}>{settings.company_name_ar}</Text>
          </View>
          <View style={styles.row}>
            <Text style={styles.label}>الرقم الضريبي:</Text>
            <Text style={styles.value}>{settings.vat_number}</Text>
          </View>
          <View style={styles.row}>
            <Text style={styles.label}>العنوان:</Text>
            <Text style={styles.value}>{settings.company_address || '-'}</Text>
          </View>
        </View>

        {/* Tenant Info */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>بيانات المستأجر</Text>
          <View style={styles.row}>
            <Text style={styles.label}>الاسم:</Text>
            <Text style={styles.value}>{tenant?.full_name_ar || '-'}</Text>
          </View>
          <View style={styles.row}>
            <Text style={styles.label}>رقم الهوية / الإقامة:</Text>
            <Text style={styles.value}>{tenant?.national_id || tenant?.iqama_number || '-'}</Text>
          </View>
          <View style={styles.row}>
            <Text style={styles.label}>الجنسية:</Text>
            <Text style={styles.value}>{tenant?.nationality || '-'}</Text>
          </View>
          <View style={styles.row}>
            <Text style={styles.label}>الجوال:</Text>
            <Text style={styles.value}>{tenant?.phone || '-'}</Text>
          </View>
          <View style={styles.row}>
            <Text style={styles.label}>البريد الإلكتروني:</Text>
            <Text style={styles.value}>{tenant?.email || '-'}</Text>
          </View>
        </View>

        {/* Property/Unit Info */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>بيانات الوحدة والعقد</Text>
          <View style={styles.row}>
            <Text style={styles.label}>العقار:</Text>
            <Text style={styles.value}>{property?.name_ar || '-'}</Text>
          </View>
          <View style={styles.row}>
            <Text style={styles.label}>الموقع:</Text>
            <Text style={styles.value}>{property?.city && property?.district ? `${property.city} - ${property.district}` : '-'}</Text>
          </View>
          <View style={styles.row}>
            <Text style={styles.label}>رقم الوحدة:</Text>
            <Text style={styles.value}>{unit?.unit_number || '-'}</Text>
          </View>
          <View style={styles.row}>
            <Text style={styles.label}>الطابق / المساحة:</Text>
            <Text style={styles.value}>{(unit?.floor ? `طابق ${unit.floor}` : '-')} | {unit?.area_sqm ? `${unit.area_sqm} م²` : '-'}</Text>
          </View>
          <View style={styles.row}>
            <Text style={styles.label}>نوع الوحدة:</Text>
            <Text style={styles.value}>{unit?.type === 'apartment' ? 'شقة' : unit?.type === 'office' ? 'مكتب' : unit?.type === 'shop' ? 'محل' : unit?.type === 'villa' ? 'فيلا' : unit?.type || '-'}</Text>
          </View>
          <View style={styles.row}>
            <Text style={styles.label}>نوع الإيجار:</Text>
            <Text style={styles.value}>{isCommercial ? 'تجاري (خاضع للضريبة)' : 'سكني (معفى من الضريبة)'}</Text>
          </View>
          <View style={styles.row}>
            <Text style={styles.label}>رقم العقد في إيجار:</Text>
            <Text style={styles.value}>{contract?.ejar_contract_number || '-'}</Text>
          </View>
        </View>

        {/* Payment Details Table */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>تفاصيل الدفعة</Text>
          <View style={styles.table}>
            <View style={styles.tableHeader}>
              <Text style={styles.tableHeaderCell}>الإجمالي</Text>
              <Text style={styles.tableHeaderCell}>VAT</Text>
              <Text style={styles.tableHeaderCell}>المبلغ</Text>
              <Text style={styles.tableHeaderCell}>البيان</Text>
            </View>
            <View style={styles.tableRow}>
              <Text style={styles.tableCell}>{payment.total_amount?.toFixed(2)}</Text>
              <Text style={styles.tableCell}>{isCommercial ? payment.vat_amount?.toFixed(2) : '0.00'}</Text>
              <Text style={styles.tableCell}>{payment.amount?.toFixed(2)}</Text>
              <Text style={styles.tableCell}>{isCommercial ? 'إيجار تجاري' : 'إيجار سكني'}</Text>
            </View>
          </View>

          {/* Summary */}
          <View style={styles.summary}>
            <View style={styles.summaryRow}>
              <Text>المبلغ قبل الضريبة:</Text>
              <Text>{payment.amount?.toFixed(2)} ر.س</Text>
            </View>
            <View style={styles.summaryRow}>
              <Text>الضريبة المضافة (15%):</Text>
              <Text>{isCommercial ? payment.vat_amount?.toFixed(2) : '0.00'} ر.س</Text>
            </View>
            <View style={styles.totalRow}>
              <Text style={styles.totalLabel}>المجموع الكلي:</Text>
              <Text style={styles.totalValue}>{payment.total_amount?.toFixed(2)} ر.س</Text>
            </View>
          </View>
        </View>

        {/* ZATCA QR Code (commercial only) */}
        {isCommercial && qrCodeDataUrl && (
          <View style={styles.qrSection}>
            <Image src={qrCodeDataUrl} style={styles.qrImage} />
          </View>
        )}

        {/* Footer */}
        <View style={styles.footer}>
          <Text>هذه الفاتورة إلكترونية ومعتمدة وفقاً لمتطلبات هيئة الزكاة والضريبة والجمارك</Text>
        </View>
      </Page>
    </Document>
  );

  return (
    <PDFDownloadLink
      document={InvoiceDocument}
      fileName={payment.invoice_number ? `${payment.invoice_number}.pdf` : 'invoice.pdf'}
    >
      {({ loading }) => (
        <Button
          size="small"
          icon={<DownloadOutlined />}
          disabled={loading || (isCommercial && !qrReady)}
          loading={loading}
        >
          {loading ? '...' : 'PDF'}
        </Button>
      )}
    </PDFDownloadLink>
  );
};
