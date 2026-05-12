import { useEffect, useState, lazy, Suspense } from 'react';
import { Modal, Form, Input, InputNumber, Select, DatePicker, Button, message } from 'antd';
import { PlusOutlined } from '@ant-design/icons';
import { supabase } from '../lib/supabase';
import { useAuth } from '../hooks/useAuth';
import { ErrorBoundary } from '../components/ErrorBoundary';
import dayjs from 'dayjs';
import type { GeneralExpenseVoucherData } from '../components/GeneralExpenseVoucherPDF';

const GeneralExpenseVoucherPDF = lazy(() =>
  import('../components/GeneralExpenseVoucherPDF').then((m) => ({ default: m.GeneralExpenseVoucherPDF }))
);

const { Option } = Select;
const { TextArea } = Input;

const EXPENSE_CATEGORIES = [
  'الرواتب والأجور',
  'برامج محاسبية',
  'إيجار المكتب',
  'فواتير كهرباء وماء',
  'الإنترنت والاتصالات',
  'تسويق وإعلان',
  'رسوم حكومية',
  'استشارات قانونية',
  'صيانة عامة',
  'لوازم مكتبية',
  'تأمين',
  'أخرى',
];

const categoryColors: Record<string, string> = {
  'الرواتب والأجور': 'bg-blue-100 text-blue-600 border-blue-200',
  'برامج محاسبية': 'bg-purple-100 text-purple-600 border-purple-200',
  'إيجار المكتب': 'bg-orange-100 text-orange-600 border-orange-200',
  'فواتير كهرباء وماء': 'bg-yellow-100 text-yellow-600 border-yellow-200',
  'الإنترنت والاتصالات': 'bg-cyan-100 text-cyan-600 border-cyan-200',
  'تسويق وإعلان': 'bg-pink-100 text-pink-600 border-pink-200',
  'رسوم حكومية': 'bg-red-100 text-red-600 border-red-200',
  'استشارات قانونية': 'bg-indigo-100 text-indigo-600 border-indigo-200',
  'صيانة عامة': 'bg-amber-100 text-amber-600 border-amber-200',
  'لوازم مكتبية': 'bg-lime-100 text-lime-600 border-lime-200',
  'تأمين': 'bg-teal-100 text-teal-600 border-teal-200',
  'أخرى': 'bg-gray-100 text-gray-600 border-gray-200',
};

const ExpensesPage = () => {
  const { user } = useAuth();
  const [expenses, setExpenses] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalVisible, setModalVisible] = useState(false);
  const [editingExpense, setEditingExpense] = useState<any>(null);
  const [saving, setSaving] = useState(false);
  const [categoryFilter, setCategoryFilter] = useState('');
  const [filtered, setFiltered] = useState<any[]>([]);
  const [voucherExpense, setVoucherExpense] = useState<GeneralExpenseVoucherData | null>(null);
  const [form] = Form.useForm();

  useEffect(() => {
    fetchExpenses();
  }, []);

  useEffect(() => {
    applyFilters();
  }, [expenses, categoryFilter]);

  const fetchExpenses = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('general_expenses')
        .select('*')
        .order('expense_date', { ascending: false });
      if (error) throw error;
      setExpenses(data || []);
      setFiltered(data || []);
    } catch (err: any) {
      console.error('Error fetching expenses:', err);
      message.error('فشل تحميل المصروفات');
    } finally {
      setLoading(false);
    }
  };

  const applyFilters = () => {
    let result = [...expenses];
    if (categoryFilter) {
      result = result.filter((e) => e.category === categoryFilter);
    }
    setFiltered(result);
  };

  const openAddModal = () => {
    setEditingExpense(null);
    form.resetFields();
    setModalVisible(true);
  };

  const openEditModal = (expense: any) => {
    setEditingExpense(expense);
    form.setFieldsValue({
      description: expense.description,
      amount: expense.amount,
      category: expense.category,
      expense_date: expense.expense_date ? dayjs(expense.expense_date) : null,
      notes: expense.notes,
    });
    setModalVisible(true);
  };

  const handleDelete = (id: string) => {
    Modal.confirm({
      title: 'حذف المصروف',
      content: 'هل أنت متأكد من حذف هذا المصروف؟',
      okText: 'حذف',
      okType: 'danger',
      cancelText: 'إلغاء',
      onOk: async () => {
        try {
          const { error } = await supabase.from('general_expenses').delete().eq('id', id);
          if (error) throw error;
          message.success('تم حذف المصروف');
          fetchExpenses();
        } catch (err: any) {
          message.error('فشل الحذف');
        }
      },
    });
  };

  const handleSubmit = async () => {
    try {
      const values = await form.validateFields();
      setSaving(true);

      const payload = {
        description: values.description,
        amount: values.amount,
        category: values.category,
        expense_date: values.expense_date.format('YYYY-MM-DD'),
        notes: values.notes || null,
        created_by: user?.id || null,
      };

      if (editingExpense) {
        const { error } = await supabase
          .from('general_expenses')
          .update(payload)
          .eq('id', editingExpense.id);
        if (error) throw error;
        message.success('تم تحديث المصروف');
      } else {
        const { error } = await supabase
          .from('general_expenses')
          .insert(payload);
        if (error) throw error;
        message.success('تم إضافة المصروف');
      }

      setModalVisible(false);
      form.resetFields();
      fetchExpenses();
    } catch (err: any) {
      console.error('Error saving expense:', err);
    } finally {
      setSaving(false);
    }
  };

  const totalAmount = filtered.reduce((s, e) => s + (e.amount || 0), 0);

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

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="font-headline-lg text-headline-lg font-bold text-primary">المصروفات العامة</h2>
          <p className="font-body-md text-body-md text-on-surface-variant mt-1">إدارة مصروفات التشغيل (رواتب، برامج، فواتير، ...)</p>
        </div>
        <Button type="primary" icon={<PlusOutlined />} onClick={openAddModal} className="font-label-md">
          إضافة مصروف
        </Button>
      </div>

      {/* Summary + Filter */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white rounded-xl border border-outline-variant p-5 md:col-span-3">
          <div className="flex items-center gap-3">
            <span className="material-symbols-outlined text-red-500 text-2xl">receipt</span>
            <div>
              <p className="text-label-sm text-on-surface-variant">إجمالي المصروفات</p>
              <p className="text-headline-md font-bold text-red-600">ر.س {totalAmount.toLocaleString()}</p>
            </div>
          </div>
        </div>
        <div>
          <select
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value)}
            className="w-full bg-white border border-outline-variant rounded-xl text-label-md px-4 py-5 focus:ring-2 focus:ring-primary outline-none"
          >
            <option value="">جميع التصنيفات</option>
            {EXPENSE_CATEGORIES.map((cat) => (
              <option key={cat} value={cat}>{cat}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Table */}
      {filtered.length === 0 ? (
        <div className="bg-white rounded-xl border border-outline-variant p-12 text-center">
          <span className="material-symbols-outlined text-5xl text-outline-variant mb-4">receipt_long</span>
          <p className="text-on-surface-variant mb-4">لا توجد مصروفات</p>
          <Button type="primary" icon={<PlusOutlined />} onClick={openAddModal}>
            إضافة مصروف
          </Button>
        </div>
      ) : (
        <div className="bg-white rounded-xl border border-outline-variant overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-right">
              <thead className="bg-surface-container-low text-on-surface-variant border-b border-outline-variant font-label-md">
                <tr>
                  <th className="px-6 py-4 font-bold">البيان</th>
                  <th className="px-6 py-4 font-bold">التصنيف</th>
                  <th className="px-6 py-4 font-bold">المبلغ</th>
                  <th className="px-6 py-4 font-bold">التاريخ</th>
                  <th className="px-6 py-4 font-bold">ملاحظات</th>
                  <th className="px-6 py-4 font-bold">إجراءات</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-outline-variant">
                {filtered.map((e) => (
                  <tr key={e.id} className="hover:bg-surface-container-lowest transition-colors">
                    <td className="px-6 py-4 font-bold text-on-surface">{e.description}</td>
                    <td className="px-6 py-4">
                      <span className={`px-3 py-1 rounded-full text-label-sm font-bold border ${categoryColors[e.category] || categoryColors['أخرى']}`}>
                        {e.category}
                      </span>
                    </td>
                    <td className="px-6 py-4 font-bold text-red-600">{e.amount.toLocaleString()} ر.س</td>
                    <td className="px-6 py-4">{new Date(e.expense_date).toLocaleDateString('ar-SA')}</td>
                    <td className="px-6 py-4 text-on-surface-variant max-w-[200px] truncate">{e.notes || '—'}</td>
                    <td className="px-6 py-4">
                      <div className="flex gap-2 items-center">
                        <Suspense fallback={<span className="text-label-sm text-on-surface-variant">...</span>}>
                          <ErrorBoundary>
                            <GeneralExpenseVoucherPDF data={{
                              id: e.id,
                              description: e.description,
                              amount: e.amount,
                              category: e.category,
                              expenseDate: e.expense_date,
                              notes: e.notes,
                            }} />
                          </ErrorBoundary>
                        </Suspense>
                        <button
                          onClick={() => openEditModal(e)}
                          className="text-primary hover:underline text-label-sm font-bold"
                        >
                          تعديل
                        </button>
                        <button
                          onClick={() => handleDelete(e.id)}
                          className="text-error hover:underline text-label-sm font-bold"
                        >
                          حذف
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot className="bg-surface-container-low/50 border-t border-outline-variant font-bold">
                <tr>
                  <td className="px-6 py-4 text-on-surface">الإجمالي</td>
                  <td className="px-6 py-4"></td>
                  <td className="px-6 py-4 text-red-600">{totalAmount.toLocaleString()} ر.س</td>
                  <td className="px-6 py-4"></td>
                  <td className="px-6 py-4"></td>
                  <td className="px-6 py-4"></td>
                </tr>
              </tfoot>
            </table>
          </div>
        </div>
      )}

      {/* Cards view for mobile */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 md:hidden">
        {filtered.map((e) => (
          <div key={e.id} className="bg-white rounded-xl border border-outline-variant p-4">
            <div className="flex items-start justify-between mb-2">
              <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold border ${categoryColors[e.category] || categoryColors['أخرى']}`}>
                {e.category}
              </span>
              <div className="flex gap-2">
                <button onClick={() => openEditModal(e)} className="text-primary text-[10px] font-bold">تعديل</button>
                <button onClick={() => handleDelete(e.id)} className="text-error text-[10px] font-bold">حذف</button>
              </div>
            </div>
            <p className="font-body-md text-body-md font-bold">{e.description}</p>
            <p className="text-headline-sm font-bold text-red-600 mt-1">{e.amount.toLocaleString()} ر.س</p>
            <p className="text-label-sm text-on-surface-variant mt-1">
              {new Date(e.expense_date).toLocaleDateString('ar-SA')}
              {e.notes ? ` — ${e.notes}` : ''}
            </p>
          </div>
        ))}
      </div>

      {/* Add/Edit Modal */}
      <Modal
        title={editingExpense ? 'تعديل المصروف' : 'إضافة مصروف جديد'}
        open={modalVisible}
        onCancel={() => setModalVisible(false)}
        onOk={handleSubmit}
        confirmLoading={saving}
        okText={editingExpense ? 'تحديث' : 'إضافة'}
        cancelText="إلغاء"
        width={520}
      >
        <Form form={form} layout="vertical" className="mt-4">
          <Form.Item
            name="description"
            label="البيان"
            rules={[{ required: true, message: 'الرجاء إدخال بيان المصروف' }]}
          >
            <Input placeholder="مثال: اشتراك برنامج محاسبي شهري" />
          </Form.Item>
          <div className="grid grid-cols-2 gap-4">
            <Form.Item
              name="amount"
              label="المبلغ"
              rules={[{ required: true, message: 'الرجاء إدخال المبلغ' }]}
            >
              <InputNumber className="w-full" min={0} prefix="ر.س" placeholder="0" />
            </Form.Item>
            <Form.Item
              name="category"
              label="التصنيف"
              rules={[{ required: true, message: 'الرجاء اختيار التصنيف' }]}
            >
              <Select placeholder="اختر التصنيف">
                {EXPENSE_CATEGORIES.map((cat) => (
                  <Option key={cat} value={cat}>{cat}</Option>
                ))}
              </Select>
            </Form.Item>
          </div>
          <Form.Item
            name="expense_date"
            label="التاريخ"
            rules={[{ required: true, message: 'الرجاء اختيار التاريخ' }]}
          >
            <DatePicker className="w-full" />
          </Form.Item>
          <Form.Item name="notes" label="ملاحظات">
            <TextArea rows={2} placeholder="ملاحظات إضافية (اختياري)" />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
};

export default ExpensesPage;
