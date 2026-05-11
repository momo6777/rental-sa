import { Badge, Popover, List, Button, Typography, Space, Empty } from 'antd';
import { BellOutlined, CheckOutlined } from '@ant-design/icons';
import { useNotifications } from '../hooks/useNotifications';
import { useNavigate } from 'react-router-dom';
import styles from './NotificationBell.module.css';

const { Text } = Typography;

const TYPE_ROUTES: Record<string, string> = {
  contract_expiry: '/contracts',
  payment_overdue: '/payments',
  maintenance_urgent: '/maintenance',
};

export const NotificationBell = () => {
  const { notifications, unreadCount, markAsRead, markAllAsRead } = useNotifications();
  const navigate = useNavigate();

  const handleClick = (n: any) => {
    if (!n.is_read) markAsRead(n.id);
    const route = TYPE_ROUTES[n.type] || '/';
    navigate(route);
  };

  const content = (
    <div className={styles.popover}>
      <div className={styles.header}>
        <Text strong style={{ color: '#fff' }}>الإشعارات</Text>
        {unreadCount > 0 && (
          <Button type="link" size="small" onClick={markAllAsRead} style={{ color: '#ffd700' }}>
            تحديد الكل مقروء
          </Button>
        )}
      </div>
      {notifications.length === 0 ? (
        <Empty description="لا توجد إشعارات" image={Empty.PRESENTED_IMAGE_SIMPLE} />
      ) : (
        <List
          dataSource={notifications.slice(0, 10)}
          renderItem={(n: any) => (
            <List.Item
              className={`${styles.notifItem} ${!n.is_read ? styles.unread : ''}`}
              onClick={() => handleClick(n)}
            >
              <List.Item.Meta
                title={
                  <Space>
                    <Text className={styles.notifTitle}>{n.title}</Text>
                    {!n.is_read && <span className={styles.dot} />}
                  </Space>
                }
                description={
                  <div>
                    <Text className={styles.notifMessage}>{n.message}</Text>
                    <br />
                    <Text className={styles.notifTime}>
                      {new Date(n.created_at).toLocaleDateString('ar-SA')}
                    </Text>
                  </div>
                }
              />
            </List.Item>
          )}
        />
      )}
    </div>
  );

  return (
    <Popover content={content} trigger="click" placement="bottomRight" overlayClassName={styles.popoverOverlay}>
      <Badge count={unreadCount} size="small" className={styles.bell}>
        <BellOutlined style={{ fontSize: 20, color: '#fff', cursor: 'pointer' }} />
      </Badge>
    </Popover>
  );
};
