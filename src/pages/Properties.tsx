import React, { useState, useEffect } from 'react';
import { Table, Input, Button, Select, Space, Typography, Tag, Spin, Modal } from 'antd';
import { SearchOutlined, FilterFilled, PlusOutlined, EyeOutlined } from '@ant-design/icons';
import { useAuth } from '../hooks/useAuth';
import { supabase } from '../lib/supabase';
import AddEditProperty from './AddEditProperty';
import styles from './Properties.module.css';

const { Text } = Typography;
const { Option } = Select;

const PropertiesPage = () => {
  const { user } = useAuth();
  const [properties, setProperties] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [propertyType, setPropertyType] = useState('all'); // all, residential, commercial
  const [filteredProperties, setFilteredProperties] = useState([]);
  const [selectedProperty, setSelectedProperty] = useState(null);
  const [modalVisible, setModalVisible] = useState(false);
  const [isEditing, setIsEditing] = useState(false);

  useEffect(() => {
    fetchProperties();
  }, []);

  const fetchProperties = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('properties')
        .select('*')
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      
      setProperties(data);
      setFilteredProperties(data);
    } catch (error) {
      console.error('Error fetching properties:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchTerm(e.target.value);
    applyFilters();
  };

  const handleFilterChange = (value: string) => {
    setPropertyType(value);
    applyFilters();
  };

  const applyFilters = () => {
    let filtered = [...properties];
    
    // Apply search filter
    if (searchTerm.trim()) {
      const term = searchTerm.toLowerCase().trim();
      filtered = filtered.filter(prop => 
        prop.name_ar.toLowerCase().includes(term) || 
        prop.city.toLowerCase().includes(term) ||
        (prop.name_en && prop.name_en.toLowerCase().includes(term))
      );
    }
    
    // Apply property type filter
    if (propertyType !== 'all') {
      filtered = filtered.filter(prop => prop.type === propertyType);
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

  const handleViewProperty = (property: any) => {
    setSelectedProperty(property);
    setIsEditing(false);
    setModalVisible(true);
  };

  const handleModalClose = () => {
    setModalVisible(false);
    setSelectedProperty(null);
  };

  const handleModalSubmit = () => {
    // The AddEditProperty component handles the actual submit
    // and calls onClose which we've set to handleModalClose
  };

  const columns = [
    {
      title: 'الاسم (عربي)',
      dataIndex: 'name_ar',
      key: 'name_ar',
      render: (text: string) => (
        <Text strong>{text}</Text>
      )
    },
    {
      title: 'الاسم (إنجليزي)',
      dataIndex: 'name_en',
      key: 'name_en',
      render: (text: string | undefined) => text ? <Text>{text}</Text> : <Text>-</Text>
    },
    {
      title: 'النوع',
      dataIndex: 'type',
      key: 'type',
      render: (text: 'residential' | 'commercial') => (
        <Tag color={text === 'residential' ? 'green' : 'blue'}>
          {text === 'residential' ? 'سكني' : 'تجاري'}
        </Tag>
      )
    },
    {
      title: 'المدينة',
      dataIndex: 'city',
      key: 'city'
    },
    {
      title: 'المنطقة',
      dataIndex: 'district',
      key: 'district'
    },
    {
      title: 'عدد الوحدات',
      dataIndex: 'total_units',
      key: 'total_units'
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
            onClick={() => handleViewProperty(record)}
          />
          {user?.role === 'admin' && (
            <>
              <Button 
                size="small" 
                icon={<PlusOutlined />} 
                style={{ margin: '0 4px' }}
                title="إضافة وحدة"
                onClick={() => {
                  alert('سيتم تطوير صفحة إضافة الوحدة قريباً');
                }}
              />
              <Button 
                size="small" 
                type="primary" 
                icon={<PlusOutlined />} 
                title="تعديل العقار"
                onClick={() => handleEditProperty(record)}
              />
            </>
          )}
        </Space>
      )
    }
  ];

  return (
    <div className={styles.propertiesPage}>
      <div className={styles.pageHeader}>
        <h1>العقارات</h1>
        <div className={styles.headerActions}>
          <Space>
            <Select 
              placeholder="جميع الأنواع"
              value={propertyType}
              onChange={handleFilterChange}
              style={{ width: 140 }}
            >
              <Option value="all">جميع الأنواع</Option>
              <Option value="residential">سكني</Option>
              <Option value="commercial">تجاري</Option>
            </Select>
            
            <Input.Search 
              placeholder="ابحث بالاسم أو المدينة..."
              value={searchTerm}
              onChange={handleSearch}
              style={{ width: 240 }}
            />
            
            {user?.role === 'admin' && (
              <Button 
                type="primary" 
                icon={<PlusOutlined />}
                onClick={handleAddProperty}
              >
                إضافة عقار
              </Button>
            )}
          </Space>
        </div>
      </div>
      
      {loading ? (
        <div className={styles.loadingContainer}>
          <Spin tip="جاري تحميل العقارات..." />
        </div>
      ) : filteredProperties.length === 0 ? (
        <div className={styles.emptyState}>
          <p>لا توجد عقارات تطابق معايير البحث</p>
          {user?.role === 'admin' && (
            <Button type="primary" onClick={handleAddProperty}>
              إضافة أول عقار
            </Button>
          )}
        </div>
      ) : (
        <Table 
          columns={columns} 
          dataSource={filteredProperties}
          pagination={{ pageSize: 10 }}
          rowKey="id"
          scroll={{ x: 'max-content' }}
        />
      )}
      
      {/* Add/Edit/View Property Modal */}
      <AddEditProperty
        propertyId={selectedProperty?.id || undefined}
        onClose={handleModalClose}
        visible={modalVisible}
      />
    </div>
  );
};

export default PropertiesPage;