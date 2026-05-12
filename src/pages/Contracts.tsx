import { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { useSettings } from '../lib/SettingsContext';
import { supabase } from '../lib/supabase';
import AddEditContract from './AddEditContract';

const ContractsPage = () => {
  const { user } = useAuth();
  const { formatCurrency, countryConfig } = useSettings();
  const [searchParams] = useSearchParams();
  const [contracts, setContracts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState(searchParams.get('q') || '');
  const [filteredContracts, setFilteredContracts] = useState<any[]>([]);
  const [modalVisible, setModalVisible] = useState(false);
  const [selectedContract, setSelectedContract] = useState<any>(null);
  const [previewContract, setPreviewContract] = useState<any>(null);

  useEffect(() => {
    fetchContracts();
  }, []);

  useEffect(() => {
    applyFilters();
  }, [searchTerm, contracts]);

  const fetchContracts = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('contracts')
        .select(`
          *,
          unit:units(unit_number, floor, area_sqm, type, rent_price, property:properties(name_ar, city, district)),
          tenant:tenants(full_name_ar, full_name_en, national_id, iqama_number, nationality, phone, email)
        `)
        .order('created_at', { ascending: false });
      if (error) throw error;
      setContracts(data || []);
      setFilteredContracts(data || []);
    } catch (err: any) {
      console.error('Error fetching contracts', err);
    } finally {
      setLoading(false);
    }
  };

  const applyFilters = () => {
    const term = searchTerm.toLowerCase().trim();
    if (!term) {
      setFilteredContracts(contracts);
      return;
    }
    const filtered = contracts.filter(
      (c) =>
        (c.id && c.id.toString().includes(term)) ||
        (c.ejar_contract_number && c.ejar_contract_number.toString().includes(term)) ||
        (c.tenant?.full_name_ar && c.tenant.full_name_ar.toLowerCase().includes(term))
    );
    setFilteredContracts(filtered);
  };

  const handleAddContract = () => {
    setSelectedContract(null);
    setModalVisible(true);
  };

  const handleEditContract = (contract: any) => {
    setSelectedContract(contract);
    setModalVisible(true);
  };

  const handleModalClose = () => {
    setModalVisible(false);
    setSelectedContract(null);
    fetchContracts();
  };

  const handlePrint = () => {
    window.print();
  };

  const statusColor: Record<string, string> = {
    active: 'bg-secondary/10 text-secondary border-secondary/20',
    expired: 'bg-error/10 text-error border-error/20',
    terminated: 'bg-orange-100 text-orange-600 border-orange-200',
  };
  const statusLabel: Record<string, string> = {
    active: 'نشط',
    expired: 'منتهي',
    terminated: 'ملغي',
  };
  const freqLabel: Record<string, string> = {
    monthly: 'شهري',
    quarterly: 'ربع سنوي',
    yearly: 'سنوي',
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-end justify-between">
        <div>
          <h2 className="font-headline-lg text-headline-lg font-bold text-primary">إدارة العقود</h2>
          <p className="font-body-md text-body-md text-on-surface-variant mt-1">متابعة العقود النشطة والمنتهية</p>
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
              onClick={handleAddContract}
              className="bg-primary text-on-primary px-4 py-2 rounded-xl font-label-md flex items-center gap-2 hover:opacity-90 active:scale-95 transition-all"
            >
              <span className="material-symbols-outlined text-[18px]">add</span>
              إضافة عقد
            </button>
          )}
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center h-40">
          <div className="animate-pulse flex flex-col items-center gap-3">
            <div className="w-8 h-8 rounded-full bg-primary/20"></div>
            <div className="h-3 w-32 bg-surface-container-highest rounded"></div>
          </div>
        </div>
      ) : filteredContracts.length === 0 ? (
        <div className="bg-white rounded-xl border border-outline-variant p-12 text-center">
          <span className="material-symbols-outlined text-5xl text-outline-variant mb-4">description</span>
          <p className="text-on-surface-variant">لا توجد عقود مطابقة</p>
        </div>
      ) : (<>
        <div className="hidden md:block bg-white rounded-xl border border-outline-variant overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-right">
              <thead className="bg-surface-container-low text-on-surface-variant border-b border-outline-variant font-label-md">
                <tr>
                  <th className="px-6 py-4 font-bold">رقم العقد</th>
                  <th className="px-6 py-4 font-bold">المستأجر</th>
                  <th className="px-6 py-4 font-bold">الوحدة</th>
                  <th className="px-6 py-4 font-bold">الإيجار</th>
                  <th className="px-6 py-4 font-bold">دورية الدفع</th>
                  <th className="px-6 py-4 font-bold">الحالة</th>
                  <th className="px-6 py-4 font-bold text-left">إجراءات</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-outline-variant">
                {filteredContracts.map((c) => (
                  <tr key={c.id} className="hover:bg-surface-container-lowest transition-colors">
                    <td className="px-6 py-4">
                      <span className="bg-primary-container/10 text-primary px-3 py-1 rounded-lg text-label-sm font-bold">
                        {c.contract_number || c.id?.slice(0, 8)}...
                      </span>
                    </td>
                    <td className="px-6 py-4 font-bold text-on-surface">{c.tenant?.full_name_ar || c.tenant_id?.slice(0, 8)}</td>
                    <td className="px-6 py-4 text-on-surface-variant">
                      {c.unit?.property?.name_ar ? `${c.unit.property.name_ar} - وحدة ${c.unit.unit_number || ''}` : c.unit_id?.slice(0, 8) || '-'}
                    </td>
                    <td className="px-6 py-4 font-bold text-primary">{formatCurrency(c.rent_amount)}</td>
                    <td className="px-6 py-4 text-on-surface-variant">{freqLabel[c.payment_frequency] || c.payment_frequency}</td>
                    <td className="px-6 py-4">
                      <span className={`px-3 py-1 rounded-full text-label-sm font-bold border ${statusColor[c.status] || 'bg-surface-container text-on-surface-variant'}`}>
                        {statusLabel[c.status] || c.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-left">
                      <div className="flex gap-1 justify-end">
                        <button
                          onClick={() => setPreviewContract(c)}
                          className="p-2 text-on-surface-variant hover:text-primary transition-colors"
                          title="عرض وطباعة"
                        >
                          <span className="material-symbols-outlined text-[20px]">print</span>
                        </button>
                        {user?.role === 'admin' && (
                          <button
                            onClick={() => handleEditContract(c)}
                            className="p-2 text-on-surface-variant hover:text-primary transition-colors"
                            title="تعديل"
                          >
                            <span className="material-symbols-outlined text-[20px]">edit</span>
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="p-4 border-t border-outline-variant flex justify-between items-center bg-surface-container-low/50">
            <p className="text-body-sm text-on-surface-variant">عرض {filteredContracts.length} من أصل {contracts.length} عقد</p>
          </div>
        </div>

        <div className="block md:hidden space-y-3">
          {filteredContracts.map((c) => (
            <div key={c.id} className="bg-white rounded-xl border border-outline-variant p-4">
              <div className="flex items-center justify-between mb-3">
                <span className="bg-primary-container/10 text-primary px-3 py-1 rounded-lg text-label-sm font-bold">
                  {c.contract_number || c.id?.slice(0, 8)}...
                </span>
                <span className={`px-3 py-1 rounded-full text-label-sm font-bold border ${statusColor[c.status] || 'bg-surface-container text-on-surface-variant'}`}>
                  {statusLabel[c.status] || c.status}
                </span>
              </div>
              <div className="space-y-1.5 text-body-sm">
                <p><span className="text-on-surface-variant">المستأجر: </span>{c.tenant?.full_name_ar || '-'}</p>
                <p><span className="text-on-surface-variant">الوحدة: </span>{c.unit?.property?.name_ar ? `${c.unit.property.name_ar} - وحدة ${c.unit.unit_number || ''}` : c.unit_id?.slice(0, 8) || '-'}</p>
                <p><span className="text-on-surface-variant">دورية: </span>{freqLabel[c.payment_frequency] || c.payment_frequency}</p>
                <p className="font-bold text-primary">{formatCurrency(c.rent_amount)}</p>
                </div>
                <div className="flex gap-2 mt-3 pt-3 border-t border-outline-variant">
                <button onClick={() => setPreviewContract(c)} className="flex-1 py-2 rounded-lg border border-outline-variant text-label-sm font-bold hover:bg-surface-container transition-colors flex items-center justify-center gap-1">
                  <span className="material-symbols-outlined text-[16px]">print</span> طباعة
                </button>
                {user?.role === 'admin' && (
                  <button onClick={() => handleEditContract(c)} className="flex-1 py-2 rounded-lg border border-outline-variant text-label-sm font-bold hover:bg-surface-container transition-colors flex items-center justify-center gap-1">
                    <span className="material-symbols-outlined text-[16px]">edit</span> تعديل
                  </button>
                )}
              </div>
            </div>
          ))}
          <div className="p-3 text-center">
            <p className="text-body-sm text-on-surface-variant">عرض {filteredContracts.length} من أصل {contracts.length} عقد</p>
          </div>
        </div>
      </>)}

      <AddEditContract
        contractId={selectedContract?.id}
        onClose={handleModalClose}
        visible={modalVisible}
      />

      {/* Print Preview Modal */}
      {previewContract && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4 print:bg-white print:p-0" dir="rtl">
          <div className="bg-white rounded-2xl max-w-3xl w-full max-h-[90vh] overflow-y-auto shadow-2xl print:shadow-none print:max-h-none print:rounded-none">
            {/* Header actions (hidden when printing) */}
            <div className="flex items-center justify-between p-4 border-b print:hidden">
              <h3 className="font-headline-md text-headline-md text-primary">عقد إيجار</h3>
              <div className="flex gap-2">
                <button onClick={handlePrint} className="bg-primary text-on-primary px-4 py-2 rounded-xl font-label-md flex items-center gap-2 hover:opacity-90">
                  <span className="material-symbols-outlined text-[18px]">print</span>
                  طباعة
                </button>
                <button onClick={() => setPreviewContract(null)} className="px-4 py-2 rounded-xl border border-outline-variant font-label-md hover:bg-surface-container">
                  إغلاق
                </button>
              </div>
            </div>

            {/* Print content */}
            <div className="p-8 print:p-6 space-y-6">
              {/* Title */}
              <div className="text-center border-b border-outline-variant pb-6">
                <h1 className="font-headline-xl text-headline-xl text-primary mb-2">عقد إيجار</h1>
                <p className="text-on-surface-variant">
                  {previewContract.ejar_contract_number ? `رقم عقد إيجار: ${previewContract.ejar_contract_number}` : ''}
                </p>
                <p className="text-label-sm text-on-surface-variant mt-1">
                  رقم العقد: {previewContract.id}
                </p>
              </div>

              {/* Parties */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="bg-surface-container-low rounded-xl p-4">
                  <h4 className="font-headline-md text-headline-md text-primary mb-3">المؤجر</h4>
                  <div className="space-y-2 text-body-md">
                    <p><span className="text-on-surface-variant">الاسم:</span> <span className="font-bold">{user?.full_name || 'شركة إدارة العقارات'}</span></p>
                    <p><span className="text-on-surface-variant">البريد:</span> {user?.email || '-'}</p>
                  </div>
                </div>
                <div className="bg-surface-container-low rounded-xl p-4">
                  <h4 className="font-headline-md text-headline-md text-primary mb-3">المستأجر</h4>
                  <div className="space-y-2 text-body-md">
                    <p><span className="text-on-surface-variant">الاسم:</span> <span className="font-bold">{previewContract.tenant?.full_name_ar || '-'}</span></p>
                    {previewContract.tenant?.full_name_en && <p><span className="text-on-surface-variant">Name:</span> {previewContract.tenant.full_name_en}</p>}
                    <p><span className="text-on-surface-variant">الجنسية:</span> {previewContract.tenant?.nationality || '-'}</p>
                    <p><span className="text-on-surface-variant">الهوية:</span> {previewContract.tenant?.national_id || previewContract.tenant?.iqama_number || '-'}</p>
                    <p><span className="text-on-surface-variant">الهاتف:</span> {previewContract.tenant?.phone || '-'}</p>
                    <p><span className="text-on-surface-variant">البريد:</span> {previewContract.tenant?.email || '-'}</p>
                  </div>
                </div>
              </div>

              {/* Property / Unit Details */}
              <div className="bg-white border border-outline-variant rounded-xl overflow-hidden">
                <div className="px-4 py-3 bg-surface-container-low border-b border-outline-variant">
                  <h4 className="font-headline-md text-headline-md text-primary">بيانات العقار والوحدة</h4>
                </div>
                <div className="p-4 grid grid-cols-2 md:grid-cols-3 gap-4 text-body-md">
                  <div>
                    <p className="text-label-sm text-on-surface-variant">العقار</p>
                    <p className="font-bold">{previewContract.unit?.property?.name_ar || '-'}</p>
                  </div>
                  <div>
                    <p className="text-label-sm text-on-surface-variant">الموقع</p>
                    <p className="font-bold">{previewContract.unit?.property?.city || '-'}{previewContract.unit?.property?.district ? ` - ${previewContract.unit.property.district}` : ''}</p>
                  </div>
                  <div>
                    <p className="text-label-sm text-on-surface-variant">رقم الوحدة</p>
                    <p className="font-bold">{previewContract.unit?.unit_number || '-'}</p>
                  </div>
                  <div>
                    <p className="text-label-sm text-on-surface-variant">الطابق</p>
                    <p className="font-bold">{previewContract.unit?.floor ?? '-'}</p>
                  </div>
                  <div>
                    <p className="text-label-sm text-on-surface-variant">المساحة</p>
                    <p className="font-bold">{previewContract.unit?.area_sqm ? `${previewContract.unit.area_sqm} م²` : '-'}</p>
                  </div>
                  <div>
                    <p className="text-label-sm text-on-surface-variant">نوع الوحدة</p>
                    <p className="font-bold">
                      {previewContract.unit?.type === 'apartment' ? 'شقة' :
                       previewContract.unit?.type === 'office' ? 'مكتب' :
                       previewContract.unit?.type === 'shop' ? 'محل' :
                       previewContract.unit?.type === 'villa' ? 'فيلا' :
                       previewContract.unit?.type || '-'}
                    </p>
                  </div>
                </div>
              </div>

              {/* Financial Terms */}
              <div className="bg-white border border-outline-variant rounded-xl overflow-hidden">
                <div className="px-4 py-3 bg-surface-container-low border-b border-outline-variant">
                  <h4 className="font-headline-md text-headline-md text-primary">الشروط المالية</h4>
                </div>
                <div className="p-4 grid grid-cols-2 md:grid-cols-4 gap-4 text-body-md">
                  <div>
                    <p className="text-label-sm text-on-surface-variant">قيمة الإيجار</p>
                    <p className="font-bold text-primary text-headline-md">{formatCurrency(previewContract.rent_amount)}</p>
                  </div>
                  <div>
                    <p className="text-label-sm text-on-surface-variant">دورية الدفع</p>
                    <p className="font-bold">{freqLabel[previewContract.payment_frequency] || previewContract.payment_frequency}</p>
                  </div>
                  <div>
                    <p className="text-label-sm text-on-surface-variant">مبلغ الضمان</p>
                    <p className="font-bold">{formatCurrency(previewContract.deposit_amount)}</p>
                  </div>
                  <div>
                    <p className="text-label-sm text-on-surface-variant">شامل الضريبة</p>
                    <p className="font-bold">{previewContract.vat_included ? 'نعم' : 'لا'}</p>
                  </div>
                </div>
              </div>

              {/* Duration */}
              <div className="bg-white border border-outline-variant rounded-xl overflow-hidden">
                <div className="px-4 py-3 bg-surface-container-low border-b border-outline-variant">
                  <h4 className="font-headline-md text-headline-md text-primary">مدة العقد</h4>
                </div>
                <div className="p-4 grid grid-cols-2 gap-4 text-body-md">
                  <div>
                    <p className="text-label-sm text-on-surface-variant">تاريخ البدء</p>
                    <p className="font-bold">{previewContract.start_date ? new Date(previewContract.start_date).toLocaleDateString('ar-SA') : '-'}</p>
                  </div>
                  <div>
                    <p className="text-label-sm text-on-surface-variant">تاريخ الانتهاء</p>
                    <p className="font-bold">{previewContract.end_date ? new Date(previewContract.end_date).toLocaleDateString('ar-SA') : '-'}</p>
                  </div>
                </div>
              </div>

              {/* Status */}
              <div className="flex items-center justify-center gap-2 text-body-md">
                <span className="text-on-surface-variant">حالة العقد:</span>
                <span className={`px-4 py-1.5 rounded-full text-label-sm font-bold border ${statusColor[previewContract.status] || ''}`}>
                  {statusLabel[previewContract.status] || previewContract.status}
                </span>
              </div>

              {/* Footer */}
              <div className="text-center text-label-sm text-on-surface-variant border-t border-outline-variant pt-4 mt-4">
                <p>تم إنشاء هذه الوثيقة بواسطة نظام إدارة العقارات</p>
                <p className="mt-1">{new Date().toLocaleDateString('ar-SA')}</p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Print styles */}
      <style>{`
        @media print {
          body * { visibility: hidden; }
          .fixed.inset-0, .fixed.inset-0 * { visibility: visible; }
          .fixed.inset-0 { position: absolute; left: 0; top: 0; background: white; }
          .print\\:hidden { display: none !important; }
          .print\\:bg-white { background: white !important; }
          .print\\:p-0 { padding: 0 !important; }
          .print\\:p-6 { padding: 1.5rem !important; }
          .print\\:shadow-none { box-shadow: none !important; }
          .print\\:rounded-none { border-radius: 0 !important; }
          .print\\:max-h-none { max-height: none !important; }
          @page { margin: 1.5cm; }
        }
      `}</style>
    </div>
  );
};

export default ContractsPage;
