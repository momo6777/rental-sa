import React, { useEffect, useState } from 'react';
import { Table, Button, Space, Tag, Popconfirm, Spin, Input, Select, message } from 'antd';
import { PlusOutlined, EditOutlined, DeleteOutlined, SearchOutlined } from '@ant-design/icons';
import { useAuth } from '../hooks/useAuth';
import { supabase } from '../lib/supabase';
import { PaymentInvoicePDF } from '../components/PaymentInvoicePDF';
import AddEditPayment from './AddEditPayment';
import styles from './Payments.module.css';

const { Option } = Select;

const PaymentsPage = () => {
  const { user } = useAuth();
  const [payments, setPayments] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filteredPayments, setFilteredPayments] = useState<any[]>([]);
  const [modalVisible, setModalVisible] = useState(false);
  const [selectedPayment, setSelectedPayment] = useState<any>(null);

  useEffect(() => {
    fetchPayments();
  }, []);

  const fetchPayments = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('payments')
        .select(`
          id,
          contract_id,
          amount,
          vat_amount,
          total_amount,
          due_date,
          paid_date,
          status,
          payment_method,
          invoice_number,
          created_at,
          contract:contracts (
            id,
            unit_id,
            tenant_id,
            rent_amount,
            ejar_contract_number,
            unit:units (
              id,
              unit_number,
              floor,
              area_sqm,
              type,
              status,
              rent_price,
              is_commercial,
              property:properties (
                id,
                name_ar,
                name_en,
                city,
                district,
                parcel_number,
                deed_number
              )
            ),
            tenant:tenants (
              id,
              full_name_ar,
              full_name_en,
              national_id,
              iqama_number,
              nationality,
              phone,
              email
            )
          )
        `)
        .order('created_at', { ascending: false });
      if (error) throw error;
      setPayments(data);
      setFilteredPayments(data);
    } catch (err: any) {
      console.error('Error fetching payments', err);
      message.error(err.message || 'فشل تحميل المدفوعات');
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchTerm(e.target.value);
    const term = e.target.value.toLowerCase().trim();
    if (!term) {
      setFilteredPayments(payments);
      return;
    }
    const filtered = payments.filter(p =>
      (p.id && p.id.toString().includes(term)) ||
      (p.contract_id && p.contract_id.toString().includes(term)) ||
      (p.invoice_number && p.invoice_number.toString().includes(term))
    );
    setFilteredPayments(filtered);
  };

  const handleAddPayment = () => {
    setSelectedPayment(null);
    setModalVisible(true);
  };

  const handleEditPayment = (payment: any) => {
    setSelectedPayment(payment);
    setModalVisible(true);
  };

  const handleDeletePayment = async (paymentId: string) => {
    try {
      const { error } = await supabase.from('payments').delete().eq('id', paymentId);
      if (error) throw error;
      message.success('تم حذف الدفعة بنجاح');
      fetchPayments();
    } catch (err: any) {
      console.error('Error deleting payment', err);
      message.error(err.message || 'فشل حذف الدفعة');
    }
  };

  const handleModalClose = () => {
    setModalVisible(false);
    setSelectedPayment(null);
    fetchPayments();
  };

  const columns = [
    {
      title: 'معرف الدفعة',
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
      title: 'الضريبة (VAT)',
      dataIndex: 'vat_amount',
      key: 'vat_amount',
    },
    {
      title: 'المجموع',
      dataIndex: 'total_amount',
      key: 'total_amount',
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
      render: (date: string) => (date ? new Date(date).toLocaleDateString('ar-SA') : '-'),
    },
    {
      title: 'الحالة',
      dataIndex: 'status',
      key: 'status',
      render: (status: string) => {
        let color = 'default';
        if (status === 'paid') color = 'green';
        else if (status === 'overdue') color = 'red';
        else if (status === 'pending') color = 'orange';
        return <Tag color={color}>{status}</Tag>;
      },
    },
    {
      title: 'طريقة الدفع',
      dataIndex: 'payment_method',
      key: 'payment_method',
    },
    {
      title: 'رقم الفاتورة',
      dataIndex: 'invoice_number',
      key: 'invoice_number',
    },
    {
      title: 'الإجراءات',
      key: 'actions',
      render: (_: any, record: any) => (
        <Space size="middle">
          {user?.role === 'admin' && (
            <>
              <Button size="small" icon={<EditOutlined />} onClick={() => handleEditPayment(record)} />
              <Popconfirm
                title="هل تريد حذف هذه الدفعة؟"
                onConfirm={() => handleDeletePayment(record.id)}
                okText="نعم"
                cancelText="لا"
              >
                <Button size="small" danger icon={<DeleteOutlined />} />
              </Popconfirm>
            </>
          )}
          {/* PDF download for any user (or admin only if desired) */}
          <PaymentInvoicePDF payment={record} />
        </Space>
      ),
    },
  ];

  return (
    <div className={styles.paymentsPage}>
      <div className={styles.pageHeader}>
        <h1>إدارة المدفوعات</h1>
        <div className={styles.headerActions}>
          <Space>
            <Input.Search
              placeholder="ابحث بالمعرف أو العقد أو الفاتورة..."
              value={searchTerm}
              onChange={handleSearch}
              style={{ width: 300 }}
            />
            {user?.role === 'admin' && (
              <Button type="primary" icon={<PlusOutlined />} onClick={handleAddPayment}>
                إضافة دفعة
              </Button>
            )}
          </Space>
        </div>
      </div>

      {loading ? (
        <div className={styles.loadingContainer}>
          <Spin tip="جاري تحميل المدفوعات..." />
        </div>
      ) : (
        <Table
          columns={columns}
          dataSource={filteredPayments}
          rowKey="id"
          pagination={{ pageSize: 10 }}
          scroll={{ x: 'max-content' }}
        />
      )}

      {/* Add/Edit Payment Modal */}
      <AddEditPayment
        paymentId={selectedPayment?.id}
        onClose={handleModalClose}
        visible={modalVisible}
      />
    </div>
  );
};

export default PaymentsPage;
