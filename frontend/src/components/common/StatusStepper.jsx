import { Steps } from 'antd';

const STAGES = [
  { key: 'SUBMITTED',           label: 'تقديم الطلب' },
  { key: 'VERIFICATION',        label: 'التحقق' },
  { key: 'APPROVAL',            label: 'المراجعة والموافقة' },
  { key: 'COMPANY_REGISTRATION',label: 'تسجيل الشركة' },
  { key: 'NOTIFIED',            label: 'الإشعار' },
];

const TERMINAL = { APPROVED: 'finish', REJECTED: 'error', ESCALATED: 'error', AUTO_APPROVED: 'finish' };

const StatusStepper = ({ currentStage, status }) => {
  const idx = STAGES.findIndex((s) => s.key === currentStage);
  const current = idx >= 0 ? idx : 0;

  return (
    <Steps
      current={current}
      status={TERMINAL[status] || 'process'}
      size="small"
      direction="horizontal"
      className="my-4"
      items={STAGES.map((s) => ({ title: s.label }))}
    />
  );
};

export default StatusStepper;
