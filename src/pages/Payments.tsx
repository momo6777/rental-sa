import { useEffect, useState, lazy, Suspense } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { supabase } from '../lib/supabase';
import AddEditPayment from './AddEditPayment';
import { ErrorBoundary } from '../components/ErrorBoundary';
import { useSettings } from '../lib/SettingsContext';

const ReceiptVoucherPDF = lazy(() =>
  import('../components/ReceiptVoucherPDF').then((m) => ({ default: m.ReceiptVoucherPDF }))
);

const PaymentsPage = () => {
  const { user } = useAuth();
  const [searchParams] = useSearchParams();
  const [payments, setPayments] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState(searchParams.get('q') || '');
  const [filteredPayments, setFilteredPayments] = useState<any[]>([]);
  const [modalVisible, setModalVisible] = useState(false);
  const [selectedPayment, setSelectedPayment] = useState<any>(null);
  const { formatCurrency, countryConfig } = useSettings();

  useEffect(() => {
    fetchPayments();
  }, []);

  useEffect(() => {
    applyFilters();
  }, [searchTerm, payments]);

  const fetchPayments = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('payments')
        .select('*, contract:contracts(*, tenant:tenants(*), unit:units(*, property:properties(*)))')
        .order('created_at', { ascending: false });
      if (error) throw error;
      setPayments(data || []);
      setFilteredPayments(data || []);
    } catch (err: any) {
      console.error('Error fetching payments', err);
    } finally {
      setLoading(false);
    }
  };

  const applyFilters = () => {
    const term = searchTerm.toLowerCase().trim();
    if (!term) {
      setFilteredPayments(payments);
      return;
    }
    const filtered = payments.filter(
      (p) =>
        (p.id && p.id.toString().includes(term)) ||
        (p.invoice_number && p.invoice_number.toString().includes(term))
    );
    setFilteredPayments(filtered);
  };

  const handleAddPayment = () => {
    setSelectedPayment(null);
    setModalVisible(true);
  };

  const handleModalClose = () => {
    setModalVisible(false);
    setSelectedPayment(null);
    fetchPayments();
  };

  const totalCollected = payments
    .filter((p) => p.status === 'paid')
    .reduce((sum, p) => sum + (p.total_amount || 0), 0);
  const totalPending = payments
    .filter((p) => p.status === 'pending' || p.status === 'overdue')
    .reduce((sum, p) => sum + (p.total_amount || 0), 0);
  const collectionRate =
    totalCollected + totalPending > 0
      ? ((totalCollected / (totalCollected + totalPending)) * 100).toFixed(1)
      : '0';

  const statusColor: Record<string, string> = {
    paid: 'bg-secondary/10 text-secondary',
    pending: 'bg-amber-100 text-amber-700',
    overdue: 'bg-error/10 text-error',
  };
  const statusLabel: Record<string, string> = {
    paid: 'مدفوع',
    pending: 'مستحق',
    overdue: 'متأخر',
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-end">
        <div>
          <h2 className="font-headline-lg text-headline-lg font-bold text-primary">التحصيل المالي</h2>
          <p className="font-body-md text-body-md text-on-surface-variant mt-1">تتبع التدفقات النقدية وحالة تحصيل الإيجارات</p>
        </div>
        <div className="flex gap-3">
          <input
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="بحث..."
            className="bg-white border border-outline-variant rounded-xl px-4 py-2 font-label-md focus:ring-primary w-56"
          />
          {user?.role === 'admin' && (
            <button
              onClick={handleAddPayment}
              className="bg-secondary text-on-secondary px-4 py-2 rounded-xl font-label-md flex items-center gap-2 hover:opacity-90 active:scale-95 transition-all"
            >
              <span className="material-symbols-outlined text-[18px]">add_card</span>
              تسجيل دفعة
            </button>
          )}
        </div>
      </div>

      {/* Bento Financial Summary */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-gutter">
        <div className="bg-white p-card-padding rounded-xl border border-outline-variant shadow-sm flex flex-col justify-between">
          <div className="flex items-start justify-between">
            <div className="w-12 h-12 bg-secondary/10 rounded-xl flex items-center justify-center text-secondary">
              <span className="material-symbols-outlined fill">account_balance_wallet</span>
            </div>
            <span className="text-secondary font-label-sm bg-secondary/5 px-2 py-0.5 rounded-full flex items-center gap-1">
              <span className="material-symbols-outlined text-[14px]">trending_up</span>
              {collectionRate}%
            </span>
          </div>
          <div className="mt-4">
            <p className="font-label-md text-label-md text-on-surface-variant">إجمالي المحصل</p>
            <h3 className="font-headline-xl text-headline-xl text-secondary mt-1">{formatCurrency(totalCollected)}</h3>
          </div>
        </div>

        <div className="bg-white p-card-padding rounded-xl border border-outline-variant shadow-sm flex flex-col justify-between">
          <div className="flex items-start justify-between">
            <div className="w-12 h-12 bg-error/10 rounded-xl flex items-center justify-center text-error">
              <span className="material-symbols-outlined fill">pending_actions</span>
            </div>
          </div>
          <div className="mt-4">
            <p className="font-label-md text-label-md text-on-surface-variant">المتبقي (غير محصل)</p>
            <h3 className="font-headline-xl text-headline-xl text-error mt-1">{formatCurrency(totalPending)}</h3>
          </div>
        </div>

        <div className="bg-white p-card-padding rounded-xl border border-outline-variant shadow-sm col-span-1 md:col-span-2 relative overflow-hidden">
          <div className="flex justify-between relative z-10">
            <div className="space-y-4">
              <p className="font-label-md text-label-md text-on-surface-variant">معدل التحصيل العام</p>
              <h3 className="font-headline-xl text-headline-xl text-primary">{collectionRate}%</h3>
              <div className="w-64 h-2 bg-surface-container rounded-full overflow-hidden">
                <div className="h-full bg-primary rounded-full" style={{ width: `${collectionRate}%` }}></div>
              </div>
              <p className="font-body-sm text-body-sm text-on-surface-variant">
                إجمالي {payments.length} دفعة
              </p>
            </div>
            <div className="opacity-10">
              <span className="material-symbols-outlined text-[120px]">analytics</span>
            </div>
          </div>
        </div>
      </div>

      {/* Table */}
      {loading ? (
        <div className="flex items-center justify-center h-40">
          <div className="animate-pulse flex flex-col items-center gap-3">
            <div className="w-8 h-8 rounded-full bg-primary/20"></div>
            <div className="h-3 w-32 bg-surface-container-highest rounded"></div>
          </div>
        </div>
        ) : (<>
          <div className="hidden md:block bg-white rounded-xl border border-outline-variant overflow-hidden">
            <div className="px-card-padding py-4 border-b border-outline-variant flex items-center justify-between bg-surface-container-lowest">
              <h3 className="font-headline-md text-headline-md text-on-surface">سجل الفواتير والدفعات</h3>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-right">
                <thead>
                  <tr className="bg-slate-50 font-label-md text-label-md text-on-surface-variant border-b border-outline-variant">
                    <th className="px-card-padding py-4 font-semibold">رقم الفاتورة</th>
                    <th className="px-card-padding py-4 font-semibold">المبلغ</th>
                    <th className="px-card-padding py-4 font-semibold">الضريبة</th>
                    <th className="px-card-padding py-4 font-semibold">المجموع</th>
                    <th className="px-card-padding py-4 font-semibold">تاريخ الاستحقاق</th>
                    <th className="px-card-padding py-4 font-semibold">حالة الدفع</th>
                    <th className="px-card-padding py-4 font-semibold">الطريقة</th>
                    <th className="px-card-padding py-4 font-semibold">إجراءات</th>
                  </tr>
                </thead>
                <tbody className="font-body-md text-body-md divide-y divide-outline-variant">
                  {filteredPayments.map((p) => (
                    <tr key={p.id} className="hover:bg-surface-container-low transition-colors">
                      <td className="px-card-padding py-4">
                        <span className="bg-primary-container/10 text-primary px-2 py-1 rounded text-label-sm font-bold">
                          {p.invoice_number || `#${p.id?.slice(0, 6)}`}
                        </span>
                      </td>
                      <td className="px-card-padding py-4 font-bold text-on-surface">{formatCurrency(p.amount)}</td>
                      <td className="px-card-padding py-4 text-on-surface-variant">{formatCurrency(p.vat_amount)}</td>
                      <td className="px-card-padding py-4 font-bold text-primary">{formatCurrency(p.total_amount)}</td>
                      <td className="px-card-padding py-4 text-on-surface-variant">
                        {p.due_date ? new Date(p.due_date).toLocaleDateString('ar-SA') : '-'}
                      </td>
                      <td className="px-card-padding py-4">
                        <span className={`px-3 py-1 rounded-full text-label-sm font-medium ${statusColor[p.status] || 'bg-surface-container text-on-surface-variant'}`}>
                          {statusLabel[p.status] || p.status}
                        </span>
                      </td>
                      <td className="px-card-padding py-4 text-on-surface-variant">{p.payment_method || '-'}</td>
                      <td className="px-card-padding py-4">
                        {p.status === 'paid' && p.contract && (
                          <Suspense fallback={<span className="text-label-sm text-on-surface-variant">جاري التحميل...</span>}>
                            <ErrorBoundary>
                              <ReceiptVoucherPDF payment={p} />
                            </ErrorBoundary>
                          </Suspense>
                        )}
                      </td>
                    </tr>
                  ))}
                  {filteredPayments.length === 0 && (
                    <tr>
                      <td colSpan={8} className="px-card-padding py-8 text-center text-on-surface-variant">
                        لا توجد دفعات مسجلة
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
            <div className="px-card-padding py-4 border-t border-outline-variant flex items-center justify-between">
              <p className="font-label-sm text-label-sm text-on-surface-variant">
                عرض {filteredPayments.length} من أصل {payments.length} دفعة
              </p>
            </div>
          </div>

          <div className="block md:hidden space-y-3">
          {filteredPayments.map((p) => (
            <div key={p.id} className="bg-white rounded-xl border border-outline-variant p-4">
              <div className="flex items-center justify-between mb-3">
                <span className="bg-primary-container/10 text-primary px-2 py-1 rounded text-label-sm font-bold">
                  {p.invoice_number || `#${p.id?.slice(0, 6)}`}
                </span>
                <span className={`px-3 py-1 rounded-full text-label-sm font-medium ${statusColor[p.status] || 'bg-surface-container text-on-surface-variant'}`}>
                  {statusLabel[p.status] || p.status}
                </span>
              </div>
              <div className="space-y-1.5 text-body-sm">
                <div className="flex justify-between">
                  <span className="text-on-surface-variant">المبلغ:</span>
                  <span>{formatCurrency(p.amount)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-on-surface-variant">الضريبة:</span>
                  <span className={p.vat_amount > 0 ? '' : 'text-on-surface-variant'}>{formatCurrency(p.vat_amount)}</span>
                </div>
                <div className="flex justify-between font-bold text-primary">
                  <span>المجموع:</span>
                  <span>{formatCurrency(p.total_amount)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-on-surface-variant">استحقاق:</span>
                  <span>{p.due_date ? new Date(p.due_date).toLocaleDateString('ar-SA') : '-'}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-on-surface-variant">الطريقة:</span>
                  <span>{p.payment_method || '-'}</span>
                </div>
              </div>
              {p.status === 'paid' && p.contract && (
                <div className="mt-3 pt-3 border-t border-outline-variant flex justify-center">
                  <Suspense fallback={<span className="text-label-sm text-on-surface-variant">جاري التحميل...</span>}>
                    <ErrorBoundary>
                      <ReceiptVoucherPDF payment={p} />
                    </ErrorBoundary>
                  </Suspense>
                </div>
              )}
            </div>
          ))}
          {filteredPayments.length === 0 && (
            <div className="bg-white rounded-xl border border-outline-variant p-8 text-center">
              <p className="text-on-surface-variant">لا توجد دفعات مسجلة</p>
            </div>
          )}
          <div className="p-3 text-center">
            <p className="font-label-sm text-label-sm text-on-surface-variant">
              عرض {filteredPayments.length} من أصل {payments.length} دفعة
            </p>
          </div>
        </div>
      </>)}

      <AddEditPayment
        paymentId={selectedPayment?.id}
        onClose={handleModalClose}
        visible={modalVisible}
      />
    </div>
  );
};

export default PaymentsPage;
