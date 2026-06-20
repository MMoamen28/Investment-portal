import { useState } from 'react';
import { Modal, Descriptions, Button, Input, Select, Checkbox, message, Divider } from 'antd';
import { CheckOutlined, CloseOutlined, WarningOutlined } from '@ant-design/icons';
import RiskBadge from '../common/RiskBadge';
import SLATimer from '../common/SLATimer';

const MISSING_OPTIONS = [
  'الرقم القومي', 'الإعفاء الضريبي', 'عقد الشركة', 'بيانات الشركاء',
  'رخصة النشاط', 'العنوان', 'بيانات الاستثمار', 'مستندات أخرى',
];

const Item = Descriptions.Item;

const TaskDetailModal = ({ open, task, request, onClose, onComplete }) => {
  const [decision,      setDecision]      = useState(null);
  const [reason,        setReason]        = useState('');
  const [missingFields, setMissingFields] = useState([]);
  const [loading,       setLoading]       = useState(false);

  const handleSubmit = async () => {
    if (!decision) return message.warning('اختر القرار أولاً');
    if (decision === 'REJECTED' && !reason.trim()) return message.warning('يجب إدخال سبب الرفض');
    if (decision === 'MISSING_DATA' && missingFields.length === 0) return message.warning('اختر الحقول الناقصة');

    setLoading(true);
    try {
      await onComplete(task.taskId, { decision, reason, missingFields });
      message.success('تم إكمال المهمة بنجاح');
      onClose();
    } catch {
      message.error('حدث خطأ أثناء إكمال المهمة');
    } finally { setLoading(false); }
  };

  const inv = request?.investor || {};
  const com = request?.company  || {};
  const inv_ = request?.investment || {};

  return (
    <Modal
      open={open}
      onCancel={onClose}
      title={<span className="text-[#1e3a5f] font-bold">تفاصيل المهمة: {task?.taskId}</span>}
      width={700}
      footer={null}
    >
      {task && (
        <>
          <div className="flex items-center gap-3 mb-4">
            <RiskBadge level={request?.riskLevel} />
            <SLATimer deadline={task.slaDeadline} breached={task.slaBreached} />
          </div>

          <Descriptions bordered column={2} size="small" className="mb-4">
            <Item label="المستثمر">{inv.fullName}</Item>
            <Item label="الرقم القومي"><span dir="ltr">{inv.nationalId}</span></Item>
            <Item label="البريد الإلكتروني"><span dir="ltr">{inv.email}</span></Item>
            <Item label="الهاتف"><span dir="ltr">{inv.phone}</span></Item>
            <Item label="اسم الشركة">{com.name}</Item>
            <Item label="الشكل القانوني">{com.type}</Item>
            <Item label="النشاط">{com.activity}</Item>
            <Item label="العنوان">{com.address}</Item>
            <Item label="رأس المال" span={2}>
              <strong>{Number(inv_.amount || 0).toLocaleString('ar-EG')} جنيه</strong>
            </Item>
          </Descriptions>

          <Divider>القرار</Divider>

          <div className="flex gap-3 mb-4">
            <Button
              block type={decision === 'APPROVED' ? 'primary' : 'default'}
              style={decision === 'APPROVED' ? { background: '#16a34a' } : {}}
              icon={<CheckOutlined />}
              onClick={() => setDecision('APPROVED')}
            >
              موافقة
            </Button>
            <Button
              block danger type={decision === 'REJECTED' ? 'primary' : 'default'}
              icon={<CloseOutlined />}
              onClick={() => setDecision('REJECTED')}
            >
              رفض
            </Button>
            <Button
              block type={decision === 'MISSING_DATA' ? 'primary' : 'default'}
              style={decision === 'MISSING_DATA' ? { background: '#d97706' } : {}}
              icon={<WarningOutlined />}
              onClick={() => setDecision('MISSING_DATA')}
            >
              بيانات ناقصة
            </Button>
          </div>

          {decision === 'REJECTED' && (
            <Input.TextArea
              rows={3}
              placeholder="سبب الرفض..."
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              className="mb-4"
            />
          )}

          {decision === 'MISSING_DATA' && (
            <div className="mb-4">
              <p className="text-sm text-gray-600 mb-2">اختر الحقول الناقصة:</p>
              <Checkbox.Group
                options={MISSING_OPTIONS.map((o) => ({ label: o, value: o }))}
                value={missingFields}
                onChange={setMissingFields}
                className="flex flex-wrap gap-2"
              />
            </div>
          )}

          <div className="flex justify-end gap-3 mt-4">
            <Button onClick={onClose}>إلغاء</Button>
            <Button
              type="primary"
              loading={loading}
              disabled={!decision}
              onClick={handleSubmit}
              style={{ background: '#1e3a5f' }}
            >
              تأكيد القرار
            </Button>
          </div>
        </>
      )}
    </Modal>
  );
};

export default TaskDetailModal;
