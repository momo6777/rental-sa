import { useEffect, useState } from 'react';
import {
  Card, Form, Input, InputNumber, Button, message, Spin, Table, Tag, Modal, Select, Upload,
} from 'antd';
import {
  SaveOutlined, PlusOutlined, UserOutlined, BankOutlined,
  PercentageOutlined, BellOutlined, UploadOutlined, DeleteOutlined,
} from '@ant-design/icons';
import { useAuth } from '../hooks/useAuth';
import { supabase } from '../lib/supabase';
import { getCompanySettings, clearSettingsCache, CompanySettings } from '../lib/companySettings';
import styles from './Settings.module.css';

const SettingsPage = () => {
  const { user } = useAuth();
  const [form] = Form.useForm();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [settings, setSettings] = useState<CompanySettings | null>(null);
  const [profiles, setProfiles] = useState<any[]>([]);
  const [addUserModal, setAddUserModal] = useState(false);
  const [addUserForm] = Form.useForm();
  const [addUserLoading, setAddUserLoading] = useState(false);

  const isAdmin = user?.role === 'admin';

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      const s = await getCompanySettings();
      setSettings(s);

      form.setFieldsValue({
        company_name_ar: s.company_name_ar,
        company_name_en: s.company_name_en || '',
        vat_number: s.vat_number,
        company_address: s.company_address || '',
        vat_rate: s.vat_rate * 100,
        notification_days_before_expiry: s.notification_days_before_expiry,
      });

      const { data: profilesData } = await supabase
        .from('profiles')
        .select('*')
        .order('created_at', { ascending: false });

      setProfiles(profilesData || []);
    } catch (err: any) {
      message.error('فشل تحميل الإعدادات');
    } finally {
      setLoading(false);
    }
  };

  const handleSaveSettings = async (values: any) => {
    if (!isAdmin) return;
    try {
      setSaving(true);

      const payload = {
        company_name_ar: values.company_name_ar,
        company_name_en: values.company_name_en || null,
        vat_number: values.vat_number,
        company_address: values.company_address || null,
        vat_rate: (values.vat_rate || 15) / 100,
        notification_days_before_expiry: values.notification_days_before_expiry || 90,
      };

      const { data: existing } = await supabase
        .from('company_settings')
        .select('id')
        .limit(1)
        .single();

      if (existing) {
        await supabase.from('company_settings').update(payload).eq('id', existing.id);
      } else {
        await supabase.from('company_settings').insert([payload]);
      }

      clearSettingsCache();
      message.success('تم حفظ الإعدادات بنجاح');
    } catch (err: any) {
      message.error(err.message || 'فشل حفظ الإعدادات');
    } finally {
      setSaving(false);
    }
  };

  const handleAddUser = async (values: any) => {
    try {
      setAddUserLoading(true);

      const { data: authData, error: authError } = await supabase.auth.signUp({
        email: values.email,
        password: values.password,
      });

      if (authError) throw authError;
      if (!authData.user) throw new Error('فشل إنشاء المستخدم');

      const { error: profileError } = await supabase.from('profiles').insert([{
        id: authData.user.id,
        user_id: authData.user.id,
        full_name: values.full_name,
        role: values.role,
      }]);

      if (profileError) throw profileError;

      message.success(`تم إضافة المستخدم ${values.full_name} بنجاح`);
      setAddUserModal(false);
      addUserForm.resetFields();
      loadData();
    } catch (err: any) {
      message.error(err.message || 'فشل إضافة المستخدم');
    } finally {
      setAddUserLoading(false);
    }
  };

  const handleDeleteProfile = async (profile: any) => {
    try {
      const { error } = await supabase.from('profiles').delete().eq('id', profile.id);
      if (error) throw error;
      message.success('تم حذف المستخدم');
      loadData();
    } catch (err: any) {
      message.error(err.message || 'فشل حذف المستخدم');
    }
  };

  if (loading) {
    return (
      <div className={styles.settingsPage}>
        <div className={styles.loadingContainer}>
          <Spin tip="جاري تحميل الإعدادات..." />
        </div>
      </div>
    );
  }

  const profileColumns = [
    { title: 'الاسم', dataIndex: 'full_name', key: 'full_name' },
    {
      title: 'الدور', dataIndex: 'role', key: 'role',
      render: (role: string) => (
        <Tag color={role === 'admin' ? 'gold' : 'blue'}>
          {role === 'admin' ? 'مدير' : 'محاسب'}
        </Tag>
      ),
    },
    {
      title: 'تاريخ الإنشاء', dataIndex: 'created_at', key: 'created_at',
      render: (date: string) => new Date(date).toLocaleDateString('ar-SA'),
    },
    {
      title: '', key: 'actions',
      render: (_: any, record: any) => (
        record.role !== 'admin' ? (
          <Button size="small" danger icon={<DeleteOutlined />} onClick={() => handleDeleteProfile(record)} />
        ) : null
      ),
    },
  ];

  return (
    <div className={styles.settingsPage}>
      <div className={styles.pageHeader}>
        <h1>الإعدادات</h1>
      </div>

      {!isAdmin ? (
        <Card className={styles.card}>
          <p className={styles.accessDenied}>ليس لديك صلاحية الوصول إلى هذه الصفحة. هذه الصفحة مخصصة للمدير فقط.</p>
        </Card>
      ) : (
        <>
          {/* Company Info */}
          <Card
            className={styles.card}
            title={<span><BankOutlined /> بيانات الشركة</span>}
          >
            <Form
              form={form}
              layout="vertical"
              onFinish={handleSaveSettings}
              initialValues={{
                vat_rate: 15,
                notification_days_before_expiry: 90,
              }}
            >
              <div className={styles.formGrid}>
                <Form.Item
                  label="اسم الشركة (عربي)"
                  name="company_name_ar"
                  rules={[{ required: true, message: 'الاسم مطلوب' }]}
                >
                  <Input placeholder="شركة عقارات للإدارة والتأجير" />
                </Form.Item>
                <Form.Item label="اسم الشركة (إنجليزي)" name="company_name_en">
                  <Input placeholder="Real Estate Management Co." />
                </Form.Item>
                <Form.Item
                  label="الرقم الضريبي (VAT)"
                  name="vat_number"
                  rules={[{ required: true, message: 'الرقم الضريبي مطلوب' }]}
                >
                  <Input placeholder="310123456700003" />
                </Form.Item>
                <Form.Item label="عنوان الشركة" name="company_address">
                  <Input placeholder="الرياض، المملكة العربية السعودية" />
                </Form.Item>
              </div>
              <Button type="primary" htmlType="submit" loading={saving} icon={<SaveOutlined />}>
                حفظ بيانات الشركة
              </Button>
            </Form>
          </Card>

          {/* VAT & Notifications */}
          <Card
            className={styles.card}
            title={<span><PercentageOutlined /> إعدادات VAT والإشعارات</span>}
          >
            <Form
              layout="vertical"
              onFinish={handleSaveSettings}
              initialValues={{
                vat_rate: settings ? settings.vat_rate * 100 : 15,
                notification_days_before_expiry: settings?.notification_days_before_expiry || 90,
              }}
            >
              <div className={styles.formGrid}>
                <Form.Item
                  label="نسبة VAT (%)"
                  name="vat_rate"
                  rules={[{ required: true, message: 'نسبة VAT مطلوبة' }]}
                >
                  <InputNumber min={0} max={100} style={{ width: '100%' }} placeholder="15" />
                </Form.Item>
                <Form.Item
                  label="أيام التنبيه قبل انتهاء العقد"
                  name="notification_days_before_expiry"
                  rules={[{ required: true, message: 'هذا الحقل مطلوب' }]}
                >
                  <InputNumber min={1} max={365} style={{ width: '100%' }} placeholder="90" />
                </Form.Item>
              </div>
              <Button type="primary" htmlType="submit" loading={saving} icon={<SaveOutlined />}>
                حفظ الإعدادات
              </Button>
            </Form>
          </Card>

          {/* User Management */}
          <Card
            className={styles.card}
            title={<span><UserOutlined /> إدارة المستخدمين</span>}
            extra={
              <Button type="primary" icon={<PlusOutlined />} onClick={() => setAddUserModal(true)}>
                إضافة مستخدم
              </Button>
            }
          >
            <Table
              columns={profileColumns}
              dataSource={profiles}
              rowKey="id"
              pagination={false}
            />
          </Card>

          {/* Add User Modal */}
          <Modal
            title="إضافة مستخدم جديد"
            open={addUserModal}
            onCancel={() => setAddUserModal(false)}
            footer={null}
          >
            <Form
              form={addUserForm}
              layout="vertical"
              onFinish={handleAddUser}
            >
              <Form.Item
                label="الاسم الكامل"
                name="full_name"
                rules={[{ required: true, message: 'الاسم مطلوب' }]}
              >
                <Input placeholder="أحمد محمد" />
              </Form.Item>
              <Form.Item
                label="البريد الإلكتروني"
                name="email"
                rules={[
                  { required: true, message: 'البريد مطلوب' },
                  { type: 'email', message: 'البريد غير صحيح' },
                ]}
              >
                <Input placeholder="ahmed@example.com" />
              </Form.Item>
              <Form.Item
                label="كلمة المرور"
                name="password"
                rules={[{ required: true, min: 6, message: 'كلمة المرور مطلوبة (6 أحرف على الأقل)' }]}
              >
                <Input.Password placeholder="******" />
              </Form.Item>
              <Form.Item
                label="الدور"
                name="role"
                rules={[{ required: true, message: 'اختر الدور' }]}
              >
                <Select>
                  <Select.Option value="accountant">محاسب</Select.Option>
                  <Select.Option value="admin">مدير</Select.Option>
                </Select>
              </Form.Item>
              <Button type="primary" htmlType="submit" loading={addUserLoading} icon={<PlusOutlined />}>
                إضافة المستخدم
              </Button>
            </Form>
          </Modal>
        </>
      )}
    </div>
  );
};

export default SettingsPage;
