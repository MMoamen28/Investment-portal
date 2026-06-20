import { Card, Button, Tag } from 'antd';
import { UserOutlined, TeamOutlined } from '@ant-design/icons';
import RiskBadge from '../common/RiskBadge';
import SLATimer from '../common/SLATimer';

const STATUS_TAG = {
  AVAILABLE: { color: 'blue',   label: 'متاحة' },
  CLAIMED:   { color: 'orange', label: 'محجوزة' },
  COMPLETED: { color: 'green',  label: 'مكتملة' },
};

const TaskCard = ({ task, onClaim, onView, currentUser }) => {
  const st = STATUS_TAG[task.status] || STATUS_TAG.AVAILABLE;
  const isMine = task.claimedBy === currentUser;

  return (
    <Card
      className="hover-card border border-gray-200"
      size="small"
      bodyStyle={{ padding: '12px 16px' }}
    >
      <div className="flex justify-between items-start mb-2">
        <div>
          <div className="font-semibold text-[#1e3a5f] text-sm">{task.taskName}</div>
          <div className="text-xs text-gray-400 mt-0.5">#{task.taskId}</div>
        </div>
        <div className="flex items-center gap-2">
          <RiskBadge level={task.riskLevel} size="sm" />
          <Tag color={st.color}>{st.label}</Tag>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-1 text-xs text-gray-600 mb-3">
        <span><UserOutlined className="ml-1" />{task.investorName || '—'}</span>
        <span><TeamOutlined className="ml-1" />{task.assignedGroup}</span>
        {task.claimedBy && <span className="col-span-2 text-orange-600">محجوزة بواسطة: {task.claimedBy}</span>}
      </div>

      <div className="flex justify-between items-center">
        <SLATimer deadline={task.slaDeadline} breached={task.slaBreached} />
        <div className="flex gap-2">
          {task.status === 'AVAILABLE' && (
            <Button size="small" type="primary" style={{ background: '#1e3a5f' }} onClick={() => onClaim(task.taskId)}>
              حجز المهمة
            </Button>
          )}
          {(task.status === 'CLAIMED' && isMine) && (
            <Button size="small" style={{ borderColor: '#c9a84c', color: '#c9a84c' }} onClick={() => onView(task)}>
              إكمال المهمة
            </Button>
          )}
          <Button size="small" variant="outlined" onClick={() => onView(task)}>عرض</Button>
        </div>
      </div>
    </Card>
  );
};

export default TaskCard;
