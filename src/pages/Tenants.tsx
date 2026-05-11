import React, { useState, useEffect } from 'react';
import { Table, Input, Button, Select, Space, Typography, Tag, Spin, Modal, Popconfirm } from 'antd';
import { SearchOutlined, FilterFilled, PlusOutlined, EyeOutlined, EditOutlined, DeleteOutlined } from '@ant-design/icons';
import { useAuth } from '../hooks/useAuth';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import AddEditTenant from './AddEditTenant';
import styles from './Tenants.module.css';

const { Text } = Typography;
const { Option } = Select;

const TenantsPage = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [tenants, setTenants] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [nationalityFilter, setNationalityFilter] = useState('all'); // all or specific nationality
  const [filteredTenants, setFilteredTenants] = useState([]);
  const [nationalities, setNationalities] = useState<string[]>([]);
  const [selectedTenant, setSelectedTenant] = useState(null);
  const [modalVisible, setModalVisible] = useState(false);
  const [isEditing, setIsEditing] = useState(false);

  useEffect(() => {
    fetchNationalities();
    fetchTenants();
  }, []);

  const fetchNationalities = async () => {
    try {
      const { data, error } = await supabase
        .from('tenants')
        .select('nationality')
        .order('nationality');
      
      if (error) throw error;
      
      // Extract unique nationalities
      const uniqueNationalities = [...new Set(data.map(t => t.nationality))];
      setNationalities(uniqueNationalities);
    } catch (error) {
      console.error('Error fetching nationalities:', error);
    }
  };

  const fetchTenants = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('tenants')
        .select('*')
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      
      setTenants(data);
      setFilteredTenants(data);
    } catch (error) {
      console.error('Error fetching tenants:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchTerm(e.target.value);
    applyFilters();
  };

  const handleNationalityFilterChange = (value: string) => {
    setNationalityFilter(value);
    applyFilters();
  };

  const applyFilters = () => {
    let filtered = [...tenants];
    
    // Apply search filter
    if (searchTerm.trim()) {
      const term = searchTerm.toLowerCase().trim();
      filtered = filtered.filter(tenant => 
        tenant.full_name_ar.toLowerCase().includes(term) || 
        tenant.full_name_en?.toLowerCase().includes(term) ||
        tenant.national_id?.toLowerCase().includes(term) ||
        tenant.iqama_number?.toLowerCase().includes(term) ||
        tenant.phone.toLowerCase().includes(term) ||
        tenant.email?.toLowerCase().includes(term)
      );
    }
    
    // Apply nationality filter
    if (nationalityFilter !== 'all') {
      filtered = filtered.filter(tenant => tenant.nationality === nationalityFilter);
    }
    
    setFilteredTenants(filtered);
  };

  const handleAddTenant = () => {
    setSelectedTenant(null);
    setIsEditing(false);
    setModalVisible(true);
  };

  const handleEditTenant = (tenant: any) => {
    setSelectedTenant(tenant);
    setIsEditing(true);
    setModalVisible(true);
  };

  const handleViewTenant = (tenant: any) => {
    navigate(`/tenants/${tenant.id}`);
  };

  const handleDeleteTenant = async (tenantId: string) => {
    try {
      // Check if tenant has active contracts before allowing deletion
      const { data: contractsData, error: contractsError } = await supabase
        .from('contracts')
        .select('id, status')
        .eq('tenant_id', tenantId)
        .in('status', ['active', 'expired']); // Note: expired contracts might still exist, but we prevent deletion if any active
      
      if (contractsError) throw contractsError;
      
      const activeContracts = contractsData?.filter(c => c.status === 'active') || [];
      if (activeContracts.length > 0) {
        message.error('لا يمكن حذف المستأجر الذي لديه عقد فعال. يجب إنهاء العقد أولًا.');
        return;
      }
      
      const { error } = await supabase
        .from('tenants')
        .delete()
        .eq('id', tenantId);
      
      if (error) throw error;
      
      message.success('تم حذف المستأجر بنجاح');
      fetchTenants();
    } catch (error: any) {
      console.error('Error deleting tenant:', error);
      message.error(error.message || 'فشل حذف المستأجر');
    }
  };

  const handleModalClose = () => {
    setModalVisible(false);
    setSelectedTenant(null);
  };

  const columns = [
    {
      title: 'الاسم (عربي)',
      dataIndex: 'full_name_ar',
      key: 'full_name_ar',
      render: (text: string) => (
        <Text strong>{text}</Text>
      )
    },
    {
      title: 'الاسم (إنجليزي)',
      dataIndex: 'full_name_en',
      key: 'full_name_en',
      render: (text: string | undefined) => text ? <Text>{text}</Text> : <Text>-</Text>
    },
    {
      title: 'الجنسية',
      dataIndex: 'nationality',
      key: 'nationality'
    },
    {
      title: 'رقم الهوية',
      dataIndex: 'national_id',
      key: 'national_id',
      render: (text: string | undefined) => text ? <Text>{text}</Text> : <Text>-</Text>
    },
    {
      title: 'رقم الإقامة',
      dataIndex: 'iqama_number',
      key: 'iqama_number',
      render: (text: string | undefined) => text ? <Text>{text}</Text> : <Text>-</Text>
    },
    {
      title: 'الهاتف',
      dataIndex: 'phone',
      key: 'phone'
    },
    {
      title: 'البريد الإلكتروني',
      dataIndex: 'email',
      key: 'email',
      render: (text: string | undefined) => text ? <Text>{text}</Text> : <Text>-</Text>
    },
    {
      title: 'تحققAbsher',
      dataIndex: 'absher_verified',
      key: 'absher_verified',
      render: (value: boolean) => (
        <Tag color={value ? 'green' : 'grey'}>
          {value ? 'محقق' : 'غير محقق'}
        </Tag>
      )
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
            onClick={() => handleViewTenant(record)}
          />
          {user?.role === 'admin' && (
            <>
              <Popconfirm
                title="هل أنت متأكد من حذف هذا المستأجر؟"
                onConfirm={() => handleDeleteTenant(record.id)}
                okText="نعم"
                cancelText="لا"
              >
                <Button 
                  size="small" 
                  icon={<DeleteOutlined />} 
                  danger
                  title="حذف المستأجر"
                />
              </Popconfirm>
              <Button 
                size="small" 
                style={{ margin: '0 4px' }}
                icon={<EditOutlined />} 
                title="تعديل المستأجر"
                onClick={() => handleEditTenant(record)}
              />
            </>
          )}
        </Space>
      )
    }
  ];

  return (
    <div className={styles.tenantsPage}>
      <div className={styles.pageHeader}>
        <h1>إدارة المستأجرين</h1>
        <div className={styles.headerActions}>
          <Space>
            <Select 
              placeholder="جميع الجنسيات"
              value={nationalityFilter}
              onChange={handleNationalityFilterChange}
              style={{ width: 140 }}
            >
              <Option value="all">جميع الجنسيات</Option>
              {nationalities.map(nat => (
                <Option key={nat} value={nat}>
                  {nat}
                </Option>
              ))}
            </Select>
            
            <Input.Search 
              placeholder="ابحث بالاسم أو الرقم أو الهاتف..."
              value={searchTerm}
              onChange={handleSearch}
              style={{ width: 280 }}
            />
            
            {user?.role === 'admin' && (
              <Button 
                type="primary" 
                icon={<PlusOutlined />}
                onClick={handleAddTenant}
              >
                إضافة مستأجر
              </Button>
            )}
          </Space>
        </div>
      </div>
      
      {loading ? (
        <div className={styles.loadingContainer}>
          <Spin tip="جاري تحميل المستأجرين..." />
        </div>
      ) : filteredTenants.length === 0 ? (
        <div className={styles.emptyState}>
          <p>لا توجد مستأجرين يطابقون معايير البحث</p>
          {user?.role === 'admin' && (
            <Button type="primary" onClick={handleAddTenant}>
              إضافة أول مستأجر
            </Button>
          )}
        </div>
      ) : (
        <Table 
          columns={columns} 
          dataSource={filteredTenants}
          pagination={{ pageSize: 10 }}
          rowKey="id"
          scroll={{ x: 'max-content' }}
        />
      )}
      
      {/* Add/Edit/View Tenant Modal */}
      <AddEditTenant
        tenantId={selectedTenant?.id || undefined}
        onClose={handleModalClose}
        visible={modalVisible}
      />
    </div>
  );
};

export default TenantsPage;