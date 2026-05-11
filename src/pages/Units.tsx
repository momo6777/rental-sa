import React, { useState, useEffect } from 'react';
import { Table, Input, Button, Select, Space, Typography, Tag, Spin, Modal, Popconfirm } from 'antd';
import { SearchOutlined, FilterFilled, PlusOutlined, EyeOutlined, EditOutlined, DeleteOutlined } from '@ant-design/icons';
import { useAuth } from '../hooks/useAuth';
import { supabase } from '../lib/supabase';
import AddEditUnit from './AddEditUnit';
import styles from './Units.module.css';

const { Text } = Typography;
const { Option } = Select;

const UnitsPage = () => {
  const { user } = useAuth();
  const [units, setUnits] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [propertyFilter, setPropertyFilter] = useState('all'); // all property IDs or 'all'
  const [statusFilter, setStatusFilter] = useState('all'); // all, available, rented, maintenance
  const [filteredUnits, setFilteredUnits] = useState([]);
  const [properties, setProperties] = useState([]);
  const [selectedUnit, setSelectedUnit] = useState(null);
  const [modalVisible, setModalVisible] = useState(false);
  const [isEditing, setIsEditing] = useState(false);

  useEffect(() => {
    fetchProperties();
    fetchUnits();
  }, []);

  const fetchProperties = async () => {
    try {
      const { data, error } = await supabase
        .from('properties')
        .select('id, name_ar')
        .order('name_ar');
      
      if (error) throw error;
      
      setProperties(data);
    } catch (error) {
      console.error('Error fetching properties:', error);
    }
  };

  const fetchUnits = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('units')
        .select(`
          *,
          properties!inner (
            name_ar
          )
        `)
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      
      setUnits(data);
      setFilteredUnits(data);
    } catch (error) {
      console.error('Error fetching units:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchTerm(e.target.value);
    applyFilters();
  };

  const handlePropertyFilterChange = (value: string) => {
    setPropertyFilter(value);
    applyFilters();
  };

  const handleStatusFilterChange = (value: string) => {
    setStatusFilter(value);
    applyFilters();
  };

  const applyFilters = () => {
    let filtered = [...units];
    
    // Apply search filter
    if (searchTerm.trim()) {
      const term = searchTerm.toLowerCase().trim();
      filtered = filtered.filter(unit => 
        unit.unit_number.toLowerCase().includes(term) || 
        unit.properties.name_ar.toLowerCase().includes(term) ||
        (unit.properties.name_en && unit.properties.name_en.toLowerCase().includes(term))
      );
    }
    
    // Apply property filter
    if (propertyFilter !== 'all') {
      filtered = filtered.filter(unit => unit.property_id === propertyFilter);
    }
    
    // Apply status filter
    if (statusFilter !== 'all') {
      filtered = filtered.filter(unit => unit.status === statusFilter);
    }
    
    setFilteredUnits(filtered);
  };

  const handleAddUnit = () => {
    setSelectedUnit(null);
    setIsEditing(false);
    setModalVisible(true);
  };

  const handleEditUnit = (unit: any) => {
    setSelectedUnit(unit);
    setIsEditing(true);
    setModalVisible(true);
  };

  const handleViewUnit = (unit: any) => {
    setSelectedUnit(unit);
    setIsEditing(false);
    setModalVisible(true);
  };

  const handleDeleteUnit = async (unitId: string) => {
    try {
      // Check if unit is rented before allowing deletion
      const { data: unitData, error: unitError } = await supabase
        .from('units')
        .select('status')
        .eq('id', unitId)
        .single();
      
      if (unitError) throw unitError;
      
      if (unitData.status === 'rented') {
        message.error('لا يمكن حذف الوحدة المؤجرة. يجب إنهاء العقد أولًا.');
        return;
      }
      
      const { error } = await supabase
        .from('units')
        .delete()
        .eq('id', unitId);
      
      if (error) throw error;
      
      message.success('تم حذف الوحدة بنجاح');
      fetchUnits();
    } catch (error: any) {
      console.error('Error deleting unit:', error);
      message.error(error.message || 'فشل حذف الوحدة');
    }
  };

  const handleModalClose = () => {
    setModalVisible(false);
    setSelectedUnit(null);
  };

  const columns = [
    {
      title: 'رقم الوحدة',
      dataIndex: 'unit_number',
      key: 'unit_number'
    },
    {
      title: 'العقار',
      dataIndex: 'properties.name_ar',
      key: 'property_name'
    },
    {
      title: 'الطابق',
      dataIndex: 'floor',
      key: 'floor',
      render: (value: number | null) => value !== null ? <Text>{value}</Text> : <Text>-</Text>
    },
    {
      title: 'المساحة (م²)',
      dataIndex: 'area_sqm',
      key: 'area_sqm',
      render: (value: number) => <Text>{value.toFixed(2)}</Text>
    },
    {
      title: 'النوع',
      dataIndex: 'type',
      key: 'type',
      render: (text: 'apartment' | 'office' | 'shop' | 'villa') => {
        const typeMap: Record<string, string> = {
          apartment: 'شقة',
          office: 'مكتب',
          shop: 'محل',
          villa: 'فيلا'
        };
        return <Text>{typeMap[text] || text}</Text>;
      }
    },
    {
      title: 'الحالة',
      dataIndex: 'status',
      key: 'status',
      render: (text: 'available' | 'rented' | 'maintenance') => {
        let color: string;
        let label: string;
        
        switch (text) {
          case 'available':
            color = 'green';
            label = 'متاح';
            break;
          case 'rented':
            color = 'blue';
            label = 'مؤجرة';
            break;
          case 'maintenance':
            color = 'orange';
            label = 'تحت الصيانة';
            break;
          default:
            color = 'grey';
            label = text;
        }
        
        return <Tag color={color}>{label}</Tag>;
      }
    },
    {
      title: 'الإيجار (ر.س)',
      dataIndex: 'rent_price',
      key: 'rent_price',
      render: (value: number) => <Text>{value.toLocaleString()}</Text>
    },
    {
      title: 'تاريخ الإضافة',
      dataIndex: 'created_at',
      key: 'created_at',
      render: (date: string) => {
        const options: Intl.DateTimeFormatOptions = { 
          year: 'numeric', month: 'short', day: 'numeric' 
        };
        return new Date(date).toLocaleDateString('ar-SA', options);
      }
    },
    {
      title: 'الإجراءات',
      dataIndex: 'id',
      key: 'actions',
      render: (_: string, record: any) => (
        <Space size="middle">
          <Button 
            size="small" 
            icon={<EyeOutlined />} 
            title="عرض التفاصيل"
            onClick={() => handleViewUnit(record)}
          />
          {user?.role === 'admin' && (
            <>
              <Popconfirm
                title="هل أنت متأكد من حذف هذه الوحدة؟"
                onConfirm={() => handleDeleteUnit(record.id)}
                okText="نعم"
                cancelText="لا"
              >
                <Button 
                  size="small" 
                  icon={<DeleteOutlined />} 
                  danger
                  title="حذف الوحدة"
                />
              </Popconfirm>
              <Button 
                size="small" 
                style={{ margin: '0 4px' }}
                icon={<EditOutlined />} 
                title="تعديل الوحدة"
                onClick={() => handleEditUnit(record)}
              />
            </>
          )}
        </Space>
      )
    }
  ];

  return (
    <div className={styles.unitsPage}>
      <div className={styles.pageHeader}>
        <h1>إدارة الوحدات</h1>
        <div className={styles.headerActions}>
          <Space>
            <Select 
              placeholder="جميع العقارات"
              value={propertyFilter}
              onChange={handlePropertyFilterChange}
              style={{ width: 200 }}
            >
              <Option value="all">جميع العقارات</Option>
              {properties.map(prop => (
                <Option key={prop.id} value={prop.id}>
                  {prop.name_ar}
                </Option>
              ))}
            </Select>
            
            <Select 
              placeholder="جميع الحالات"
              value={statusFilter}
              onChange={handleStatusFilterChange}
              style={{ width: 120 }}
            >
              <Option value="all">جميع الحالات</Option>
              <Option value="available">متاح</Option>
              <Option value="rented">مؤجرة</Option>
              <Option value="maintenance">تحت الصيانة</Option>
            </Select>
            
            <Input.Search 
              placeholder="ابحث بالرقم أو العقار..."
              value={searchTerm}
              onChange={handleSearch}
              style={{ width: 240 }}
            />
            
            {user?.role === 'admin' && (
              <Button 
                type="primary" 
                icon={<PlusOutlined />}
                onClick={handleAddUnit}
              >
                إضافة وحدة
              </Button>
            )}
          </Space>
        </div>
      </div>
      
      {loading ? (
        <div className={styles.loadingContainer}>
          <Spin tip="جاري تحميل الوحدات..." />
        </div>
      ) : filteredUnits.length === 0 ? (
        <div className={styles.emptyState}>
          <p>لا توجد وحدات تطابق معايير البحث</p>
          {user?.role === 'admin' && (
            <Button type="primary" onClick={handleAddUnit}>
              إضافة أول وحدة
            </Button>
          )}
        </div>
      ) : (
        <Table 
          columns={columns} 
          dataSource={filteredUnits}
          pagination={{ pageSize: 10 }}
          rowKey="id"
          scroll={{ x: 'max-content' }}
        />
      )}
      
      {/* Add/Edit/View Unit Modal */}
      <AddEditUnit
        unitId={selectedUnit?.id || undefined}
        onClose={handleModalClose}
        visible={modalVisible}
      />
    </div>
  );
};

export default UnitsPage;