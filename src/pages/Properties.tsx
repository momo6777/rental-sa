import { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import AddEditProperty from './AddEditProperty';

const PropertiesPage = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [properties, setProperties] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState(searchParams.get('q') || '');
  const [propertyType, setPropertyType] = useState('all');
  const [filteredProperties, setFilteredProperties] = useState<any[]>([]);
  const [selectedProperty, setSelectedProperty] = useState<any>(null);
  const [modalVisible, setModalVisible] = useState(false);
  const [isEditing, setIsEditing] = useState(false);

  useEffect(() => {
    const q = searchParams.get('q');
    if (q) setSearchTerm(q);
    const add = searchParams.get('add');
    if (add === 'true') {
      setSelectedProperty(null);
      setIsEditing(false);
      setModalVisible(true);
    }
    fetchProperties();
  }, []);

  useEffect(() => {
    applyFilters();
  }, [searchTerm, propertyType, properties]);

  const fetchProperties = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('properties')
        .select('*')
        .order('created_at', { ascending: false });
      if (error) throw error;
      setProperties(data || []);
      setFilteredProperties(data || []);
    } catch (error) {
      console.error('Error fetching properties:', error);
    } finally {
      setLoading(false);
    }
  };

  const applyFilters = () => {
    let filtered = [...properties];
    if (searchTerm.trim()) {
      const term = searchTerm.toLowerCase().trim();
      filtered = filtered.filter(
        (p) =>
          p.name_ar.toLowerCase().includes(term) ||
          p.city.toLowerCase().includes(term) ||
          (p.name_en && p.name_en.toLowerCase().includes(term))
      );
    }
    if (propertyType !== 'all') {
      filtered = filtered.filter((p) => p.type === propertyType);
    }
    setFilteredProperties(filtered);
  };

  const handleAddProperty = () => {
    setSelectedProperty(null);
    setIsEditing(false);
    setModalVisible(true);
  };

  const handleEditProperty = (property: any) => {
    setSelectedProperty(property);
    setIsEditing(true);
    setModalVisible(true);
  };

  const handleModalClose = () => {
    setModalVisible(false);
    setSelectedProperty(null);
    fetchProperties();
  };

  const typeMap: Record<string, string> = { residential: 'سكني', commercial: 'تجاري' };
  const typeColor: Record<string, string> = { residential: 'bg-secondary/10 text-secondary', commercial: 'bg-primary/10 text-primary' };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <h2 className="font-headline-lg text-headline-lg font-bold text-primary">قائمة العقارات</h2>
          <p className="text-on-surface-variant font-body-md">إدارة وتتبع {properties.length} عقار</p>
        </div>
        <div className="flex flex-wrap gap-3">
          <div className="flex items-center bg-white border border-outline-variant rounded-xl p-1">
            {['all', 'residential', 'commercial'].map((t) => (
              <button
                key={t}
                onClick={() => setPropertyType(t)}
                className={`px-4 py-2 rounded-lg font-label-sm transition-colors ${
                  propertyType === t ? 'bg-primary-container/10 text-primary font-bold' : 'text-on-surface-variant hover:bg-surface-container'
                }`}
              >
                {t === 'all' ? 'الكل' : t === 'residential' ? 'سكني' : 'تجاري'}
              </button>
            ))}
          </div>
          <div className="flex gap-2">
            <select
              className="bg-white border border-outline-variant rounded-xl px-4 py-2 font-label-md focus:ring-primary"
              value={propertyType}
              onChange={(e) => setPropertyType(e.target.value)}
            >
              <option value="all">نوع العقار</option>
              <option value="residential">سكني</option>
              <option value="commercial">تجاري</option>
            </select>
            <input
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="ابحث باسم العقار..."
              className="bg-white border border-outline-variant rounded-xl px-4 py-2 font-label-md focus:ring-primary w-48"
            />
            {user?.role === 'admin' && (
              <button
                onClick={handleAddProperty}
                className="bg-primary text-on-primary px-4 py-2 rounded-xl font-label-md flex items-center gap-2 hover:opacity-90 active:scale-95 transition-all"
              >
                <span className="material-symbols-outlined text-[18px]">add</span>
                إضافة عقار
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Loading State */}
      {loading ? (
        <div className="flex items-center justify-center h-40">
          <div className="animate-pulse flex flex-col items-center gap-3">
            <div className="w-8 h-8 rounded-full bg-primary/20"></div>
            <div className="h-3 w-32 bg-surface-container-highest rounded"></div>
          </div>
        </div>
      ) : filteredProperties.length === 0 ? (
        /* Empty State */
        <div className="bg-white rounded-xl border border-outline-variant p-12 text-center">
          <span className="material-symbols-outlined text-5xl text-outline-variant mb-4">apartment</span>
          <p className="text-on-surface-variant mb-4">لا توجد عقارات تطابق معايير البحث</p>
          {user?.role === 'admin' && (
            <button onClick={handleAddProperty} className="bg-primary text-on-primary px-6 py-2 rounded-xl font-label-md">
              إضافة أول عقار
            </button>
          )}
        </div>
      ) : (
        /* Properties Grid */
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredProperties.map((property) => (
            <div
              key={property.id}
              className="bg-white border border-outline-variant rounded-xl overflow-hidden flex flex-col hover:shadow-md transition-shadow"
            >
              <div className="relative h-40 overflow-hidden">
                {property.image_url ? (
                  <img src={property.image_url} alt={property.name_ar} className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full bg-gradient-to-br from-primary-container to-primary flex items-center justify-center">
                    <span className="material-symbols-outlined text-6xl text-white/30">apartment</span>
                  </div>
                )}
                <div className="absolute bottom-3 left-3 bg-white/90 backdrop-blur shadow-sm px-3 py-1 rounded-lg text-label-sm font-bold text-primary">
                  {typeMap[property.type] || property.type}
                </div>
              </div>
              <div className="p-card-padding space-y-3 flex-1">
                <div>
                  <h4 className="font-headline-md text-headline-md font-bold text-on-surface">{property.name_ar}</h4>
                  <p className="text-on-surface-variant text-body-sm flex items-center gap-1 mt-1">
                    <span className="material-symbols-outlined text-[16px]">location_on</span>
                    {property.district ? `${property.district}، ` : ''}{property.city}
                  </p>
                </div>
                <div className="flex items-center gap-4 text-on-surface-variant text-body-sm">
                  <span className="flex items-center gap-1">
                    <span className="material-symbols-outlined text-[18px]">counter_1</span>
                    {property.total_units || 0} وحدة
                  </span>
                  {property.deed_number && (
                    <span className="flex items-center gap-1">
                      <span className="material-symbols-outlined text-[18px]">description</span>
                      صك {property.deed_number}
                    </span>
                  )}
                </div>
                <div className="pt-4 border-t border-outline-variant flex justify-between items-center">
                  <div className="flex gap-2">
                    <button
                      onClick={() => handleEditProperty(property)}
                      className="p-2 rounded-lg border border-outline-variant hover:bg-surface-container transition-colors"
                      title="تعديل"
                    >
                      <span className="material-symbols-outlined text-[18px]">edit</span>
                    </button>
                    <button
                      onClick={() => navigate(`/units?property_id=${property.id}`)}
                      className="p-2 rounded-lg border border-outline-variant hover:bg-surface-container transition-colors"
                      title="عرض الوحدات"
                    >
                      <span className="material-symbols-outlined text-[18px]">visibility</span>
                    </button>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      <AddEditProperty
        propertyId={selectedProperty?.id || undefined}
        onClose={handleModalClose}
        visible={modalVisible}
      />
    </div>
  );
};

export default PropertiesPage;
