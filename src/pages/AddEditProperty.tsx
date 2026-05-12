import React, { useState, useEffect } from 'react';
import { Form, Input, InputNumber, Select, Upload, Button, message, Modal } from 'antd';
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
  const [propertyData, setPropertyData] = useState<Record<string, any>>({
    name_ar: '',
    name_en: '',
    type: 'residential',
    city: '',
    district: '',
    parcel_number: '',
    deed_number: '',
    total_units: 0,
    image_url: '',
    deed_url: '',
  });
  const [previewImage, setPreviewImage] = useState<string | null>(null);
  const [previewDeed, setPreviewDeed] = useState<string | null>(null);
  const [uploadingImage, setUploadingImage] = useState(false);
  const [uploadingDeed, setUploadingDeed] = useState(false);
  const isEditing = !!propertyId;

  useEffect(() => {
    if (propertyId) {
      fetchPropertyDetails();
    } else {
      form.resetFields();
      setPropertyData({
        name_ar: '', name_en: '', type: 'residential',
        city: '', district: '', parcel_number: '', deed_number: '', total_units: 0,
        image_url: '', deed_url: '',
      });
      setPreviewImage(null);
      setPreviewDeed(null);
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
      form.setFieldsValue(data);
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
      
      const { image_file, deed_file, ...dbValues } = values;
      
      let result;
      if (isEditing) {
        result = await supabase
          .from('properties')
          .update(dbValues)
          .eq('id', propertyId);
      } else {
        result = await supabase
          .from('properties')
          .insert([dbValues]);
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

  const uploadFile = async (file: File, folder: string): Promise<string | null> => {
    try {
      const ext = file.name.split('.').pop();
      const fileName = `${folder}/${Date.now()}.${ext}`;
      const { data, error } = await supabase.storage
        .from('property_images')
        .upload(fileName, file);
      if (error) throw error;
      const { data: urlData } = supabase.storage
        .from('property_images')
        .getPublicUrl(fileName);
      return urlData.publicUrl;
    } catch (err: any) {
      message.error(err.message || 'فشل رفع الملف');
      return null;
    }
  };

  const handleImageUpload = async (file: File) => {
    setUploadingImage(true);
    const url = await uploadFile(file, 'images');
    if (url) {
      setPreviewImage(url);
      form.setFieldValue('image_url', url);
    }
    setUploadingImage(false);
    return false;
  };

  const handleDeedUpload = async (file: File) => {
    setUploadingDeed(true);
    const url = await uploadFile(file, 'deeds');
    if (url) {
      setPreviewDeed(url);
      form.setFieldValue('deed_url', url);
    }
    setUploadingDeed(false);
    return false;
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
          <InputNumber
            min={1}
            placeholder="أدخل عدد الوحدات"
            style={{ width: '100%', borderRadius: 8 }}
          />
        </Form.Item>

        <Form.Item
          label="رقم القطعة"
          name="parcel_number"
        >
          <Input
            placeholder="أدخل رقم القطعة (اختياري)"
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

        <Form.Item name="image_url" hidden><Input /></Form.Item>
        <Form.Item
          label="صورة العقار"
          extra="الحد الأقصى للحجم: 5 ميجابايت"
        >
          <Upload
            accept="image/*"
            showUploadList={false}
            beforeUpload={handleImageUpload}
          >
            <div className="border border-dashed border-outline-variant rounded-xl p-6 text-center cursor-pointer hover:bg-surface-container-low transition-colors">
              <CameraOutlined style={{ fontSize: 24, color: '#757682', marginBottom: 8 }} />
              <br />
              <span className="text-body-sm text-on-surface-variant">
                {uploadingImage ? 'جاري الرفع...' : 'انقر لرفع الصورة أو اسحبها هنا'}
              </span>
            </div>
          </Upload>
        </Form.Item>

        {(previewImage || propertyData.image_url) && (
          <div className="bg-surface-container-low rounded-xl p-4 mb-4">
            <h4 className="font-label-md mb-2">معاينة الصورة:</h4>
            <img src={previewImage || propertyData.image_url} alt="معاينة" style={{ maxWidth: '100%', borderRadius: 8 }} />
          </div>
        )}

        <Form.Item name="deed_url" hidden><Input /></Form.Item>
        <Form.Item
          label="وثيقة الصك"
          extra="الحد الأقصى للحجم: 10 ميجابايت, بصيغة PDF"
        >
          <Upload
            accept=".pdf,image/*"
            showUploadList={false}
            beforeUpload={handleDeedUpload}
          >
            <div className="border border-dashed border-outline-variant rounded-xl p-6 text-center cursor-pointer hover:bg-surface-container-low transition-colors">
              <FileTextOutlined style={{ fontSize: 24, color: '#757682', marginBottom: 8 }} />
              <br />
              <span className="text-body-sm text-on-surface-variant">
                {uploadingDeed ? 'جاري الرفع...' : 'انقر لرفع وثيقة الصك أو اسحبها هنا'}
              </span>
            </div>
          </Upload>
        </Form.Item>

        {(previewDeed || propertyData.deed_url) && (
          <div className="bg-surface-container-low rounded-xl p-4 mb-4">
            <h4 className="font-label-md mb-2">تم رفع وثيقة الصك بنجاح</h4>
            <CheckCircleOutlined style={{ fontSize: 32, color: '#52c41a' }} />
          </div>
        )}
      </Form>
    </Modal>
  );
};

export default AddEditProperty;