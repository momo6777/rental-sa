import { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import AddEditTenant from './AddEditTenant';

const TenantsPage = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [tenants, setTenants] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState(searchParams.get('q') || '');
  const [filteredTenants, setFilteredTenants] = useState<any[]>([]);
  const [selectedTenant, setSelectedTenant] = useState<any>(null);
  const [modalVisible, setModalVisible] = useState(false);

  useEffect(() => {
    fetchTenants();
  }, []);

  useEffect(() => {
    applyFilters();
  }, [searchTerm, tenants]);

  const fetchTenants = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('tenants')
        .select('*')
        .order('created_at', { ascending: false });
      if (error) throw error;
      setTenants(data || []);
      setFilteredTenants(data || []);
    } catch (error) {
      console.error('Error fetching tenants:', error);
    } finally {
      setLoading(false);
    }
  };

  const applyFilters = () => {
    const term = searchTerm.toLowerCase().trim();
    if (!term) {
      setFilteredTenants(tenants);
      return;
    }
    const filtered = tenants.filter(
      (t) =>
        t.full_name_ar.toLowerCase().includes(term) ||
        (t.full_name_en && t.full_name_en.toLowerCase().includes(term)) ||
        (t.national_id && t.national_id.toLowerCase().includes(term)) ||
        (t.phone && t.phone.toLowerCase().includes(term))
    );
    setFilteredTenants(filtered);
  };

  const handleAddTenant = () => {
    setSelectedTenant(null);
    setModalVisible(true);
  };

  const handleEditTenant = (tenant: any) => {
    setSelectedTenant(tenant);
    setModalVisible(true);
  };

  const handleViewTenant = (tenant: any) => {
    navigate(`/tenants/${tenant.id}`);
  };

  const handleModalClose = () => {
    setModalVisible(false);
    setSelectedTenant(null);
    fetchTenants();
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-end justify-between">
        <div>
          <h2 className="font-headline-lg text-headline-lg font-bold text-primary">إدارة المستأجرين</h2>
          <p className="font-body-md text-body-md text-on-surface-variant mt-1">متابعة المستأجرين النشطين وحالة العقود</p>
        </div>
        <div className="flex gap-3">
          <input
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="بحث بالاسم أو الهاتف..."
            className="bg-white border border-outline-variant rounded-xl px-4 py-2 font-label-md focus:ring-primary w-56"
          />
          {user?.role === 'admin' && (
            <button
              onClick={handleAddTenant}
              className="bg-primary text-on-primary px-4 py-2 rounded-xl font-label-md flex items-center gap-2 hover:opacity-90 active:scale-95 transition-all"
            >
              <span className="material-symbols-outlined text-[18px]">add</span>
              إضافة مستأجر
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
      ) : filteredTenants.length === 0 ? (
        <div className="bg-white rounded-xl border border-outline-variant p-12 text-center">
          <span className="material-symbols-outlined text-5xl text-outline-variant mb-4">group</span>
          <p className="text-on-surface-variant">لا توجد مستأجرين مطابقين</p>
        </div>
      ) : (
        <div className="bg-white rounded-xl border border-outline-variant overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-right">
              <thead className="bg-surface-container-low text-on-surface-variant border-b border-outline-variant font-label-md">
                <tr>
                  <th className="px-6 py-4 font-bold">المستأجر</th>
                  <th className="px-6 py-4 font-bold">رقم الهاتف</th>
                  <th className="px-6 py-4 font-bold">الجنسية</th>
                  <th className="px-6 py-4 font-bold">الهوية</th>
                  <th className="px-6 py-4 font-bold">الإقامة</th>
                  <th className="px-6 py-4 font-bold">Absher</th>
                  <th className="px-6 py-4 font-bold text-left">إجراءات</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-outline-variant">
                {filteredTenants.map((tenant) => {
                  const initial = tenant.full_name_ar?.charAt(0) || 'م';
                  return (
                    <tr key={tenant.id} className="hover:bg-surface-container-lowest transition-colors">
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 bg-primary-container text-white rounded-full flex items-center justify-center font-bold text-sm">
                            {initial}
                          </div>
                          <div>
                            <p className="font-bold text-on-surface">{tenant.full_name_ar}</p>
                            <p className="text-body-sm text-on-surface-variant">
                              {tenant.full_name_en || ''}
                            </p>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 font-body-md text-on-surface-variant">{tenant.phone}</td>
                      <td className="px-6 py-4 text-on-surface-variant">{tenant.nationality}</td>
                      <td className="px-6 py-4 text-on-surface-variant">{tenant.national_id || '-'}</td>
                      <td className="px-6 py-4 text-on-surface-variant">{tenant.iqama_number || '-'}</td>
                      <td className="px-6 py-4">
                        <span className={`px-3 py-1 rounded-full text-label-sm font-bold border ${
                          tenant.absher_verified
                            ? 'bg-secondary/10 text-secondary border-secondary/20'
                            : 'bg-surface-container text-on-surface-variant border-outline-variant'
                        }`}>
                          {tenant.absher_verified ? 'محقق' : 'غير محقق'}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-left">
                        <div className="flex gap-2 justify-end">
                          <button
                            onClick={() => handleViewTenant(tenant)}
                            className="p-2 text-on-surface-variant hover:text-primary transition-colors"
                            title="عرض"
                          >
                            <span className="material-symbols-outlined text-[20px]">visibility</span>
                          </button>
                          {user?.role === 'admin' && (
                            <button
                              onClick={() => handleEditTenant(tenant)}
                              className="p-2 text-on-surface-variant hover:text-primary transition-colors"
                              title="تعديل"
                            >
                              <span className="material-symbols-outlined text-[20px]">edit</span>
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          <div className="p-4 border-t border-outline-variant flex justify-between items-center bg-surface-container-low/50">
            <p className="text-body-sm text-on-surface-variant">عرض {filteredTenants.length} من أصل {tenants.length} مستأجر</p>
          </div>
        </div>
      )}

      <AddEditTenant
        tenantId={selectedTenant?.id || undefined}
        onClose={handleModalClose}
        visible={modalVisible}
      />
    </div>
  );
};

export default TenantsPage;
