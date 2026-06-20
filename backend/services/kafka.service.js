const kafka = require('../config/kafka');
const { handleNotification } = require('./notification.service');

const consumer = kafka.consumer({ groupId: 'notification-group' });
const producer = kafka.producer();

const TOPICS = [
  'investment.notification.approval',
  'investment.notification.rejection',
  'investment.notification.missing_data',
  'investment.escalation',
];

const startConsumer = async () => {
  await consumer.connect();
  await consumer.subscribe({ topics: TOPICS, fromBeginning: false });
  await consumer.run({
    eachMessage: async ({ topic, message }) => {
      try {
        const payload = JSON.parse(message.value.toString());
        await handleNotification(topic, payload);
      } catch (err) {
        console.error('Kafka message error:', err.message);
      }
    },
  });
};

const publishEvent = async (topic, payload) => {
  if (process.env.NODE_ENV === 'test') {
    try {
      await handleNotification(topic, payload);
    } catch (notifErr) {
      console.error('Fallback notification failed:', notifErr.message);
    }
    return;
  }
  try {
    await producer.connect();
    await producer.send({
      topic,
      messages: [{ value: JSON.stringify(payload) }],
    });
  } catch (err) {
    console.warn('Kafka publish failed, falling back to direct notification:', err.message);
    try {
      await handleNotification(topic, payload);
    } catch (notifErr) {
      console.error('Fallback notification failed:', notifErr.message);
    }
  }
};

module.exports = { startConsumer, publishEvent };
