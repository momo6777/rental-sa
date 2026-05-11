import { Layout as AntdLayout, Menu, Button, Space } from 'antd';
import {
  UserOutlined, HomeOutlined, ProfileOutlined, MailOutlined,
  LoadingOutlined, SettingOutlined, LogoutOutlined, BarChartOutlined,
} from '@ant-design/icons';
import { Link, Outlet, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { NotificationBell } from './NotificationBell';
import styles from './Layout.module.css';

const { Header, Content, Sider } = AntdLayout;

const LayoutComponent = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { user, logout } = useAuth();

  const menuItems = [
    { key: '/dashboard', label: 'لوحة التحكم', icon: HomeOutlined },
    { key: '/properties', label: 'العقارات', icon: UserOutlined },
    { key: '/contracts', label: 'العقود', icon: ProfileOutlined },
    { key: '/payments', label: 'المدفوعات', icon: MailOutlined },
    { key: '/maintenance', label: 'الصيانة', icon: LoadingOutlined },
    { key: '/reports', label: 'التقارير', icon: BarChartOutlined },
    { key: '/settings', label: 'الإعدادات', icon: SettingOutlined },
  ];

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  return (
    <AntdLayout className={styles.layout}>
      <Sider trigger={null} collapsible className={styles.sider}>
        <div className={styles.logo}>
          <h2>نظام العقارات</h2>
        </div>
        <Menu
          mode="inline"
          selectedKeys={[location.pathname]}
          style={{ height: '100%', borderRight: 0 }}
          items={menuItems.map(item => ({
            key: item.key,
            label: <Link to={item.key}>{item.label}</Link>,
            icon: <item.icon style={{ fontSize: 18 }} />,
          }))}
        />
      </Sider>
      <AntdLayout>
        <Header className={styles.header}>
          <div className={styles.headerContent}>
            <Space size="large" className={styles.headerLeft}>
              <NotificationBell />
            </Space>
            <Space className={styles.userInfo}>
              <span>{user?.full_name || 'مستخدم'}</span>
              {user?.role && (
                <span className={styles.roleBadge}>
                  {user.role === 'admin' ? 'مدير' : 'محاسب'}
                </span>
              )}
              <Button type="text" icon={<LogoutOutlined />} onClick={handleLogout} className={styles.logoutBtn} />
            </Space>
          </div>
        </Header>
        <Content className={styles.content}>
          <div className={styles.container}>
            <Outlet />
          </div>
        </Content>
      </AntdLayout>
    </AntdLayout>
  );
};

export default LayoutComponent;
