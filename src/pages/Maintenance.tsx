import { useEffect, useState } from 'react';
import {
  Table, Button, Space, Tag, Popconfirm, Spin, Input, Select, message, Modal, Form, Upload,
  Image,
} from 'antd';
import {
  PlusOutlined, EditOutlined, DeleteOutlined, ToolOutlined,
  UploadOutlined, SearchOutlined,
} from '@ant-design/icons';
import { useAuth } from '../hooks/useAuth';
import { supabase } from '../lib/supabase';
import styles from './Maintenance.module.css';

const { Option } = Select;
const { TextArea } = Input;

const STATUS_FLOW: Record<string, string[]> = {
  open: ['in_progress'],
  in_progress: ['completed'],
  completed: [],
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

  const columns = [
    {
      title: 'الطلب', dataIndex: 'title', key: 'title',
      render: (text: string, record: any) => (
        <span>
          <strong style={{ color: '#fff' }}>{text}</strong>
          <br />
          <span style={{ color: 'rgba(255,255,255,0.5)', fontSize: 12 }}>
            وحدة {record.unit?.unit_number || '-'}
            {' | '}
            {record.unit?.property?.name_ar || '-'}
          </span>
        </span>
      ),
    },
    {
      title: 'الأولوية', dataIndex: 'priority', key: 'priority',
      render: (p: string) => {
        const colors: Record<string, string> = { low: 'green', medium: 'blue', high: 'orange', urgent: 'red' };
        const labels: Record<string, string> = { low: 'منخفضة', medium: 'متوسطة', high: 'عالية', urgent: 'عاجلة' };
        return <Tag color={colors[p] || 'default'}>{labels[p] || p}</Tag>;
      },
    },
    {
      title: 'الحالة', dataIndex: 'status', key: 'status',
      render: (s: string, record: any) => {
        const colors: Record<string, string> = { open: 'orange', in_progress: 'processing', completed: 'green' };
        const labels: Record<string, string> = { open: 'مفتوح', in_progress: 'قيد التنفيذ', completed: 'مكتمل' };
        const nextSteps = STATUS_FLOW[s] || [];
        return (
          <Space>
            <Tag color={colors[s] || 'default'}>{labels[s] || s}</Tag>
            {isAdmin && nextSteps.length > 0 && (
              <Button
                size="small"
                onClick={() => handleStatusChange(record, nextSteps[0])}
              >
                {s === 'open' ? 'بدء التنفيذ' : 'إكمال'}
              </Button>
            )}
          </Space>
        );
      },
    },
    {
      title: 'التكلفة', dataIndex: 'cost', key: 'cost',
      render: (cost: number) => cost ? `ر.س ${cost.toLocaleString()}` : '-',
    },
    {
      title: 'تاريخ الإنشاء', dataIndex: 'created_at', key: 'created_at',
      render: (d: string) => d ? new Date(d).toLocaleDateString('ar-SA') : '-',
    },
    {
      title: 'الصورة', dataIndex: 'image_url', key: 'image_url',
      render: (url: string) => url ? (
        <Image src={url} width={60} height={60} style={{ borderRadius: 4, objectFit: 'cover' }} />
      ) : '-',
    },
    {
      title: 'الإجراءات', key: 'actions',
      render: (_: any, record: any) => (
        <Space>
          {isAdmin && (
            <>
              <Button size="small" icon={<EditOutlined />} onClick={() => handleEdit(record)} />
              <Popconfirm title="حذف الطلب؟" onConfirm={() => handleDelete(record.id)} okText="نعم" cancelText="لا">
                <Button size="small" danger icon={<DeleteOutlined />} />
              </Popconfirm>
            </>
          )}
        </Space>
      ),
    },
  ];

  return (
    <div className={styles.maintenancePage}>
      <div className={styles.pageHeader}>
        <h1>إدارة طلبات الصيانة</h1>
        <Space wrap>
          <Input.Search
            placeholder="بحث..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            style={{ width: 200 }}
          />
          <Select
            placeholder="الحالة"
            allowClear
            style={{ width: 130 }}
            value={statusFilter || undefined}
            onChange={(v) => setStatusFilter(v || '')}
          >
            <Option value="open">مفتوح</Option>
            <Option value="in_progress">قيد التنفيذ</Option>
            <Option value="completed">مكتمل</Option>
          </Select>
          <Select
            placeholder="الأولوية"
            allowClear
            style={{ width: 130 }}
            value={priorityFilter || undefined}
            onChange={(v) => setPriorityFilter(v || '')}
          >
            <Option value="urgent">عاجلة</Option>
            <Option value="high">عالية</Option>
            <Option value="medium">متوسطة</Option>
            <Option value="low">منخفضة</Option>
          </Select>
          {isAdmin && (
            <Button type="primary" icon={<PlusOutlined />} onClick={handleAdd}>إضافة طلب</Button>
          )}
        </Space>
      </div>

      {loading ? (
        <div className={styles.loadingContainer}><Spin tip="جاري التحميل..." /></div>
      ) : (
        <Table
          columns={columns}
          dataSource={filtered}
          rowKey="id"
          pagination={{ pageSize: 10 }}
          scroll={{ x: 'max-content' }}
        />
      )}

      <Modal
        title={editingRequest ? 'تعديل طلب صيانة' : 'إضافة طلب صيانة'}
        open={modalVisible}
        onCancel={() => setModalVisible(false)}
        onOk={() => form.submit()}
        confirmLoading={saving}
        width={640}
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
            <Button icon={<UploadOutlined />} loading={uploading}>رفع صورة</Button>
          </Upload>
        </Form>
      </Modal>
    </div>
  );
};

export default MaintenancePage;
