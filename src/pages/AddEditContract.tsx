import React, { useState, useEffect } from 'react';
import { Form, Input, InputNumber, Select, DatePicker, Button, message, Modal, Checkbox } from 'antd';
import { PlusOutlined, CameraOutlined, FileTextOutlined, CheckCircleOutlined } from '@ant-design/icons';
import { useAuth } from '../hooks/useAuth';
import { supabase } from '../lib/supabase';
import dayjs from 'dayjs';
import styles from './AddEditContract.module.css';

const { Option } = Select;

export type AddEditContractProps = {
  contractId?: string;
  onClose: () => void;
  visible: boolean;
};

const AddEditContract: React.FC<AddEditContractProps> = ({ contractId, onClose, visible }) => {
  const { user } = useAuth();
  const [form] = Form.useForm();
  const [loading, setLoading] = useState(false);
  const [contractData, setContractData] = useState({
    unit_id: '',
    tenant_id: '',
    start_date: null as string | null,
    end_date: null as string | null,
    rent_amount: 0,
    payment_frequency: 'monthly' as 'monthly' | 'quarterly' | 'yearly',
    status: 'active' as 'active' | 'expired' | 'terminated',
    ejar_contract_number: '',
    vat_included: false,
    deposit_amount: 0,
  });
  const [units, setUnits] = useState<Array<{ id: string; unit_number: string }>>([]);
  const [tenants, setTenants] = useState<Array<{ id: string; full_name_ar: string }>>([]);

  const isEditing = !!contractId;

  useEffect(() => {
    fetchUnits();
    fetchTenants();
    if (contractId) {
      fetchContractDetails();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [contractId]);

  const fetchUnits = async () => {
    try {
      const { data, error } = await supabase.from('units').select('id, unit_number').order('unit_number');
      if (error) throw error;
      setUnits(data || []);
    } catch (err) {
      console.error('Error fetching units', err);
    }
  };

  const fetchTenants = async () => {
    try {
      const { data, error } = await supabase.from('tenants').select('id, full_name_ar').order('full_name_ar');
      if (error) throw error;
      setTenants(data || []);
    } catch (err) {
      console.error('Error fetching tenants', err);
    }
  };

  const fetchContractDetails = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase.from('contracts').select('*').eq('id', contractId).single();
      if (error) throw error;
      setContractData({
        ...data,
        start_date: data.start_date ? dayjs(data.start_date).format('YYYY-MM-DD') : null,
        end_date: data.end_date ? dayjs(data.end_date).format('YYYY-MM-DD') : null,
      });
    } catch (err: any) {
      console.error('Error loading contract', err);
      message.error(err.message || 'فشل تحميل بيانات العقد');
    } finally {
      setLoading(false);
    }
  };

  const setUnitAvailableIfNoActiveContracts = async (unitId: string, excludeContractId: string) => {
    const { count } = await supabase
      .from('contracts')
      .select('*', { count: 'exact', head: true })
      .eq('unit_id', unitId)
      .eq('status', 'active')
      .neq('id', excludeContractId);
    if (count === 0) {
      await supabase.from('units').update({ status: 'available' }).eq('id', unitId);
    }
  };

  const handleSubmit = async (values: any) => {
    try {
      setLoading(true);
      if (values.start_date) {
        values.start_date = values.start_date.format('YYYY-MM-DD');
      }
      if (values.end_date) {
        values.end_date = values.end_date.format('YYYY-MM-DD');
      }
      if (!values.ejar_contract_number) {
        values.ejar_contract_number = null;
      }

      let oldUnitId: string | null = null;
      let oldStatus: string | null = null;

      if (isEditing) {
        const { data: current } = await supabase
          .from('contracts')
          .select('unit_id, status')
          .eq('id', contractId)
          .single();
        if (current) {
          oldUnitId = current.unit_id;
          oldStatus = current.status;
        }
      }

      if (isEditing) {
        const { error } = await supabase.from('contracts').update(values).eq('id', contractId);
        if (error) throw error;
      } else {
        const { error } = await supabase.from('contracts').insert([values]);
        if (error) throw error;
      }

      const newUnitId = values.unit_id;
      const newStatus = values.status;

      if (isEditing) {
        if (oldUnitId && oldUnitId !== newUnitId) {
          await setUnitAvailableIfNoActiveContracts(oldUnitId, contractId!);
          if (newStatus === 'active') {
            await supabase.from('units').update({ status: 'rented' }).eq('id', newUnitId);
          }
        } else if (oldUnitId === newUnitId && oldStatus !== newStatus) {
          if (newStatus === 'active') {
            await supabase.from('units').update({ status: 'rented' }).eq('id', newUnitId);
          } else if (oldStatus === 'active') {
            await setUnitAvailableIfNoActiveContracts(newUnitId, contractId!);
          }
        }
      } else {
        if (newStatus === 'active') {
          await supabase.from('units').update({ status: 'rented' }).eq('id', newUnitId);
        }
      }

      message.success(isEditing ? 'تم تعديل العقد بنجاح' : 'تم إضافة العقد بنجاح');
      onClose();
    } catch (err: any) {
      console.error('Error saving contract', err);
      message.error(err.message || 'فشل حفظ العقد');
    } finally {
      setLoading(false);
    }
  };

  if (!visible) return null;

  return (
    <Modal
      title={isEditing ? 'تعديل العقد' : 'إضافة عقد جديد'}
      visible={true}
      onCancel={onClose}
      footer={[
        <Button key="back" onClick={onClose}>
          إلغاء
        </Button>,
        <Button key="submit" type="primary" loading={loading} onClick={() => form.submit()}>
          {isEditing ? 'حفظ التعديلات' : 'إضافة العقد'}
        </Button>,
      ]}
      width={720}
      style={{ top: 20 }}
    >
      <Form
        form={form}
        layout="vertical"
        name="contract_form"
        initialValues={contractData}
        onFinish={handleSubmit}
        style={{ marginBottom: 24 }}
      >
        <Form.Item label="العقار (الوحدة)" name="unit_id" rules={[{ required: true, message: 'اختر الوحدة' }]}>
          <Select placeholder="اختر وحدة">
            {units.map(u => (
              <Option key={u.id} value={u.id}>
                {u.unit_number}
              </Option>
            ))}
          </Select>
        </Form.Item>

        <Form.Item label="المستأجر" name="tenant_id" rules={[{ required: true, message: 'اختر المستأجر' }]}>
          <Select placeholder="اختر مستأجر">
            {tenants.map(t => (
              <Option key={t.id} value={t.id}>
                {t.full_name_ar}
              </Option>
            ))}
          </Select>
        </Form.Item>

        <Form.Item label="تاريخ البدء" name="start_date" rules={[{ required: true, message: 'اختر تاريخ البدء' }]}>
          <DatePicker style={{ width: '100%' }} />
        </Form.Item>

        <Form.Item label="تاريخ الانتهاء" name="end_date">
          <DatePicker style={{ width: '100%' }} />
        </Form.Item>

        <Form.Item label="قيمة الإيجار" name="rent_amount" rules={[{ required: true, message: 'أدخل قيمة الإيجار' }]}>
          <InputNumber min={0} placeholder="قيمة الإيجار" style={{ width: '100%', borderRadius: 8 }} />
        </Form.Item>

        <Form.Item label="دورية الدفع" name="payment_frequency" rules={[{ required: true, message: 'اختر دورة الدفع' }]}>
          <Select>
            <Option value="monthly">شهري</Option>
            <Option value="quarterly">ربع سنوي</Option>
            <Option value="yearly">سنوي</Option>
          </Select>
        </Form.Item>

        <Form.Item label="الحالة" name="status" rules={[{ required: true, message: 'اختر الحالة' }]}>
          <Select>
            <Option value="active">نشط</Option>
            <Option value="expired">منتهي</Option>
            <Option value="terminated">ملغى</Option>
          </Select>
        </Form.Item>

        <Form.Item label="رقم عقد إيجار" name="ejar_contract_number">
          <Input placeholder="رقم العقد في منصة إيجار" style={{ borderRadius: 8 }} />
        </Form.Item>

        <Form.Item name="vat_included" valuePropName="checked" label="شامل الضريبة (VAT)">
          <Checkbox>تشمل الضريبة</Checkbox>
        </Form.Item>

        <Form.Item label="الضمان (مبلغ)" name="deposit_amount" rules={[{ required: true, message: 'أدخل مبلغ الضمان' }]}>
          <InputNumber min={0} placeholder="مبلغ الضمان" style={{ width: '100%', borderRadius: 8 }} />
        </Form.Item>
      </Form>
    </Modal>
  );
};

export default AddEditContract;
