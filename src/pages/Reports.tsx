import { useState, useEffect } from 'react';
import { Card, Table, Tag, Spin, Statistic, Tabs, Empty, Progress } from 'antd';
import {
  DollarCircleOutlined, FileTextOutlined, PercentageOutlined,
  CalculatorOutlined, HomeOutlined, ArrowUpOutlined,
} from '@ant-design/icons';
import { supabase } from '../lib/supabase';
import styles from './Reports.module.css';

interface PaymentWithVAT {
  id: string;
  amount: number;
  vat_amount: number;
  total_amount: number;
  due_date: string;
  paid_date: string;
  status: string;
  created_at: string;
  invoice_number: string;
  contract: { unit: { is_commercial: boolean } | null } | null;
}

interface MonthlyVATRow {
  month: string; monthKey: string;
  taxableSales: number; vatCollected: number;
  exemptSales: number; totalAmount: number; invoiceCount: number;
}

interface RevenueRow {
  month: string; monthKey: string;
  collected: number; overdue: number; pending: number; total: number;
}

interface OccupancyRow {
  name: string; id: string;
  totalUnits: number; rentedUnits: number; rate: number;
  topUnit: string; topRevenue: number;
}

const ReportsPage = () => {
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('vat');
  const [payments, setPayments] = useState<PaymentWithVAT[]>([]);
  const [monthlyVAT, setMonthlyVAT] = useState<MonthlyVATRow[]>([]);
  const [revenueData, setRevenueData] = useState<RevenueRow[]>([]);
  const [occupancyData, setOccupancyData] = useState<OccupancyRow[]>([]);

  useEffect(() => {
    loadAll();
  }, []);

  const loadAll = async () => {
    try {
      setLoading(true);

      const [payRes, unitsRes, propertiesRes, contractsRes] = await Promise.all([
        supabase.from('payments').select(`
          id, amount, vat_amount, total_amount, due_date, paid_date, status, created_at, invoice_number,
          contract:contracts (unit:units (is_commercial))
        `).not('status', 'eq', 'pending').order('created_at', { ascending: false }),

        supabase.from('units').select('id, property_id, status, rent_price, unit_number'),
        supabase.from('properties').select('id, name_ar'),
        supabase.from('contracts').select('id, unit_id, tenant:tenants(full_name_ar), unit:units(unit_number, property:properties(name_ar))'),
      ]);

      if (payRes.error) throw payRes.error;
      const data = payRes.data || [];
      setPayments(data);
      buildVATReport(data);
      buildRevenueReport(data);
      buildOccupancyReport(unitsRes.data || [], propertiesRes.data || []);
    } catch (err: any) {
      console.error('Error:', err);
    } finally {
      setLoading(false);
    }
  };

  const buildVATReport = (data: PaymentWithVAT[]) => {
    const map = new Map<string, MonthlyVATRow>();
    for (const p of data) {
      const d = new Date(p.paid_date || p.due_date || p.created_at);
      const k = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
      const lbl = d.toLocaleDateString('ar-SA', { month: 'long', year: 'numeric' });
      const isComm = p.contract?.unit?.is_commercial === true;
      const r = map.get(k) || { month: lbl, monthKey: k, taxableSales: 0, vatCollected: 0, exemptSales: 0, totalAmount: 0, invoiceCount: 0 };
      if (isComm) { r.taxableSales += p.amount || 0; r.vatCollected += p.vat_amount || 0; }
      else { r.exemptSales += p.amount || 0; }
      r.totalAmount += p.total_amount || 0; r.invoiceCount += 1;
      map.set(k, r);
    }
    setMonthlyVAT(Array.from(map.values()).sort((a, b) => a.monthKey.localeCompare(b.monthKey)));
  };

  const buildRevenueReport = (data: PaymentWithVAT[]) => {
    const map = new Map<string, RevenueRow>();
    for (const p of data) {
      const d = new Date(p.paid_date || p.due_date || p.created_at);
      const k = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
      const lbl = d.toLocaleDateString('ar-SA', { month: 'long', year: 'numeric' });
      const r = map.get(k) || { month: lbl, monthKey: k, collected: 0, overdue: 0, pending: 0, total: 0 };
      const amt = p.total_amount || 0;
      r.total += amt;
      if (p.status === 'paid') r.collected += amt;
      else if (p.status === 'overdue') r.overdue += amt;
      else r.pending += amt;
      map.set(k, r);
    }
    setRevenueData(Array.from(map.values()).sort((a, b) => a.monthKey.localeCompare(b.monthKey)));
  };

  const buildOccupancyReport = (units: any[], properties: any[]) => {
    const propMap = new Map(properties.map(p => [p.id, p.name_ar]));
    const grouped = new Map<string, { total: number; rented: number }>();
    for (const u of units) {
      const g = grouped.get(u.property_id) || { total: 0, rented: 0 };
      g.total += 1;
      if (u.status === 'rented') g.rented += 1;
      grouped.set(u.property_id, g);
    }
    const data: OccupancyRow[] = [];
    for (const [propId, g] of grouped) {
      data.push({
        id: propId, name: propMap.get(propId) || '-',
        totalUnits: g.total, rentedUnits: g.rented,
        rate: g.total > 0 ? Math.round((g.rented / g.total) * 1000) / 10 : 0,
        topUnit: '', topRevenue: 0,
      });
    }
    setOccupancyData(data.sort((a, b) => b.rate - a.rate));
  };

  const vatTotals = monthlyVAT.reduce((a, r) => ({
    taxableSales: a.taxableSales + r.taxableSales, vatCollected: a.vatCollected + r.vatCollected,
    exemptSales: a.exemptSales + r.exemptSales, totalAmount: a.totalAmount + r.totalAmount, invoiceCount: a.invoiceCount + r.invoiceCount,
  }), { taxableSales: 0, vatCollected: 0, exemptSales: 0, totalAmount: 0, invoiceCount: 0 });

  const revTotals = revenueData.reduce((a, r) => ({
    collected: a.collected + r.collected, overdue: a.overdue + r.overdue,
    pending: a.pending + r.pending, total: a.total + r.total,
  }), { collected: 0, overdue: 0, pending: 0, total: 0 });

  const occTotals = occupancyData.reduce((a, r) => ({
    totalUnits: a.totalUnits + r.totalUnits, rentedUnits: a.rentedUnits + r.rentedUnits,
  }), { totalUnits: 0, rentedUnits: 0 });

  const vatColumns = [
    { title: 'الشهر', dataIndex: 'month', key: 'month', render: (t: string) => <span style={{ fontWeight: 500, color: '#fff' }}>{t}</span> },
    { title: 'خاضع (ر.س)', dataIndex: 'taxableSales', key: 'taxableSales', render: (v: number) => v.toLocaleString() },
    { title: 'VAT (ر.س)', dataIndex: 'vatCollected', key: 'vatCollected', render: (v: number) => <span style={{ color: '#ffd700', fontWeight: 600 }}>{v.toLocaleString()}</span> },
    { title: 'معفى (ر.س)', dataIndex: 'exemptSales', key: 'exemptSales', render: (v: number) => v.toLocaleString() },
    { title: 'إجمالي (ر.س)', dataIndex: 'totalAmount', key: 'totalAmount', render: (v: number) => <span style={{ color: '#52c41a', fontWeight: 600 }}>{v.toLocaleString()}</span> },
    { title: 'فواتير', dataIndex: 'invoiceCount', key: 'invoiceCount', render: (v: number) => <Tag color="blue">{v}</Tag> },
  ];

  const revColumns = [
    { title: 'الشهر', dataIndex: 'month', key: 'month', render: (t: string) => <span style={{ fontWeight: 500, color: '#fff' }}>{t}</span> },
    { title: 'محصل (ر.س)', dataIndex: 'collected', key: 'collected', render: (v: number) => <span style={{ color: '#52c41a' }}>{v.toLocaleString()}</span> },
    { title: 'متأخر (ر.س)', dataIndex: 'overdue', key: 'overdue', render: (v: number) => <span style={{ color: v > 0 ? '#ff4d4f' : '#666' }}>{v.toLocaleString()}</span> },
    { title: 'معلق (ر.س)', dataIndex: 'pending', key: 'pending', render: (v: number) => <span style={{ color: '#fa8c16' }}>{v.toLocaleString()}</span> },
    { title: 'الإجمالي (ر.س)', dataIndex: 'total', key: 'total', render: (v: number) => <span style={{ color: '#ffd700', fontWeight: 600 }}>{v.toLocaleString()}</span> },
  ];

  const occColumns = [
    { title: 'العقار', dataIndex: 'name', key: 'name', render: (t: string) => <span style={{ color: '#fff', fontWeight: 500 }}>{t}</span> },
    { title: 'الوحدات', dataIndex: 'totalUnits', key: 'totalUnits' },
    { title: 'مؤجر', dataIndex: 'rentedUnits', key: 'rentedUnits' },
    { title: 'نسبة الإشغال', dataIndex: 'rate', key: 'rate', render: (v: number) => (
      <Space>
        <Progress percent={v} size="small" strokeColor={v >= 80 ? '#52c41a' : v >= 50 ? '#fa8c16' : '#ff4d4f'} trailColor="#333" format={() => `${v}%`} />
      </Space>
    )},
  ];

  if (loading) return <div className={styles.reportsPage}><div className={styles.loadingContainer}><Spin tip="جاري تحميل..." /></div></div>;

  const renderVAT = () => monthlyVAT.length === 0 ? <Empty description="لا توجد بيانات" /> : (
    <>
      <div className={styles.gridRow}>
        <Card className={styles.statCard}><Statistic title="خاضع للضريبة" value={`ر.س ${vatTotals.taxableSales.toLocaleString()}`} prefix={<DollarCircleOutlined style={{ color: '#ffd700' }} />} /></Card>
        <Card className={styles.statCard}><Statistic title="VAT المحصل" value={`ر.س ${vatTotals.vatCollected.toLocaleString()}`} valueStyle={{ color: '#ffd700' }} prefix={<PercentageOutlined style={{ color: '#ffd700' }} />} /></Card>
        <Card className={styles.statCard}><Statistic title="معفى من VAT" value={`ر.س ${vatTotals.exemptSales.toLocaleString()}`} valueStyle={{ color: '#52c41a' }} prefix={<CalculatorOutlined style={{ color: '#52c41a' }} />} /></Card>
        <Card className={styles.statCard}><Statistic title="الفواتير" value={vatTotals.invoiceCount} prefix={<FileTextOutlined style={{ color: '#1890ff' }} />} /></Card>
      </div>
      <Card className={styles.tableCard} title="التفصيل الشهري">
        <Table columns={vatColumns} dataSource={monthlyVAT} rowKey="monthKey" pagination={false}
          summary={() => (
            <Table.Summary><Table.Summary.Row>
              <Table.Summary.Cell index={0}><strong style={{ color: '#fff' }}>الإجمالي</strong></Table.Summary.Cell>
              <Table.Summary.Cell index={1}><strong>{vatTotals.taxableSales.toLocaleString()}</strong></Table.Summary.Cell>
              <Table.Summary.Cell index={2}><strong style={{ color: '#ffd700' }}>{vatTotals.vatCollected.toLocaleString()}</strong></Table.Summary.Cell>
              <Table.Summary.Cell index={3}><strong>{vatTotals.exemptSales.toLocaleString()}</strong></Table.Summary.Cell>
              <Table.Summary.Cell index={4}><strong style={{ color: '#52c41a' }}>{vatTotals.totalAmount.toLocaleString()}</strong></Table.Summary.Cell>
              <Table.Summary.Cell index={5}><Tag color="gold">{vatTotals.invoiceCount}</Tag></Table.Summary.Cell>
            </Table.Summary.Row></Table.Summary>
          )}
          scroll={{ x: 'max-content' }} />
      </Card>
    </>
  );

  const renderRevenue = () => revenueData.length === 0 ? <Empty description="لا توجد بيانات" /> : (
    <>
      <div className={styles.gridRow}>
        <Card className={styles.statCard}><Statistic title="الإيرادات المحصلة" value={`ر.س ${revTotals.collected.toLocaleString()}`} prefix={<DollarCircleOutlined style={{ color: '#52c41a' }} />} /></Card>
        <Card className={styles.statCard}><Statistic title="المتأخر" value={`ر.س ${revTotals.overdue.toLocaleString()}`} valueStyle={{ color: revTotals.overdue > 0 ? '#ff4d4f' : '#52c41a' }} prefix={<ArrowUpOutlined />} /></Card>
        <Card className={styles.statCard}><Statistic title="المعلق" value={`ر.س ${revTotals.pending.toLocaleString()}`} valueStyle={{ color: '#fa8c16' }} prefix={<CalculatorOutlined />} /></Card>
        <Card className={styles.statCard}><Statistic title="الإجمالي" value={`ر.س ${revTotals.total.toLocaleString()}`} valueStyle={{ color: '#ffd700' }} prefix={<FileTextOutlined />} /></Card>
      </div>
      <Card className={styles.tableCard} title="الإيرادات الشهرية">
        <Table columns={revColumns} dataSource={revenueData} rowKey="monthKey" pagination={false}
          summary={() => (
            <Table.Summary><Table.Summary.Row>
              <Table.Summary.Cell index={0}><strong style={{ color: '#fff' }}>الإجمالي</strong></Table.Summary.Cell>
              <Table.Summary.Cell index={1}><strong style={{ color: '#52c41a' }}>{revTotals.collected.toLocaleString()}</strong></Table.Summary.Cell>
              <Table.Summary.Cell index={2}><strong style={{ color: revTotals.overdue > 0 ? '#ff4d4f' : '#666' }}>{revTotals.overdue.toLocaleString()}</strong></Table.Summary.Cell>
              <Table.Summary.Cell index={3}><strong style={{ color: '#fa8c16' }}>{revTotals.pending.toLocaleString()}</strong></Table.Summary.Cell>
              <Table.Summary.Cell index={4}><strong style={{ color: '#ffd700' }}>{revTotals.total.toLocaleString()}</strong></Table.Summary.Cell>
            </Table.Summary.Row></Table.Summary>
          )}
          scroll={{ x: 'max-content' }} />
      </Card>
    </>
  );

  const renderOccupancy = () => occupancyData.length === 0 ? <Empty description="لا توجد بيانات" /> : (
    <>
      <div className={styles.gridRow}>
        <Card className={styles.statCard}><Statistic title="إجمالي الوحدات" value={occTotals.totalUnits} prefix={<HomeOutlined style={{ color: '#1890ff' }} />} /></Card>
        <Card className={styles.statCard}><Statistic title="الوحدات المؤجرة" value={occTotals.rentedUnits} valueStyle={{ color: '#52c41a' }} prefix={<HomeOutlined />} /></Card>
        <Card className={styles.statCard}><Statistic title="الشاغرة" value={occTotals.totalUnits - occTotals.rentedUnits} valueStyle={{ color: occTotals.totalUnits - occTotals.rentedUnits > 0 ? '#ff4d4f' : '#52c41a' }} prefix={<HomeOutlined />} /></Card>
        <Card className={styles.statCard}><Statistic title="نسبة الإشغال" value={`${occTotals.totalUnits > 0 ? Math.round((occTotals.rentedUnits / occTotals.totalUnits) * 1000) / 10 : 0}%`} valueStyle={{ color: '#ffd700' }} prefix={<PercentageOutlined />} /></Card>
      </div>
      <Card className={styles.tableCard} title="الإشغال حسب العقار">
        <Table columns={occColumns} dataSource={occupancyData} rowKey="id" pagination={false} scroll={{ x: 'max-content' }} />
      </Card>
    </>
  );

  return (
    <div className={styles.reportsPage}>
      <div className={styles.pageHeader}>
        <h1>التقارير</h1>
        <p className={styles.subtitle}>تقارير شاملة لإدارة العقارات</p>
      </div>
      <Tabs
        activeKey={activeTab}
        onChange={setActiveTab}
        items={[
          { key: 'vat', label: <span><PercentageOutlined /> VAT</span>, children: renderVAT() },
          { key: 'revenue', label: <span><DollarCircleOutlined /> الإيرادات</span>, children: renderRevenue() },
          { key: 'occupancy', label: <span><HomeOutlined /> الإشغال</span>, children: renderOccupancy() },
        ]}
      />
    </div>
  );
};

export default ReportsPage;
