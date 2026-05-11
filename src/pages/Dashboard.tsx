import { Card, Statistic, Tag, Spin, Space, Typography, List, Avatar } from 'antd';
import {
  DollarCircleOutlined,
  HomeOutlined,
  CalendarOutlined,
  ToolOutlined,
  WarningOutlined,
  CheckCircleOutlined,
  CloseCircleOutlined,
  BarChartOutlined,
  FileTextOutlined,
} from '@ant-design/icons';
import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { Column } from '@ant-design/charts';
import styles from './Dashboard.module.css';
import { useNavigate } from 'react-router-dom';

const { Text } = Typography;

interface MonthlyRevenue {
  month: string;
  revenue: number;
}

interface DuePayment {
  id: string;
  total_amount: number;
  due_date: string;
  status: string;
  contract: {
    tenant: { full_name_ar: string };
  } | null;
}

interface ExpiringContract {
  id: string;
  end_date: string;
  status: string;
  tenant: { full_name_ar: string } | null;
  unit: {
    unit_number: string;
    property: { name_ar: string } | null;
  } | null;
}

interface MaintenanceItem {
  id: string;
  title: string;
  priority: string;
  status: string;
  unit: { unit_number: string } | null;
}

const DashboardPage = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [stats, setStats] = useState({
    totalRevenue: 0,
    collected: 0,
    overdue: 0,
    occupancyRate: 0,
  });
  const [monthlyRevenue, setMonthlyRevenue] = useState<MonthlyRevenue[]>([]);
  const [duePayments, setDuePayments] = useState<DuePayment[]>([]);
  const [expiringContracts, setExpiringContracts] = useState<ExpiringContract[]>([]);
  const [maintenanceItems, setMaintenanceItems] = useState<MaintenanceItem[]>([]);

  useEffect(() => {
    loadDashboardData();
  }, []);

  const loadDashboardData = async () => {
    try {
      setLoading(true);
      setError(null);

      const [
        paymentsResult,
        unitsResult,
        duePaymentsResult,
        contractsResult,
        maintenanceResult,
      ] = await Promise.all([
        supabase.from('payments').select('amount, vat_amount, total_amount, status, due_date, paid_date, created_at'),
        supabase.from('units').select('status'),
        supabase.from('payments').select(`
          id, total_amount, due_date, status,
          contract:contracts (
            tenant:tenants (full_name_ar)
          )
        `).in('status', ['pending', 'overdue']).order('due_date', { ascending: true }).limit(5),
        supabase.from('contracts').select(`
          id, end_date, status,
          tenant:tenants (full_name_ar),
          unit:units (
            unit_number,
            property:properties (name_ar)
          )
        `).eq('status', 'active').order('end_date', { ascending: true }).limit(5),
        supabase.from('maintenance_requests').select(`
          id, title, priority, status,
          unit:units (unit_number)
        `).in('status', ['open', 'in_progress']).order('created_at', { ascending: false }).limit(5),
      ]);

      if (paymentsResult.error) throw paymentsResult.error;
      if (unitsResult.error) throw unitsResult.error;
      if (duePaymentsResult.error) throw duePaymentsResult.error;
      if (contractsResult.error) throw contractsResult.error;
      if (maintenanceResult.error) throw maintenanceResult.error;

      const payments = paymentsResult.data || [];
      const units = unitsResult.data || [];

      const totalRevenue = payments.reduce((sum, p) => sum + (p.total_amount || 0), 0);
      const collected = payments.reduce((sum, p) => sum + (p.status === 'paid' ? (p.total_amount || 0) : 0), 0);
      const overdue = payments.reduce((sum, p) => sum + (p.status === 'overdue' ? (p.total_amount || 0) : 0), 0);

      const totalUnits = units.length;
      const rentedUnits = units.filter(u => u.status === 'rented').length;
      const occupancyRate = totalUnits > 0 ? (rentedUnits / totalUnits) * 100 : 0;

      setStats({
        totalRevenue,
        collected,
        overdue,
        occupancyRate: Math.round(occupancyRate * 10) / 10,
      });

      const monthlyData: MonthlyRevenue[] = [];
      const now = new Date();
      for (let i = 11; i >= 0; i--) {
        const date = new Date(now.getFullYear(), now.getMonth() - i, 1);
        const monthKey = date.toISOString().slice(0, 7);
        const monthPayments = payments.filter(p => {
          const paymentDate = new Date(p.paid_date || p.due_date || p.created_at);
          return paymentDate.toISOString().slice(0, 7) === monthKey;
        });
        const monthTotal = monthPayments.reduce((sum, p) => sum + (p.total_amount || 0), 0);
        monthlyData.push({
          month: date.toLocaleDateString('ar-SA', { month: 'short', year: 'numeric' }),
          revenue: monthTotal,
        });
      }
      setMonthlyRevenue(monthlyData);

      setDuePayments(duePaymentsResult.data || []);
      setExpiringContracts(contractsResult.data || []);
      setMaintenanceItems(maintenanceResult.data || []);
    } catch (err: any) {
      console.error('Error loading dashboard:', err);
      setError(err.message || 'فشل تحميل البيانات');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className={styles.dashboard}>
        <div className={styles.loading}>
          <Spin tip="جاري تحميل البيانات..." />
        </div>
      </div>
    );
  }

  const overdueChange = stats.overdue > 0
    ? ((stats.overdue / (stats.totalRevenue || 1)) * 100).toFixed(1)
    : '0';

  const columnConfig = {
    data: monthlyRevenue,
    xField: 'month',
    yField: 'revenue',
    color: '#ffd700',
    columnStyle: { radius: [4, 4, 0, 0] },
    meta: {
      revenue: { alias: 'الإيرادات (ر.س)' },
    },
    tooltip: {
      formatter: (datum: any) => ({
        name: 'الإيرادات',
        value: `${datum.revenue?.toLocaleString()} ر.س`,
      }),
    },
    axis: {
      x: {
        label: { style: { fill: '#999' } },
      },
      y: {
        label: {
          style: { fill: '#999' },
          formatter: (v: string) => `${(Number(v) / 1000).toFixed(0)}k`,
        },
      },
    },
  };

  const renderStatusTag = (status: string) => {
    const colors: Record<string, string> = {
      paid: 'green', pending: 'orange', overdue: 'red',
      active: 'blue', expired: 'default', terminated: 'red',
      open: 'orange', in_progress: 'processing', completed: 'green',
    };
    const labels: Record<string, string> = {
      paid: 'مدفوع', pending: 'مستحق', overdue: 'متأخر',
      active: 'نشط', expired: 'منتهي', terminated: 'ملغي',
      open: 'مفتوح', in_progress: 'قيد التنفيذ', completed: 'مكتمل',
    };
    return <Tag color={colors[status] || 'default'}>{labels[status] || status}</Tag>;
  };

  const renderPriorityTag = (priority: string) => {
    const colors: Record<string, string> = { low: 'green', medium: 'blue', high: 'orange', urgent: 'red' };
    const labels: Record<string, string> = { low: 'منخفضة', medium: 'متوسطة', high: 'عالية', urgent: 'عاجلة' };
    return <Tag color={colors[priority] || 'default'}>{labels[priority] || priority}</Tag>;
  };

  return (
    <div className={styles.dashboard}>
      <div className={styles.header}>
        <h1>لوحة التحكم</h1>
        <p>ملخص شامل لأداء العقارات</p>
      </div>

      {/* Stats Cards */}
      <div className={styles.gridRow}>
        <Card className={styles.statCard}>
          <Statistic
            title="إجمالي الإيرادات"
            value={`ر.س ${stats.totalRevenue.toLocaleString()}`}
            precision={2}
            prefix={<DollarCircleOutlined style={{ fontSize: '1.5rem', color: '#ffd700' }} />}
          />
        </Card>
        <Card className={styles.statCard}>
          <Statistic
            title="المحصّل"
            value={`ر.س ${stats.collected.toLocaleString()}`}
            precision={2}
            prefix={<CheckCircleOutlined style={{ fontSize: '1.5rem', color: '#52c41a' }} />}
            suffix={<Tag color="green">مُسدَّد</Tag>}
          />
        </Card>
        <Card className={styles.statCard}>
          <Statistic
            title="المتأخر"
            value={`ر.س ${stats.overdue.toLocaleString()}`}
            precision={2}
            valueStyle={{ color: stats.overdue > 0 ? '#ff4d4f' : '#52c41a' }}
            prefix={<CloseCircleOutlined style={{ fontSize: '1.5rem' }} />}
            suffix={<Tag color={stats.overdue > 0 ? 'red' : 'green'}>{overdueChange}%</Tag>}
          />
        </Card>
        <Card className={styles.statCard}>
          <Statistic
            title="نسبة الإشغال"
            value={`${stats.occupancyRate}%`}
            precision={1}
            prefix={<HomeOutlined style={{ fontSize: '1.5rem', color: '#1890ff' }} />}
          />
        </Card>
      </div>

      {/* Revenue Chart */}
      <div className={styles.section}>
        <h2><DollarCircleOutlined /> الإيرادات الشهرية (آخر 12 شهر)</h2>
        <div className={styles.chartContainer}>
          {monthlyRevenue.length > 0 ? (
            <Column {...columnConfig} />
          ) : (
            <div className={styles.chartPlaceholder}>
              <BarChartOutlined style={{ fontSize: '3rem', color: 'rgba(255,215,0,0.3)' }} />
              <p className={styles.chartText}>لا توجد بيانات إيرادات بعد</p>
            </div>
          )}
        </div>
      </div>

      {/* Lists Row */}
      <div className={styles.gridRow}>
        {/* Due Payments */}
        <Card
          className={styles.infoCard}
          title={<span><WarningOutlined style={{ color: '#fa8c16' }} /> أقرب 5 دفعات مستحقة</span>}
        >
          {duePayments.length === 0 ? (
            <div className={styles.emptyState}>
              <CheckCircleOutlined style={{ fontSize: 32, color: '#52c41a' }} />
              <p>لا توجد دفعات مستحقة</p>
            </div>
          ) : (
            <List
              dataSource={duePayments}
              renderItem={(item) => (
                <List.Item
                  className={styles.listItem}
                  onClick={() => navigate('/payments')}
                >
                  <List.Item.Meta
                    avatar={<Avatar icon={<DollarCircleOutlined />} className={styles.avatarGold} />}
                    title={
                      <Space>
                        <Text className={styles.itemTitle}>{item.contract?.tenant?.full_name_ar || '-'}</Text>
                        {renderStatusTag(item.status)}
                      </Space>
                    }
                    description={
                      <Space direction="vertical" size={0}>
                        <Text className={styles.itemDesc}>
                          <CalendarOutlined /> {item.due_date ? new Date(item.due_date).toLocaleDateString('ar-SA') : '-'}
                        </Text>
                        <Text className={styles.itemAmount}>ر.س {item.total_amount?.toLocaleString()}</Text>
                      </Space>
                    }
                  />
                </List.Item>
              )}
            />
          )}
        </Card>

        {/* Expiring Contracts */}
        <Card
          className={styles.infoCard}
          title={<span><CalendarOutlined style={{ color: '#1890ff' }} /> أقرب 5 عقود تنتهي</span>}
        >
          {expiringContracts.length === 0 ? (
            <div className={styles.emptyState}>
              <CheckCircleOutlined style={{ fontSize: 32, color: '#52c41a' }} />
              <p>لا توجد عقود تنتهي قريباً</p>
            </div>
          ) : (
            <List
              dataSource={expiringContracts}
              renderItem={(item) => {
                const daysLeft = Math.ceil(
                  (new Date(item.end_date).getTime() - Date.now()) / (1000 * 60 * 60 * 24)
                );
                const isUrgent = daysLeft <= 30;
                const isWarning = daysLeft <= 90;
                return (
                  <List.Item
                    className={styles.listItem}
                    onClick={() => navigate('/contracts')}
                  >
                    <List.Item.Meta
                      avatar={
                        <Avatar
                          icon={<FileTextOutlined />}
                          className={isUrgent ? styles.avatarRed : isWarning ? styles.avatarOrange : styles.avatarBlue}
                        />
                      }
                      title={
                        <Space>
                          <Text className={styles.itemTitle}>{item.tenant?.full_name_ar || '-'}</Text>
                          <Tag color={isUrgent ? 'red' : isWarning ? 'orange' : 'blue'}>
                            {daysLeft <= 0 ? 'منتهي' : `${daysLeft} يوم`}
                          </Tag>
                        </Space>
                      }
                      description={
                        <Text className={styles.itemDesc}>
                          {item.unit?.property?.name_ar || '-'} - وحدة {item.unit?.unit_number || '-'}
                          {' | '}
                          ينتهي: {new Date(item.end_date).toLocaleDateString('ar-SA')}
                        </Text>
                      }
                    />
                  </List.Item>
                );
              }}
            />
          )}
        </Card>
      </div>

      {/* Maintenance Requests */}
      <div className={styles.section}>
        <Card
          className={styles.infoCard}
          title={<span><ToolOutlined style={{ color: '#ff4d4f' }} /> طلبات الصيانة المفتوحة</span>}
        >
          {maintenanceItems.length === 0 ? (
            <div className={styles.emptyState}>
              <CheckCircleOutlined style={{ fontSize: 32, color: '#52c41a' }} />
              <p>لا توجد طلبات صيانة مفتوحة</p>
            </div>
          ) : (
            <List
              dataSource={maintenanceItems}
              renderItem={(item) => (
                <List.Item
                  className={styles.listItem}
                  onClick={() => navigate('/maintenance')}
                >
                  <List.Item.Meta
                    avatar={
                      <Avatar
                        icon={<ToolOutlined />}
                        className={item.priority === 'urgent' ? styles.avatarRed : item.priority === 'high' ? styles.avatarOrange : styles.avatarBlue}
                      />
                    }
                    title={
                      <Space>
                        <Text className={styles.itemTitle}>{item.title}</Text>
                        {renderPriorityTag(item.priority)}
                        {renderStatusTag(item.status)}
                      </Space>
                    }
                    description={
                      <Text className={styles.itemDesc}>
                        وحدة {item.unit?.unit_number || '-'}
                      </Text>
                    }
                  />
                </List.Item>
              )}
            />
          )}
        </Card>
      </div>
    </div>
  );
};

export default DashboardPage;
