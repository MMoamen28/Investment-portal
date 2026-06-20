import { Card, Statistic } from 'antd';
import {
  FileTextOutlined, ClockCircleOutlined, WarningOutlined,
  CheckCircleOutlined, CloseCircleOutlined,
} from '@ant-design/icons';

const CARDS = [
  { key: 'total',        label: 'الطلبات النشطة',      icon: <FileTextOutlined />,    color: '#1e3a5f' },
  { key: 'pending',      label: 'في انتظار الموافقة',  icon: <ClockCircleOutlined />, color: '#d97706' },
  { key: 'slaBreached',  label: 'تجاوز الميعاد',        icon: <WarningOutlined />,     color: '#dc2626' },
  { key: 'approvedToday',label: 'موافقة اليوم',          icon: <CheckCircleOutlined />, color: '#16a34a' },
  { key: 'rejectedToday',label: 'مرفوضة اليوم',          icon: <CloseCircleOutlined />, color: '#6b7280' },
];

const StatsCards = ({ stats = {} }) => (
  <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
    {CARDS.map(({ key, label, icon, color }) => (
      <Card key={key} className="hover-card text-center" size="small">
        <div className="text-2xl mb-1" style={{ color }}>{icon}</div>
        <Statistic
          value={stats[key] ?? 0}
          valueStyle={{ color, fontSize: '28px', fontWeight: 700 }}
        />
        <div className="text-xs text-gray-500 mt-1">{label}</div>
      </Card>
    ))}
  </div>
);

export default StatsCards;
