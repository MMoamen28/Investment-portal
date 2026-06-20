import { Table, Tag, Button, Popconfirm } from 'antd';
import { EyeOutlined, DeleteOutlined } from '@ant-design/icons';
import RiskBadge from '../common/RiskBadge';
import SLATimer from '../common/SLATimer';

const STATUS_COLOR = {
  IN_PROGRESS:  'processing',
  APPROVED:     'success',
  REJECTED:     'error',
  ESCALATED:    'warning',
  MISSING_DATA: 'orange',
};

const STATUS_LABEL = {
  IN_PROGRESS:  'قيد المعالجة',
  APPROVED:     'موافق عليه',
  REJECTED:     'مرفوض',
  ESCALATED:    'مُصعَّد',
  MISSING_DATA: 'بيانات ناقصة',
};

const RequestsTable = ({ data = [], loading, pagination, onChange, onDelete }) => {
  const columns = [
    { title: 'رقم الطلب', dataIndex: 'processInstanceId', width: 160, render: (v) => <span className="text-xs font-mono">{v}</span> },
    { title: 'المستثمر',  dataIndex: ['investor', 'fullName'], width: 140 },
    { title: 'الشركة',    dataIndex: ['company', 'name'], width: 140 },
    {
      title: 'رأس المال', dataIndex: ['investment', 'amount'], width: 130,
      render: (v) => v ? `${Number(v).toLocaleString('ar-EG')} ج` : '—',
      sorter: true,
    },
    { title: 'المخاطرة', dataIndex: 'riskLevel', width: 90, render: (v) => <RiskBadge level={v} size="sm" /> },
    {
      title: 'الحالة', dataIndex: 'status', width: 120,
      render: (v) => <Tag color={STATUS_COLOR[v]}>{STATUS_LABEL[v] || v}</Tag>,
    },
    { title: 'الميعاد النهائي', dataIndex: 'slaDeadline', width: 150, render: (v, r) => <SLATimer deadline={v} breached={r.slaBreached} status={r.status} /> },
    {
      title: 'تاريخ التقديم', dataIndex: 'createdAt', width: 120,
      render: (v) => new Date(v).toLocaleDateString('ar-EG'),
    },
  ];

  if (onDelete) {
    columns.push({
      title: 'إجراء',
      key: 'action',
      width: 80,
      fixed: 'right',
      render: (_, r) => (
        <Popconfirm
          title="هل أنت متأكد من حذف هذا الطلب؟"
          onConfirm={() => onDelete(r.processInstanceId)}
          okText="نعم"
          cancelText="لا"
        >
          <Button type="text" danger icon={<DeleteOutlined />} />
        </Popconfirm>
      )
    });
  }

  return (
    <Table
      columns={columns}
      dataSource={data}
      rowKey="processInstanceId"
      loading={loading}
      pagination={pagination}
      onChange={onChange}
      scroll={{ x: 900 }}
      size="small"
    />
  );
};

export default RequestsTable;
