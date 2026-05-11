import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Card, Descriptions, Table, Tag, Spin, Button, message } from 'antd';
import { LeftOutlined } from '@ant-design/icons';
import { useAuth } from '../hooks/useAuth';
import { supabase } from '../lib/supabase';
import styles from './Tenants.module.css';

const TenantDetails = () => {
  const { id: tenantId } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [tenant, setTenant] = useState<any>(null);
  const [contracts, setContracts] = useState<any[]>([]);
  const [payments, setPayments] = useState<any[]>([]);

  useEffect(() => {
    if (tenantId) {
      fetchData();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tenantId]);

  const fetchData = async () => {
    try {
      setLoading(true);
      // Fetch tenant info
      const { data: tenantData, error: tenantError } = await supabase
        .from('tenants')
        .select('*')
        .eq('id', tenantId)
        .single();
      if (tenantError) throw tenantError;
      setTenant(tenantData);

      // Fetch contracts for tenant
      const { data: contractsData, error: contractsError } = await supabase
        .from('contracts')
        .select('*')
        .eq('tenant_id', tenantId);
      if (contractsError) throw contractsError;
      setContracts(contractsData || []);

      // Gather contract ids for payment query
      const contractIds = (contractsData || []).map((c) => c.id);
      if (contractIds.length > 0) {
        const { data: paymentsData, error: paymentsError } = await supabase
          .from('payments')
          .select('*')
          .in('contract_id', contractIds);
        if (paymentsError) throw paymentsError;
        setPayments(paymentsData || []);
      } else {
        setPayments([]);
      }
    } catch (err: any) {
      console.error('Error loading tenant details', err);
      message.error(err.message || 'فشل تحميل تفاصيل المستأجر');
    } finally {
      setLoading(false);
    }
  };

  const contractColumns = [
    {
      title: 'العقد',
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
      title: 'الإيجار',
      dataIndex: 'rent_amount',
      key: 'rent_amount',
    },
    {
      title: 'الحالة',
      dataIndex: 'status',
      key: 'status',
      render: (status: string) => (
        <Tag color={status === 'active' ? 'green' : status === 'expired' ? 'red' : 'orange'}>
          {status}
        </Tag>
      ),
    },
    {
      title: 'تاريخ البدء',
      dataIndex: 'start_date',
      key: 'start_date',
      render: (date: string) => new Date(date).toLocaleDateString('ar-SA'),
    },
    {
      title: 'تاريخ الانتهاء',
      dataIndex: 'end_date',
      key: 'end_date',
      render: (date: string) => new Date(date).toLocaleDateString('ar-SA'),
    },
  ];

  const paymentColumns = [
    {
      title: 'الدفع',
      dataIndex: 'id',
      key: 'id',
      render: (text: string) => <Tag color="purple">{text}</Tag>,
    },
    {
      title: 'العقد',
      dataIndex: 'contract_id',
      key: 'contract_id',
    },
    {
      title: 'المبلغ',
      dataIndex: 'amount',
      key: 'amount',
    },
    {
      title: 'الحالة',
      dataIndex: 'status',
      key: 'status',
      render: (status: string) => (
        <Tag color={status === 'paid' ? 'green' : status === 'overdue' ? 'red' : 'orange'}>
          {status}
        </Tag>
      ),
    },
    {
      title: 'طريقة الدفع',
      dataIndex: 'payment_method',
      key: 'payment_method',
    },
    {
      title: 'تاريخ الاستحقاق',
      dataIndex: 'due_date',
      key: 'due_date',
      render: (date: string) => new Date(date).toLocaleDateString('ar-SA'),
    },
    {
      title: 'تاريخ الدفع',
      dataIndex: 'paid_date',
      key: 'paid_date',
      render: (date: string) => date ? new Date(date).toLocaleDateString('ar-SA') : '-',
    },
  ];

  if (loading) {
    return (
      <div className={styles.loadingContainer}>
        <Spin tip="جاري تحميل تفاصيل المستأجر..." />
      </div>
    );
  }

  if (!tenant) {
    return (
      <div className={styles.emptyState}>
        <p>لم يتم العثور على المستأجر.</p>
        <Button icon={<LeftOutlined />} onClick={() => navigate('/tenants')}>رجوع إلى القائمة</Button>
      </div>
    );
  }

  return (
    <div className={styles.tenantsPage}>
      <Button icon={<LeftOutlined />} style={{ marginBottom: 16 }} onClick={() => navigate('/tenants')}>
        الرجوع إلى القائمة
      </Button>
      <Card title="معلومات المستأجر">
        <Descriptions column={1} bordered>
          <Descriptions.Item label="الاسم (عربي)">{tenant.full_name_ar}</Descriptions.Item>
          <Descriptions.Item label="الاسم (إنجليزي)">{tenant.full_name_en || '-'} </Descriptions.Item>
          <Descriptions.Item label="الجنسية">{tenant.nationality}</Descriptions.Item>
          <Descriptions.Item label="رقم الهوية الوطنية">{tenant.national_id || '-'} </Descriptions.Item>
          <Descriptions.Item label="رقم الإقامة">{tenant.iqama_number || '-'} </Descriptions.Item>
          <Descriptions.Item label="الهاتف">{tenant.phone}</Descriptions.Item>
          <Descriptions.Item label="البريد الإلكتروني">{tenant.email || '-'} </Descriptions.Item>
          <Descriptions.Item label="تحقق Absher">
            <Tag color={tenant.absher_verified ? 'green' : 'grey'}>
              {tenant.absher_verified ? 'محقق' : 'غير محقق'}
            </Tag>
          </Descriptions.Item>
        </Descriptions>
      </Card>

      <h3 style={{ marginTop: 24, marginBottom: 12 }}>العقود</h3>
      <Table
        columns={contractColumns}
        dataSource={contracts}
        rowKey="id"
        pagination={{ pageSize: 5 }}
        scroll={{ x: 'max-content' }}
      />

      <h3 style={{ marginTop: 24, marginBottom: 12 }}>الدفعات</h3>
      <Table
        columns={paymentColumns}
        dataSource={payments}
        rowKey="id"
        pagination={{ pageSize: 5 }}
        scroll={{ x: 'max-content' }}
      />
    </div>
  );
};

export default TenantDetails;
