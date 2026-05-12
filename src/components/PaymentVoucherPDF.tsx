import React, { useEffect, useState } from 'react';
import { Document, Page, Text, View, StyleSheet, PDFDownloadLink, Font } from '@react-pdf/renderer';
import { Button } from 'antd';
import { DownloadOutlined } from '@ant-design/icons';
import { getCompanySettings, CompanySettings } from '../lib/companySettings';

Font.register({
  family: 'Amiri',
  src: '/fonts/Amiri-Regular.ttf',
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
    borderBottomColor: '#b71c1c',
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
    backgroundColor: '#ffebee',
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
  amountBox: {
    marginTop: 20,
    padding: 15,
    borderWidth: 1,
    borderColor: '#b71c1c',
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
    color: '#b71c1c',
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
    textAlign: 'right',
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

export type PaymentVoucherData = {
  requestId: string;
  title: string;
  description: string;
  cost: number;
  unitNumber?: string;
  propertyName?: string;
  payeeName: string;
  paymentMethod: string;
  paymentDate: string;
  referenceNumber: string;
};

type Props = {
  data: PaymentVoucherData;
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

export const PaymentVoucherPDF: React.FC<Props> = ({ data }) => {
  const [settings, setSettings] = useState<CompanySettings>(DEFAULT_SETTINGS);

  useEffect(() => {
    let cancelled = false;
    getCompanySettings().then((s) => { if (!cancelled) setSettings(s); });
    return () => { cancelled = true; };
  }, []);

  const formatDate = (dateStr: string) => {
    if (!dateStr) return '-';
    return new Date(dateStr).toLocaleDateString('ar-SA');
  };

  const amountWords = numberToArabicWords(Math.floor(data.cost)) + ' ريالاً' + (data.cost % 1 ? ' و' + Math.round((data.cost % 1) * 100) + ' هللة' : '');

  const DocumentContent = (
    <Document>
      <Page size="A4" style={styles.page}>
        <View style={styles.header}>
          <Text style={styles.title}>سند صرف</Text>
          <Text style={styles.subtitle}>{data.referenceNumber || '-'}</Text>
          <View style={styles.metadataRow}>
            <Text style={styles.metadataItem}>التاريخ: {formatDate(data.paymentDate)}</Text>
            <Text style={styles.metadataItem}>رقم السند: {data.referenceNumber || data.requestId?.slice(0, 8)}</Text>
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
          <View style={styles.row}>
            <Text style={styles.label}>الرقم الضريبي:</Text>
            <Text style={styles.value}>{settings.vat_number || '-'}</Text>
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>صرف إلى</Text>
          <View style={styles.row}>
            <Text style={styles.label}>اسم المستفيد:</Text>
            <Text style={styles.value}>{data.payeeName}</Text>
          </View>
          <View style={styles.row}>
            <Text style={styles.label}>طريقة الدفع:</Text>
            <Text style={styles.value}>{data.paymentMethod === 'cash' ? 'نقود' : data.paymentMethod === 'transfer' ? 'تحويل بنكي' : data.paymentMethod}</Text>
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>بيان الصرف</Text>
          <View style={styles.row}>
            <Text style={styles.label}>الطلب:</Text>
            <Text style={styles.value}>{data.title}</Text>
          </View>
          <View style={styles.row}>
            <Text style={styles.label}>الوصف:</Text>
            <Text style={styles.value}>{data.description}</Text>
          </View>
          {data.propertyName && (
            <View style={styles.row}>
              <Text style={styles.label}>العقار:</Text>
              <Text style={styles.value}>{data.propertyName}{data.unitNumber ? ` - وحدة ${data.unitNumber}` : ''}</Text>
            </View>
          )}
        </View>

        <View style={styles.amountBox}>
          <Text style={styles.amountLabel}>المبلغ</Text>
          <Text style={styles.amountText}>{data.cost.toFixed(2)} ر.س</Text>
          <Text style={styles.amountWords}>{amountWords}</Text>
        </View>

        <View style={styles.signature}>
          <View>
            <Text style={styles.signatureLine}>الصرف</Text>
          </View>
          <View>
            <Text style={styles.signatureLine}>المدير المالي</Text>
          </View>
        </View>

        <View style={styles.footer}>
          <Text>سند صرف إلكتروني - {settings.company_name_ar}</Text>
        </View>
      </Page>
    </Document>
  );

  return (
    <PDFDownloadLink
      document={DocumentContent}
      fileName={`payment-voucher-${data.referenceNumber || data.requestId?.slice(0, 8) || 'voucher'}.pdf`}
    >
      {({ loading }) => (
        <Button
          size="small"
          icon={<DownloadOutlined />}
          disabled={loading}
          loading={loading}
        >
          {loading ? '...' : 'سند صرف'}
        </Button>
      )}
    </PDFDownloadLink>
  );
};
