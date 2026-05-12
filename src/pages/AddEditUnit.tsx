import React, { useState, useEffect } from 'react';
import { Form, Input, InputNumber, Select, Upload, Button, message, Modal, Checkbox } from 'antd';
import { PlusOutlined, CameraOutlined, FileTextOutlined, CheckCircleOutlined } from '@ant-design/icons';
import { useAuth } from '../hooks/useAuth';
import { supabase } from '../lib/supabase';
import styles from './AddEditUnit.module.css';

const { Option } = Select;
const { Dragger } = Upload;

type AddEditUnitProps = {
  unitId?: string;
  initialPropertyId?: string;
  onClose: () => void;
  visible: boolean;
};

const AddEditUnit = ({ unitId, initialPropertyId, onClose, visible }: AddEditUnitProps) => {
  const { user } = useAuth();
  const [form] = Form.useForm();
  const [loading, setLoading] = useState(false);
  const [unitData, setUnitData] = useState({
    property_id: '',
    unit_number: '',
    floor: null as number | null,
    area_sqm: 0,
    type: 'apartment' as 'apartment' | 'office' | 'shop' | 'villa',
    status: 'available' as 'available' | 'rented' | 'maintenance',
    rent_price: 0,
    is_commercial: false
  });
  const [previewImage, setPreviewImage] = useState<string | null>(null);
  const [properties, setProperties] = useState<Array<{id: string; name_ar: string}>>([]);

  useEffect(() => {
    fetchProperties();
    if (unitId) {
      fetchUnitDetails();
    }
    if (initialPropertyId) {
      form.setFieldValue('property_id', initialPropertyId);
    }
  }, [unitId, initialPropertyId]);

  const fetchProperties = async () => {
    try {
      const { data, error } = await supabase
        .from('properties')
        .select('id, name_ar')
        .order('name_ar');
      
      if (error) throw error;
      
      setProperties(data);
    } catch (error) {
      console.error('Error fetching properties:', error);
    }
  };

  const fetchUnitDetails = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('units')
        .select('*')
        .eq('id', unitId)
        .single();
      
      if (error) throw error;
      
      setUnitData(data);
      form.setFieldsValue(data);
    } catch (error) {
      console.error('Error fetching unit details:', error);
      message.error('فشل تحميل بيانات الوحدة');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (values: any) => {
    try {
      setLoading(true);
      
      const { image_file, ...dbValues } = values;
      
      let result;
      if (unitId) {
        result = await supabase
          .from('units')
          .update(dbValues)
          .eq('id', unitId);
      } else {
        result = await supabase
          .from('units')
          .insert([dbValues]);
      }
      
      if (result.error) throw result.error;

      if (!unitId) {
        await supabase.rpc('increment_property_units', { prop_id: values.property_id });
      }
      
      message.success(unitId ? 'تم تعديل الوحدة بنجاح' : 'تم إضافة الوحدة بنجاح');
      onClose();
    } catch (error: any) {
      console.error('Error saving unit:', error);
      message.error(error.message || 'فشل حفظ الوحدة');
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
      title={unitId ? 'تعديل الوحدة' : 'إضافة وحدة جديدة'}
      visible={visible}
      onCancel={onClose}
      footer={[
        <Button key="back" onClick={onClose}>
          إلغاء
        </Button>,
        <Button key="submit" type="primary" loading={loading} onClick={() => form.submit()}>
          {unitId ? 'حفظ التعديلات' : 'إضافة الوحدة'}
        </Button>
      ]}
      width={720}
      style={{ top: 20 }}
    >
      <Form
        form={form}
        layout="vertical"
        name="unit_form"
        initialValues={unitData}
        onFinish={handleSubmit}
        style={{ marginBottom: 24 }}
      >
        <Form.Item
          label="العقار"
          name="property_id"
          rules={[{ required: true, message: 'يرجى اختيار العقار' }]}
        >
          <Select>
            <Option value="">اختر عقار</Option>
            {properties.map(prop => (
              <Option key={prop.id} value={prop.id}>
                {prop.name_ar}
              </Option>
            ))}
          </Select>
        </Form.Item>

        <Form.Item
          label="رقم الوحدة"
          name="unit_number"
          rules={[{ required: true, message: 'يرجى إدخال رقم الوحدة' }]}
        >
          <Input
            placeholder="أدخل رقم الوحدة"
            style={{ borderRadius: 8 }}
          />
        </Form.Item>

        <Form.Item
          label="الطابق"
          name="floor"
        >
          <InputNumber
            placeholder="أدخل رقم الطابق (اختياري)"
            style={{ width: '100%', borderRadius: 8 }}
          />
        </Form.Item>

        <Form.Item
          label="المساحة (م²)"
          name="area_sqm"
          rules={[{ required: true, type: 'number', min: 0, message: 'يرجى إدخال المساحة (رقم أكبر من أو يساوي صفر)' }]}
        >
          <InputNumber
            min={0}
            placeholder="أدخل المساحة بالمتر المربع"
            style={{ width: '100%', borderRadius: 8 }}
          />
        </Form.Item>

        <Form.Item
          label="نوع الوحدة"
          name="type"
          initialValue="apartment"
        >
          <Select>
            <Option value="apartment">شقة</Option>
            <Option value="office">مكتب</Option>
            <Option value="shop">محل</Option>
            <Option value="villa">فيلا</Option>
          </Select>
        </Form.Item>

        <Form.Item
          label="حالة الوحدة"
          name="status"
          initialValue="available"
        >
          <Select>
            <Option value="available">متاح</Option>
            <Option value="rented">مؤجرة</Option>
            <Option value="maintenance">تحت الصيانة</Option>
          </Select>
        </Form.Item>

        <Form.Item
          label="الإيجار الشهري (ر.س)"
          name="rent_price"
          rules={[{ required: true, type: 'number', min: 0, message: 'يرجى إدخال الإيجار (رقم أكبر من أو يساوي صفر)' }]}
        >
          <InputNumber
            min={0}
            placeholder="أدخل الإيجار الشهري"
            style={{ width: '100%', borderRadius: 8 }}
          />
        </Form.Item>

        <Form.Item
          label="الوحدة تجارية (تؤثر على VAT)"
          name="is_commercial"
          valuePropName="checked"
        >
          <Checkbox>الوحدة تجارية</Checkbox>
        </Form.Item>

        <Form.Item
          label="صورة الوحدة"
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

export default AddEditUnit;