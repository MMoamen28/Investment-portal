require('dotenv').config();
const express = require('express');
const cors    = require('cors');
const { connectDB }     = require('./config/db');
const { startConsumer } = require('./services/kafka.service');
const flowableService   = require('./services/flowable.service');

const authRoutes       = require('./routes/auth.routes');
const investmentRoutes = require('./routes/investment.routes');
const taskRoutes       = require('./routes/task.routes');

const app = express();
app.use(cors());
app.use(express.json());

app.use('/api/auth',       authRoutes);
app.use('/api/investment', investmentRoutes);
app.use('/api/tasks',      taskRoutes);
app.get('/api/health', (_req, res) => res.json({ status: 'ok', time: new Date() }));

const PORT = process.env.PORT || 5000;

if (process.env.NODE_ENV !== 'test') {
  (async () => {
    await connectDB();
    try {
      await startConsumer();
      console.log('✅ Kafka consumer started');
    } catch (err) {
      console.warn('⚠️  Kafka unavailable, skipping consumer:', err.message);
    }
    
    try {
      await flowableService.deployProcessIfMissing();
      console.log('✅ Flowable process deployed/verified');
    } catch (err) {
      console.warn('⚠️  Flowable unavailable:', err.message);
    }
    app.listen(PORT, () => console.log(`🚀 Server running on http://localhost:${PORT}`));
  })();
}

module.exports = app;
