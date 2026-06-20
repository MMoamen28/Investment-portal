import { Table, Tag, Button, Popconfirm, message } from 'antd';
import { WarningOutlined } from '@ant-design/icons';
import RiskBadge from '../common/RiskBadge';
import api from '../../services/api';

const EscalationList = ({ data = [], loading, onRefresh }) => {
  const forceDecision = async (id, decision) => {
    try {
      await api.post(`/tasks/TASK-${id}-G1/complete`, { decision });
      message.success(`تم ${decision === 'APPROVED' ? 'الموافقة' : 'الرفض'} بنجاح`);
      onRefresh?.();
    } catch { message.error('فشل تنفيذ القرار'); }
  };

  const columns = [
    { title: 'المستثمر', dataIndex: ['investor', 'fullName'] },
    { title: 'المخاطرة', dataIndex: 'riskLevel', render: (v) => <RiskBadge level={v} size="sm" /> },
    {
      title: 'نوع التصعيد', width: 160,
      render: (_, r) => (
        <Tag icon={<WarningOutlined />} color={r.retryExhausted ? 'purple' : 'red'}>
          {r.retryExhausted ? 'استنفاد المحاولات' : 'تجاوز الميعاد'}
        </Tag>
      ),
    },
    {
      title: 'وقت الانتهاء', dataIndex: 'slaDeadline',
      render: (v) => v ? new Date(v).toLocaleString('ar-EG') : '—',
    },
    {
      title: 'الإجراءات', width: 220,
      render: (_, r) => (
        <div className="flex gap-2">
          <Popconfirm title="هل تريد الموافقة القسرية؟" onConfirm={() => forceDecision(r.processInstanceId, 'APPROVED')} okText="نعم" cancelText="لا">
            <Button size="small" style={{ background: '#16a34a', color: '#fff', borderColor: '#16a34a' }}>موافقة قسرية</Button>
          </Popconfirm>
          <Popconfirm title="هل تريد الرفض القسري؟" onConfirm={() => forceDecision(r.processInstanceId, 'REJECTED')} okText="نعم" cancelText="لا">
            <Button size="small" danger>رفض قسري</Button>
          </Popconfirm>
        </div>
      ),
    },
  ];

  return (
    <Table
      columns={columns}
      dataSource={data}
      rowKey="processInstanceId"
      loading={loading}
      size="small"
      pagination={{ pageSize: 10 }}
    />
  );
};

export default EscalationList;
