import React, { useState, useEffect } from 'react';
import { Form, Input, Select, Upload, Button, message, Modal, Checkbox } from 'antd';
import { PlusOutlined, CameraOutlined, FileTextOutlined, CheckCircleOutlined } from '@ant-design/icons';
import { useAuth } from '../hooks/useAuth';
import { supabase } from '../lib/supabase';
import styles from './AddEditTenant.module.css';

const { Option } = Select;
const { Dragger } = Upload;

type AddEditTenantProps = {
  tenantId?: string;
  onClose: () => void;
  visible: boolean;
};

const AddEditTenant = ({ tenantId, onClose, visible }: AddEditTenantProps) => {
  const { user } = useAuth();
  const [form] = Form.useForm();
  const [loading, setLoading] = useState(false);
  const [tenantData, setTenantData] = useState({
    full_name_ar: '',
    full_name_en: '',
    national_id: '',
    iqama_number: '',
    nationality: '',
    phone: '',
    email: '',
    absher_verified: false
  });
  const [previewImage, setPreviewImage] = useState<string | null>(null);

  useEffect(() => {
    if (tenantId) {
      fetchTenantDetails();
    }
  }, [tenantId]);

  const fetchTenantDetails = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('tenants')
        .select('*')
        .eq('id', tenantId)
        .single();
      
      if (error) throw error;
      
      setTenantData(data);
    } catch (error) {
      console.error('Error fetching tenant details:', error);
      message.error('فشل تحميل بيانات المستأجر');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (values: any) => {
    try {
      setLoading(true);
      
      let result;
      if (tenantId) {
        result = await supabase
          .from('tenants')
          .update(values)
          .eq('id', tenantId);
      } else {
        result = await supabase
          .from('tenants')
          .insert([values]);
      }
      
      if (result.error) throw result.error;
      
      message.success(tenantId ? 'تم تعديل المستأجر بنجاح' : 'تم إضافة المستأجر بنجاح');
      onClose();
    } catch (error: any) {
      console.error('Error saving tenant:', error);
      message.error(error.message || 'فشل حفظ المستأجر');
    } finally {
      setLoading(false);
    }
  };

  const handleImageChange = (info: any) => {
    if (info.file.status === 'done') {
      // In a real app, you would upload to Supabase Storage first
      // For demo, we'll use a placeholder URL
      setPreviewImage(info.file.url || URL.createObjectURL(info.file.originFileObj));
    } else if (info.file.status === 'error') {
      message.error('فشل رفع الصورة');
    }
  };

  if (!visible) return null;

  return (
    <Modal
      title={tenantId ? 'تعديل المستأجر' : 'إضافة مستأجر جديد'}
      visible={true}
      onCancel={onClose}
      footer={[
        <Button key="back" onClick={onClose}>
          إلغاء
        </Button>,
        <Button key="submit" type="primary" loading={loading} onClick={() => form.submit()}>
          {tenantId ? 'حفظ التعديلات' : 'إضافة المستأجر'}
        </Button>
      ]}
      width={720}
      style={{ top: 20 }}
    >
      <Form
        form={form}
        layout="vertical"
        name="tenant_form"
        initialValues={tenantData}
        onFinish={handleSubmit}
        style={{ marginBottom: 24 }}
      >
        <Form.Item
          label="الاسم الكامل (عربي)"
          name="full_name_ar"
          rules={[{ required: true, message: 'يرجى إدخال الاسم الكامل بالعربية' }]}
        >
          <Input
            placeholder="أدخل الاسم الكامل بالعربية"
            style={{ borderRadius: 8 }}
          />
        </Form.Item>

        <Form.Item
          label="الاسم الكامل (إنجليزي)"
          name="full_name_en"
        >
          <Input
            placeholder="أدخل الاسم الكامل بالإنجليزية (اختياري)"
            style={{ borderRadius: 8 }}
          />
        </Form.Item>

        <Form.Item
          label="الجنسية"
          name="nationality"
          rules={[{ required: true, message: 'يرجى إدخال الجنسية' }]}
        >
          <Input
            placeholder="أدخل الجنسية"
            style={{ borderRadius: 8 }}
          />
        </Form.Item>

        <Form.Item
          label="رقم الهوية الوطنية"
          name="national_id"
          // Note: Validation for national_id (10 digits, starts with 1 or 2) can be added via a custom validator
        >
          <Input
            placeholder="أدخل رقم الهوية الوطنية (10 أرقام، يبدأ بـ 1 أو 2)"
            style={{ borderRadius: 8 }}
          />
        </Form.Item>

        <Form.Item
          label="رقم الإقامة"
          name="iqama_number"
          // Note: Validation for iqama_number (10 digits, starts with 2) can be added via a custom validator
        >
          <Input
            placeholder="أدخل رقم الإقامة (10 أرقام، يبدأ بـ 2)"
            style={{ borderRadius: 8 }}
          />
        </Form.Item>

        <Form.Item
          label="رقم الهاتف"
          name="phone"
          rules={[{ required: true, message: 'يرجى إدخال رقم الهاتف' }]}
        >
          <Input
            placeholder="أدخل رقم الهاتف"
            style={{ borderRadius: 8 }}
          />
        </Form.Item>

        <Form.Item
          label="البريد الإلكتروني"
          name="email"
        >
          <Input
            placeholder="أدخل البريد الإلكتروني (اختياري)"
            style={{ borderRadius: 8 }}
          />
        </Form.Item>

        <Form.Item
          label="تحقق Absher"
          name="absher_verified"
          valuePropName="checked"
        >
          <Checkbox>محقق عبر Absher</Checkbox>
        </Form.Item>

        <Form.Item
          label="صورة الهوية"
          name="image_file"
          extra="الحد الأقصى للحجم: 5 ميجابايت"
        >
          <Dragger>
            <p className={styles.uploadText}>
              <CameraOutlined style={{ fontSize: 24, marginBottom: 8 }} />
              <br />
              انقر لرفع الصورة أو اسحبها هنا
            </p>
          </Dragger>
        </Form.Item>

        {previewImage && (
          <div className={styles.previewBox}>
            <h4>معاينة الصورة:</h4>
            <img src={previewImage} alt="معاينة" style={{ maxWidth: '100%', borderRadius: 8 }} />
          </div>
        )}
      </Form>
    </Modal>
  );
};

export default AddEditTenant;