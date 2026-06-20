const InvestmentRequest = require('../models/InvestmentRequest');
const AuditLog = require('../models/AuditLog');

const TOPIC_MESSAGES = {
  'investment.notification.approval':      { type: 'APPROVAL',      text: 'تمت الموافقة على طلبك' },
  'investment.notification.rejection':     { type: 'REJECTION',     text: 'تم رفض طلبك' },
  'investment.notification.missing_data':  { type: 'MISSING_DATA',  text: 'يرجى استكمال البيانات الناقصة' },
  'investment.escalation':                 { type: 'ESCALATION',    text: 'تم تصعيد الطلب' },
};

const handleNotification = async (topic, payload) => {
  const meta = TOPIC_MESSAGES[topic];
  if (!meta) return;

  const { processInstanceId } = payload;

  await InvestmentRequest.findOneAndUpdate(
    { processInstanceId },
    {
      $push: {
        notifications: {
          type: meta.type,
          channel: 'SMS',
          sentAt: new Date(),
          status: 'SENT',
        },
      },
    }
  );

  await AuditLog.create({
    action: `NOTIFICATION_${meta.type}`,
    performedBy: 'Kafka',
    processInstanceId,
    details: { topic, payload, message: meta.text },
  });

  console.log(`[Notification] ${meta.text} — processId: ${processInstanceId}`);
};

module.exports = { handleNotification };
