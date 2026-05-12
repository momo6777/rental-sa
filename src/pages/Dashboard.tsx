import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { useNavigate } from 'react-router-dom';

interface MonthlyRevenue {
  month: string;
  revenue: number;
}

interface DuePayment {
  id: string;
  total_amount: number;
  due_date: string;
  status: string;
  contract: { tenant: { full_name_ar: string } } | null;
}

interface ExpiringContract {
  id: string;
  end_date: string;
  status: string;
  tenant: { full_name_ar: string } | null;
  unit: { unit_number: string; property: { name_ar: string } | null } | null;
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
    totalUnits: 0,
    rentedUnits: 0,
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

      const [paymentsResult, unitsResult, duePaymentsResult, contractsResult, maintenanceResult] =
        await Promise.all([
          supabase.from('payments').select('amount, vat_amount, total_amount, status, due_date, paid_date, created_at'),
          supabase.from('units').select('status'),
          supabase
            .from('payments')
            .select('id, total_amount, due_date, status, contract:contracts(tenant:tenants(full_name_ar))')
            .in('status', ['pending', 'overdue'])
            .order('due_date', { ascending: true })
            .limit(5),
          supabase
            .from('contracts')
            .select('id, end_date, status, tenant:tenants(full_name_ar), unit:units(unit_number, property:properties(name_ar))')
            .eq('status', 'active')
            .order('end_date', { ascending: true })
            .limit(5),
          supabase
            .from('maintenance_requests')
            .select('id, title, priority, status, unit:units(unit_number)')
            .in('status', ['open', 'in_progress'])
            .order('created_at', { ascending: false })
            .limit(5),
        ]);

      if (paymentsResult.error) throw paymentsResult.error;
      if (unitsResult.error) throw unitsResult.error;
      if (duePaymentsResult.error) throw duePaymentsResult.error;
      if (contractsResult.error) throw contractsResult.error;
      if (maintenanceResult.error) throw maintenanceResult.error;

      const payments = paymentsResult.data || [];
      const units = unitsResult.data || [];

      const totalRevenue = payments.reduce((sum, p) => sum + (p.total_amount || 0), 0);
      const collected = payments.reduce(
        (sum, p) => sum + (p.status === 'paid' ? p.total_amount || 0 : 0),
        0
      );
      const overdue = payments.reduce(
        (sum, p) => sum + (p.status === 'overdue' ? p.total_amount || 0 : 0),
        0
      );

      const totalUnits = units.length;
      const rentedUnits = units.filter((u) => u.status === 'rented').length;
      const occupancyRate = totalUnits > 0 ? (rentedUnits / totalUnits) * 100 : 0;

      setStats({
        totalRevenue,
        collected,
        overdue,
        occupancyRate: Math.round(occupancyRate * 10) / 10,
        totalUnits,
        rentedUnits,
      });

      const monthlyData: MonthlyRevenue[] = [];
      const now = new Date();
      for (let i = 11; i >= 0; i--) {
        const date = new Date(now.getFullYear(), now.getMonth() - i, 1);
        const monthKey = date.toISOString().slice(0, 7);
        const monthPayments = payments.filter((p) => {
          const paymentDate = new Date(p.paid_date || p.due_date || p.created_at);
          return paymentDate.toISOString().slice(0, 7) === monthKey;
        });
        const monthTotal = monthPayments.reduce((sum, p) => sum + (p.total_amount || 0), 0);
        monthlyData.push({
          month: date.toLocaleDateString('ar-SA', { month: 'short' }),
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

  const maxRevenue = Math.max(...monthlyRevenue.map((m) => m.revenue), 1);
  const months = ['يناير', 'فبراير', 'مارس', 'إبريل', 'مايو', 'يونيو', 'يوليو', 'أغسطس', 'سبتمبر', 'أكتوبر', 'نوفمبر', 'ديسمبر'];
  const now = new Date();
  const dateStr = `${months[now.getMonth()]} ${now.getFullYear()}`;

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-pulse flex flex-col items-center gap-4">
          <div className="w-12 h-12 rounded-full bg-primary/20"></div>
          <div className="h-4 w-40 bg-surface-container-highest rounded"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-container-margin">
      {/* Header */}
      <div className="flex items-end justify-between">
        <div>
          <h2 className="font-headline-lg text-headline-lg text-primary">لوحة التحكم الرئيسية</h2>
          <p className="font-body-md text-body-md text-on-surface-variant mt-1">أهلاً بك، إليك ملخص لأداء محفظتك العقارية اليوم.</p>
        </div>
        <div className="text-on-surface-variant font-label-md">{dateStr}</div>
      </div>

      {error && (
        <div className="bg-error-container text-error p-4 rounded-xl text-body-sm">
          {error}
        </div>
      )}

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-gutter">
        <div className="bg-white p-card-padding rounded-xl border border-outline-variant shadow-sm hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between mb-4">
            <span className="p-2 bg-primary-container/10 text-primary rounded-lg material-symbols-outlined">home_work</span>
            <span className="text-on-secondary-container font-label-sm px-2 py-1 bg-secondary-container rounded-full">
              +{stats.totalUnits > 0 ? ((stats.rentedUnits / stats.totalUnits) * 100).toFixed(0) : 0}%
            </span>
          </div>
          <p className="font-body-sm text-body-sm text-on-surface-variant">إجمالي الوحدات</p>
          <h3 className="font-headline-xl text-headline-xl text-primary">{stats.totalUnits}</h3>
        </div>

        <div className="bg-white p-card-padding rounded-xl border border-outline-variant shadow-sm hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between mb-4">
            <span className="p-2 bg-secondary-container/20 text-secondary rounded-lg material-symbols-outlined">analytics</span>
            <span className="text-secondary font-label-sm px-2 py-1 bg-secondary-container/10 rounded-full">{stats.occupancyRate}%</span>
          </div>
          <p className="font-body-sm text-body-sm text-on-surface-variant">نسبة الإشغال</p>
          <div className="w-full bg-surface-container rounded-full h-2 mt-4">
            <div className="bg-secondary h-2 rounded-full" style={{ width: `${stats.occupancyRate}%` }}></div>
          </div>
        </div>

        <div className="bg-white p-card-padding rounded-xl border border-outline-variant shadow-sm hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between mb-4">
            <span className="p-2 bg-error-container/20 text-error rounded-lg material-symbols-outlined">warning</span>
          </div>
          <p className="font-body-sm text-body-sm text-on-surface-variant">المتأخرات المالية</p>
          <h3 className="font-headline-xl text-headline-xl text-error">
            {stats.overdue.toLocaleString()} <span className="text-body-sm font-normal">ر.س</span>
          </h3>
        </div>

        <div className="bg-white p-card-padding rounded-xl border border-outline-variant shadow-sm hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between mb-4">
            <span className="p-2 bg-tertiary-fixed/30 text-tertiary rounded-lg material-symbols-outlined">event_repeat</span>
            <span className="text-tertiary font-label-sm px-2 py-1 bg-tertiary-fixed rounded-full">
              {expiringContracts.length} عقد
            </span>
          </div>
          <p className="font-body-sm text-body-sm text-on-surface-variant">عقود تنتهي قريباً</p>
          <h3 className="font-headline-xl text-headline-xl text-tertiary">{expiringContracts.length}</h3>
        </div>
      </div>

      {/* Bento Grid - Chart + Activities */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-gutter">
        {/* Revenue Chart */}
        <div className="lg:col-span-2 bg-white p-card-padding rounded-xl border border-outline-variant shadow-sm">
          <div className="flex items-center justify-between mb-8">
            <h4 className="font-headline-md text-headline-md text-on-surface">التحصيل المالي الشهري</h4>
            <select className="bg-surface-container-low border-none rounded-lg text-label-md px-4 py-1">
              <option>آخر 6 أشهر</option>
              <option>سنة كاملة</option>
            </select>
          </div>
          <div className="h-64 flex items-end justify-between gap-4 px-4 border-b border-outline-variant/30">
            {monthlyRevenue.slice(-6).map((item, i) => {
              const height = Math.max((item.revenue / maxRevenue) * 100, 4);
              const isMax = item.revenue >= maxRevenue;
              return (
                <div key={i} className="flex flex-col items-center gap-2 flex-1 group">
                  <div
                    className={`w-full rounded-t-lg transition-colors ${
                      isMax ? 'bg-primary' : 'bg-primary/20 group-hover:bg-primary'
                    }`}
                    style={{ height: `${height}%` }}
                  ></div>
                  <span className={`font-label-sm ${isMax ? 'text-primary font-bold' : 'text-on-surface-variant'}`}>
                    {item.month}
                  </span>
                </div>
              );
            })}
          </div>
        </div>

        {/* Activities */}
        <div className="bg-white p-card-padding rounded-xl border border-outline-variant shadow-sm flex flex-col">
          <div className="flex items-center justify-between mb-6">
            <h4 className="font-headline-md text-headline-md text-on-surface">آخر النشاطات</h4>
            <button className="text-primary font-label-md hover:underline">عرض الكل</button>
          </div>
          <div className="space-y-6 flex-1 overflow-y-auto pr-1">
            {/* Recent payments */}
            {duePayments.slice(0, 2).map((p) => (
              <div key={p.id} className="flex gap-4 relative cursor-pointer" onClick={() => navigate('/payments')}>
                <div className="flex-shrink-0 w-10 h-10 rounded-full bg-secondary-container/30 flex items-center justify-center text-secondary">
                  <span className="material-symbols-outlined">payments</span>
                </div>
                <div>
                  <p className="font-body-md text-body-md">
                    {p.status === 'overdue' ? 'دفعة متأخرة من ' : 'دفعة مستحقة من '}
                    <span className="font-bold">{p.contract?.tenant?.full_name_ar || 'مستأجر'}</span>
                  </p>
                  <span className="text-label-sm text-on-surface-variant">
                    {p.total_amount.toLocaleString()} ر.س - {new Date(p.due_date).toLocaleDateString('ar-SA')}
                  </span>
                </div>
              </div>
            ))}
            {/* Expiring contracts */}
            {expiringContracts.slice(0, 2).map((c) => {
              const daysLeft = Math.ceil((new Date(c.end_date).getTime() - Date.now()) / (1000 * 60 * 60 * 24));
              return (
                <div key={c.id} className="flex gap-4 relative cursor-pointer" onClick={() => navigate('/contracts')}>
                  <div className={`flex-shrink-0 w-10 h-10 rounded-full flex items-center justify-center ${
                    daysLeft <= 30 ? 'bg-error-container/20 text-error' : 'bg-primary-container/10 text-primary'
                  }`}>
                    <span className="material-symbols-outlined">history_edu</span>
                  </div>
                  <div>
                    <p className="font-body-md text-body-md">
                      عقد <span className="font-bold">{c.tenant?.full_name_ar || 'مستأجر'}</span>{' '}
                      {daysLeft <= 0 ? 'منتهي' : `ينتهي خلال ${daysLeft} يوم`}
                    </p>
                    <span className="text-label-sm text-on-surface-variant">
                      {c.unit?.property?.name_ar || ''} - وحدة {c.unit?.unit_number || ''}
                    </span>
                  </div>
                </div>
              );
            })}
            {/* Maintenance */}
            {maintenanceItems.slice(0, 1).map((m) => (
              <div key={m.id} className="flex gap-4 relative cursor-pointer" onClick={() => navigate('/maintenance')}>
                <div className="flex-shrink-0 w-10 h-10 rounded-full bg-error-container/20 flex items-center justify-center text-error">
                  <span className="material-symbols-outlined">engineering</span>
                </div>
                <div>
                  <p className="font-body-md text-body-md">
                    طلب صيانة{m.priority === 'urgent' ? ' طارئ' : ''} - <span className="font-bold">{m.title}</span>
                  </p>
                  <span className="text-label-sm text-on-surface-variant">وحدة {m.unit?.unit_number || '-'}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Featured Section */}
      <div className="relative rounded-2xl overflow-hidden h-72 bg-primary">
        <div className="absolute inset-0 bg-gradient-to-l from-primary/80 via-primary/60 to-primary/90"></div>
        <div className="absolute inset-0 flex items-center p-container-margin">
          <div className="bg-white/10 backdrop-blur-md border border-white/20 p-8 rounded-xl max-w-lg text-white">
            <h3 className="font-headline-lg text-headline-lg mb-2">أداء المحفظة العقارية</h3>
            <p className="font-body-md text-body-md opacity-90 mb-6">
              إجمالي الإيرادات {stats.collected.toLocaleString()} ر.س بنسبة تحصيل{' '}
              {stats.totalRevenue > 0 ? ((stats.collected / stats.totalRevenue) * 100).toFixed(1) : 0}%
            </p>
            <div className="flex gap-4">
              <button
                onClick={() => navigate('/reports')}
                className="bg-white text-primary px-6 py-2 rounded-lg font-label-md hover:bg-surface-variant transition-colors"
              >
                تحليل البيانات
              </button>
              <button
                onClick={() => navigate('/properties')}
                className="border border-white/40 text-white px-6 py-2 rounded-lg font-label-md hover:bg-white/10 transition-colors"
              >
                عرض العقارات
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default DashboardPage;
