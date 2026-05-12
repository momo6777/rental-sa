import { Badge, Popover, List, Button, Typography, Space, Empty } from 'antd';
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
        <span className="font-bold text-on-surface text-body-md">الإشعارات</span>
        {unreadCount > 0 && (
          <Button type="link" size="small" onClick={markAllAsRead} className="text-label-sm font-bold !text-primary p-0">
            تحديد الكل مقروء
          </Button>
        )}
      </div>
      {notifications.length === 0 ? (
        <div className="py-10 text-center text-on-surface-variant text-body-sm">
          <span className="material-symbols-outlined text-3xl block mb-2 text-outline-variant">notifications_off</span>
          لا توجد إشعارات
        </div>
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
                  <div className="flex items-center gap-2">
                    <span className={styles.notifTitle}>{n.title}</span>
                    {!n.is_read && <span className={styles.dot} />}
                  </div>
                }
                description={
                  <div>
                    <div className={styles.notifMessage}>{n.message}</div>
                    <div className={styles.notifTime}>
                      {new Date(n.created_at).toLocaleDateString('ar-SA')}
                    </div>
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
        <span className="material-symbols-outlined text-on-surface-variant cursor-pointer text-[22px] leading-none p-1">
          notifications
        </span>
      </Badge>
    </Popover>
  );
};
