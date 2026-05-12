import { useEffect, useState } from 'react';
import { Form, Input, InputNumber, Button, message, Spin, Modal, Select, Upload } from 'antd';
import { PlusOutlined, DeleteOutlined, UploadOutlined } from '@ant-design/icons';
import { useAuth } from '../hooks/useAuth';
import { supabase } from '../lib/supabase';
import { getCompanySettings, clearSettingsCache, CompanySettings } from '../lib/companySettings';

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
  const [logoUrl, setLogoUrl] = useState<string | null>(null);
  const [logoUploading, setLogoUploading] = useState(false);

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
      setLogoUrl(s.logo_url || null);

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

  const handleLogoUpload = async (file: File) => {
    try {
      setLogoUploading(true);
      const ext = file.name.split('.').pop();
      const fileName = `logo-${Date.now()}.${ext}`;
      const { error } = await supabase.storage.from('logos').upload(fileName, file);
      if (error) throw error;

      const { data: urlData } = supabase.storage.from('logos').getPublicUrl(fileName);
      const publicUrl = urlData.publicUrl;

      const { data: existing } = await supabase
        .from('company_settings')
        .select('id')
        .limit(1)
        .single();

      if (existing) {
        await supabase.from('company_settings').update({ logo_url: publicUrl }).eq('id', existing.id);
      }

      clearSettingsCache();
      setLogoUrl(publicUrl);
      message.success('تم رفع الشعار');
    } catch (err: any) {
      message.error(err.message || 'فشل رفع الشعار');
    } finally {
      setLogoUploading(false);
    }
    return false;
  };

  const handleRemoveLogo = async () => {
    try {
      const { data: existing } = await supabase
        .from('company_settings')
        .select('id')
        .limit(1)
        .single();

      if (existing) {
        await supabase.from('company_settings').update({ logo_url: null }).eq('id', existing.id);
      }

      clearSettingsCache();
      setLogoUrl(null);
      message.success('تم إزالة الشعار');
    } catch (err: any) {
      message.error(err.message || 'فشل إزالة الشعار');
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
      <div className="flex items-center justify-center h-64">
        <div className="animate-pulse flex flex-col items-center gap-4">
          <div className="w-12 h-12 rounded-full bg-primary/20"></div>
          <div className="h-4 w-40 bg-surface-container-highest rounded"></div>
        </div>
      </div>
    );
  }

  if (!isAdmin) {
    return (
      <div className="space-y-6">
        <div>
          <h2 className="font-headline-lg text-headline-lg font-bold text-primary">الإعدادات</h2>
          <p className="text-on-surface-variant font-body-md mt-1">إعدادات النظام</p>
        </div>
        <div className="bg-white rounded-xl border border-outline-variant p-12 text-center">
          <span className="material-symbols-outlined text-5xl text-outline-variant mb-4">lock</span>
          <p className="text-on-surface-variant">ليس لديك صلاحية الوصول إلى هذه الصفحة. هذه الصفحة مخصصة للمدير فقط.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h2 className="font-headline-lg text-headline-lg font-bold text-primary">الإعدادات</h2>
        <p className="text-on-surface-variant font-body-md mt-1">إعدادات الشركة والمستخدمين</p>
      </div>

      {/* Company Info */}
      <div className="bg-white rounded-xl border border-outline-variant overflow-hidden">
        <div className="px-card-padding py-4 border-b border-outline-variant bg-surface-container-low">
          <h3 className="font-headline-md text-headline-md text-on-surface flex items-center gap-2">
            <span className="material-symbols-outlined text-primary">business</span>
            بيانات الشركة
          </h3>
        </div>
        <div className="p-card-padding">
          <Form
            form={form}
            layout="vertical"
            onFinish={handleSaveSettings}
            initialValues={{ vat_rate: 15, notification_days_before_expiry: 90 }}
          >
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Form.Item label="اسم الشركة (عربي)" name="company_name_ar" rules={[{ required: true, message: 'الاسم مطلوب' }]}>
                <Input placeholder="شركة عقارات للإدارة والتأجير" className="rounded-lg" />
              </Form.Item>
              <Form.Item label="اسم الشركة (إنجليزي)" name="company_name_en">
                <Input placeholder="Real Estate Management Co." className="rounded-lg" />
              </Form.Item>
              <Form.Item label="الرقم الضريبي (VAT)" name="vat_number" rules={[{ required: true, message: 'الرقم الضريبي مطلوب' }]}>
                <Input placeholder="310123456700003" className="rounded-lg" />
              </Form.Item>
              <Form.Item label="عنوان الشركة" name="company_address">
                <Input placeholder="الرياض، المملكة العربية السعودية" className="rounded-lg" />
              </Form.Item>
            </div>
            {/* Logo upload */}
            <div className="mt-4 mb-4">
              <label className="text-label-sm font-medium text-on-surface mb-2 block">شعار الشركة</label>
              <div className="flex items-center gap-4">
                {logoUrl ? (
                  <div className="relative">
                    <img src={logoUrl} alt="شعار الشركة" className="h-16 w-auto rounded-lg border border-outline-variant object-contain" />
                    <button
                      type="button"
                      onClick={handleRemoveLogo}
                      className="absolute -top-2 -right-2 w-5 h-5 bg-error text-white rounded-full flex items-center justify-center text-xs hover:bg-error/80 transition-colors"
                    >
                      x
                    </button>
                  </div>
                ) : (
                  <div className="w-16 h-16 bg-surface-container-highest rounded-lg flex items-center justify-center text-on-surface-variant text-lg border border-outline-variant">
                    ?
                  </div>
                )}
                <Upload
                  accept="image/*"
                  showUploadList={false}
                  beforeUpload={(file) => { handleLogoUpload(file); return false; }}
                >
                  <button
                    type="button"
                    disabled={logoUploading}
                    className="border border-outline-variant rounded-lg px-4 py-2 font-label-md flex items-center gap-2 hover:bg-surface-container-low transition-colors disabled:opacity-50"
                  >
                    <UploadOutlined />
                    {logoUploading ? 'جاري الرفع...' : 'رفع شعار'}
                  </button>
                </Upload>
              </div>
            </div>
            <button
              type="submit"
              disabled={saving}
              className="mt-2 bg-primary text-on-primary px-6 py-2.5 rounded-xl font-label-md flex items-center gap-2 hover:opacity-90 active:scale-95 transition-all disabled:opacity-50"
            >
              <span className="material-symbols-outlined text-[18px]">save</span>
              {saving ? 'جاري الحفظ...' : 'حفظ بيانات الشركة'}
            </button>
          </Form>
        </div>
      </div>

      {/* VAT & Notifications */}
      <div className="bg-white rounded-xl border border-outline-variant overflow-hidden">
        <div className="px-card-padding py-4 border-b border-outline-variant bg-surface-container-low">
          <h3 className="font-headline-md text-headline-md text-on-surface flex items-center gap-2">
            <span className="material-symbols-outlined text-primary">percent</span>
            إعدادات VAT والإشعارات
          </h3>
        </div>
        <div className="p-card-padding">
          <Form
            layout="vertical"
            onFinish={handleSaveSettings}
            initialValues={{
              vat_rate: settings ? settings.vat_rate * 100 : 15,
              notification_days_before_expiry: settings?.notification_days_before_expiry || 90,
            }}
          >
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Form.Item label="نسبة VAT (%)" name="vat_rate" rules={[{ required: true, message: 'نسبة VAT مطلوبة' }]}>
                <InputNumber min={0} max={100} style={{ width: '100%' }} placeholder="15" className="rounded-lg" />
              </Form.Item>
              <Form.Item label="أيام التنبيه قبل انتهاء العقد" name="notification_days_before_expiry" rules={[{ required: true, message: 'هذا الحقل مطلوب' }]}>
                <InputNumber min={1} max={365} style={{ width: '100%' }} placeholder="90" className="rounded-lg" />
              </Form.Item>
            </div>
            <button
              type="submit"
              disabled={saving}
              className="mt-2 bg-primary text-on-primary px-6 py-2.5 rounded-xl font-label-md flex items-center gap-2 hover:opacity-90 active:scale-95 transition-all disabled:opacity-50"
            >
              <span className="material-symbols-outlined text-[18px]">save</span>
              {saving ? 'جاري الحفظ...' : 'حفظ الإعدادات'}
            </button>
          </Form>
        </div>
      </div>

      {/* User Management */}
      <div className="bg-white rounded-xl border border-outline-variant overflow-hidden">
        <div className="px-card-padding py-4 border-b border-outline-variant bg-surface-container-low flex items-center justify-between">
          <h3 className="font-headline-md text-headline-md text-on-surface flex items-center gap-2">
            <span className="material-symbols-outlined text-primary">group</span>
            إدارة المستخدمين
          </h3>
          <button
            onClick={() => setAddUserModal(true)}
            className="bg-primary text-on-primary px-4 py-2 rounded-xl font-label-md flex items-center gap-2 hover:opacity-90 active:scale-95 transition-all"
          >
            <span className="material-symbols-outlined text-[18px]">add</span>
            إضافة مستخدم
          </button>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-right">
            <thead className="bg-surface-container-low text-on-surface-variant border-b border-outline-variant font-label-md">
              <tr>
                <th className="px-6 py-4 font-bold">الاسم</th>
                <th className="px-6 py-4 font-bold">الدور</th>
                <th className="px-6 py-4 font-bold">تاريخ الإنشاء</th>
                <th className="px-6 py-4 font-bold text-left">إجراءات</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-outline-variant">
              {profiles.map((profile: any) => (
                <tr key={profile.id} className="hover:bg-surface-container-lowest transition-colors">
                  <td className="px-6 py-4 font-bold text-on-surface">{profile.full_name}</td>
                  <td className="px-6 py-4">
                    <span className={`px-3 py-1 rounded-full text-label-sm font-bold border ${
                      profile.role === 'admin'
                        ? 'bg-amber-100 text-amber-700 border-amber-200'
                        : 'bg-primary/10 text-primary border-primary/20'
                    }`}>
                      {profile.role === 'admin' ? 'مدير' : 'محاسب'}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-on-surface-variant">
                    {new Date(profile.created_at).toLocaleDateString('ar-SA')}
                  </td>
                  <td className="px-6 py-4 text-left">
                    {profile.role !== 'admin' && (
                      <button
                        onClick={() => handleDeleteProfile(profile)}
                        className="p-2 text-error hover:bg-error-container/20 rounded-lg transition-colors"
                        title="حذف"
                      >
                        <span className="material-symbols-outlined text-[20px]">delete</span>
                      </button>
                    )}
                  </td>
                </tr>
              ))}
              {profiles.length === 0 && (
                <tr>
                  <td colSpan={4} className="px-6 py-8 text-center text-on-surface-variant">
                    لا يوجد مستخدمين
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add User Modal */}
      <Modal
        title="إضافة مستخدم جديد"
        open={addUserModal}
        onCancel={() => setAddUserModal(false)}
        footer={null}
        destroyOnClose
      >
        <Form
          form={addUserForm}
          layout="vertical"
          onFinish={handleAddUser}
        >
          <Form.Item label="الاسم الكامل" name="full_name" rules={[{ required: true, message: 'الاسم مطلوب' }]}>
            <Input placeholder="أحمد محمد" className="rounded-lg" />
          </Form.Item>
          <Form.Item label="البريد الإلكتروني" name="email" rules={[{ required: true, message: 'البريد مطلوب' }, { type: 'email', message: 'البريد غير صحيح' }]}>
            <Input placeholder="ahmed@example.com" className="rounded-lg" />
          </Form.Item>
          <Form.Item label="كلمة المرور" name="password" rules={[{ required: true, min: 6, message: 'كلمة المرور مطلوبة (6 أحرف على الأقل)' }]}>
            <Input.Password placeholder="******" className="rounded-lg" />
          </Form.Item>
          <Form.Item label="الدور" name="role" rules={[{ required: true, message: 'اختر الدور' }]}>
            <Select className="rounded-lg">
              <Select.Option value="accountant">محاسب</Select.Option>
              <Select.Option value="admin">مدير</Select.Option>
            </Select>
          </Form.Item>
          <button
            type="submit"
            disabled={addUserLoading}
            className="w-full bg-primary text-on-primary py-3 rounded-xl font-label-md flex items-center justify-center gap-2 hover:opacity-90 active:scale-95 transition-all disabled:opacity-50"
          >
            <span className="material-symbols-outlined text-[18px]">person_add</span>
            {addUserLoading ? 'جاري الإضافة...' : 'إضافة المستخدم'}
          </button>
        </Form>
      </Modal>
    </div>
  );
};

export default SettingsPage;
