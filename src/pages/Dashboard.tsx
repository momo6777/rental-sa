import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { useNavigate } from 'react-router-dom';

interface MonthlyRevenue {
  month: string;
  revenue: number;
  count: number;
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
  const [counts, setCounts] = useState({
    pendingMaintenance: 0,
    activeContracts: 0,
    pendingPayments: 0,
    availableUnits: 0,
    expiringSoon: 0,
  });
  const [monthlyRevenue, setMonthlyRevenue] = useState<MonthlyRevenue[]>([]);
  const [duePayments, setDuePayments] = useState<DuePayment[]>([]);
  const [expiringContracts, setExpiringContracts] = useState<ExpiringContract[]>([]);
  const [maintenanceItems, setMaintenanceItems] = useState<MaintenanceItem[]>([]);
  const [chartMonths, setChartMonths] = useState(6);

  useEffect(() => {
    loadDashboardData();
  }, []);

  const loadDashboardData = async () => {
    try {
      setLoading(true);
      setError(null);

      const [paymentsResult, unitsResult, duePaymentsResult, contractsResult, maintenanceResult,
        activeCountResult, pendingCountResult, expiringCountResult] =
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
          supabase.from('contracts').select('*', { count: 'exact', head: true }).eq('status', 'active'),
          supabase.from('payments').select('*', { count: 'exact', head: true }).eq('status', 'pending'),
          supabase
            .from('contracts')
            .select('*', { count: 'exact', head: true })
            .eq('status', 'active')
            .lte('end_date', new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString()),
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
      const availableUnits = units.filter((u) => u.status === 'available').length;
      const occupancyRate = totalUnits > 0 ? (rentedUnits / totalUnits) * 100 : 0;

      setStats({
        totalRevenue,
        collected,
        overdue,
        occupancyRate: Math.round(occupancyRate * 10) / 10,
        totalUnits,
        rentedUnits,
      });

      setCounts({
        pendingMaintenance: maintenanceResult.data?.length || 0,
        activeContracts: activeCountResult.count || 0,
        pendingPayments: pendingCountResult.count || 0,
        availableUnits,
        expiringSoon: expiringCountResult.count || 0,
      });

      const monthlyData: MonthlyRevenue[] = [];
      const now = new Date();
      for (let i = 11; i >= 0; i--) {
        const date = new Date(now.getFullYear(), now.getMonth() - i, 1);
        const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
        const monthPayments = payments.filter((p) => {
          const pd = new Date(p.paid_date || p.due_date || p.created_at);
          const pKey = `${pd.getFullYear()}-${String(pd.getMonth() + 1).padStart(2, '0')}`;
          return pKey === monthKey;
        });
        const monthTotal = monthPayments.reduce((sum, p) => sum + (p.total_amount || 0), 0);
        monthlyData.push({
          month: date.toLocaleDateString('ar-SA', { month: 'short' }),
          revenue: monthTotal,
          count: monthPayments.length,
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

  const visibleRevenue = chartMonths === 6 ? monthlyRevenue.slice(-6) : monthlyRevenue.slice(-12);
  const maxRevenue = Math.max(...visibleRevenue.map((m) => m.revenue), 1);
  const periodTotal = visibleRevenue.reduce((s, m) => s + m.revenue, 0);
  const now = new Date();
  const dateStr = now.toLocaleDateString('ar-SA', {
    weekday: 'long', year: 'numeric', month: 'long', day: 'numeric'
  });

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-pulse flex flex-col items-center gap-4">
          <div className="w-12 h-12 rounded-full bg-primary/20"></div>
          <div className="h-4 w-40 bg-surface-container-highest rounded"></div>
          <div className="h-3 w-56 bg-surface-container-highest rounded"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-container-margin">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-2">
        <div>
          <h2 className="font-headline-lg text-headline-lg text-primary">لوحة التحكم</h2>
          <p className="font-body-md text-body-md text-on-surface-variant mt-1">ملخص أداء محفظتك العقارية</p>
        </div>
        <div className="text-on-surface-variant font-label-md">{dateStr}</div>
      </div>

      {error && (
        <div className="bg-error-container text-error p-4 rounded-xl text-body-sm">
          {error}
        </div>
      )}

      {/* Row 1: Core KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-gutter">
        {/* Total Revenue */}
        <div className="bg-white p-card-padding rounded-xl border border-outline-variant shadow-sm hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between mb-3">
            <span className="material-symbols-outlined text-primary text-2xl">account_balance</span>
            <span className={`text-label-sm px-2 py-0.5 rounded-full font-bold ${
              (stats.collected / Math.max(stats.totalRevenue, 1)) >= 0.8
                ? 'bg-emerald-50 text-emerald-600'
                : 'bg-amber-50 text-amber-600'
            }`}>
              {stats.totalRevenue > 0
                ? ((stats.collected / stats.totalRevenue) * 100).toFixed(0) + '%'
                : '—'}
            </span>
          </div>
          <p className="font-body-sm text-body-sm text-on-surface-variant">إجمالي الإيرادات</p>
          <h3 className="font-headline-xl text-headline-xl text-primary mt-0.5">
            {stats.collected.toLocaleString()}
          </h3>
          <p className="text-label-sm text-on-surface-variant mt-1">ريال سعودي</p>
        </div>

        {/* Occupancy Rate */}
        <div className="bg-white p-card-padding rounded-xl border border-outline-variant shadow-sm hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between mb-3">
            <span className="material-symbols-outlined text-secondary text-2xl">home_work</span>
            <span className="text-label-sm px-2 py-0.5 rounded-full font-bold bg-secondary/10 text-secondary">
              {stats.occupancyRate}%
            </span>
          </div>
          <p className="font-body-sm text-body-sm text-on-surface-variant">نسبة الإشغال</p>
          <h3 className="font-headline-xl text-headline-xl text-secondary mt-0.5">
            {stats.rentedUnits}
            <span className="text-body-md font-normal text-on-surface-variant"> / {stats.totalUnits}</span>
          </h3>
          <div className="w-full bg-surface-container rounded-full h-2 mt-3">
            <div
              className="bg-secondary h-2 rounded-full transition-all duration-700"
              style={{ width: `${Math.max(stats.occupancyRate, 2)}%` }}
            ></div>
          </div>
        </div>

        {/* Overdue Amount */}
        <div className="bg-white p-card-padding rounded-xl border border-outline-variant shadow-sm hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between mb-3">
            <span className="material-symbols-outlined text-error text-2xl">warning</span>
            <span className="text-label-sm px-2 py-0.5 rounded-full font-bold bg-error/10 text-error">
              {counts.pendingPayments} مستحق
            </span>
          </div>
          <p className="font-body-sm text-body-sm text-on-surface-variant">المتأخرات</p>
          <h3 className="font-headline-xl text-headline-xl text-error mt-0.5">
            {stats.overdue.toLocaleString()}
          </h3>
          <p className="text-label-sm text-on-surface-variant mt-1">ريال سعودي متأخرة</p>
        </div>

        {/* Pending Maintenance */}
        <div className="bg-white p-card-padding rounded-xl border border-outline-variant shadow-sm hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between mb-3">
            <span className="material-symbols-outlined text-tertiary text-2xl">engineering</span>
            <span className="text-label-sm px-2 py-0.5 rounded-full font-bold bg-tertiary/10 text-tertiary">
              طلب
            </span>
          </div>
          <p className="font-body-sm text-body-sm text-on-surface-variant">الصيانة المعلقة</p>
          <h3 className="font-headline-xl text-headline-xl text-tertiary mt-0.5">
            {counts.pendingMaintenance}
          </h3>
          <p className="text-label-sm text-on-surface-variant mt-1">
            {maintenanceItems.filter(m => m.priority === 'urgent').length > 0
              ? `${maintenanceItems.filter(m => m.priority === 'urgent').length} منها عاجلة`
              : 'لا توجد طلبات عاجلة'}
          </p>
        </div>
      </div>

      {/* Row 2: Revenue Chart + Quick Stats */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-gutter">
        {/* Revenue Chart */}
        <div className="lg:col-span-2 bg-white p-card-padding rounded-xl border border-outline-variant shadow-sm">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h4 className="font-headline-md text-headline-md text-on-surface">التحصيل الشهري</h4>
              <p className="text-label-sm text-on-surface-variant mt-0.5">
                إجمالي <strong>{periodTotal.toLocaleString()} ر.س</strong> خلال {chartMonths} أشهر
              </p>
            </div>
            <select
              value={chartMonths}
              onChange={(e) => setChartMonths(Number(e.target.value))}
              className="bg-surface-container-low border border-outline-variant rounded-xl text-label-md px-4 py-2 focus:ring-2 focus:ring-primary outline-none"
            >
              <option value={6}>آخر 6 أشهر</option>
              <option value={12}>سنة كاملة</option>
            </select>
          </div>
          {periodTotal === 0 ? (
            <div className="h-64 flex items-center justify-center text-on-surface-variant text-body-md">
              لا توجد بيانات مالية بعد
            </div>
          ) : (
            <div className="h-64 flex items-end justify-between gap-2 px-2 pt-4 border-b border-outline-variant/30">
              {visibleRevenue.map((item, i) => {
                const height = Math.max((item.revenue / maxRevenue) * 100, 3);
                const isMax = item.revenue >= maxRevenue && item.revenue > 0;
                return (
                  <div key={i} className="flex flex-col items-center gap-1.5 flex-1 min-w-0 group relative">
                    <div className="relative w-full flex flex-col items-center">
                      <span className="text-[10px] text-on-surface-variant opacity-0 group-hover:opacity-100 transition-opacity font-label-sm whitespace-nowrap absolute -top-6 bg-surface-container-highest px-2 py-0.5 rounded">
                        {item.revenue.toLocaleString()} ر.س
                      </span>
                      <div
                        className={`w-full rounded-t-md transition-all duration-300 ${
                          isMax
                            ? 'bg-primary'
                            : 'bg-primary/20 group-hover:bg-primary/40'
                        }`}
                        style={{ height: `${height}%`, minHeight: '4px' }}
                      ></div>
                    </div>
                    <span className={`text-[10px] whitespace-nowrap ${
                      isMax ? 'text-primary font-bold' : 'text-on-surface-variant'
                    }`}>
                      {item.month}
                    </span>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Quick Stats */}
        <div className="bg-white p-card-padding rounded-xl border border-outline-variant shadow-sm">
          <h4 className="font-headline-md text-headline-md text-on-surface mb-5">مؤشرات سريعة</h4>
          <div className="space-y-4">
            <div className="flex items-center justify-between py-3 px-4 bg-surface-container-low rounded-xl">
              <div className="flex items-center gap-3">
                <span className="material-symbols-outlined text-primary">description</span>
                <span className="font-body-md text-body-md">العقود النشطة</span>
              </div>
              <span className="font-headline-sm text-headline-sm text-primary">{counts.activeContracts}</span>
            </div>
            <div className="flex items-center justify-between py-3 px-4 bg-surface-container-low rounded-xl">
              <div className="flex items-center gap-3">
                <span className="material-symbols-outlined text-secondary">cottage</span>
                <span className="font-body-md text-body-md">وحدات شاغرة</span>
              </div>
              <span className="font-headline-sm text-headline-sm text-secondary">{counts.availableUnits}</span>
            </div>
            <div className="flex items-center justify-between py-3 px-4 bg-surface-container-low rounded-xl">
              <div className="flex items-center gap-3">
                <span className="material-symbols-outlined text-error">payments</span>
                <span className="font-body-md text-body-md">مدفوعات معلقة</span>
              </div>
              <span className="font-headline-sm text-headline-sm text-error">{counts.pendingPayments}</span>
            </div>
            <div className="flex items-center justify-between py-3 px-4 bg-surface-container-low rounded-xl">
              <div className="flex items-center gap-3">
                <span className={`material-symbols-outlined ${counts.expiringSoon > 0 ? 'text-orange-500' : 'text-tertiary'}`}>event_repeat</span>
                <span className="font-body-md text-body-md">تنتهي خلال 30 يوم</span>
              </div>
              <span className={`font-headline-sm text-headline-sm ${counts.expiringSoon > 0 ? 'text-orange-500' : 'text-tertiary'}`}>
                {counts.expiringSoon}
              </span>
            </div>
          </div>
          <div className="mt-5 pt-4 border-t border-outline-variant/50">
            <p className="text-label-sm text-on-surface-variant text-center">
              نسبة التحصيل: <strong className="text-primary">
                {stats.totalRevenue > 0
                  ? ((stats.collected / stats.totalRevenue) * 100).toFixed(1)
                  : 0}%
              </strong>
            </p>
          </div>
        </div>
      </div>

      {/* Row 3: Activity Feed */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-gutter">
        {/* Due Payments */}
        <div className="bg-white p-card-padding rounded-xl border border-outline-variant shadow-sm">
          <div className="flex items-center justify-between mb-5">
            <h4 className="font-headline-md text-headline-md text-on-surface">المدفوعات المستحقة</h4>
            <button
              onClick={() => navigate('/payments')}
              className="text-primary font-label-md hover:underline text-sm"
            >
              عرض الكل
            </button>
          </div>
          {duePayments.length === 0 ? (
            <div className="text-center py-8 text-on-surface-variant text-body-sm">
              <span className="material-symbols-outlined text-3xl block mb-2">check_circle</span>
              لا توجد مدفوعات مستحقة
            </div>
          ) : (
            <div className="space-y-3">
              {duePayments.map((p) => (
                <div
                  key={p.id}
                  className="flex items-center gap-3 p-3 rounded-xl bg-surface-container-low hover:bg-surface-container-highest cursor-pointer transition-colors"
                  onClick={() => navigate('/payments')}
                >
                  <div className={`w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0 ${
                    p.status === 'overdue'
                      ? 'bg-error/10 text-error'
                      : 'bg-amber-50 text-amber-600'
                  }`}>
                    <span className="material-symbols-outlined text-lg">
                      {p.status === 'overdue' ? 'error_outline' : 'schedule'}
                    </span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-body-md text-body-md truncate">
                      {p.contract?.tenant?.full_name_ar || 'مستأجر'}
                    </p>
                    <p className="text-label-sm text-on-surface-variant">
                      {new Date(p.due_date).toLocaleDateString('ar-SA')}
                    </p>
                  </div>
                  <div className="text-left">
                    <p className={`font-label-md font-bold ${
                      p.status === 'overdue' ? 'text-error' : 'text-primary'
                    }`}>
                      {p.total_amount.toLocaleString()} ر.س
                    </p>
                    <span className={`text-[10px] ${p.status === 'overdue' ? 'text-error' : 'text-amber-600'}`}>
                      {p.status === 'overdue' ? 'متأخرة' : 'مستحقة'}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Maintenance Requests */}
        <div className="bg-white p-card-padding rounded-xl border border-outline-variant shadow-sm">
          <div className="flex items-center justify-between mb-5">
            <h4 className="font-headline-md text-headline-md text-on-surface">طلبات الصيانة</h4>
            <button
              onClick={() => navigate('/maintenance')}
              className="text-primary font-label-md hover:underline text-sm"
            >
              عرض الكل
            </button>
          </div>
          {maintenanceItems.length === 0 ? (
            <div className="text-center py-8 text-on-surface-variant text-body-sm">
              <span className="material-symbols-outlined text-3xl block mb-2">check_circle</span>
              لا توجد طلبات صيانة معلقة
            </div>
          ) : (
            <div className="space-y-3">
              {maintenanceItems.map((m) => {
                const priorityConfig = {
                  urgent: { bg: 'bg-red-50', dot: 'bg-red-500', text: 'text-red-600' },
                  high: { bg: 'bg-orange-50', dot: 'bg-orange-500', text: 'text-orange-600' },
                  medium: { bg: 'bg-blue-50', dot: 'bg-blue-500', text: 'text-blue-600' },
                  low: { bg: 'bg-emerald-50', dot: 'bg-emerald-500', text: 'text-emerald-600' },
                };
                const pc = priorityConfig[m.priority as keyof typeof priorityConfig] || priorityConfig.medium;
                return (
                  <div
                    key={m.id}
                    className="flex items-center gap-3 p-3 rounded-xl bg-surface-container-low hover:bg-surface-container-highest cursor-pointer transition-colors"
                    onClick={() => navigate('/maintenance')}
                  >
                    <div className={`w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0 ${pc.bg} ${pc.text}`}>
                      <span className="material-symbols-outlined text-lg">build</span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-body-md text-body-md truncate">{m.title}</p>
                      <p className="text-label-sm text-on-surface-variant">
                        وحدة {m.unit?.unit_number || '-'}
                      </p>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <span className={`w-2 h-2 rounded-full ${pc.dot}`}></span>
                      <span className={`text-[10px] font-bold ${pc.text}`}>
                        {m.priority === 'urgent' ? 'عاجل' : m.priority === 'high' ? 'عالية' : m.priority === 'medium' ? 'متوسطة' : 'منخفضة'}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Expiring Contracts */}
        <div className="bg-white p-card-padding rounded-xl border border-outline-variant shadow-sm">
          <div className="flex items-center justify-between mb-5">
            <h4 className="font-headline-md text-headline-md text-on-surface">العقود المنتهية قريباً</h4>
            <button
              onClick={() => navigate('/contracts')}
              className="text-primary font-label-md hover:underline text-sm"
            >
              عرض الكل
            </button>
          </div>
          {expiringContracts.length === 0 ? (
            <div className="text-center py-8 text-on-surface-variant text-body-sm">
              <span className="material-symbols-outlined text-3xl block mb-2">check_circle</span>
              لا توجد عقود وشيكة الانتهاء
            </div>
          ) : (
            <div className="space-y-3">
              {expiringContracts.map((c) => {
                const daysLeft = Math.ceil((new Date(c.end_date).getTime() - Date.now()) / (1000 * 60 * 60 * 24));
                const isUrgent = daysLeft <= 30;
                return (
                  <div
                    key={c.id}
                    className="flex items-center gap-3 p-3 rounded-xl bg-surface-container-low hover:bg-surface-container-highest cursor-pointer transition-colors"
                    onClick={() => navigate('/contracts')}
                  >
                    <div className={`w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0 ${
                      isUrgent ? 'bg-error/10 text-error' : 'bg-primary/10 text-primary'
                    }`}>
                      <span className="material-symbols-outlined text-lg">history_edu</span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-body-md text-body-md truncate">
                        {c.tenant?.full_name_ar || 'مستأجر'}
                      </p>
                      <p className="text-label-sm text-on-surface-variant truncate">
                        {c.unit?.property?.name_ar || ''} - {c.unit?.unit_number || ''}
                      </p>
                    </div>
                    <div className="text-left">
                      <p className={`font-label-md font-bold whitespace-nowrap ${
                        isUrgent ? 'text-error' : 'text-amber-600'
                      }`}>
                        {daysLeft <= 0 ? 'منتهي' : `${daysLeft} يوم`}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* Featured CTA */}
      <div className="relative rounded-2xl overflow-hidden bg-primary">
        <div className="absolute inset-0 bg-gradient-to-l from-primary/80 via-primary/60 to-primary/90"></div>
        <div className="relative p-container-margin sm:p-8 flex flex-col sm:flex-row items-center justify-between gap-6">
          <div className="text-white max-w-lg">
            <h3 className="font-headline-lg text-headline-lg mb-2">أداء المحفظة العقارية</h3>
            <p className="font-body-md text-body-md opacity-90">
              إجمالي الإيرادات <strong>{stats.collected.toLocaleString()} ر.س</strong> بنسبة تحصيل{' '}
              {stats.totalRevenue > 0 ? ((stats.collected / stats.totalRevenue) * 100).toFixed(1) : 0}%
            </p>
          </div>
          <div className="flex gap-3 flex-shrink-0">
            <button
              onClick={() => navigate('/reports')}
              className="bg-white text-primary px-6 py-2.5 rounded-xl font-label-md hover:bg-surface-variant transition-colors active:scale-95"
            >
              تحليل البيانات
            </button>
            <button
              onClick={() => navigate('/properties')}
              className="border border-white/40 text-white px-6 py-2.5 rounded-xl font-label-md hover:bg-white/10 transition-colors active:scale-95"
            >
              عرض العقارات
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default DashboardPage;
