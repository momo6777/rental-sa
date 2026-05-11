import React, { useState, useEffect } from 'react';
import { Form, Input, Select, DatePicker, Upload, Button, message, Modal } from 'antd';
import { PlusOutlined, CameraOutlined, FileTextOutlined, CheckCircleOutlined } from '@ant-design/icons';
import { useAuth } from '../hooks/useAuth';
import { supabase } from '../lib/supabase';
import styles from './AddEditProperty.module.css';

const { Option } = Select;
const { Dragger } = Upload;

type AddEditPropertyProps = {
  propertyId?: string;
  onClose: () => void;
  visible: boolean;
};

const AddEditProperty = ({ propertyId, onClose, visible }: AddEditPropertyProps) => {
  const { user } = useAuth();
  const [form] = Form.useForm();
  const [loading, setLoading] = useState(false);
  const [propertyData, setPropertyData] = useState({
    name_ar: '',
    name_en: '',
    type: 'residential' as 'residential' | 'commercial',
    city: '',
    district: '',
    parcel_number: '',
    deed_number: '',
    total_units: 0
  });
  const [previewImage, setPreviewImage] = useState<string | null>(null);
  const [previewDeed, setPreviewDeed] = useState<string | null>(null);
  const [isEditing, setIsEditing] = useState(!!propertyId);

  useEffect(() => {
    if (propertyId) {
      fetchPropertyDetails();
    }
  }, [propertyId]);

  const fetchPropertyDetails = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('properties')
        .select('*')
        .eq('id', propertyId)
        .single();
      
      if (error) throw error;
      
      setPropertyData(data);
    } catch (error) {
      console.error('Error fetching property details:', error);
      message.error('فشل تحميل بيانات العقار');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (values: any) => {
    try {
      setLoading(true);
      
      let result;
      if (isEditing) {
        result = await supabase
          .from('properties')
          .update(values)
          .eq('id', propertyId);
      } else {
        result = await supabase
          .from('properties')
          .insert([values]);
      }
      
      if (result.error) throw result.error;
      
      message.success(isEditing ? 'تم تعديل العقار بنجاح' : 'تم إضافة العقار بنجاح');
      onClose();
    } catch (error: any) {
      console.error('Error saving property:', error);
      message.error(error.message || 'فشل حفظ العقار');
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

  const handleDeedChange = (info: any) => {
    if (info.file.status === 'done') {
      // In a real app, you would upload to Supabase Storage first
      setPreviewDeed(info.file.url || URL.createObjectURL(info.file.originFileObj));
    } else if (info.file.status === 'error') {
      message.error('فشل رفع وثيقة الصك');
    }
  };

  if (!visible) return null;

  return (
    <Modal
      title={isEditing ? 'تعديل العقار' : 'إضافة عقار جديد'}
      visible={visible}
      onCancel={onClose}
      footer={[
        <Button key="back" onClick={onClose}>
          إلغاء
        </Button>,
        <Button key="submit" type="primary" loading={loading} onClick={() => form.submit()}>
          {isEditing ? 'حفظ التعديلات' : 'إضافة العقار'}
        </Button>
      ]}
      width={720}
      style={{ top: 20 }}
    >
      <Form
        form={form}
        layout="vertical"
        name="property_form"
        initialValues={propertyData}
        onFinish={handleSubmit}
        style={{ marginBottom: 24 }}
      >
        <Form.Item
          label="اسم العقار (عربي)"
          name="name_ar"
          rules={[{ required: true, message: 'يرجى إدخال اسم العقار بالعربية' }]}
        >
          <Input
            placeholder="أدخل اسم العقار بالعربية"
            style={{ borderRadius: 8 }}
          />
        </Form.Item>

        <Form.Item
          label="اسم العقار (إنجليزي)"
          name="name_en"
        >
          <Input
            placeholder="أدخل اسم العقار بالإنجليزية (اختياري)"
            style={{ borderRadius: 8 }}
          />
        </Form.Item>

        <Form.Item
          label="نوع العقار"
          name="type"
          initialValue="residential"
        >
          <Select>
            <Option value="residential">سكني</Option>
            <Option value="commercial">تجاري</Option>
          </Select>
        </Form.Item>

        <Form.Item
          label="المدينة"
          name="city"
          rules={[{ required: true, message: 'يرجى إدخال المدينة' }]}
        >
          <Input
            placeholder="أدخل المدينة"
            style={{ borderRadius: 8 }}
          />
        </Form.Item>

        <Form.Item
          label="المنطقة"
          name="district"
          rules={[{ required: true, message: 'يرجى إدخال المنطقة' }]}
        >
          <Input
            placeholder="أدخل المنطقة"
            style={{ borderRadius: 8 }}
          />
        </Form.Item>

        <Form.Item
          label="عدد الوحدات"
          name="total_units"
          rules={[{ required: true, type: 'number', min: 1, message: 'يرجى إدخال عدد الوحدات (رقم أكبر من صفر)' }]}
        >
          <Input
            type="number"
            placeholder="أدخل عدد الوحدات"
            style={{ borderRadius: 8 }}
          />
        </Form.Item>

        <Form.Item
          label="رقم parcel"
          name="parcel_number"
        >
          <Input
            placeholder="أدخل رقم parcel (اختياري)"
            style={{ borderRadius: 8 }}
          />
        </Form.Item>

        <Form.Item
          label="رقم الصك"
          name="deed_number"
        >
          <Input
            placeholder="أدخل رقم الصك (اختياري)"
            style={{ borderRadius: 8 }}
          />
        </Form.Item>

        <Form.Item
          label="صورة العقار"
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

        <Form.Item
          label="وثيقة الصك"
          name="deed_file"
          extra="الحد الأقصى للحجم: 10 ميجابايت, بصيغة PDF"
        >
          <Dragger>
            <p className={styles.uploadText}>
              <FileTextOutlined style={{ fontSize: 24, marginBottom: 8 }} />
              <br />
              انقر لرفع وثيقة الصك أو اسحبها هنا
            </p>
          </Dragger>
        </Form.Item>

        {previewDeed && (
          <div className={styles.previewBox}>
            <h4>معاينة وثيقة الصك:</h4>
            <CheckCircleOutlined style={{ fontSize: 32, color: '#52c41a', marginBottom: 8 }} />
            <p>تم رفع الوثيقة بنجاح</p>
          </div>
        )}
      </Form>
    </Modal>
  );
};

export default AddEditProperty;