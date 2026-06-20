import { Card, Tag, Spin } from 'antd';
import { CheckCircleOutlined, CloseCircleOutlined, SyncOutlined, IdcardOutlined, AuditOutlined } from '@ant-design/icons';

const STATUS_CFG = {
  PENDING:  { icon: <SyncOutlined spin />, color: 'processing', label: 'جاري التحقق' },
  VERIFIED: { icon: <CheckCircleOutlined />, color: 'success',  label: 'تم التحقق' },
  FAILED:   { icon: <CloseCircleOutlined />, color: 'error',    label: 'فشل التحقق' },
};

const VerificationCard = ({ title, icon, status }) => {
  const cfg = STATUS_CFG[status] || STATUS_CFG.PENDING;
  return (
    <Card size="small" className="flex-1 text-center border-2" bodyStyle={{ padding: '16px 12px' }}>
      <div className="text-3xl mb-2 text-[#1e3a5f]">{icon}</div>
      <div className="font-semibold text-sm mb-2 text-gray-700">{title}</div>
      <Tag color={cfg.color} icon={cfg.icon}>{cfg.label}</Tag>
    </Card>
  );
};

const VerificationStatus = ({ verificationStatus = {} }) => (
  <div>
    <h4 className="font-semibold text-[#1e3a5f] mb-3">حالة التحقق الموازي</h4>
    <div className="flex gap-3">
      <VerificationCard title="التحقق من الهوية الوطنية" icon={<IdcardOutlined />} status={verificationStatus.nationalId} />
      <VerificationCard title="الإعفاء الضريبي" icon={<AuditOutlined />} status={verificationStatus.taxClearance} />
    </div>
  </div>
);

export default VerificationStatus;
