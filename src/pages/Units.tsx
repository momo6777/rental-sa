import { useState, useEffect } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { supabase } from '../lib/supabase';
import { message } from 'antd';
import AddEditUnit from './AddEditUnit';

const UnitsPage = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [units, setUnits] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [propertyFilter, setPropertyFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [filteredUnits, setFilteredUnits] = useState<any[]>([]);
  const [properties, setProperties] = useState<any[]>([]);
  const [selectedUnit, setSelectedUnit] = useState<any>(null);
  const [modalVisible, setModalVisible] = useState(false);

  useEffect(() => {
    fetchProperties();
    fetchUnits();
    const propId = searchParams.get('property_id');
    if (propId) {
      setPropertyFilter(propId);
      setModalVisible(true);
    }
  }, []);

  useEffect(() => {
    applyFilters();
  }, [searchTerm, propertyFilter, statusFilter, units]);

  const fetchProperties = async () => {
    try {
      const { data, error } = await supabase.from('properties').select('id, name_ar').order('name_ar');
      if (error) throw error;
      setProperties(data || []);
    } catch (error) {
      console.error('Error fetching properties:', error);
    }
  };

  const fetchUnits = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('units')
        .select('*, properties!inner(name_ar)')
        .order('created_at', { ascending: false });
      if (error) throw error;
      setUnits(data || []);
      setFilteredUnits(data || []);
    } catch (error) {
      console.error('Error fetching units:', error);
    } finally {
      setLoading(false);
    }
  };

  const applyFilters = () => {
    let filtered = [...units];
    if (searchTerm.trim()) {
      const term = searchTerm.toLowerCase().trim();
      filtered = filtered.filter(
        (u) =>
          u.unit_number.toLowerCase().includes(term) ||
          u.properties.name_ar.toLowerCase().includes(term)
      );
    }
    if (propertyFilter !== 'all') {
      filtered = filtered.filter((u) => u.property_id === propertyFilter);
    }
    if (statusFilter !== 'all') {
      filtered = filtered.filter((u) => u.status === statusFilter);
    }
    setFilteredUnits(filtered);
  };

  const handleEdit = (unit: any) => {
    setSelectedUnit(unit);
    setModalVisible(true);
  };

  const handleDelete = async (unit: any) => {
    if (!window.confirm(`حذف الوحدة ${unit.unit_number}؟`)) return;
    try {
      const { error } = await supabase.from('units').delete().eq('id', unit.id);
      if (error) throw error;
      await supabase.rpc('decrement_property_units', { prop_id: unit.property_id });
      fetchUnits();
    } catch (err: any) {
      console.error('Error deleting unit', err);
      message.error(err.message || 'فشل حذف الوحدة');
    }
  };

  const handleModalClose = () => {
    setModalVisible(false);
    setSelectedUnit(null);
    fetchUnits();
  };

  const statusBadge: Record<string, string> = {
    available: 'bg-secondary/10 text-secondary border-secondary/20',
    rented: 'bg-primary/10 text-primary border-primary/20',
    maintenance: 'bg-amber-100 text-amber-700 border-amber-200',
  };
  const statusLabel: Record<string, string> = {
    available: 'متاح',
    rented: 'مؤجرة',
    maintenance: 'تحت الصيانة',
  };
  const typeLabel: Record<string, string> = {
    apartment: 'شقة',
    office: 'مكتب',
    shop: 'محل',
    villa: 'فيلا',
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <h2 className="font-headline-lg text-headline-lg font-bold text-primary">إدارة الوحدات</h2>
          <p className="text-on-surface-variant font-body-md">إدارة {units.length} وحدة عقارية</p>
        </div>
        <div className="flex flex-wrap gap-3">
          <select
            value={propertyFilter}
            onChange={(e) => setPropertyFilter(e.target.value)}
            className="bg-white border border-outline-variant rounded-xl px-4 py-2 font-label-md focus:ring-primary"
          >
            <option value="all">جميع العقارات</option>
            {properties.map((p) => (
              <option key={p.id} value={p.id}>{p.name_ar}</option>
            ))}
          </select>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="bg-white border border-outline-variant rounded-xl px-4 py-2 font-label-md focus:ring-primary"
          >
            <option value="all">جميع الحالات</option>
            <option value="available">متاح</option>
            <option value="rented">مؤجرة</option>
            <option value="maintenance">تحت الصيانة</option>
          </select>
          <input
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="بحث..."
            className="bg-white border border-outline-variant rounded-xl px-4 py-2 font-label-md focus:ring-primary w-44"
          />
          {user?.role === 'admin' && (
            <button
              onClick={() => { setSelectedUnit(null); setModalVisible(true); }}
              className="bg-primary text-on-primary px-4 py-2 rounded-xl font-label-md flex items-center gap-2 hover:opacity-90 active:scale-95 transition-all"
            >
              <span className="material-symbols-outlined text-[18px]">add</span>
              إضافة وحدة
            </button>
          )}
        </div>
      </div>

      {/* Quick stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-gutter">
        <div className="bg-white p-4 rounded-xl border border-outline-variant flex items-center gap-4">
          <span className="p-3 bg-secondary/10 text-secondary rounded-lg material-symbols-outlined">check_circle</span>
          <div>
            <p className="text-label-sm text-on-surface-variant">متاح</p>
            <p className="font-headline-md font-bold">{units.filter((u) => u.status === 'available').length}</p>
          </div>
        </div>
        <div className="bg-white p-4 rounded-xl border border-outline-variant flex items-center gap-4">
          <span className="p-3 bg-primary/10 text-primary rounded-lg material-symbols-outlined">home</span>
          <div>
            <p className="text-label-sm text-on-surface-variant">مؤجرة</p>
            <p className="font-headline-md font-bold">{units.filter((u) => u.status === 'rented').length}</p>
          </div>
        </div>
        <div className="bg-white p-4 rounded-xl border border-outline-variant flex items-center gap-4">
          <span className="p-3 bg-amber-100 text-amber-700 rounded-lg material-symbols-outlined">build</span>
          <div>
            <p className="text-label-sm text-on-surface-variant">تحت الصيانة</p>
            <p className="font-headline-md font-bold">{units.filter((u) => u.status === 'maintenance').length}</p>
          </div>
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center h-40">
          <div className="animate-pulse flex flex-col items-center gap-3">
            <div className="w-8 h-8 rounded-full bg-primary/20"></div>
            <div className="h-3 w-32 bg-surface-container-highest rounded"></div>
          </div>
        </div>
      ) : filteredUnits.length === 0 ? (
        <div className="bg-white rounded-xl border border-outline-variant p-12 text-center">
          <span className="material-symbols-outlined text-5xl text-outline-variant mb-4">home_work</span>
          <p className="text-on-surface-variant">لا توجد وحدات مطابقة</p>
        </div>
      ) : (
        <div className="bg-white rounded-xl border border-outline-variant overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-right">
              <thead className="bg-surface-container-low text-on-surface-variant border-b border-outline-variant font-label-md">
                <tr>
                  <th className="px-6 py-4 font-bold">رقم الوحدة</th>
                  <th className="px-6 py-4 font-bold">العقار</th>
                  <th className="px-6 py-4 font-bold">النوع</th>
                  <th className="px-6 py-4 font-bold">الطابق</th>
                  <th className="px-6 py-4 font-bold">المساحة</th>
                  <th className="px-6 py-4 font-bold">الإيجار</th>
                  <th className="px-6 py-4 font-bold">الحالة</th>
                  {user?.role === 'admin' && <th className="px-6 py-4 font-bold text-left">إجراءات</th>}
                </tr>
              </thead>
              <tbody className="divide-y divide-outline-variant">
                {filteredUnits.map((unit) => (
                  <tr key={unit.id} className="hover:bg-surface-container-lowest transition-colors">
                    <td className="px-6 py-4 font-bold">{unit.unit_number}</td>
                    <td className="px-6 py-4 text-on-surface-variant">{unit.properties?.name_ar || '-'}</td>
                    <td className="px-6 py-4">
                      <span className="bg-surface-container px-3 py-1 rounded-lg text-label-sm">
                        {typeLabel[unit.type] || unit.type}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-on-surface-variant">{unit.floor ?? '-'}</td>
                    <td className="px-6 py-4 text-on-surface-variant">{unit.area_sqm ? `${unit.area_sqm} م²` : '-'}</td>
                    <td className="px-6 py-4 font-bold text-primary">{unit.rent_price?.toLocaleString()} ر.س</td>
                    <td className="px-6 py-4">
                      <span className={`px-3 py-1 rounded-full text-label-sm font-bold border ${statusBadge[unit.status] || 'bg-surface-container text-on-surface-variant'}`}>
                        {statusLabel[unit.status] || unit.status}
                      </span>
                    </td>
                    {user?.role === 'admin' && (
                      <td className="px-6 py-4 text-left">
                        <div className="flex gap-1 justify-end">
                          <button
                            onClick={() => handleEdit(unit)}
                            className="p-2 text-on-surface-variant hover:text-primary transition-colors"
                            title="تعديل"
                          >
                            <span className="material-symbols-outlined text-[20px]">edit</span>
                          </button>
                          <button
                            onClick={() => handleDelete(unit)}
                            className="p-2 text-on-surface-variant hover:text-error transition-colors"
                            title="حذف"
                          >
                            <span className="material-symbols-outlined text-[20px]">delete</span>
                          </button>
                        </div>
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="p-4 border-t border-outline-variant flex justify-between items-center bg-surface-container-low/50">
            <p className="text-body-sm text-on-surface-variant">عرض {filteredUnits.length} من أصل {units.length} وحدة</p>
          </div>
        </div>
      )}

      <AddEditUnit
        unitId={selectedUnit?.id || undefined}
        initialPropertyId={searchParams.get('property_id') || undefined}
        onClose={handleModalClose}
        visible={modalVisible}
      />
    </div>
  );
};

export default UnitsPage;
