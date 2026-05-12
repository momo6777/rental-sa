import { useEffect, useState } from 'react';
import { Modal, Form, Input, Select, Upload, DatePicker, message } from 'antd';
import { UploadOutlined } from '@ant-design/icons';
import { useAuth } from '../hooks/useAuth';
import { supabase } from '../lib/supabase';
import { PaymentVoucherPDF, PaymentVoucherData } from '../components/PaymentVoucherPDF';
import dayjs from 'dayjs';

const { Option } = Select;
const { TextArea } = Input;

const STATUS_FLOW: Record<string, string[]> = {
  open: ['in_progress'],
  in_progress: ['completed'],
  completed: [],
};

const priorityColors: Record<string, string> = {
  low: 'bg-emerald-100 text-emerald-600 border-emerald-200',
  medium: 'bg-blue-100 text-blue-600 border-blue-200',
  high: 'bg-orange-100 text-orange-600 border-orange-200',
  urgent: 'bg-red-100 text-red-600 border-red-200',
};

const priorityLabels: Record<string, string> = {
  low: 'منخفضة',
  medium: 'متوسطة',
  high: 'عالية',
  urgent: 'عاجلة',
};

const statusColors: Record<string, string> = {
  open: 'bg-amber-100 text-amber-600 border-amber-200',
  in_progress: 'bg-blue-100 text-blue-600 border-blue-200',
  completed: 'bg-emerald-100 text-emerald-600 border-emerald-200',
};

const statusLabels: Record<string, string> = {
  open: 'مفتوح',
  in_progress: 'قيد التنفيذ',
  completed: 'مكتمل',
};

const MaintenancePage = () => {
  const { user } = useAuth();
  const isAdmin = user?.role === 'admin';
  const [requests, setRequests] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('');
  const [priorityFilter, setPriorityFilter] = useState<string>('');
  const [filtered, setFiltered] = useState<any[]>([]);
  const [modalVisible, setModalVisible] = useState(false);
  const [editingRequest, setEditingRequest] = useState<any>(null);
  const [units, setUnits] = useState<any[]>([]);
  const [saving, setSaving] = useState(false);
  const [form] = Form.useForm();
  const [uploading, setUploading] = useState(false);
  const [payModalVisible, setPayModalVisible] = useState(false);
  const [payRequest, setPayRequest] = useState<any>(null);
  const [voucherData, setVoucherData] = useState<PaymentVoucherData | null>(null);
  const [payForm] = Form.useForm();

  useEffect(() => {
    fetchRequests();
    fetchUnits();
  }, []);

  useEffect(() => {
    applyFilters();
  }, [requests, searchTerm, statusFilter, priorityFilter]);

  const fetchRequests = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('maintenance_requests')
        .select(`
          *,
          unit:units (unit_number, property:properties (name_ar))
        `)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setRequests(data || []);
    } catch (err: any) {
      message.error(err.message || 'فشل تحميل طلبات الصيانة');
    } finally {
      setLoading(false);
    }
  };

  const fetchUnits = async () => {
    const { data } = await supabase.from('units').select('id, unit_number, property:properties(name_ar)');
    setUnits(data || []);
  };

  const applyFilters = () => {
    let result = [...requests];
    const term = searchTerm.toLowerCase().trim();
    if (term) {
      result = result.filter(r =>
        r.title?.toLowerCase().includes(term) ||
        r.id?.toString().includes(term) ||
        r.unit?.unit_number?.toString().includes(term)
      );
    }
    if (statusFilter) result = result.filter(r => r.status === statusFilter);
    if (priorityFilter) result = result.filter(r => r.priority === priorityFilter);
    setFiltered(result);
  };

  const handleAdd = () => {
    setEditingRequest(null);
    form.resetFields();
    setModalVisible(true);
  };

  const handleEdit = (record: any) => {
    setEditingRequest(record);
    form.setFieldsValue({
      unit_id: record.unit_id,
      title: record.title,
      description: record.description,
      priority: record.priority,
      status: record.status,
      cost: record.cost,
    });
    setModalVisible(true);
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm('حذف الطلب؟')) return;
    try {
      const { error } = await supabase.from('maintenance_requests').delete().eq('id', id);
      if (error) throw error;
      message.success('تم حذف الطلب');
      fetchRequests();
    } catch (err: any) {
      message.error(err.message || 'فشل الحذف');
    }
  };

  const handleStatusChange = async (record: any, newStatus: string) => {
    try {
      const update: any = { status: newStatus };
      if (newStatus === 'completed') update.completed_at = new Date().toISOString();
      const { error } = await supabase.from('maintenance_requests').update(update).eq('id', record.id);
      if (error) throw error;
      message.success('تم تحديث الحالة');
      fetchRequests();
    } catch (err: any) {
      message.error(err.message || 'فشل تحديث الحالة');
    }
  };

  const handleSubmit = async (values: any) => {
    try {
      setSaving(true);
      const payload: any = {
        unit_id: values.unit_id,
        title: values.title,
        description: values.description,
        priority: values.priority,
        status: values.status || 'open',
        reported_by: user?.full_name || user?.email || 'system',
      };

      if (values.cost) payload.cost = Number(values.cost);
      if (values.image_url) payload.image_url = values.image_url;

      if (editingRequest) {
        if (values.status === 'completed') payload.completed_at = new Date().toISOString();
        const { error } = await supabase.from('maintenance_requests').update(payload).eq('id', editingRequest.id);
        if (error) throw error;
        message.success('تم تعديل طلب الصيانة');
      } else {
        const { error } = await supabase.from('maintenance_requests').insert([payload]);
        if (error) throw error;
        message.success('تم إضافة طلب الصيانة');
      }

      setModalVisible(false);
      fetchRequests();
    } catch (err: any) {
      message.error(err.message || 'فشل حفظ الطلب');
    } finally {
      setSaving(false);
    }
  };

  const handlePayOpen = (record: any) => {
    setPayRequest(record);
    setVoucherData(null);
    payForm.resetFields();
    payForm.setFieldsValue({
      payment_date: dayjs(),
      payment_method: 'cash',
      reference_number: `PV-${Date.now().toString(36).toUpperCase()}`,
    });
    setPayModalVisible(true);
  };

  const handlePayGenerate = (values: any) => {
    if (!payRequest) return;
    setVoucherData({
      requestId: payRequest.id,
      title: payRequest.title,
      description: payRequest.description,
      cost: Number(payRequest.cost) || 0,
      unitNumber: payRequest.unit?.unit_number,
      propertyName: payRequest.unit?.property?.name_ar,
      payeeName: values.payee_name,
      paymentMethod: values.payment_method,
      paymentDate: values.payment_date?.format('YYYY-MM-DD') || new Date().toISOString(),
      referenceNumber: values.reference_number,
    });
  };

  const handleUploadImage = async (file: File) => {
    try {
      setUploading(true);
      const ext = file.name.split('.').pop();
      const fileName = `${Date.now()}.${ext}`;
      const { data, error } = await supabase.storage.from('maintenance').upload(fileName, file);
      if (error) throw error;

      const { data: urlData } = supabase.storage.from('maintenance').getPublicUrl(fileName);
      form.setFieldValue('image_url', urlData.publicUrl);
      message.success('تم رفع الصورة');
    } catch (err: any) {
      message.error(err.message || 'فشل رفع الصورة');
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-end justify-between flex-wrap gap-4">
        <div>
          <h2 className="font-headline-lg text-headline-lg font-bold text-primary">إدارة طلبات الصيانة</h2>
          <p className="font-body-md text-body-md text-on-surface-variant mt-1">متابعة طلبات الصيانة وإدارتها</p>
        </div>
        <div className="flex gap-3 flex-wrap">
          <input
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="بحث..."
            className="bg-white border border-outline-variant rounded-xl px-4 py-2 font-label-md focus:ring-primary w-48"
          />
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="bg-white border border-outline-variant rounded-xl px-4 py-2 font-label-md text-on-surface-variant focus:ring-primary"
          >
            <option value="">كل الحالات</option>
            <option value="open">مفتوح</option>
            <option value="in_progress">قيد التنفيذ</option>
            <option value="completed">مكتمل</option>
          </select>
          <select
            value={priorityFilter}
            onChange={(e) => setPriorityFilter(e.target.value)}
            className="bg-white border border-outline-variant rounded-xl px-4 py-2 font-label-md text-on-surface-variant focus:ring-primary"
          >
            <option value="">كل الأولويات</option>
            <option value="urgent">عاجلة</option>
            <option value="high">عالية</option>
            <option value="medium">متوسطة</option>
            <option value="low">منخفضة</option>
          </select>
          {isAdmin && (
            <button
              onClick={handleAdd}
              className="bg-primary text-on-primary px-4 py-2 rounded-xl font-label-md flex items-center gap-2 hover:opacity-90 active:scale-95 transition-all"
            >
              <span className="material-symbols-outlined text-[18px]">add</span>
              إضافة طلب
            </button>
          )}
        </div>
      </div>

      {/* Loading */}
      {loading ? (
        <div className="flex items-center justify-center h-40">
          <div className="animate-pulse flex flex-col items-center gap-3">
            <div className="w-8 h-8 rounded-full bg-primary/20"></div>
            <div className="h-3 w-32 bg-surface-container-highest rounded"></div>
          </div>
        </div>
      ) : filtered.length === 0 ? (
        <div className="bg-white rounded-xl border border-outline-variant p-12 text-center">
          <span className="material-symbols-outlined text-5xl text-outline-variant mb-4">build</span>
          <p className="text-on-surface-variant">لا توجد طلبات صيانة مطابقة</p>
        </div>
      ) : (<>
        <div className="hidden md:block bg-white rounded-xl border border-outline-variant overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-right">
              <thead className="bg-surface-container-low text-on-surface-variant border-b border-outline-variant font-label-md">
                <tr>
                  <th className="px-6 py-4 font-bold">الطلب</th>
                  <th className="px-6 py-4 font-bold">الأولوية</th>
                  <th className="px-6 py-4 font-bold">الحالة</th>
                  <th className="px-6 py-4 font-bold">التكلفة</th>
                  <th className="px-6 py-4 font-bold">تاريخ الإنشاء</th>
                  <th className="px-6 py-4 font-bold">الصورة</th>
                  <th className="px-6 py-4 font-bold text-left">إجراءات</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-outline-variant">
                {filtered.map((r) => (
                  <tr key={r.id} className="hover:bg-surface-container-lowest transition-colors">
                    <td className="px-6 py-4">
                      <div className="font-bold text-on-surface">{r.title}</div>
                      <div className="text-label-sm text-on-surface-variant mt-0.5">
                        وحدة {r.unit?.unit_number || '-'}
                        {' | '}
                        {r.unit?.property?.name_ar || '-'}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <span className={`px-3 py-1 rounded-full text-label-sm font-bold border ${priorityColors[r.priority] || ''}`}>
                        {priorityLabels[r.priority] || r.priority}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2">
                        <span className={`px-3 py-1 rounded-full text-label-sm font-bold border ${statusColors[r.status] || ''}`}>
                          {statusLabels[r.status] || r.status}
                        </span>
                        {isAdmin && (STATUS_FLOW[r.status]?.length > 0) && (
                          <button
                            onClick={() => handleStatusChange(r, STATUS_FLOW[r.status][0])}
                            className="text-label-sm text-primary hover:text-primary-container transition-colors font-bold"
                          >
                            {r.status === 'open' ? 'بدء التنفيذ' : 'إكمال'}
                          </button>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4 text-on-surface-variant">
                      {r.cost ? `ر.س ${r.cost.toLocaleString()}` : '-'}
                    </td>
                    <td className="px-6 py-4 text-on-surface-variant">
                      {r.created_at ? new Date(r.created_at).toLocaleDateString('ar-SA') : '-'}
                    </td>
                    <td className="px-6 py-4">
                      {r.image_url ? (
                        <img
                          src={r.image_url}
                          alt="صورة"
                          className="w-14 h-14 rounded-lg object-cover border border-outline-variant"
                        />
                      ) : '-'}
                    </td>
                    <td className="px-6 py-4 text-left">
                      {isAdmin && (
                        <div className="flex gap-1 justify-end">
                          <button
                            onClick={() => handleEdit(r)}
                            className="p-2 text-on-surface-variant hover:text-primary transition-colors"
                            title="تعديل"
                          >
                            <span className="material-symbols-outlined text-[20px]">edit</span>
                          </button>
                          <button
                            onClick={() => handleDelete(r.id)}
                            className="p-2 text-on-surface-variant hover:text-error transition-colors"
                            title="حذف"
                          >
                            <span className="material-symbols-outlined text-[20px]">delete</span>
                          </button>
                          {r.status === 'completed' && (
                            <button
                              onClick={() => handlePayOpen(r)}
                              className="p-2 text-on-surface-variant hover:text-secondary transition-colors"
                              title="سند صرف"
                            >
                              <span className="material-symbols-outlined text-[20px]">payments</span>
                            </button>
                          )}
                        </div>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="px-6 py-4 border-t border-outline-variant bg-surface-container-low/50">
            <p className="text-body-sm text-on-surface-variant">عرض {filtered.length} من أصل {requests.length} طلب</p>
          </div>
        </div>

        <div className="block md:hidden space-y-3">
          {filtered.map((r) => (
            <div key={r.id} className="bg-white rounded-xl border border-outline-variant p-4">
              <div className="flex items-start justify-between mb-2">
                <div className="flex-1 min-w-0 ml-2">
                  <p className="font-bold text-on-surface truncate">{r.title}</p>
                  <p className="text-label-sm text-on-surface-variant truncate">
                    وحدة {r.unit?.unit_number || '-'} | {r.unit?.property?.name_ar || '-'}
                  </p>
                </div>
                <span className={`px-3 py-1 rounded-full text-label-sm font-bold border shrink-0 ${priorityColors[r.priority] || ''}`}>
                  {priorityLabels[r.priority] || r.priority}
                </span>
              </div>
              <div className="flex items-center gap-2 mb-3">
                <span className={`px-3 py-1 rounded-full text-label-sm font-bold border ${statusColors[r.status] || ''}`}>
                  {statusLabels[r.status] || r.status}
                </span>
                {r.cost ? <span className="text-label-sm text-on-surface-variant">ر.س {r.cost.toLocaleString()}</span> : null}
                <span className="text-label-sm text-on-surface-variant mr-auto">
                  {r.created_at ? new Date(r.created_at).toLocaleDateString('ar-SA') : ''}
                </span>
              </div>
              {r.image_url && (
                <img src={r.image_url} alt="" className="w-full h-32 rounded-lg object-cover border border-outline-variant mb-3" />
              )}
              <div className="flex gap-2 pt-3 border-t border-outline-variant">
                {isAdmin && (
                  <>
                    <button onClick={() => handleEdit(r)} className="flex-1 py-2 rounded-lg border border-outline-variant text-label-sm font-bold hover:bg-surface-container transition-colors flex items-center justify-center gap-1">
                      <span className="material-symbols-outlined text-[16px]">edit</span> تعديل
                    </button>
                    <button onClick={() => handleDelete(r.id)} className="flex-1 py-2 rounded-lg border border-error/30 text-error text-label-sm font-bold hover:bg-error/5 transition-colors flex items-center justify-center gap-1">
                      <span className="material-symbols-outlined text-[16px]">delete</span> حذف
                    </button>
                  </>
                )}
                {isAdmin && r.status === 'completed' && (
                  <button onClick={() => handlePayOpen(r)} className="flex-1 py-2 rounded-lg bg-secondary text-white text-label-sm font-bold hover:opacity-90 transition-colors flex items-center justify-center gap-1">
                    <span className="material-symbols-outlined text-[16px]">payments</span> صرف
                  </button>
                )}
              </div>
            </div>
          ))}
          <div className="p-3 text-center">
            <p className="text-body-sm text-on-surface-variant">عرض {filtered.length} من أصل {requests.length} طلب</p>
          </div>
        </div>
      </>)}

      {/* Pay Modal */}
      <Modal
        title="سند صرف - صيانة"
        open={payModalVisible}
        onCancel={() => { setPayModalVisible(false); setVoucherData(null); }}
        footer={null}
        width={520}
        style={{ top: 40 }}
      >
        {!voucherData ? (
          <Form form={payForm} layout="vertical" onFinish={handlePayGenerate}>
            {payRequest && (
              <div className="bg-secondary/5 p-3 rounded-xl border border-secondary/20 mb-4 text-center">
                <p className="text-body-sm text-on-surface-variant">
                  مبلغ الصيانة: <strong className="text-secondary">{Number(payRequest.cost)?.toLocaleString() || 0} ر.س</strong>
                </p>
              </div>
            )}
            <Form.Item name="payee_name" label="اسم المستفيد" rules={[{ required: true, message: 'أدخل اسم المستفيد' }]}>
              <Input placeholder="اسم المقاول أو المورد" style={{ borderRadius: 8 }} />
            </Form.Item>
            <Form.Item name="payment_method" label="طريقة الدفع" rules={[{ required: true, message: 'اختر طريقة الدفع' }]}>
              <Select style={{ borderRadius: 8 }}>
                <Option value="cash">نقود</Option>
                <Option value="transfer">تحويل بنكي</Option>
              </Select>
            </Form.Item>
            <Form.Item name="payment_date" label="تاريخ الدفع" rules={[{ required: true, message: 'اختر التاريخ' }]}>
              <DatePicker style={{ width: '100%', borderRadius: 8 }} />
            </Form.Item>
            <Form.Item name="reference_number" label="رقم السند">
              <Input placeholder="رقم السند" style={{ borderRadius: 8 }} />
            </Form.Item>
            <div className="flex justify-end gap-3 mt-4">
              <button
                onClick={() => { setPayModalVisible(false); setVoucherData(null); }}
                className="px-4 py-2 rounded-xl font-label-md border border-outline-variant hover:bg-surface-container transition-colors"
              >
                إلغاء
              </button>
              <button
                type="submit"
                className="bg-secondary text-on-secondary px-4 py-2 rounded-xl font-label-md hover:opacity-90 transition-colors"
              >
                إنشاء سند الصرف
              </button>
            </div>
          </Form>
        ) : (
          <div className="space-y-4">
            <div className="bg-secondary/5 p-4 rounded-xl border border-secondary/20">
              <p className="font-label-md text-secondary mb-1">تم إنشاء سند الصرف</p>
              <p className="text-body-sm text-on-surface-variant">
                مستفيد: {voucherData.payeeName} | المبلغ: {voucherData.cost.toLocaleString()} ر.س
              </p>
            </div>
            <div className="flex justify-center">
              <PaymentVoucherPDF data={voucherData} />
            </div>
            <div className="flex justify-end">
              <button
                onClick={() => { setPayModalVisible(false); setVoucherData(null); }}
                className="px-4 py-2 rounded-xl font-label-md border border-outline-variant hover:bg-surface-container transition-colors"
              >
                إغلاق
              </button>
            </div>
          </div>
        )}
      </Modal>

      {/* Add/Edit Modal */}
      <Modal
        title={editingRequest ? 'تعديل طلب صيانة' : 'إضافة طلب صيانة'}
        open={modalVisible}
        onCancel={() => setModalVisible(false)}
        onOk={() => form.submit()}
        confirmLoading={saving}
        width={640}
        style={{ top: 40 }}
      >
        <Form form={form} layout="vertical" onFinish={handleSubmit}>
          <Form.Item name="unit_id" label="الوحدة" rules={[{ required: true, message: 'اختر الوحدة' }]}>
            <Select placeholder="اختر وحدة" showSearch filterOption={(input, option) =>
              (option?.children as any)?.toString().toLowerCase().includes(input.toLowerCase())
            }>
              {units.map(u => (
                <Option key={u.id} value={u.id}>
                  {u.property?.name_ar || ''} - وحدة {u.unit_number}
                </Option>
              ))}
            </Select>
          </Form.Item>
          <Form.Item name="title" label="العنوان" rules={[{ required: true, message: 'العنوان مطلوب' }]}>
            <Input placeholder="عنوان الطلب" />
          </Form.Item>
          <Form.Item name="description" label="الوصف" rules={[{ required: true, message: 'الوصف مطلوب' }]}>
            <TextArea rows={3} placeholder="شرح المشكلة..." />
          </Form.Item>
          <Form.Item name="priority" label="الأولوية" rules={[{ required: true, message: 'اختر الأولوية' }]}>
            <Select>
              <Option value="low">منخفضة</Option>
              <Option value="medium">متوسطة</Option>
              <Option value="high">عالية</Option>
              <Option value="urgent">عاجلة</Option>
            </Select>
          </Form.Item>
          <Form.Item name="status" label="الحالة">
            <Select>
              <Option value="open">مفتوح</Option>
              <Option value="in_progress">قيد التنفيذ</Option>
              <Option value="completed">مكتمل</Option>
            </Select>
          </Form.Item>
          <Form.Item name="cost" label="التكلفة (عند الإغلاق)">
            <Input type="number" min={0} placeholder="ر.س" />
          </Form.Item>
          <Form.Item name="image_url" label="صورة المشكلة">
            <Input placeholder="رابط الصورة" style={{ display: 'none' }} />
          </Form.Item>
          <Upload
            accept="image/*"
            showUploadList={false}
            beforeUpload={(file) => { handleUploadImage(file); return false; }}
          >
            <button
              type="button"
              disabled={uploading}
              className="border border-outline-variant rounded-xl px-4 py-2 font-label-md flex items-center gap-2 hover:bg-surface-container-low transition-colors disabled:opacity-50"
            >
              <UploadOutlined />
              {uploading ? 'جاري الرفع...' : 'رفع صورة'}
            </button>
          </Upload>
        </Form>
      </Modal>
    </div>
  );
};

export default MaintenancePage;
