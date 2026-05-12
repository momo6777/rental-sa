import React, { useEffect, useState } from 'react';
import { Document, Page, Text, View, Image, StyleSheet, PDFDownloadLink, Font } from '@react-pdf/renderer';
import { Button } from 'antd';
import { DownloadOutlined } from '@ant-design/icons';
import { getCompanySettings, CompanySettings } from '../lib/companySettings';

Font.register({ family: 'Amiri', src: '/fonts/Amiri-Regular.ttf' });

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
    padding: 25,
    paddingTop: 30,
    fontFamily: 'Amiri',
    direction: 'rtl',
  },
  logo: {
    width: 60,
    height: 60,
    objectFit: 'contain',
  },
  header: {
    marginBottom: 16,
    borderBottomWidth: 2,
    borderBottomColor: '#1a6d4c',
    borderBottomStyle: 'solid',
    paddingBottom: 10,
  },
  headerRow: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    gap: 12,
  },
  headerTextCol: {
    flex: 1,
  },
  title: {
    fontSize: 22,
    textAlign: 'center',
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 11,
    textAlign: 'center',
    color: '#666',
  },
  section: {
    marginBottom: 10,
  },
  sectionTitle: {
    fontSize: 12,
    backgroundColor: '#e8f5e9',
    padding: 4,
    paddingLeft: 8,
    paddingRight: 8,
    marginBottom: 6,
    textAlign: 'right',
  },
  row: {
    flexDirection: 'row-reverse',
    marginBottom: 2,
  },
  label: {
    fontSize: 9,
    width: 100,
    color: '#666',
    textAlign: 'right',
  },
  value: {
    fontSize: 9,
    textAlign: 'right',
  },
  amountBox: {
    marginTop: 10,
    padding: 10,
    borderWidth: 1,
    borderColor: '#1a6d4c',
    borderStyle: 'solid',
    borderRadius: 4,
  },
  amountLabel: {
    fontSize: 10,
    color: '#666',
    marginBottom: 3,
  },
  amountText: {
    fontSize: 16,
    fontWeight: 'bold',
    textAlign: 'center',
    color: '#1a6d4c',
  },
  amountWords: {
    fontSize: 9,
    textAlign: 'center',
    color: '#666',
    marginTop: 3,
  },
  footer: {
    position: 'absolute',
    bottom: 20,
    left: 25,
    right: 25,
    textAlign: 'center',
    borderTopWidth: 1,
    borderTopColor: '#ddd',
    borderTopStyle: 'solid',
    paddingTop: 6,
    fontSize: 8,
    color: '#999',
  },
  metadataRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 6,
  },
  metadataItem: {
    fontSize: 9,
    color: '#666',
    textAlign: 'right',
  },
  signature: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 20,
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

export type GeneralExpenseVoucherData = {
  id: string;
  description: string;
  amount: number;
  category: string;
  expenseDate: string;
  notes?: string;
};

type Props = {
  data: GeneralExpenseVoucherData;
};

function numberToArabicWords(num: number): string {
  if (num === 0) return 'صفر';
  const units = ['', 'واحد', 'اثنان', 'ثلاثة', 'أربعة', 'خمسة', 'ستة', 'سبعة', 'ثمانية', 'تسعة'];
  const tens = ['', 'عشرة', 'عشرون', 'ثلاثون', 'أربعون', 'خمسون', 'ستون', 'سبعون', 'ثمانون', 'تسعون'];
  if (num < 10) return units[num];
  if (num < 100) return tens[Math.floor(num / 10)] + (num % 10 ? ' و' + units[num % 10] : '');
  if (num < 1000) {
    if (num === 100) return 'مائة';
    if (num === 200) return 'مائتان';
    return hundreds(num);
  }
  return num.toLocaleString('ar-SA');
}

function hundreds(num: number): string {
  const h = Math.floor(num / 100);
  const r = num % 100;
  const hWords = ['', 'مائة', 'مائتان', 'ثلاثمائة', 'أربعمائة', 'خمسمائة', 'ستمائة', 'سبعمائة', 'ثمانمائة', 'تسعمائة'];
  let result = hWords[h];
  if (r > 0) result += ' و' + numberToArabicWords(r);
  return result;
}

export const GeneralExpenseVoucherPDF: React.FC<Props> = ({ data }) => {
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

  const amountWords = numberToArabicWords(Math.floor(data.amount)) + ' ريالاً' + (data.amount % 1 ? ' و' + Math.round((data.amount % 1) * 100) + ' هللة' : '');

  const categoryLabels: Record<string, string> = {
    'الرواتب والأجور': 'رواتب وأجور',
    'برامج محاسبية': 'برامج محاسبية',
    'إيجار المكتب': 'إيجار مكتب',
    'فواتير كهرباء وماء': 'فواتير',
    'الإنترنت والاتصالات': 'إنترنت واتصالات',
    'تسويق وإعلان': 'تسويق وإعلان',
    'رسوم حكومية': 'رسوم حكومية',
    'استشارات قانونية': 'استشارات قانونية',
    'صيانة عامة': 'صيانة عامة',
    'لوازم مكتبية': 'لوازم مكتبية',
    'تأمين': 'تأمين',
    'أخرى': 'أخرى',
  };

  const DocumentContent = (
    <Document>
      <Page size="A4" style={styles.page}>
        <View style={styles.header}>
          <View style={styles.headerRow}>
            {settings.logo_url && (
              <Image src={settings.logo_url} style={styles.logo} />
            )}
            <View style={styles.headerTextCol}>
              <Text style={styles.title}>سند مصروف</Text>
              <Text style={styles.subtitle}>{data.id?.slice(0, 8) || '-'}</Text>
            </View>
          </View>
          <View style={styles.metadataRow}>
            <Text style={styles.metadataItem}>التاريخ: {formatDate(data.expenseDate)}</Text>
            <Text style={styles.metadataItem}>رقم السند: {data.id?.slice(0, 8) || '-'}</Text>
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
          <Text style={styles.sectionTitle}>بيان المصروف</Text>
          <View style={styles.row}>
            <Text style={styles.label}>البيان:</Text>
            <Text style={styles.value}>{data.description}</Text>
          </View>
          <View style={styles.row}>
            <Text style={styles.label}>التصنيف:</Text>
            <Text style={styles.value}>{categoryLabels[data.category] || data.category}</Text>
          </View>
          <View style={styles.row}>
            <Text style={styles.label}>التاريخ:</Text>
            <Text style={styles.value}>{formatDate(data.expenseDate)}</Text>
          </View>
          {data.notes && (
            <View style={styles.row}>
              <Text style={styles.label}>ملاحظات:</Text>
              <Text style={styles.value}>{data.notes}</Text>
            </View>
          )}
        </View>

        <View style={styles.amountBox}>
          <Text style={styles.amountLabel}>المبلغ</Text>
          <Text style={styles.amountText}>{data.amount.toFixed(2)} ر.س</Text>
          <Text style={styles.amountWords}>{amountWords}</Text>
        </View>

        <View style={styles.signature}>
          <View>
            <Text style={styles.signatureLine}>المصرف</Text>
          </View>
          <View>
            <Text style={styles.signatureLine}>المدير المالي</Text>
          </View>
        </View>

        <View style={styles.footer}>
          <Text>سند مصروف إلكتروني - {settings.company_name_ar}</Text>
        </View>
      </Page>
    </Document>
  );

  return (
    <PDFDownloadLink
      document={DocumentContent}
      fileName={`expense-${data.id?.slice(0, 8) || 'voucher'}.pdf`}
    >
      {({ loading }) => (
        <Button
          size="small"
          icon={<DownloadOutlined />}
          disabled={loading}
          loading={loading}
        >
          {loading ? '...' : 'سند مصروف'}
        </Button>
      )}
    </PDFDownloadLink>
  );
};
