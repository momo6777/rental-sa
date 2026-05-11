import React, { useEffect, useState } from 'react';
import { Table, Button, Space, Tag, Popconfirm, Spin, Input, Select, message } from 'antd';
import { PlusOutlined, EditOutlined, DeleteOutlined, SearchOutlined } from '@ant-design/icons';
import { useAuth } from '../hooks/useAuth';
import { supabase } from '../lib/supabase';
import AddEditContract from './AddEditContract';
import styles from './Contracts.module.css';

const { Option } = Select;

const ContractsPage = () => {
  const { user } = useAuth();
  const [contracts, setContracts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filteredContracts, setFilteredContracts] = useState<any[]>([]);
  const [modalVisible, setModalVisible] = useState(false);
  const [selectedContract, setSelectedContract] = useState<any>(null);

  useEffect(() => {
    fetchContracts();
  }, []);

  const fetchContracts = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase.from('contracts').select('*').order('created_at', { ascending: false });
      if (error) throw error;
      setContracts(data);
      setFilteredContracts(data);
    } catch (err: any) {
      console.error('Error fetching contracts', err);
      message.error(err.message || 'فشل تحميل العقود');
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchTerm(e.target.value);
    const term = e.target.value.toLowerCase().trim();
    if (!term) {
      setFilteredContracts(contracts);
      return;
    }
    const filtered = contracts.filter(c =>
      (c.id && c.id.toString().includes(term)) ||
      (c.unit_id && c.unit_id.toString().includes(term)) ||
      (c.tenant_id && c.tenant_id.toString().includes(term)) ||
      (c.ejar_contract_number && c.ejar_contract_number.toString().includes(term))
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

  const handleDeleteContract = async (contractId: string) => {
    try {
      const { error } = await supabase.from('contracts').delete().eq('id', contractId);
      if (error) throw error;
      message.success('تم حذف العقد بنجاح');
      fetchContracts();
    } catch (err: any) {
      console.error('Error deleting contract', err);
      message.error(err.message || 'فشل حذف العقد');
    }
  };

  const handleModalClose = () => {
    setModalVisible(false);
    setSelectedContract(null);
    fetchContracts();
  };

  const columns = [
    {
      title: 'معرف العقد',
      dataIndex: 'id',
      key: 'id',
      render: (text: string) => <Tag color="blue">{text}</Tag>,
    },
    {
      title: 'الوحدة',
      dataIndex: 'unit_id',
      key: 'unit_id',
    },
    {
      title: 'المستأجر',
      dataIndex: 'tenant_id',
      key: 'tenant_id',
    },
    {
      title: 'الإيجار',
      dataIndex: 'rent_amount',
      key: 'rent_amount',
    },
    {
      title: 'دورية الدفع',
      dataIndex: 'payment_frequency',
      key: 'payment_frequency',
      render: (freq: string) => {
        let color = 'default';
        if (freq === 'monthly') color = 'green';
        else if (freq === 'quarterly') color = 'orange';
        else if (freq === 'yearly') color = 'blue';
        return <Tag color={color}>{freq}</Tag>;
      },
    },
    {
      title: 'الحالة',
      dataIndex: 'status',
      key: 'status',
      render: (status: string) => {
        let color = status === 'active' ? 'green' : status === 'expired' ? 'red' : 'orange';
        return <Tag color={color}>{status}</Tag>;
      },
    },
    {
      title: 'رقم عقد إيجار',
      dataIndex: 'ejar_contract_number',
      key: 'ejar_contract_number',
    },
    {
      title: 'شامل الضريبة',
      dataIndex: 'vat_included',
      key: 'vat_included',
      render: (inc: boolean) => (inc ? <Tag color="green">نعم</Tag> : <Tag color="grey">لا</Tag>),
    },
    {
      title: 'الضمان',
      dataIndex: 'deposit_amount',
      key: 'deposit_amount',
    },
    {
      title: 'الإجراءات',
      key: 'actions',
      render: (_: any, record: any) => (
        <Space size="middle">
          {user?.role === 'admin' && (
            <>
              <Button size="small" icon={<EditOutlined />} onClick={() => handleEditContract(record)} />
              <Popconfirm
                title="هل تريد حذف هذا العقد؟"
                onConfirm={() => handleDeleteContract(record.id)}
                okText="نعم"
                cancelText="لا"
              >
                <Button size="small" danger icon={<DeleteOutlined />} />
              </Popconfirm>
            </>
          )}
        </Space>
      ),
    },
  ];

  return (
    <div className={styles.contractsPage}>
      <div className={styles.pageHeader}>
        <h1>إدارة العقود</h1>
        <div className={styles.headerActions}>
          <Space>
            <Input.Search
              placeholder="ابحث بالمعرف أو الوحدة أو المستأجر..."
              value={searchTerm}
              onChange={handleSearch}
              style={{ width: 300 }}
            />
            {user?.role === 'admin' && (
              <Button type="primary" icon={<PlusOutlined />} onClick={handleAddContract}>
                إضافة عقد
              </Button>
            )}
          </Space>
        </div>
      </div>

      {loading ? (
        <div className={styles.loadingContainer}>
          <Spin tip="جاري تحميل العقود..." />
        </div>
      ) : (
        <Table
          columns={columns}
          dataSource={filteredContracts}
          rowKey="id"
          pagination={{ pageSize: 10 }}
          scroll={{ x: 'max-content' }}
        />
      )}

      {/* Add/Edit Contract Modal */}
      <AddEditContract
        contractId={selectedContract?.id}
        onClose={handleModalClose}
        visible={modalVisible}
      />
    </div>
  );
};

export default ContractsPage;
