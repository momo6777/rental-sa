import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { useNavigate } from 'react-router-dom';

interface PaidPayment {
  id: string;
  amount: number;
  total_amount: number;
  paid_date: string;
  created_at: string;
}

interface MaintenanceExpenseRow {
  id: string;
  amount: number;
  created_at: string;
}

interface GeneralExpenseRow {
  id: string;
  amount: number;
  expense_date: string;
}

interface AgingPayment {
  id: string;
  total_amount: number;
  amount: number;
  due_date: string;
  status: string;
  contract: {
    tenant: { full_name_ar: string; phone: string } | null;
  } | null;
}

interface PLRow {
  month: string;
  monthKey: string;
  revenue: number;
  expenses: number;
  net: number;
}

interface AgingBucket {
  label: string;
  payments: AgingPayment[];
  total: number;
}

interface CashFlowRow {
  month: string;
  monthKey: string;
  inflow: number;
  outflow: number;
  net: number;
  balance: number;
}

const TABS = [
  { key: 'pl', label: 'الأرباح والخسائر', icon: 'monitoring' },
  { key: 'aging', label: 'الذمم المدينة', icon: 'receipt_long' },
  { key: 'cashflow', label: 'التدفق النقدي', icon: 'currency_exchange' },
] as const;

type TabKey = typeof TABS[number]['key'];

const AccountingPage = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<TabKey>('pl');
  const [plData, setPlData] = useState<PLRow[]>([]);
  const [agingBuckets, setAgingBuckets] = useState<AgingBucket[]>([]);
  const [cashFlowData, setCashFlowData] = useState<CashFlowRow[]>([]);
  const [dateRange, setDateRange] = useState('12');

  useEffect(() => {
    loadAll();
  }, []);

  const loadAll = async () => {
    try {
      setLoading(true);

      const [paidRes, expenseRes, agingRes, generalExpRes] = await Promise.all([
        supabase
          .from('payments')
          .select('id, amount, total_amount, paid_date, created_at')
          .eq('status', 'paid'),
        supabase
          .from('maintenance_expenses')
          .select('id, amount, created_at'),
        supabase
          .from('payments')
          .select('id, total_amount, amount, due_date, status, contract:contracts(tenant:tenants(full_name_ar, phone))')
          .in('status', ['overdue', 'pending'])
          .order('due_date', { ascending: true }),
        supabase
          .from('general_expenses')
          .select('id, amount, expense_date'),
      ]);

      if (paidRes.error) throw paidRes.error;
      if (expenseRes.error) throw expenseRes.error;
      if (agingRes.error) throw agingRes.error;
      if (generalExpRes.error) throw generalExpRes.error;

      const generalExpenses = generalExpRes.data || [];
      buildPL(paidRes.data || [], expenseRes.data || [], generalExpenses);
      buildAging(agingRes.data || []);
      buildCashFlow(paidRes.data || [], expenseRes.data || [], generalExpenses);
    } catch (err: any) {
      console.error('Error loading accounting data:', err);
    } finally {
      setLoading(false);
    }
  };

  const getMonthKey = (dateStr: string) => {
    const d = new Date(dateStr);
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
  };

  const getMonthLabel = (dateStr: string) => {
    const d = new Date(dateStr);
    return d.toLocaleDateString('ar-SA', { month: 'long', year: 'numeric' });
  };

  const buildPL = (payments: PaidPayment[], expenses: MaintenanceExpenseRow[], general: GeneralExpenseRow[]) => {
    const revMap = new Map<string, number>();
    for (const p of payments) {
      const k = getMonthKey(p.paid_date || p.created_at);
      revMap.set(k, (revMap.get(k) || 0) + (p.total_amount || 0));
    }

    const expMap = new Map<string, number>();
    for (const e of expenses) {
      const k = getMonthKey(e.created_at);
      expMap.set(k, (expMap.get(k) || 0) + (e.amount || 0));
    }
    for (const g of general) {
      const k = getMonthKey(g.expense_date);
      expMap.set(k, (expMap.get(k) || 0) + (g.amount || 0));
    }

    const allKeys = new Set([...revMap.keys(), ...expMap.keys()]);
    const rows: PLRow[] = [];
    for (const k of allKeys) {
      const revenue = revMap.get(k) || 0;
      const expenses = expMap.get(k) || 0;
      const d = new Date(k + '-01');
      rows.push({
        monthKey: k,
        month: d.toLocaleDateString('ar-SA', { month: 'long', year: 'numeric' }),
        revenue,
        expenses,
        net: revenue - expenses,
      });
    }
    setPlData(rows.sort((a, b) => a.monthKey.localeCompare(b.monthKey)));
  };

  const buildAging = (payments: AgingPayment[]) => {
    const now = Date.now();
    const DAY = 1000 * 60 * 60 * 24;
    const overdue = payments.filter(p => p.status === 'overdue');
    const pending = payments.filter(p => p.status === 'pending');

    const buckets: AgingBucket[] = [
      { label: '0-30 يوم', payments: [], total: 0 },
      { label: '31-60 يوم', payments: [], total: 0 },
      { label: '61-90 يوم', payments: [], total: 0 },
      { label: 'أكثر من 90 يوم', payments: [], total: 0 },
    ];

    for (const p of overdue) {
      const days = Math.floor((now - new Date(p.due_date).getTime()) / DAY);
      if (days <= 30) buckets[0].payments.push(p);
      else if (days <= 60) buckets[1].payments.push(p);
      else if (days <= 90) buckets[2].payments.push(p);
      else buckets[3].payments.push(p);
    }

    const pendingBucket: AgingBucket = {
      label: 'مستحقة (غير متأخرة)',
      payments: pending,
      total: 0,
    };

    for (const b of [...buckets, pendingBucket]) {
      b.total = b.payments.reduce((s, p) => s + (p.total_amount || 0), 0);
    }

    setAgingBuckets([...buckets, pendingBucket]);
  };

  const buildCashFlow = (payments: PaidPayment[], expenses: MaintenanceExpenseRow[], general: GeneralExpenseRow[]) => {
    const inflowMap = new Map<string, number>();
    for (const p of payments) {
      const k = getMonthKey(p.paid_date || p.created_at);
      inflowMap.set(k, (inflowMap.get(k) || 0) + (p.total_amount || 0));
    }

    const outflowMap = new Map<string, number>();
    for (const e of expenses) {
      const k = getMonthKey(e.created_at);
      outflowMap.set(k, (outflowMap.get(k) || 0) + (e.amount || 0));
    }
    for (const g of general) {
      const k = getMonthKey(g.expense_date);
      outflowMap.set(k, (outflowMap.get(k) || 0) + (g.amount || 0));
    }

    const allKeys = new Set([...inflowMap.keys(), ...outflowMap.keys()]);
    const rows: CashFlowRow[] = [];
    let runningBalance = 0;

    for (const k of Array.from(allKeys).sort()) {
      const inflow = inflowMap.get(k) || 0;
      const outflow = outflowMap.get(k) || 0;
      const net = inflow - outflow;
      runningBalance += net;
      const d = new Date(k + '-01');
      rows.push({
        monthKey: k,
        month: d.toLocaleDateString('ar-SA', { month: 'long', year: 'numeric' }),
        inflow,
        outflow,
        net,
        balance: runningBalance,
      });
    }
    setCashFlowData(rows);
  };

  const plTotals = plData.reduce((a, r) => ({
    revenue: a.revenue + r.revenue,
    expenses: a.expenses + r.expenses,
    net: a.net + r.net,
  }), { revenue: 0, expenses: 0, net: 0 });

  const grandAgingTotal = agingBuckets.reduce((s, b) => s + b.total, 0);

  const cashFlowTotals = cashFlowData.length > 0 ? {
    inflow: cashFlowData.reduce((s, r) => s + r.inflow, 0),
    outflow: cashFlowData.reduce((s, r) => s + r.outflow, 0),
    balance: cashFlowData[cashFlowData.length - 1].balance,
  } : { inflow: 0, outflow: 0, balance: 0 };

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

  const renderPL = () => {
    if (plData.length === 0) {
      return (
        <div className="bg-white rounded-xl border border-outline-variant p-12 text-center">
          <span className="material-symbols-outlined text-5xl text-outline-variant mb-4">monitoring</span>
          <p className="text-on-surface-variant">لا توجد بيانات كافية لعرض قائمة الأرباح والخسائر</p>
        </div>
      );
    }
    return (
      <>
        <div className="grid grid-cols-3 gap-4">
          <div className="bg-white rounded-xl border border-outline-variant p-5 hover:shadow-md transition-shadow">
            <div className="flex items-center gap-3 mb-3">
              <span className="material-symbols-outlined text-emerald-600">trending_up</span>
              <span className="text-label-sm text-on-surface-variant">إجمالي الإيرادات</span>
            </div>
            <div className="text-headline-md font-bold text-emerald-600">
              ر.س {plTotals.revenue.toLocaleString()}
            </div>
          </div>
          <div className="bg-white rounded-xl border border-outline-variant p-5 hover:shadow-md transition-shadow">
            <div className="flex items-center gap-3 mb-3">
              <span className="material-symbols-outlined text-red-600">trending_down</span>
              <span className="text-label-sm text-on-surface-variant">إجمالي المصروفات</span>
            </div>
            <div className="text-headline-md font-bold text-red-600">
              ر.س {plTotals.expenses.toLocaleString()}
            </div>
          </div>
          <div className="bg-white rounded-xl border border-outline-variant p-5 hover:shadow-md transition-shadow">
            <div className="flex items-center gap-3 mb-3">
              <span className={`material-symbols-outlined ${plTotals.net >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>account_balance</span>
              <span className="text-label-sm text-on-surface-variant">صافي الربح / الخسارة</span>
            </div>
            <div className={`text-headline-md font-bold ${plTotals.net >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>
              {plTotals.net >= 0 ? '' : '-'}ر.س {Math.abs(plTotals.net).toLocaleString()}
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl border border-outline-variant overflow-hidden">
          <div className="px-card-padding py-4 bg-surface-container-low border-b border-outline-variant">
            <h3 className="font-headline-md text-headline-md text-on-surface">التفصيل الشهري</h3>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-right">
              <thead className="bg-surface-container-low text-on-surface-variant border-b border-outline-variant font-label-md">
                <tr>
                  <th className="px-6 py-4 font-bold">الشهر</th>
                  <th className="px-6 py-4 font-bold">الإيرادات (ر.س)</th>
                  <th className="px-6 py-4 font-bold">المصروفات (ر.س)</th>
                  <th className="px-6 py-4 font-bold">الصافي (ر.س)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-outline-variant">
                {plData.map((r) => (
                  <tr key={r.monthKey} className="hover:bg-surface-container-lowest transition-colors">
                    <td className="px-6 py-4 font-bold text-on-surface">{r.month}</td>
                    <td className="px-6 py-4 text-emerald-600">{r.revenue.toLocaleString()}</td>
                    <td className="px-6 py-4 text-red-600">{r.expenses.toLocaleString()}</td>
                    <td className={`px-6 py-4 font-bold ${r.net >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>
                      {r.net >= 0 ? '' : '-'}{Math.abs(r.net).toLocaleString()}
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot className="bg-surface-container-low/50 border-t border-outline-variant font-bold">
                <tr>
                  <td className="px-6 py-4 text-on-surface">الإجمالي</td>
                  <td className="px-6 py-4 text-emerald-600">{plTotals.revenue.toLocaleString()}</td>
                  <td className="px-6 py-4 text-red-600">{plTotals.expenses.toLocaleString()}</td>
                  <td className={`px-6 py-4 ${plTotals.net >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>
                    {plTotals.net >= 0 ? '' : '-'}{Math.abs(plTotals.net).toLocaleString()}
                  </td>
                </tr>
              </tfoot>
            </table>
          </div>
        </div>
      </>
    );
  };

  const renderAging = () => {
    const grandTotal = agingBuckets.reduce((s, b) => s + b.total, 0);
    if (grandTotal === 0) {
      return (
        <div className="bg-white rounded-xl border border-outline-variant p-12 text-center">
          <span className="material-symbols-outlined text-5xl text-outline-variant mb-4">receipt_long</span>
          <p className="text-on-surface-variant">لا توجد ذمم مدينة مستحقة</p>
        </div>
      );
    }
    return (
      <>
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
          {agingBuckets.map((b) => (
            <div key={b.label} className={`bg-white rounded-xl border p-5 hover:shadow-md transition-shadow ${b.total > 0 && b.label !== 'مستحقة (غير متأخرة)' ? 'border-red-200' : 'border-outline-variant'}`}>
              <p className="text-label-sm text-on-surface-variant mb-2">{b.label}</p>
              <p className={`text-headline-md font-bold ${b.label === 'مستحقة (غير متأخرة)' ? 'text-amber-600' : 'text-red-600'}`}>
                ر.س {b.total.toLocaleString()}
              </p>
              <p className="text-label-sm text-on-surface-variant mt-1">{b.payments.length} فاتورة</p>
            </div>
          ))}
        </div>

        <div className="bg-white rounded-xl border border-outline-variant overflow-hidden">
          <div className="px-card-padding py-4 bg-surface-container-low border-b border-outline-variant">
            <h3 className="font-headline-md text-headline-md text-on-surface">تفصيل الذمم المدينة</h3>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-right">
              <thead className="bg-surface-container-low text-on-surface-variant border-b border-outline-variant font-label-md">
                <tr>
                  <th className="px-6 py-4 font-bold">المستأجر</th>
                  <th className="px-6 py-4 font-bold">رقم الجوال</th>
                  <th className="px-6 py-4 font-bold">المبلغ (ر.س)</th>
                  <th className="px-6 py-4 font-bold">تاريخ الاستحقاق</th>
                  <th className="px-6 py-4 font-bold">الحالة</th>
                  <th className="px-6 py-4 font-bold">التصنيف</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-outline-variant">
                {agingBuckets.flatMap((b) =>
                  b.payments.map((p) => {
                    const days = p.status === 'overdue'
                      ? Math.floor((Date.now() - new Date(p.due_date).getTime()) / (1000 * 60 * 60 * 24))
                      : 0;
                    return (
                      <tr key={p.id} className="hover:bg-surface-container-lowest transition-colors cursor-pointer" onClick={() => navigate('/payments')}>
                        <td className="px-6 py-4 font-bold text-on-surface">
                          {p.contract?.tenant?.full_name_ar || '—'}
                        </td>
                        <td className="px-6 py-4">{p.contract?.tenant?.phone || '—'}</td>
                        <td className="px-6 py-4 font-bold">{p.total_amount.toLocaleString()}</td>
                        <td className="px-6 py-4">{new Date(p.due_date).toLocaleDateString('ar-SA')}</td>
                        <td className="px-6 py-4">
                          <span className={`px-3 py-1 rounded-full text-label-sm font-bold ${
                            p.status === 'overdue' ? 'bg-red-100 text-red-600' : 'bg-amber-100 text-amber-600'
                          }`}>
                            {p.status === 'overdue' ? 'متأخرة' : 'مستحقة'}
                          </span>
                        </td>
                        <td className="px-6 py-4">
                          <span className={`px-3 py-1 rounded-full text-label-sm font-bold ${
                            days > 90 ? 'bg-red-100 text-red-700' :
                            days > 60 ? 'bg-orange-100 text-orange-600' :
                            days > 30 ? 'bg-amber-100 text-amber-600' :
                            days > 0 ? 'bg-yellow-100 text-yellow-700' :
                            'bg-blue-100 text-blue-600'
                          }`}>
                            {p.status === 'overdue' ? `${days} يوم` : 'غير متأخرة'}
                          </span>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
              <tfoot className="bg-surface-container-low/50 border-t border-outline-variant font-bold">
                <tr>
                  <td className="px-6 py-4 text-on-surface">الإجمالي</td>
                  <td className="px-6 py-4"></td>
                  <td className="px-6 py-4 text-red-600">{grandTotal.toLocaleString()}</td>
                  <td className="px-6 py-4"></td>
                  <td className="px-6 py-4"></td>
                  <td className="px-6 py-4"></td>
                </tr>
              </tfoot>
            </table>
          </div>
        </div>
      </>
    );
  };

  const renderCashFlow = () => {
    if (cashFlowData.length === 0) {
      return (
        <div className="bg-white rounded-xl border border-outline-variant p-12 text-center">
          <span className="material-symbols-outlined text-5xl text-outline-variant mb-4">currency_exchange</span>
          <p className="text-on-surface-variant">لا توجد بيانات تدفق نقدي</p>
        </div>
      );
    }

    const maxVal = Math.max(
      ...cashFlowData.map(r => Math.max(r.inflow, r.outflow, Math.abs(r.balance))),
      1
    );

    return (
      <>
        <div className="grid grid-cols-3 gap-4">
          <div className="bg-white rounded-xl border border-outline-variant p-5 hover:shadow-md transition-shadow">
            <div className="flex items-center gap-3 mb-3">
              <span className="material-symbols-outlined text-emerald-600">arrow_downward</span>
              <span className="text-label-sm text-on-surface-variant">إجمالي التدفق الداخل</span>
            </div>
            <div className="text-headline-md font-bold text-emerald-600">
              ر.س {cashFlowTotals.inflow.toLocaleString()}
            </div>
          </div>
          <div className="bg-white rounded-xl border border-outline-variant p-5 hover:shadow-md transition-shadow">
            <div className="flex items-center gap-3 mb-3">
              <span className="material-symbols-outlined text-red-600">arrow_upward</span>
              <span className="text-label-sm text-on-surface-variant">إجمالي التدفق الخارج</span>
            </div>
            <div className="text-headline-md font-bold text-red-600">
              ر.س {cashFlowTotals.outflow.toLocaleString()}
            </div>
          </div>
          <div className="bg-white rounded-xl border border-outline-variant p-5 hover:shadow-md transition-shadow">
            <div className="flex items-center gap-3 mb-3">
              <span className={`material-symbols-outlined ${cashFlowTotals.balance >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>account_balance_wallet</span>
              <span className="text-label-sm text-on-surface-variant">صافي الرصيد النقدي</span>
            </div>
            <div className={`text-headline-md font-bold ${cashFlowTotals.balance >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>
              ر.س {cashFlowTotals.balance.toLocaleString()}
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl border border-outline-variant overflow-hidden">
          <div className="px-card-padding py-4 bg-surface-container-low border-b border-outline-variant">
            <h3 className="font-headline-md text-headline-md text-on-surface">التدفق النقدي الشهري</h3>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-right">
              <thead className="bg-surface-container-low text-on-surface-variant border-b border-outline-variant font-label-md">
                <tr>
                  <th className="px-6 py-4 font-bold">الشهر</th>
                  <th className="px-6 py-4 font-bold">التدفق الداخل (ر.س)</th>
                  <th className="px-6 py-4 font-bold">التدفق الخارج (ر.س)</th>
                  <th className="px-6 py-4 font-bold">الصافي (ر.س)</th>
                  <th className="px-6 py-4 font-bold">الرصيد التراكمي</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-outline-variant">
                {cashFlowData.map((r) => (
                  <tr key={r.monthKey} className="hover:bg-surface-container-lowest transition-colors">
                    <td className="px-6 py-4 font-bold text-on-surface">{r.month}</td>
                    <td className="px-6 py-4 text-emerald-600">{r.inflow.toLocaleString()}</td>
                    <td className="px-6 py-4 text-red-600">{r.outflow.toLocaleString()}</td>
                    <td className={`px-6 py-4 font-bold ${r.net >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>
                      {r.net >= 0 ? '' : '-'}{Math.abs(r.net).toLocaleString()}
                    </td>
                    <td className={`px-6 py-4 font-bold ${r.balance >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>
                      {r.balance.toLocaleString()}
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot className="bg-surface-container-low/50 border-t border-outline-variant font-bold">
                <tr>
                  <td className="px-6 py-4 text-on-surface">الإجمالي</td>
                  <td className="px-6 py-4 text-emerald-600">{cashFlowTotals.inflow.toLocaleString()}</td>
                  <td className="px-6 py-4 text-red-600">{cashFlowTotals.outflow.toLocaleString()}</td>
                  <td className={`px-6 py-4 ${cashFlowTotals.inflow - cashFlowTotals.outflow >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>
                    {(cashFlowTotals.inflow - cashFlowTotals.outflow).toLocaleString()}
                  </td>
                  <td className={`px-6 py-4 ${cashFlowTotals.balance >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>
                    {cashFlowTotals.balance.toLocaleString()}
                  </td>
                </tr>
              </tfoot>
            </table>
          </div>
        </div>

        {/* Visual mini chart */}
        <div className="bg-white rounded-xl border border-outline-variant p-6">
          <h4 className="font-headline-md text-headline-md text-on-surface mb-6">الرسم البياني للتدفق النقدي</h4>
          <div className="h-56 flex items-end justify-between gap-2 px-2 border-b border-outline-variant/30">
            {cashFlowData.map((r, i) => {
              const maxPx = 180;
              const inPx = Math.max(Math.round((r.inflow / maxVal) * maxPx), 2);
              const outPx = Math.max(Math.round((r.outflow / maxVal) * maxPx), 2);
              return (
                <div key={i} className="flex flex-col items-center gap-1 flex-1 min-w-0">
                  <div className="flex gap-1 w-full justify-center items-end" style={{ height: `${Math.max(inPx, outPx)}px` }}>
                    <div
                      className="w-3 bg-emerald-400 rounded-t-sm"
                      style={{ height: `${inPx}px` }}
                      title={`داخل: ${r.inflow.toLocaleString()}`}
                    ></div>
                    <div
                      className="w-3 bg-red-400 rounded-t-sm"
                      style={{ height: `${outPx}px` }}
                      title={`خارج: ${r.outflow.toLocaleString()}`}
                    ></div>
                  </div>
                  <span className="text-[9px] text-on-surface-variant whitespace-nowrap">{r.month.split(' ')[0]}</span>
                </div>
              );
            })}
          </div>
          <div className="flex items-center justify-center gap-6 mt-4">
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded bg-emerald-400"></div>
              <span className="text-label-sm text-on-surface-variant">تدفق داخل</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded bg-red-400"></div>
              <span className="text-label-sm text-on-surface-variant">تدفق خارج</span>
            </div>
          </div>
        </div>
      </>
    );
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="font-headline-lg text-headline-lg font-bold text-primary">المحاسبة</h2>
        <p className="font-body-md text-body-md text-on-surface-variant mt-1">تقارير محاسبية شاملة</p>
      </div>

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

      {activeTab === 'pl' && renderPL()}
      {activeTab === 'aging' && renderAging()}
      {activeTab === 'cashflow' && renderCashFlow()}
    </div>
  );
};

export default AccountingPage;
