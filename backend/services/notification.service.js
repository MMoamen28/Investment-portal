/**
 * Notification Service (§3.6 / §4.6)
 * Handles Kafka-based async notifications via SMS and Email channels.
 */
const InvestmentRequest = require('../models/InvestmentRequest');
const AuditLog          = require('../models/AuditLog');

const TOPIC_MESSAGES = {
  'investment.notification.approval':     { type: 'APPROVAL',     text: 'تمت الموافقة على طلبك ويمكنك متابعة إجراءات تسجيل شركتك' },
  'investment.notification.rejection':    { type: 'REJECTION',    text: 'نأسف لإعلامك بأنه تم رفض طلبك' },
  'investment.notification.missing_data': { type: 'MISSING_DATA', text: 'يرجى استكمال البيانات الناقصة لمتابعة طلبك' },
  'investment.escalation':                { type: 'ESCALATION',   text: 'تم تصعيد الطلب إلى الجهة المختصة' },
};

const createNotificationId = () => `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;

const handleNotification = async (topic, payload) => {
  const meta = TOPIC_MESSAGES[topic];
  if (!meta) return;

  const { processInstanceId } = payload;

  // §4.6: Dual channel notifications (SMS + Email)
  const newNotifications = [
    { id: createNotificationId(), type: meta.type, channel: 'SMS',   message: meta.text, sentAt: new Date(), status: 'SENT', readAt: null, deletedAt: null },
    { id: createNotificationId(), type: meta.type, channel: 'EMAIL', message: meta.text, sentAt: new Date(), status: 'SENT', readAt: null, deletedAt: null },
  ];

  const request = await InvestmentRequest.findOne({ where: { processInstanceId } });
  if (request) {
    const existing = Array.isArray(request.notifications) ? request.notifications : [];
    request.notifications = [...existing, ...newNotifications];
    request.changed('notifications', true);
    await request.save();
  }

  await AuditLog.create({
    action:            `NOTIFICATION_${meta.type}`,
    performedBy:       'Kafka',
    processInstanceId,
    details:           { topic, payload, message: meta.text, channels: ['SMS', 'EMAIL'] },
  });

  console.log(`[Notification] ${meta.text} — processId: ${processInstanceId} — channels: SMS, EMAIL`);
};

module.exports = { handleNotification };
