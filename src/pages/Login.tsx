import { Form, Input, Button, Checkbox, message } from 'antd';
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { UserOutlined, LockOutlined } from '@ant-design/icons';
import styles from './Login.module.css';

const LoginPage = () => {
  const [form] = Form.useForm();
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const { login } = useAuth();

  const handleLogin = async (values: { email: string; password: string }) => {
    setLoading(true);
    try {
      await login(values.email, values.password);
      message.success('تم تسجيل الدخول بنجاح');
      navigate('/dashboard');
    } catch (error: any) {
      message.error(error.message || 'فشل تسجيل الدخول');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className={styles.loginContainer}>
      <div className={styles.loginBox}>
        <div className={styles.loginHeader}>
          <h2>تسجيل الدخول</h2>
          <p>أدخل بياناتك للوصول إلى النظام</p>
        </div>
        <Form
          form={form}
          name="login"
          onFinish={handleLogin}
          style={{ marginTop: 24 }}
        >
          <Form.Item
            name="email"
            rules={[{ required: true, message: 'البريد الإلكتروني مطلوب' }, { type: 'email', message: 'البريد الإلكتروني غير صالح' }]}
          >
            <Input
              placeholder="البريد الإلكتروني"
              prefix={<UserOutlined style={{ color: 'rgba(0,0,0,.25)' }} />}
              style={{ borderRadius: 8 }}
            />
          </Form.Item>

          <Form.Item
            name="password"
            rules={[{ required: true, message: 'كلمة المرور مطلوبة' }]}
          >
            <Input.Password
              placeholder="كلمة المرور"
              prefix={<LockOutlined style={{ color: 'rgba(0,0,0,.25)' }} />}
              style={{ borderRadius: 8 }}
            />
          </Form.Item>

          <Form.Item
            name="password"
            rules={[{ required: true, message: 'كلمة المرور مطلובה' }]}
          >
            <Input.Prefix>
              <LockOutlined style={{ color: 'rgba(0,0,0,.25)' }} />
            </Input.Prefix>
            <Input.Password
              placeholder="كلمة المرور"
              style={{ borderRadius: 8 }}
            />
          </Form.Item>

          <Form.Item>
            <Form.Item
              noStyle
              className={styles.rememberWrapper}
            >
              <Form.Item name="remember" valuePropName="checked" initialValue>
                <Checkbox>تذكرني</Checkbox>
              </Form.Item>
            </Form.Item>
          </Form.Item>

          <Form.Item>
            <Button
              type="primary"
              htmlType="submit"
              loading={loading}
              style={{ width: '100%', borderRadius: 8 }}
            >
              تسجيل الدخول
            </Button>
          </Form.Item>
        </Form>
        <div className={styles.loginFooter}>
          <p>ليس لديك حساب؟ يرجى التواصل مع المسؤول</p>
        </div>
      </div>
    </div>
  );
};

export default LoginPage;