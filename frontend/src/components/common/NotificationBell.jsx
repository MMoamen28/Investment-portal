import { useState } from 'react';
import { Badge, Popover, List, Empty, Tag } from 'antd';
import { BellOutlined } from '@ant-design/icons';

const TYPE_LABELS = {
  APPROVAL:     { label: 'موافقة',         color: 'green'  },
  REJECTION:    { label: 'رفض',            color: 'red'    },
  MISSING_DATA: { label: 'بيانات ناقصة',   color: 'orange' },
  ESCALATION:   { label: 'تصعيد',          color: 'purple' },
};

const NotificationBell = ({ notifications = [], unread = 0, onRead }) => {
  const [open, setOpen] = useState(false);

  const content = (
    <div className="w-72 max-h-80 overflow-y-auto">
      {notifications.length === 0 ? (
        <Empty description="لا توجد إشعارات" image={Empty.PRESENTED_IMAGE_SIMPLE} />
      ) : (
        <List
          dataSource={[...notifications].reverse()}
          size="small"
          renderItem={(n) => {
            const cfg = TYPE_LABELS[n.type] || { label: n.type, color: 'default' };
            return (
              <List.Item className="flex justify-between">
                <div>
                  <Tag color={cfg.color}>{cfg.label}</Tag>
                  <span className="text-xs text-gray-500 block mt-0.5">
                    {new Date(n.sentAt).toLocaleString('ar-EG')}
                  </span>
                </div>
                <span className="text-xs text-gray-400">{n.channel}</span>
              </List.Item>
            );
          }}
        />
      )}
    </div>
  );

  return (
    <Popover
      content={content}
      title="الإشعارات"
      trigger="click"
      open={open}
      onOpenChange={(v) => { setOpen(v); if (v && onRead) onRead(); }}
      placement="bottomLeft"
    >
      <Badge count={unread} size="small">
        <button className="p-2 rounded-full hover:bg-white/20 transition-colors text-white text-xl">
          <BellOutlined />
        </button>
      </Badge>
    </Popover>
  );
};

export default NotificationBell;
