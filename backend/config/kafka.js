const { Kafka } = require('kafkajs');

const kafka = new Kafka({
  clientId: 'investment-portal',
  brokers: [(process.env.KAFKA_BROKERS || 'localhost:9092').split(',')].flat(),
});

module.exports = kafka;
