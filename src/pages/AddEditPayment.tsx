import React, { useState, useEffect, useCallback } from 'react';
import { Form, Input, InputNumber, Select, DatePicker, Button, message, Modal } from 'antd';
import { supabase } from '../lib/supabase';
import { calcVAT } from '../lib/vatCalculator';
import { generateInvoiceNumber } from '../lib/invoiceGenerator';
import { useSettings } from '../lib/SettingsContext';
import dayjs from 'dayjs';

const { Option } = Select;

export type AddEditPaymentProps = {
  paymentId?: string;
  onClose: () => void;
  visible: boolean;
};

const AddEditPayment: React.FC<AddEditPaymentProps> = ({ paymentId, onClose, visible }) => {
  const { settings, countryConfig } = useSettings();
  const [form] = Form.useForm();
  const [loading, setLoading] = useState(false);
  const [contracts, setContracts] = useState<Array<{ id: string; ejar_contract_number: string; contract_number: string }>>([]);
  const [isCommercial, setIsCommercial] = useState(false);

  const isEditing = !!paymentId;

  useEffect(() => {
    if (!visible) return;
    fetchContracts();
    if (paymentId) {
      fetchPaymentDetails();
    } else {
      form.setFieldsValue({ invoice_number: generateInvoiceNumber() });
    }
  }, [paymentId, visible]);

  const handleContractChange = useCallback(async (contractId: string) => {
    if (!contractId) return;
    try {
      const { data, error } = await supabase
        .from('contracts')
        .select('unit:units(is_commercial)')
        .eq('id', contractId)
        .single();
      if (error) throw error;
      const commercial = (data as any)?.unit?.is_commercial ?? false;
      setIsCommercial(commercial);
      const amount = form.getFieldValue('amount');
      if (amount > 0) {
        const vatResult = calcVAT(Number(amount), commercial, settings.vat_rate);
        form.setFieldsValue({
          vat_amount: vatResult.vat,
          total_amount: vatResult.total,
        });
      }
    } catch (err) {
      console.error('Error fetching contract details', err);
    }
  }, [form]);

  const handleAmountChange = useCallback((value: number | null) => {
    const amount = value ?? 0;
    const vatResult = calcVAT(amount, isCommercial, settings.vat_rate);
    form.setFieldsValue({
      vat_amount: vatResult.vat,
      total_amount: vatResult.total,
    });
  }, [form, isCommercial]);

  const fetchContracts = async () => {
    try {
      const { data, error } = await supabase.from('contracts').select('id, ejar_contract_number, contract_number').order('id');
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
      const formatted = {
        ...data,
        due_date: data.due_date ? dayjs(data.due_date) : null,
        paid_date: data.paid_date ? dayjs(data.paid_date) : null,
      };
      form.setFieldsValue(formatted);
      if (data.contract_id) handleContractChange(data.contract_id);
      if (data.amount) setIsCommercial(data.vat_amount > 0);
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
      const payload = {
        ...values,
        due_date: values.due_date?.format('YYYY-MM-DD'),
        paid_date: values.paid_date?.format('YYYY-MM-DD') || null,
      };

      let result;
      if (isEditing) {
        result = await supabase.from('payments').update(payload).eq('id', paymentId);
      } else {
        result = await supabase.from('payments').insert([payload]);
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
      open={visible}
      onCancel={onClose}
      footer={[
        <Button key="back" onClick={onClose}>إلغاء</Button>,
        <Button key="submit" type="primary" loading={loading} onClick={() => form.submit()}>
          {isEditing ? 'حفظ التغييرات' : 'إضافة الدفعة'}
        </Button>,
      ]}
      width={720}
      style={{ top: 20 }}
    >
      <Form
        form={form}
        layout="vertical"
        name="payment_form"
        onFinish={handleSubmit}
        style={{ marginBottom: 24 }}
      >
        <Form.Item label="العقد" name="contract_id" rules={[{ required: true, message: 'اختر العقد' }]}>
          <Select placeholder="اختر عقد" onChange={handleContractChange}>
            {contracts.map(c => (
              <Option key={c.id} value={c.id}>
                {c.contract_number || c.ejar_contract_number ? `${c.contract_number || c.ejar_contract_number} (${c.id.slice(0, 6)})` : c.id.slice(0, 6)}
              </Option>
            ))}
          </Select>
        </Form.Item>
        <Form.Item label="المبلغ" name="amount" rules={[{ required: true, message: 'أدخل المبلغ' }]}>
          <InputNumber
            style={{ width: '100%', borderRadius: 8 }}
            placeholder="المبلغ"
            min={0}
            onChange={handleAmountChange}
          />
        </Form.Item>
        <Form.Item label="قيمة الضريبة (VAT)" name="vat_amount">
          <InputNumber style={{ width: '100%', borderRadius: 8 }} placeholder="قيمة الضريبة" min={0} disabled />
        </Form.Item>
        <Form.Item label="المجموع بعد الضريبة" name="total_amount" rules={[{ required: true, message: 'المجموع مطلوب' }]}>
          <InputNumber style={{ width: '100%', borderRadius: 8 }} placeholder="المجموع" min={0} disabled />
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
            {countryConfig.paymentMethods.map(pm => (
              <Option key={pm.value} value={pm.value}>{pm.label}</Option>
            ))}
          </Select>
        </Form.Item>
        {settings.country === 'SA' && (
          <Form.Item label="مرجع سداد (SADAD)" name="sadad_reference">
            <Input placeholder="رقم المرجع سداد (إن وجد)" style={{ borderRadius: 8 }} />
          </Form.Item>
        )}
        {settings.country === 'EG' && (
          <Form.Item label="مرجع فوري" name="fawry_reference">
            <Input placeholder="رقم مرجع فوري (إن وجد)" style={{ borderRadius: 8 }} />
          </Form.Item>
        )}
        <Form.Item label="رقم الفاتورة" name="invoice_number">
          <Input placeholder="الفاتورة (تلقائي للجديد)" style={{ borderRadius: 8 }} />
        </Form.Item>
      </Form>
    </Modal>
  );
};

export default AddEditPayment;
