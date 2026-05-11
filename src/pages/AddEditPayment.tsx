import React, { useState, useEffect } from 'react';
import { Form, Input, Select, DatePicker, Button, message, Modal, Checkbox } from 'antd';
import { useAuth } from '../hooks/useAuth';
import { supabase } from '../lib/supabase';
import dayjs from 'dayjs';
import styles from './AddEditPayment.module.css';

const { Option } = Select;

export type AddEditPaymentProps = {
  paymentId?: string;
  onClose: () => void;
  visible: boolean;
};

const AddEditPayment: React.FC<AddEditPaymentProps> = ({ paymentId, onClose, visible }) => {
  const { user } = useAuth();
  const [form] = Form.useForm();
  const [loading, setLoading] = useState(false);
  const [paymentData, setPaymentData] = useState({
    contract_id: '' as string,
    amount: 0 as number,
    vat_amount: 0 as number,
    total_amount: 0 as number,
    due_date: null as string | null,
    paid_date: null as string | null,
    status: 'pending' as 'pending' | 'paid' | 'overdue',
    payment_method: 'cash' as 'sadad' | 'transfer' | 'cash',
    sadad_reference: '' as string,
    invoice_number: '' as string,
  });

  const [contracts, setContracts] = useState<Array<{ id: string; ejar_contract_number: string }>>([]);

  const isEditing = !!paymentId;

  useEffect(() => {
    fetchContracts();
    if (paymentId) {
      fetchPaymentDetails();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [paymentId]);

  const fetchContracts = async () => {
    try {
      const { data, error } = await supabase.from('contracts').select('id, ejar_contract_number').order('id');
      if (error) throw error;
      setContracts(data || []);
    } catch (err) {
      console.error('Error fetching contracts', err);
    }
  };

  const fetchPaymentDetails = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase.from('payments').select('*').eq('id', paymentId).single();
      if (error) throw error;
      setPaymentData({
        ...data,
        due_date: data.due_date ? dayjs(data.due_date).format('YYYY-MM-DD') : null,
        paid_date: data.paid_date ? dayjs(data.paid_date).format('YYYY-MM-DD') : null,
      });
    } catch (err: any) {
      console.error('Error loading payment', err);
      message.error(err.message || 'فشل تحميل بيانات الدفعة');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (values: any) => {
    try {
      setLoading(true);
      // Convert dates to strings if needed
      if (values.due_date) {
        values.due_date = values.due_date.format('YYYY-MM-DD');
      }
      if (values.paid_date) {
        values.paid_date = values.paid_date.format('YYYY-MM-DD');
      }

      let result;
      if (isEditing) {
        result = await supabase.from('payments').update(values).eq('id', paymentId);
      } else {
        result = await supabase.from('payments').insert([values]);
      }
      if (result.error) throw result.error;
      message.success(isEditing ? 'تم تعديل الدفعة بنجاح' : 'تم إضافة الدفعة بنجاح');
      onClose();
    } catch (err: any) {
      console.error('Error saving payment', err);
      message.error(err.message || 'فشل حفظ الدفعة');
    } finally {
      setLoading(false);
    }
  };

  if (!visible) return null;

  return (
    <Modal
      title={isEditing ? 'تعديل دفعة' : 'إضافة دفعة جديدة'}
      visible={true}
      onCancel={onClose}
      footer={[
        <Button key="back" onClick={onClose}>إلغاء</Button>,
        <Button key="submit" type="primary" loading={loading} onClick={() => form.submit()}>{isEditing ? 'حفظ التغييرات' : 'إضافة الدفعة'}</Button>,
      ]}
      width={720}
      style={{ top: 20 }}
    >
      <Form
        form={form}
        layout="vertical"
        name="payment_form"
        initialValues={paymentData}
        onFinish={handleSubmit}
        style={{ marginBottom: 24 }}
      >
        <Form.Item label="العقد" name="contract_id" rules={[{ required: true, message: 'اختر العقد' }]}>
          <Select placeholder="اختر عقد">
            {contracts.map(c => (
              <Option key={c.id} value={c.id}>
                {c.ejar_contract_number ? `${c.ejar_contract_number} (${c.id})` : c.id}
              </Option>
            ))}
          </Select>
        </Form.Item>
        <Form.Item label="المبلغ" name="amount" rules={[{ required: true, type: 'number', min: 0, message: 'قيمة صالحة' }]}>
          <Input type="number" placeholder="المبلغ" style={{ borderRadius: 8 }} />
        </Form.Item>
        <Form.Item label="قيمة الضريبة (VAT)" name="vat_amount" rules={[{ required: true, type: 'number', min: 0, message: 'قيمة ضريبة صالحة' }]}>
          <Input type="number" placeholder="قيمة الضريبة" style={{ borderRadius: 8 }} />
        </Form.Item>
        <Form.Item label="المجموع بعد الضريبة" name="total_amount" rules={[{ required: true, type: 'number', min: 0, message: 'المجموع صالحة' }]}>
          <Input type="number" placeholder="المجموع" style={{ borderRadius: 8 }} />
        </Form.Item>
        <Form.Item label="تاريخ الاستحقاق" name="due_date" rules={[{ required: true, message: 'اختر تاريخ الاستحقاق' }]}>
          <DatePicker style={{ width: '100%' }} />
        </Form.Item>
        <Form.Item label="تاريخ الدفع" name="paid_date">
          <DatePicker style={{ width: '100%' }} />
        </Form.Item>
        <Form.Item label="الحالة" name="status" rules={[{ required: true, message: 'اختر الحالة' }]}>
          <Select>
            <Option value="pending">قيد الانتظار</Option>
            <Option value="paid">مدفوع</Option>
            <Option value="overdue">متأخر</Option>
          </Select>
        </Form.Item>
        <Form.Item label="طريقة الدفع" name="payment_method" rules={[{ required: true, message: 'اختر طريقة الدفع' }]}>
          <Select>
            <Option value="cash">نقود</Option>
            <Option value="transfer">تحويل</Option>
            <Option value="sadad">سداد</Option>
          </Select>
        </Form.Item>
        <Form.Item label="مرجع سداد (SADAD)" name="sadad_reference">
          <Input placeholder="رقم المرجع سداد (إن وجد)" style={{ borderRadius: 8 }} />
        </Form.Item>
        <Form.Item label="رقم الفاتورة" name="invoice_number">
          <Input placeholder="رقم الفاتورة" style={{ borderRadius: 8 }} />
        </Form.Item>
      </Form>
    </Modal>
  );
};

export default AddEditPayment;
