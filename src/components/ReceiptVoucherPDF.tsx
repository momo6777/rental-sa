import React, { useEffect, useState } from 'react';
import { Document, Page, Text, View, StyleSheet, PDFDownloadLink, Font } from '@react-pdf/renderer';
import { Button } from 'antd';
import { DownloadOutlined } from '@ant-design/icons';
import { getCompanySettings, CompanySettings } from '../lib/companySettings';

Font.register({
  family: 'Amiri',
  src: 'https://fonts.gstatic.com/s/amiri/v30/J7aRnpd8CGxBHpUrtLMA7w.woff2',
});

const DEFAULT_SETTINGS: CompanySettings = {
  id: '',
  company_name_ar: 'شركة عقارات للإدارة والتأجير',
  vat_number: '310123456700003',
  company_address: 'الرياض، المملكة العربية السعودية',
  vat_rate: 0.15,
  notification_days_before_expiry: 90,
};

const styles = StyleSheet.create({
  page: {
    padding: 40,
    fontFamily: 'Amiri',
    direction: 'rtl',
  },
  header: {
    marginBottom: 30,
    borderBottomWidth: 2,
    borderBottomColor: '#1b5e20',
    borderBottomStyle: 'solid',
    paddingBottom: 15,
  },
  title: {
    fontSize: 24,
    textAlign: 'center',
    marginBottom: 5,
  },
  subtitle: {
    fontSize: 12,
    textAlign: 'center',
    color: '#666',
  },
  section: {
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 14,
    backgroundColor: '#e8f5e9',
    padding: 5,
    paddingLeft: 10,
    paddingRight: 10,
    marginBottom: 10,
  },
  row: {
    flexDirection: 'row',
    marginBottom: 4,
  },
  label: {
    fontSize: 11,
    width: 120,
    color: '#666',
  },
  value: {
    fontSize: 11,
  },
  amountBox: {
    marginTop: 20,
    padding: 15,
    borderWidth: 1,
    borderColor: '#1b5e20',
    borderStyle: 'solid',
    borderRadius: 4,
  },
  amountLabel: {
    fontSize: 12,
    color: '#666',
    marginBottom: 5,
  },
  amountText: {
    fontSize: 18,
    fontWeight: 'bold',
    textAlign: 'center',
    color: '#1b5e20',
  },
  amountWords: {
    fontSize: 10,
    textAlign: 'center',
    color: '#666',
    marginTop: 5,
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
  },
  signature: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 40,
  },
  signatureLine: {
    width: 200,
    borderTopWidth: 1,
    borderTopColor: '#333',
    borderTopStyle: 'solid',
    paddingTop: 5,
    fontSize: 10,
    textAlign: 'center',
  },
});

type Props = {
  payment: any;
};

function numberToArabicWords(num: number): string {
  if (num === 0) return 'صفر';
  const units = ['', 'واحد', 'اثنان', 'ثلاثة', 'أربعة', 'خمسة', 'ستة', 'سبعة', 'ثمانية', 'تسعة'];
  const tens = ['', 'عشرة', 'عشرون', 'ثلاثون', 'أربعون', 'خمسون', 'ستون', 'سبعون', 'ثمانون', 'تسعون'];
  const hundreds = ['', 'مائة', 'مائتان', 'ثلاثمائة', 'أربعمائة', 'خمسمائة', 'ستمائة', 'سبعمائة', 'ثمانمائة', 'تسعمائة'];
  if (num < 10) return units[num];
  if (num < 100) return tens[Math.floor(num / 10)] + (num % 10 ? ' و' + units[num % 10] : '');
  if (num < 1000) return hundreds[Math.floor(num / 100)] + (num % 100 ? ' و' + numberToArabicWords(num % 100) : '');
  return num.toLocaleString('ar-SA');
}

export const ReceiptVoucherPDF: React.FC<Props> = ({ payment }) => {
  const [settings, setSettings] = useState<CompanySettings>(DEFAULT_SETTINGS);

  const contract = payment.contract;
  const unit = contract?.unit;
  const property = unit?.property;
  const tenant = contract?.tenant;
  const isCommercial = unit?.is_commercial;

  useEffect(() => {
    let cancelled = false;
    getCompanySettings().then((s) => { if (!cancelled) setSettings(s); });
    return () => { cancelled = true; };
  }, []);

  const formatDate = (dateStr: string) => {
    if (!dateStr) return '-';
    return new Date(dateStr).toLocaleDateString('ar-SA');
  };

  const totalAmount = payment.total_amount || 0;
  const amountWords = numberToArabicWords(Math.floor(totalAmount)) + ' ريالاً' + (totalAmount % 1 ? ' و' + Math.round((totalAmount % 1) * 100) + ' هللة' : '');

  const DocumentContent = (
    <Document>
      <Page size="A4" style={styles.page}>
        <View style={styles.header}>
          <Text style={styles.title}>سند قبض</Text>
          <Text style={styles.subtitle}>{payment.invoice_number || '-'}</Text>
          <View style={styles.metadataRow}>
            <Text style={styles.metadataItem}>التاريخ: {formatDate(payment.paid_date || payment.created_at)}</Text>
            <Text style={styles.metadataItem}>رقم السند: {payment.id?.slice(0, 8) || '-'}</Text>
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>بيانات الشركة</Text>
          <View style={styles.row}>
            <Text style={styles.label}>الاسم:</Text>
            <Text style={styles.value}>{settings.company_name_ar}</Text>
          </View>
          <View style={styles.row}>
            <Text style={styles.label}>العنوان:</Text>
            <Text style={styles.value}>{settings.company_address || '-'}</Text>
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>وارد من</Text>
          <View style={styles.row}>
            <Text style={styles.label}>اسم المستأجر:</Text>
            <Text style={styles.value}>{tenant?.full_name_ar || '-'}</Text>
          </View>
          <View style={styles.row}>
            <Text style={styles.label}>رقم الهاتف:</Text>
            <Text style={styles.value}>{tenant?.phone || '-'}</Text>
          </View>
          <View style={styles.row}>
            <Text style={styles.label}>العقار:</Text>
            <Text style={styles.value}>{property?.name_ar || '-'} - وحدة {unit?.unit_number || '-'}</Text>
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>تفاصيل السداد</Text>
          <View style={styles.row}>
            <Text style={styles.label}>بيان الدفع:</Text>
            <Text style={styles.value}>{isCommercial ? 'إيجار تجاري' : 'إيجار سكني'}</Text>
          </View>
          <View style={styles.row}>
            <Text style={styles.label}>طريقة الدفع:</Text>
            <Text style={styles.value}>{payment.payment_method === 'cash' ? 'نقود' : payment.payment_method === 'transfer' ? 'تحويل بنكي' : payment.payment_method === 'sadad' ? 'سداد' : payment.payment_method || '-'}</Text>
          </View>
          <View style={styles.row}>
            <Text style={styles.label}>تاريخ الدفع:</Text>
            <Text style={styles.value}>{formatDate(payment.paid_date)}</Text>
          </View>
          {payment.sadad_reference && (
            <View style={styles.row}>
              <Text style={styles.label}>مرجع سداد:</Text>
              <Text style={styles.value}>{payment.sadad_reference}</Text>
            </View>
          )}
        </View>

        <View style={styles.amountBox}>
          <Text style={styles.amountLabel}>المبلغ</Text>
          <Text style={styles.amountText}>{totalAmount.toFixed(2)} ر.س</Text>
          <Text style={styles.amountWords}>{amountWords}</Text>
        </View>

        <View style={styles.signature}>
          <View>
            <Text style={styles.signatureLine}>المستلم</Text>
          </View>
          <View>
            <Text style={styles.signatureLine}>المدير المالي</Text>
          </View>
        </View>

        <View style={styles.footer}>
          <Text>سند قبض إلكتروني - {settings.company_name_ar}</Text>
        </View>
      </Page>
    </Document>
  );

  return (
    <PDFDownloadLink
      document={DocumentContent}
      fileName={`receipt-${payment.invoice_number || payment.id?.slice(0, 8) || 'voucher'}.pdf`}
    >
      {({ loading }) => (
        <Button
          size="small"
          icon={<DownloadOutlined />}
          disabled={loading}
          loading={loading}
        >
          {loading ? '...' : 'سند قبض'}
        </Button>
      )}
    </PDFDownloadLink>
  );
};
