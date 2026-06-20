import { Table, Tag, Button, Popconfirm } from 'antd';
import { WarningOutlined, DeleteOutlined, EyeOutlined } from '@ant-design/icons';
import RiskBadge from '../common/RiskBadge';

const EscalationList = ({ data = [], loading, onDelete, onOpen }) => {
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
      title: 'الإجراءات', width: 100,
      render: (_, r) => (
        <div className="flex gap-2">
          <Button size="small" icon={<EyeOutlined />} onClick={() => onOpen?.(r)}>
            فتح
          </Button>
          {onDelete && (
            <Popconfirm title="هل أنت متأكد من الحذف؟" onConfirm={() => onDelete(r.processInstanceId)} okText="نعم" cancelText="لا">
              <Button size="small" type="text" danger icon={<DeleteOutlined />} />
            </Popconfirm>
          )}
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
