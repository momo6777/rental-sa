import { useEffect, useState, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';

const TenantDetails = () => {
  const { id: tenantId } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const contractNumberByContractId = useMemo(() => {
    const map: Record<string, string> = {};
    contracts.forEach(c => {
      map[c.id] = c.contract_number || c.id?.slice(0, 8);
    });
    return map;
  }, [contracts]);
  const [tenant, setTenant] = useState<any>(null);
  const [contracts, setContracts] = useState<any[]>([]);
  const [payments, setPayments] = useState<any[]>([]);

  useEffect(() => {
    if (tenantId) fetchData();
  }, [tenantId]);

  const fetchData = async () => {
    try {
      setLoading(true);
      const { data: tenantData, error: tenantError } = await supabase
        .from('tenants').select('*').eq('id', tenantId).single();
      if (tenantError) throw tenantError;
      setTenant(tenantData);

      const { data: contractsData, error: contractsError } = await supabase
        .from('contracts').select('*').eq('tenant_id', tenantId);
      if (contractsError) throw contractsError;
      setContracts(contractsData || []);

      const contractIds = (contractsData || []).map((c) => c.id);
      if (contractIds.length > 0) {
        const { data: paymentsData, error: paymentsError } = await supabase
          .from('payments').select('*').in('contract_id', contractIds);
        if (paymentsError) throw paymentsError;
        setPayments(paymentsData || []);
      }
    } catch (err: any) {
      console.error('Error loading tenant details', err);
    } finally {
      setLoading(false);
    }
  };

  const statusBadge: Record<string, string> = {
    active: 'bg-secondary/10 text-secondary border-secondary/20',
    expired: 'bg-error/10 text-error border-error/20',
    terminated: 'bg-orange-100 text-orange-600 border-orange-200',
    paid: 'bg-secondary/10 text-secondary border-secondary/20',
    pending: 'bg-amber-100 text-amber-700 border-amber-200',
    overdue: 'bg-error/10 text-error border-error/20',
  };
  const statusLabel: Record<string, string> = {
    active: 'نشط', expired: 'منتهي', terminated: 'ملغي',
    paid: 'مدفوع', pending: 'مستحق', overdue: 'متأخر',
  };

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

  if (!tenant) {
    return (
      <div className="bg-white rounded-xl border border-outline-variant p-12 text-center">
        <span className="material-symbols-outlined text-5xl text-outline-variant mb-4">person_off</span>
        <p className="text-on-surface-variant mb-4">لم يتم العثور على المستأجر.</p>
        <button onClick={() => navigate('/tenants')} className="bg-primary text-on-primary px-6 py-2 rounded-xl font-label-md">
          رجوع إلى القائمة
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Back button */}
      <button onClick={() => navigate('/tenants')} className="flex items-center gap-2 text-on-surface-variant hover:text-primary transition-colors font-label-md">
        <span className="material-symbols-outlined">arrow_forward</span>
        الرجوع إلى القائمة
      </button>

      {/* Header */}
      <div className="flex items-center gap-4">
        <div className="w-14 h-14 rounded-full bg-primary-container flex items-center justify-center text-white text-xl font-bold">
          {tenant.full_name_ar?.charAt(0) || 'م'}
        </div>
        <div>
          <h2 className="font-headline-lg text-headline-lg font-bold text-primary">{tenant.full_name_ar}</h2>
          <p className="text-on-surface-variant font-body-md">{tenant.full_name_en || ''}</p>
        </div>
      </div>

      {/* Tenant Info */}
      <div className="bg-white rounded-xl border border-outline-variant overflow-hidden">
        <div className="px-card-padding py-4 border-b border-outline-variant bg-surface-container-low">
          <h3 className="font-headline-md text-headline-md text-on-surface flex items-center gap-2">
            <span className="material-symbols-outlined text-primary">person</span>
            معلومات المستأجر
          </h3>
        </div>
        <div className="p-card-padding">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            <div>
              <p className="text-label-sm text-on-surface-variant mb-1">الجنسية</p>
              <p className="font-body-md font-bold">{tenant.nationality}</p>
            </div>
            <div>
              <p className="text-label-sm text-on-surface-variant mb-1">رقم الهوية الوطنية</p>
              <p className="font-body-md font-bold">{tenant.national_id || '-'}</p>
            </div>
            <div>
              <p className="text-label-sm text-on-surface-variant mb-1">رقم الإقامة</p>
              <p className="font-body-md font-bold">{tenant.iqama_number || '-'}</p>
            </div>
            <div>
              <p className="text-label-sm text-on-surface-variant mb-1">الهاتف</p>
              <p className="font-body-md font-bold" dir="ltr">{tenant.phone}</p>
            </div>
            <div>
              <p className="text-label-sm text-on-surface-variant mb-1">البريد الإلكتروني</p>
              <p className="font-body-md font-bold">{tenant.email || '-'}</p>
            </div>
            <div>
              <p className="text-label-sm text-on-surface-variant mb-1">تحقق Absher</p>
              <span className={`px-3 py-1 rounded-full text-label-sm font-bold border inline-block mt-1 ${
                tenant.absher_verified
                  ? 'bg-secondary/10 text-secondary border-secondary/20'
                  : 'bg-surface-container text-on-surface-variant border-outline-variant'
              }`}>
                {tenant.absher_verified ? 'محقق' : 'غير محقق'}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Contracts */}
      <div className="bg-white rounded-xl border border-outline-variant overflow-hidden">
        <div className="px-card-padding py-4 border-b border-outline-variant bg-surface-container-low">
          <h3 className="font-headline-md text-headline-md text-on-surface flex items-center gap-2">
            <span className="material-symbols-outlined text-primary">description</span>
            العقود ({contracts.length})
          </h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-right">
            <thead className="bg-surface-container-low text-on-surface-variant border-b border-outline-variant font-label-md">
              <tr>
                <th className="px-6 py-4 font-bold">العقد</th>
                <th className="px-6 py-4 font-bold">الوحدة</th>
                <th className="px-6 py-4 font-bold">الإيجار</th>
                <th className="px-6 py-4 font-bold">الحالة</th>
                <th className="px-6 py-4 font-bold">تاريخ البدء</th>
                <th className="px-6 py-4 font-bold">تاريخ الانتهاء</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-outline-variant">
              {contracts.map((c) => (
                <tr key={c.id} className="hover:bg-surface-container-lowest transition-colors">
                  <td className="px-6 py-4">
                    <span className="bg-primary-container/10 text-primary px-3 py-1 rounded-lg text-label-sm font-bold">
                      {c.contract_number || c.id?.slice(0, 8)}...
                    </span>
                  </td>
                  <td className="px-6 py-4 text-on-surface-variant">{c.unit_id?.slice(0, 8) || '-'}</td>
                  <td className="px-6 py-4 font-bold text-primary">{c.rent_amount?.toLocaleString()} ر.س</td>
                  <td className="px-6 py-4">
                    <span className={`px-3 py-1 rounded-full text-label-sm font-bold border ${statusBadge[c.status] || ''}`}>
                      {statusLabel[c.status] || c.status}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-on-surface-variant">{c.start_date ? new Date(c.start_date).toLocaleDateString('ar-SA') : '-'}</td>
                  <td className="px-6 py-4 text-on-surface-variant">{c.end_date ? new Date(c.end_date).toLocaleDateString('ar-SA') : '-'}</td>
                </tr>
              ))}
              {contracts.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-6 py-8 text-center text-on-surface-variant">لا توجد عقود</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Payments */}
      <div className="bg-white rounded-xl border border-outline-variant overflow-hidden">
        <div className="px-card-padding py-4 border-b border-outline-variant bg-surface-container-low">
          <h3 className="font-headline-md text-headline-md text-on-surface flex items-center gap-2">
            <span className="material-symbols-outlined text-primary">payments</span>
            الدفعات ({payments.length})
          </h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-right">
            <thead className="bg-surface-container-low text-on-surface-variant border-b border-outline-variant font-label-md">
              <tr>
                <th className="px-6 py-4 font-bold">الدفعة</th>
                <th className="px-6 py-4 font-bold">العقد</th>
                <th className="px-6 py-4 font-bold">المبلغ</th>
                <th className="px-6 py-4 font-bold">الحالة</th>
                <th className="px-6 py-4 font-bold">طريقة الدفع</th>
                <th className="px-6 py-4 font-bold">تاريخ الاستحقاق</th>
                <th className="px-6 py-4 font-bold">تاريخ الدفع</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-outline-variant">
              {payments.map((p) => (
                <tr key={p.id} className="hover:bg-surface-container-lowest transition-colors">
                  <td className="px-6 py-4">
                    <span className="bg-primary-container/10 text-primary px-3 py-1 rounded-lg text-label-sm font-bold">
                      {p.id?.slice(0, 8)}...
                    </span>
                  </td>
                  <td className="px-6 py-4 text-on-surface-variant">{contractNumberByContractId[p.contract_id] || p.contract_id?.slice(0, 8) || '-'}</td>
                  <td className="px-6 py-4 font-bold text-primary">{p.total_amount?.toLocaleString()} ر.س</td>
                  <td className="px-6 py-4">
                    <span className={`px-3 py-1 rounded-full text-label-sm font-bold border ${statusBadge[p.status] || ''}`}>
                      {statusLabel[p.status] || p.status}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-on-surface-variant">{p.payment_method || '-'}</td>
                  <td className="px-6 py-4 text-on-surface-variant">{p.due_date ? new Date(p.due_date).toLocaleDateString('ar-SA') : '-'}</td>
                  <td className="px-6 py-4 text-on-surface-variant">{p.paid_date ? new Date(p.paid_date).toLocaleDateString('ar-SA') : '-'}</td>
                </tr>
              ))}
              {payments.length === 0 && (
                <tr>
                  <td colSpan={7} className="px-6 py-8 text-center text-on-surface-variant">لا توجد دفعات</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default TenantDetails;
