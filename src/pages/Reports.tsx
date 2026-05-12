import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';

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
}

const TABS = [
  { key: 'vat', label: 'VAT', icon: 'percent' },
  { key: 'revenue', label: 'الإيرادات', icon: 'payments' },
  { key: 'occupancy', label: 'الإشغال', icon: 'business' },
] as const;

type TabKey = typeof TABS[number]['key'];

const ReportsPage = () => {
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<TabKey>('vat');
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

      const [payRes, unitsRes, propertiesRes] = await Promise.all([
        supabase.from('payments').select(`
          id, amount, vat_amount, total_amount, due_date, paid_date, status, created_at, invoice_number,
          contract:contracts (unit:units (is_commercial))
        `).not('status', 'eq', 'pending').order('created_at', { ascending: false }),
        supabase.from('units').select('id, property_id, status, rent_price, unit_number'),
        supabase.from('properties').select('id, name_ar'),
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

  const renderVAT = () => {
    if (monthlyVAT.length === 0) {
      return (
        <div className="bg-white rounded-xl border border-outline-variant p-12 text-center">
          <span className="material-symbols-outlined text-5xl text-outline-variant mb-4">percent</span>
          <p className="text-on-surface-variant">لا توجد بيانات VAT</p>
        </div>
      );
    }
    return (
      <>
        {/* Stat cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[
            { label: 'خاضع للضريبة', value: vatTotals.taxableSales, color: 'text-amber-600', icon: 'payments' },
            { label: 'VAT المحصل', value: vatTotals.vatCollected, color: 'text-amber-600', icon: 'percent' },
            { label: 'معفى من VAT', value: vatTotals.exemptSales, color: 'text-emerald-600', icon: 'money_off' },
            { label: 'الفواتير', value: vatTotals.invoiceCount, color: 'text-blue-600', icon: 'description', isCount: true },
          ].map((stat) => (
            <div key={stat.label} className="bg-white rounded-xl border border-outline-variant p-5 hover:shadow-md transition-shadow">
              <div className="flex items-center gap-3 mb-3">
                <span className={`material-symbols-outlined ${stat.color}`}>{stat.icon}</span>
                <span className="text-label-sm text-on-surface-variant">{stat.label}</span>
              </div>
              <div className={`text-headline-md font-bold ${stat.color}`}>
                {stat.isCount ? stat.value : `ر.س ${stat.value.toLocaleString()}`}
              </div>
            </div>
          ))}
        </div>

        {/* Table */}
        <div className="bg-white rounded-xl border border-outline-variant overflow-hidden">
          <div className="px-card-padding py-4 bg-surface-container-low border-b border-outline-variant">
            <h3 className="font-headline-md text-headline-md text-on-surface">التفصيل الشهري</h3>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-right">
              <thead className="bg-surface-container-low text-on-surface-variant border-b border-outline-variant font-label-md">
                <tr>
                  <th className="px-6 py-4 font-bold">الشهر</th>
                  <th className="px-6 py-4 font-bold">خاضع (ر.س)</th>
                  <th className="px-6 py-4 font-bold">VAT (ر.س)</th>
                  <th className="px-6 py-4 font-bold">معفى (ر.س)</th>
                  <th className="px-6 py-4 font-bold">إجمالي (ر.س)</th>
                  <th className="px-6 py-4 font-bold">فواتير</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-outline-variant">
                {monthlyVAT.map((r) => (
                  <tr key={r.monthKey} className="hover:bg-surface-container-lowest transition-colors">
                    <td className="px-6 py-4 font-bold text-on-surface">{r.month}</td>
                    <td className="px-6 py-4">{r.taxableSales.toLocaleString()}</td>
                    <td className="px-6 py-4 font-bold text-amber-600">{r.vatCollected.toLocaleString()}</td>
                    <td className="px-6 py-4">{r.exemptSales.toLocaleString()}</td>
                    <td className="px-6 py-4 font-bold text-emerald-600">{r.totalAmount.toLocaleString()}</td>
                    <td className="px-6 py-4">
                      <span className="bg-blue-100 text-blue-600 px-3 py-1 rounded-full text-label-sm font-bold">{r.invoiceCount}</span>
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot className="bg-surface-container-low/50 border-t border-outline-variant font-bold">
                <tr>
                  <td className="px-6 py-4 text-on-surface">الإجمالي</td>
                  <td className="px-6 py-4">{vatTotals.taxableSales.toLocaleString()}</td>
                  <td className="px-6 py-4 text-amber-600">{vatTotals.vatCollected.toLocaleString()}</td>
                  <td className="px-6 py-4">{vatTotals.exemptSales.toLocaleString()}</td>
                  <td className="px-6 py-4 text-emerald-600">{vatTotals.totalAmount.toLocaleString()}</td>
                  <td className="px-6 py-4">
                    <span className="bg-amber-100 text-amber-600 px-3 py-1 rounded-full text-label-sm font-bold">{vatTotals.invoiceCount}</span>
                  </td>
                </tr>
              </tfoot>
            </table>
          </div>
        </div>
      </>
    );
  };

  const renderRevenue = () => {
    if (revenueData.length === 0) {
      return (
        <div className="bg-white rounded-xl border border-outline-variant p-12 text-center">
          <span className="material-symbols-outlined text-5xl text-outline-variant mb-4">payments</span>
          <p className="text-on-surface-variant">لا توجد بيانات إيرادات</p>
        </div>
      );
    }
    return (
      <>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[
            { label: 'الإيرادات المحصلة', value: revTotals.collected, color: 'text-emerald-600', icon: 'payments' },
            { label: 'المتأخر', value: revTotals.overdue, color: revTotals.overdue > 0 ? 'text-red-600' : 'text-emerald-600', icon: 'warning' },
            { label: 'المعلق', value: revTotals.pending, color: 'text-orange-600', icon: 'hourglass_empty' },
            { label: 'الإجمالي', value: revTotals.total, color: 'text-amber-600', icon: 'account_balance' },
          ].map((stat) => (
            <div key={stat.label} className="bg-white rounded-xl border border-outline-variant p-5 hover:shadow-md transition-shadow">
              <div className="flex items-center gap-3 mb-3">
                <span className={`material-symbols-outlined ${stat.color}`}>{stat.icon}</span>
                <span className="text-label-sm text-on-surface-variant">{stat.label}</span>
              </div>
              <div className={`text-headline-md font-bold ${stat.color}`}>
                ر.س {stat.value.toLocaleString()}
              </div>
            </div>
          ))}
        </div>

        <div className="bg-white rounded-xl border border-outline-variant overflow-hidden">
          <div className="px-card-padding py-4 bg-surface-container-low border-b border-outline-variant">
            <h3 className="font-headline-md text-headline-md text-on-surface">الإيرادات الشهرية</h3>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-right">
              <thead className="bg-surface-container-low text-on-surface-variant border-b border-outline-variant font-label-md">
                <tr>
                  <th className="px-6 py-4 font-bold">الشهر</th>
                  <th className="px-6 py-4 font-bold">محصل (ر.س)</th>
                  <th className="px-6 py-4 font-bold">متأخر (ر.س)</th>
                  <th className="px-6 py-4 font-bold">معلق (ر.س)</th>
                  <th className="px-6 py-4 font-bold">الإجمالي (ر.س)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-outline-variant">
                {revenueData.map((r) => (
                  <tr key={r.monthKey} className="hover:bg-surface-container-lowest transition-colors">
                    <td className="px-6 py-4 font-bold text-on-surface">{r.month}</td>
                    <td className="px-6 py-4 text-emerald-600">{r.collected.toLocaleString()}</td>
                    <td className={`px-6 py-4 ${r.overdue > 0 ? 'text-red-600' : ''}`}>{r.overdue.toLocaleString()}</td>
                    <td className="px-6 py-4 text-orange-600">{r.pending.toLocaleString()}</td>
                    <td className="px-6 py-4 font-bold text-amber-600">{r.total.toLocaleString()}</td>
                  </tr>
                ))}
              </tbody>
              <tfoot className="bg-surface-container-low/50 border-t border-outline-variant font-bold">
                <tr>
                  <td className="px-6 py-4 text-on-surface">الإجمالي</td>
                  <td className="px-6 py-4 text-emerald-600">{revTotals.collected.toLocaleString()}</td>
                  <td className={`px-6 py-4 ${revTotals.overdue > 0 ? 'text-red-600' : ''}`}>{revTotals.overdue.toLocaleString()}</td>
                  <td className="px-6 py-4 text-orange-600">{revTotals.pending.toLocaleString()}</td>
                  <td className="px-6 py-4 text-amber-600">{revTotals.total.toLocaleString()}</td>
                </tr>
              </tfoot>
            </table>
          </div>
        </div>
      </>
    );
  };

  const renderOccupancy = () => {
    if (occupancyData.length === 0) {
      return (
        <div className="bg-white rounded-xl border border-outline-variant p-12 text-center">
          <span className="material-symbols-outlined text-5xl text-outline-variant mb-4">business</span>
          <p className="text-on-surface-variant">لا توجد بيانات إشغال</p>
        </div>
      );
    }
    return (
      <>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[
            { label: 'إجمالي الوحدات', value: occTotals.totalUnits, color: 'text-blue-600', icon: 'home' },
            { label: 'الوحدات المؤجرة', value: occTotals.rentedUnits, color: 'text-emerald-600', icon: 'home_work' },
            { label: 'الشاغرة', value: occTotals.totalUnits - occTotals.rentedUnits, color: (occTotals.totalUnits - occTotals.rentedUnits) > 0 ? 'text-red-600' : 'text-emerald-600', icon: 'home' },
            { label: 'نسبة الإشغال', value: `${occTotals.totalUnits > 0 ? Math.round((occTotals.rentedUnits / occTotals.totalUnits) * 1000) / 10 : 0}%`, color: 'text-amber-600', icon: 'pie_chart', isString: true },
          ].map((stat) => (
            <div key={stat.label} className="bg-white rounded-xl border border-outline-variant p-5 hover:shadow-md transition-shadow">
              <div className="flex items-center gap-3 mb-3">
                <span className={`material-symbols-outlined ${stat.color}`}>{stat.icon}</span>
                <span className="text-label-sm text-on-surface-variant">{stat.label}</span>
              </div>
              <div className={`text-headline-md font-bold ${stat.color}`}>
                {stat.isString ? stat.value : stat.value.toLocaleString()}
              </div>
            </div>
          ))}
        </div>

        <div className="bg-white rounded-xl border border-outline-variant overflow-hidden">
          <div className="px-card-padding py-4 bg-surface-container-low border-b border-outline-variant">
            <h3 className="font-headline-md text-headline-md text-on-surface">الإشغال حسب العقار</h3>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-right">
              <thead className="bg-surface-container-low text-on-surface-variant border-b border-outline-variant font-label-md">
                <tr>
                  <th className="px-6 py-4 font-bold">العقار</th>
                  <th className="px-6 py-4 font-bold">الوحدات</th>
                  <th className="px-6 py-4 font-bold">مؤجر</th>
                  <th className="px-6 py-4 font-bold">نسبة الإشغال</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-outline-variant">
                {occupancyData.map((r) => (
                  <tr key={r.id} className="hover:bg-surface-container-lowest transition-colors">
                    <td className="px-6 py-4 font-bold text-on-surface">{r.name}</td>
                    <td className="px-6 py-4">{r.totalUnits}</td>
                    <td className="px-6 py-4">{r.rentedUnits}</td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="flex-1 bg-surface-container-highest rounded-full h-2">
                          <div
                            className={`h-2 rounded-full transition-all ${
                              r.rate >= 80 ? 'bg-emerald-500' : r.rate >= 50 ? 'bg-orange-500' : 'bg-red-500'
                            }`}
                            style={{ width: `${Math.min(r.rate, 100)}%` }}
                          />
                        </div>
                        <span className="text-label-sm font-bold text-on-surface-variant">{r.rate}%</span>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </>
    );
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h2 className="font-headline-lg text-headline-lg font-bold text-primary">التقارير</h2>
        <p className="font-body-md text-body-md text-on-surface-variant mt-1">تقارير شاملة لإدارة العقارات</p>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-surface-container-low rounded-xl p-1 border border-outline-variant">
        {TABS.map((tab) => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={`flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg font-label-md transition-all ${
              activeTab === tab.key
                ? 'bg-white text-primary shadow-sm border border-outline-variant'
                : 'text-on-surface-variant hover:text-on-surface'
            }`}
          >
            <span className="material-symbols-outlined text-[18px]">{tab.icon}</span>
            {tab.label}
          </button>
        ))}
      </div>

      {/* Content */}
      {activeTab === 'vat' && renderVAT()}
      {activeTab === 'revenue' && renderRevenue()}
      {activeTab === 'occupancy' && renderOccupancy()}
    </div>
  );
};

export default ReportsPage;
