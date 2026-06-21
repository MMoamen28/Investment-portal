const { Op, fn, col, literal } = require('sequelize');
const sequelize         = require('../config/sequelize');
const InvestmentRequest = require('../models/InvestmentRequest');
const Task              = require('../models/Task');
const AuditLog          = require('../models/AuditLog');
const { publishEvent }  = require('../services/kafka.service');
const {
  verifyNationalId,
  verifyTaxClearance,
  registerCompany,
} = require('../services/external.service');
const { triggerFlowableRegistrationFlow } = require('../services/flowable-registration.service');

const flowableService = require('../services/flowable.service');

/* ────────────────── Helper: push to JSONB array ────────────────── */
const pushHistory = (request, entry) => {
  const hist = Array.isArray(request.history) ? [...request.history] : [];
  hist.push({ ...entry, timestamp: new Date() });
  request.history = hist;
};

const pushNotification = (request, entry) => {
  const notifs = Array.isArray(request.notifications) ? [...request.notifications] : [];
  notifs.push({ ...entry, sentAt: new Date() });
  request.notifications = notifs;
};

/* ────────────────── Parallel Verification (§3.3 / §4.2) ────────────────── */
const runParallelVerification = async (processInstanceId, investor) => {
  const request = await InvestmentRequest.findOne({ where: { processInstanceId } });
  if (!request) return;

  // Execute both verifications in parallel
  const [nationalIdResult, taxResult] = await Promise.allSettled([
    verifyNationalId(investor.nationalId, investor.fullName),
    verifyTaxClearance(investor.nationalId),
  ]);

  const nationalIdStatus   = nationalIdResult.status  === 'fulfilled' && nationalIdResult.value.verified  ? 'VERIFIED' : 'FAILED';
  const taxClearanceStatus = taxResult.status          === 'fulfilled' && taxResult.value.cleared          ? 'VERIFIED' : 'FAILED';

  const verificationStatus = { nationalId: nationalIdStatus, taxClearance: taxClearanceStatus };
  const bothVerified = nationalIdStatus === 'VERIFIED' && taxClearanceStatus === 'VERIFIED';

  pushHistory(request, {
    stage: bothVerified ? 'VERIFIED' : 'VERIFICATION_FAILED',
    note:  bothVerified
      ? 'تم التحقق من الهوية الوطنية والإعفاء الضريبي بنجاح'
      : `فشل التحقق — الهوية: ${nationalIdStatus}, الإعفاء الضريبي: ${taxClearanceStatus}`,
    actor: 'System',
  });

  request.verificationStatus = verificationStatus;

  if (!bothVerified) {
    request.status       = 'ESCALATED';
    request.currentStage = 'VERIFICATION_FAILED';
    request.retryExhausted = true;
    request.changed('history', true);
    request.changed('verificationStatus', true);
    await request.save();
    await publishEvent('investment.escalation', { processInstanceId, reason: 'VERIFICATION_FAILED' });
    return;
  }

  // Verification passed. Now route based on risk level.
  const isLow = request.riskLevel === 'LOW';

  if (isLow) {
    request.status       = 'APPROVED';
    request.currentStage = 'AUTO_APPROVED';

    setTimeout(async () => {
      await triggerFlowableRegistrationFlow(processInstanceId, request.company, request.investment);
    }, 2_000);

    await publishEvent('investment.notification.approval', { processInstanceId });
  } else {
    request.currentStage = 'APPROVAL';
    
    const taskDocs = Array.from({ length: 5 }, (_, i) => ({
      taskId:            `TASK-${processInstanceId}-G${i + 1}`,
      processInstanceId,
      taskName:          'الموافقة على تسجيل الشركة',
      assignedGroup:     `GROUP_${i + 1}`,
      status:            'AVAILABLE',
      slaDeadline:       request.slaDeadline,
    }));
    await Task.bulkCreate(taskDocs);
  }

  request.changed('history', true);
  request.changed('verificationStatus', true);
  await request.save();
};

/* ────────────────── Process Initiation (§4.1) ────────────────── */
const startInvestment = async (req, res) => {
  try {
    const { investor, company, investment } = req.body;

    if (!investor?.fullName || !investor?.nationalId || !investment?.amount) {
      return res.status(400).json({ message: 'بيانات ناقصة: يرجى توفير بيانات المستثمر والاستثمار' });
    }

    // Attach the logged in userId to link the request
    if (req.user?.userId) {
      investor.userId = req.user.userId;
    }

    const processInstanceId = `INV-${Date.now()}-${Math.random().toString(36).substr(2, 5).toUpperCase()}`;
    const { riskLevel, slaHours } = await flowableService.evaluateRisk(Number(investment.amount));
    const slaDeadline = slaHours > 0 ? new Date(Date.now() + slaHours * 3_600_000) : null;
    const isLow = riskLevel === 'LOW';

    const request = await InvestmentRequest.create({
      processInstanceId,
      investor,
      company,
      investment,
      riskLevel,
      status:             'IN_PROGRESS',
      currentStage:       'VERIFICATION',
      approvalsRequired:  isLow ? 0 : 3,
      slaDeadline,
      verificationStatus: { nationalId: 'PENDING', taxClearance: 'PENDING' },
      history: [{
        stage:     'SUBMITTED',
        timestamp: new Date(),
        note:      'تم تقديم الطلب',
        actor:     investor.fullName,
      }],
    });

    // Always run parallel verification
    setTimeout(async () => {
      try {
        await runParallelVerification(processInstanceId, investor);
      } catch (err) {
        console.error('Parallel verification error:', err.message);
      }
    }, 5_000);

    await AuditLog.create({
      action:            'INVESTMENT_SUBMITTED',
      performedBy:       investor.fullName,
      processInstanceId,
      details:           { riskLevel, amount: investment.amount },
    });

    res.status(201).json({
      processInstanceId,
      status:    request.status,
      riskLevel,
      slaDeadline,
      message:   'تم تقديم طلبك بنجاح',
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

/* ────────────────── Get Status + SLA Check (§3.4 / §4.4) ────────────────── */
const getStatus = async (req, res) => {
  try {
    const request = await InvestmentRequest.findOne({ where: { processInstanceId: req.params.id } });
    if (!request) return res.status(404).json({ message: 'الطلب غير موجود' });

    // SLA breach detection (§3.4)
    if (
      request.status === 'IN_PROGRESS' &&
      request.slaDeadline &&
      new Date() > new Date(request.slaDeadline) &&
      !request.slaBreached
    ) {
      request.slaBreached  = true;
      request.status       = 'ESCALATED';
      request.currentStage = 'ESCALATED';
      pushHistory(request, {
        stage: 'SLA_BREACHED',
        note:  `تم تجاوز الميعاد النهائي (${request.riskLevel === 'MEDIUM' ? '24' : '48'} ساعة)`,
        actor: 'System',
      });
      request.changed('history', true);
      await request.save();
      await Task.destroy({ where: { processInstanceId: request.processInstanceId } });
      await AuditLog.create({ action: 'SLA_BREACHED', performedBy: 'System', processInstanceId: request.processInstanceId });
      await publishEvent('investment.escalation', { processInstanceId: request.processInstanceId, reason: 'SLA_BREACH' });
    }

    res.json(request);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

/* ────────────────── Get My Requests (Investor) ────────────────── */
const getMyRequests = async (req, res) => {
  try {
    const { page = 1, limit = 20 } = req.query;
    const offset = (Number(page) - 1) * Number(limit);
    
    const User = require('../models/User');
    const user = await User.findByPk(req.user.userId);
    
    const whereConditions = [];
    if (req.user?.userId) {
      whereConditions.push(literal(`investor->>'userId' = '${req.user.userId}'`));
    }
    if (user?.email) {
      whereConditions.push(literal(`investor->>'email' = '${user.email.replace(/'/g, "''")}'`));
    }
    if (user?.phone) {
      whereConditions.push(literal(`investor->>'phone' = '${user.phone.replace(/'/g, "''")}'`));
    }

    const where = whereConditions.length > 0 ? { [Op.or]: whereConditions } : {};

    const { count: total, rows: requests } = await InvestmentRequest.findAndCountAll({
      where,
      order: [['createdAt', 'DESC']],
      limit: Number(limit),
      offset,
    });

    res.json({ requests, total, page: Number(page), totalPages: Math.ceil(total / Number(limit)) });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

/* ────────────────── Get All Requests ────────────────── */
const getAllRequests = async (req, res) => {
  try {
    const { status, riskLevel, investorName, startDate, endDate, page = 1, limit = 20 } = req.query;
    const where = {};

    if (status) where.status = status;
    if (riskLevel) where.riskLevel = riskLevel;

    // JSONB field filtering for investor name
    if (investorName) {
      where[Op.and] = [
        literal(`investor->>'fullName' ILIKE '%${investorName.replace(/'/g, "''")}%'`),
      ];
    }

    if (startDate || endDate) {
      where.createdAt = {};
      if (startDate) where.createdAt[Op.gte] = new Date(startDate);
      if (endDate)   where.createdAt[Op.lte] = new Date(endDate);
    }

    const offset = (Number(page) - 1) * Number(limit);
    const { count: total, rows: requests } = await InvestmentRequest.findAndCountAll({
      where,
      order:  [['createdAt', 'DESC']],
      limit:  Number(limit),
      offset,
    });

    res.json({ requests, total, page: Number(page), totalPages: Math.ceil(total / Number(limit)) });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

/* ────────────────── Get Escalations ────────────────── */
const getEscalations = async (req, res) => {
  try {
    const now = new Date();
    const escalations = await InvestmentRequest.findAll({
      where: {
        [Op.and]: [
          { status: { [Op.notIn]: ['APPROVED', 'REJECTED'] } },
          {
            [Op.or]: [
              { slaBreached: true },
              { retryExhausted: true },
              { status: 'ESCALATED' },
              { slaDeadline: { [Op.lt]: now } },
            ],
          },
        ],
      },
      order: [['updatedAt', 'DESC']],
    });
    res.json(escalations);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

/* ────────────────── Manager Escalation Decision ────────────────── */
const decideEscalation = async (req, res) => {
  try {
    const { decision, reason } = req.body;
    const request = await InvestmentRequest.findOne({ where: { processInstanceId: req.params.id } });

    if (!request) return res.status(404).json({ message: 'الطلب غير موجود' });
    if (!['APPROVED', 'REJECTED'].includes(decision)) {
      return res.status(400).json({ message: 'قرار غير صالح' });
    }

    request.status = decision;
    request.currentStage = decision;
    request.slaBreached = true;

    if (decision === 'APPROVED') {
      pushHistory(request, {
        stage: 'MANAGER_APPROVED',
        note: 'تمت الموافقة من صفحة التصعيدات',
        actor: req.user.username,
      });
      request.changed('history', true);
      await request.save();

      setTimeout(async () => {
        await triggerFlowableRegistrationFlow(request.processInstanceId, request.company, request.investment);
      }, 3_000);

      await publishEvent('investment.notification.approval', { processInstanceId: request.processInstanceId });
    } else {
      pushHistory(request, {
        stage: 'MANAGER_REJECTED',
        note: reason ? `تم الرفض من صفحة التصعيدات: ${reason}` : 'تم الرفض من صفحة التصعيدات',
        actor: req.user.username,
      });
      request.changed('history', true);
      await request.save();
      await publishEvent('investment.notification.rejection', { processInstanceId: request.processInstanceId });
    }

    await AuditLog.create({
      action: `ESCALATION_${decision}`,
      performedBy: req.user.username,
      processInstanceId: request.processInstanceId,
      details: { reason },
    });

    res.json({ message: `تم ${decision === 'APPROVED' ? 'الموافقة' : 'الرفض'} بنجاح`, request });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

/* ────────────────── Complete Missing Data (§4.8) ────────────────── */
const completeData = async (req, res) => {
  try {
    const request = await InvestmentRequest.findOne({ where: { processInstanceId: req.params.id } });
    if (!request) return res.status(404).json({ message: 'الطلب غير موجود' });

    const { data } = req.body;

    if (data) {
      const investor   = { ...request.investor };
      const company    = { ...request.company };
      const investment = { ...request.investment };
      const verStatus  = { ...request.verificationStatus };

      if (data.investor)   Object.assign(investor,   data.investor);
      if (data.company)    Object.assign(company,    data.company);
      if (data.investment) Object.assign(investment, data.investment);

      // Map Arabic field keys to schema paths
      for (const [key, value] of Object.entries(data)) {
        if (key === 'الرقم القومي')        { investor.nationalId = value; }
        else if (key === 'الإعفاء الضريبي') { verStatus.taxClearance = 'VERIFIED'; }
        else if (key === 'عقد الشركة')      { company.name = value; }
        else if (key === 'بيانات الشركاء')  { investment.partners = isNaN(value) ? undefined : Number(value); }
        else if (key === 'رخصة النشاط')     { company.activity = value; }
        else if (key === 'العنوان')         { company.address = value; }
        else if (key === 'بيانات الاستثمار') { if (!isNaN(value)) investment.amount = Number(value); }
        else if (key === 'مستندات أخرى')   { investment.notes = value; }
      }

      request.investor   = investor;
      request.company    = company;
      request.investment = investment;
      request.verificationStatus = verStatus;
    }

    // 1. Re-evaluate risk (BPMN: Populate investment risk variable)
    const { riskLevel, slaHours } = await flowableService.evaluateRisk(Number(request.investment.amount));
    const slaDeadline = slaHours > 0 ? new Date(Date.now() + slaHours * 3_600_000) : null;
    const isLow = riskLevel === 'LOW';

    request.riskLevel = riskLevel;
    request.slaDeadline = slaDeadline;
    request.approvalsReceived = 0; // Reset approvals

    // 2. Clear previous tasks (BPMN: Assign actor to approve)
    await Task.destroy({ where: { processInstanceId: req.params.id } });

    if (isLow) {
      request.status       = 'APPROVED';
      request.currentStage = 'AUTO_APPROVED';
      request.approvalsRequired = 0;

      setTimeout(async () => {
        await triggerFlowableRegistrationFlow(req.params.id, request.company, request.investment);
      }, 2_000);

      await publishEvent('investment.notification.approval', { processInstanceId: req.params.id });

      pushHistory(request, {
        stage: 'DATA_COMPLETED',
        note:  `تم استكمال البيانات وإعادة التقييم (المخاطرة: ${riskLevel}) - موافقة تلقائية`,
        actor: req.user.username,
      });

    } else {
      request.status       = 'IN_PROGRESS';
      request.currentStage = 'APPROVAL';
      request.approvalsRequired = 3;

      // Create new fresh approval tasks
      const timestamp = Date.now();
      const taskDocs = Array.from({ length: 5 }, (_, i) => ({
        taskId:            `TASK-${req.params.id}-R${timestamp}-G${i + 1}`,
        processInstanceId: req.params.id,
        taskName:          'الموافقة على تسجيل الشركة (بعد استكمال البيانات)',
        assignedGroup:     `GROUP_${i + 1}`,
        status:            'AVAILABLE',
        slaDeadline,
      }));
      await Task.bulkCreate(taskDocs);

      pushHistory(request, {
        stage: 'DATA_COMPLETED',
        note:  `تم استكمال البيانات وإعادة التقييم (المخاطرة: ${riskLevel}) - بدء دورة موافقات جديدة`,
        actor: req.user.username,
      });
    }

    request.changed('investor',            true);
    request.changed('company',             true);
    request.changed('investment',          true);
    request.changed('verificationStatus',  true);
    request.changed('history',             true);
    await request.save();

    await AuditLog.create({
      action:            'DATA_COMPLETED',
      performedBy:       req.user.username,
      processInstanceId: req.params.id,
      details:           data,
    });

    res.json({ message: 'تم استكمال البيانات بنجاح', request });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

/* ────────────────── Dashboard Stats ────────────────── */
const getDashboardStats = async (req, res) => {
  try {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const [
      total, pending, slaBreached,
      approvedToday, rejectedToday,
      byRisk, byStatus, dailySubmissions,
    ] = await Promise.all([
      InvestmentRequest.count({ where: { status: 'IN_PROGRESS' } }),
      InvestmentRequest.count({ where: { currentStage: 'APPROVAL' } }),
      InvestmentRequest.count({ where: { slaBreached: true } }),
      InvestmentRequest.count({ where: { status: 'APPROVED',  updatedAt: { [Op.gte]: today } } }),
      InvestmentRequest.count({ where: { status: 'REJECTED',  updatedAt: { [Op.gte]: today } } }),

      // Group by riskLevel
      InvestmentRequest.findAll({
        attributes: ['riskLevel', [fn('COUNT', col('id')), 'count']],
        group:      ['riskLevel'],
        raw:        true,
      }),

      // Group by status
      InvestmentRequest.findAll({
        attributes: ['status', [fn('COUNT', col('id')), 'count']],
        group:      ['status'],
        raw:        true,
      }),

      // Daily submissions (last 7 days)
      sequelize.query(
        `SELECT DATE("createdAt") AS "_id", COUNT(id) AS "count"
         FROM investment_requests
         WHERE "createdAt" >= NOW() - INTERVAL '7 days'
         GROUP BY DATE("createdAt")
         ORDER BY "_id" ASC`,
        { type: sequelize.QueryTypes.SELECT }
      ),
    ]);

    res.json({
      stats: { total, pending, slaBreached, approvedToday, rejectedToday },
      byRisk:           byRisk.map(r => ({ _id: r.riskLevel, count: parseInt(r.count) })),
      byStatus:         byStatus.map(r => ({ _id: r.status,    count: parseInt(r.count) })),
      dailySubmissions: dailySubmissions.map(r => ({ _id: r._id, count: parseInt(r.count) })),
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

/* ────────────────── Delete Investment (Manager) ────────────────── */
const deleteInvestment = async (req, res) => {
  try {
    const request = await InvestmentRequest.findOne({ where: { processInstanceId: req.params.id } });
    if (!request) return res.status(404).json({ message: 'الطلب غير موجود' });

    // Delete associated tasks
    const Task = require('../models/Task');
    await Task.destroy({ where: { processInstanceId: req.params.id } });

    // Delete associated audit logs
    const AuditLog = require('../models/AuditLog');
    await AuditLog.destroy({ where: { processInstanceId: req.params.id } });

    // Delete request
    await request.destroy();

    res.json({ message: 'تم حذف الطلب بنجاح' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

/* ────────────────── Get All Notifications for User ────────────────── */
const getUserNotifications = async (req, res) => {
  try {
    const { Op, sequelize } = require('sequelize');

    let requests = [];

    if (req.user?.role === 'INVESTOR') {
      // Investors only see notifications for their own requests.
      requests = await InvestmentRequest.findAll({
        where: sequelize.where(
          sequelize.json('investor.userId'),
          Op.eq,
          req.user?.userId
        ),
        attributes: ['processInstanceId', 'notifications'],
      });
    } else {
      // Managers and employees see system notifications across the portal.
      requests = await InvestmentRequest.findAll({
        attributes: ['processInstanceId', 'notifications'],
        order: [['updatedAt', 'DESC']],
      });
    }

    // Aggregate all notifications from all investments
    const allNotifications = requests.flatMap((r) => {
      const notifs = Array.isArray(r.notifications) ? r.notifications : [];
      return notifs
        .filter((n) => !n.deletedAt)
        .map((n) => ({ ...n, processInstanceId: r.processInstanceId }));
    });

    // Sort by most recent first
    allNotifications.sort((a, b) => new Date(b.sentAt) - new Date(a.sentAt));

    res.json({ notifications: allNotifications });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

const markNotificationRead = async (req, res) => {
  try {
    const { notificationId } = req.params;
    const requests = await InvestmentRequest.findAll({
      where: sequelize.where(sequelize.json('investor.userId'), Op.eq, req.user?.userId),
      attributes: ['processInstanceId', 'notifications'],
    });

    let updated = false;
    for (const request of requests) {
      const notifications = Array.isArray(request.notifications) ? [...request.notifications] : [];
      const next = notifications.map((notification) => {
        if (notification.id !== notificationId) return notification;
        updated = true;
        return { ...notification, status: 'READ', readAt: new Date() };
      });
      if (updated) {
        request.notifications = next;
        request.changed('notifications', true);
        await request.save();
        break;
      }
    }

    if (!updated) return res.status(404).json({ message: 'الإشعار غير موجود' });
    res.json({ message: 'تمت قراءة الإشعار بنجاح' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

const deleteNotification = async (req, res) => {
  try {
    const { notificationId } = req.params;
    const requests = await InvestmentRequest.findAll({
      where: sequelize.where(sequelize.json('investor.userId'), Op.eq, req.user?.userId),
      attributes: ['processInstanceId', 'notifications'],
    });

    let updated = false;
    for (const request of requests) {
      const notifications = Array.isArray(request.notifications) ? [...request.notifications] : [];
      const filtered = notifications.filter((notification) => notification.id !== notificationId);
      if (filtered.length !== notifications.length) {
        updated = true;
        request.notifications = filtered;
        request.changed('notifications', true);
        await request.save();
        break;
      }
    }

    if (!updated) return res.status(404).json({ message: 'الإشعار غير موجود' });
    res.json({ message: 'تم حذف الإشعار بنجاح' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

module.exports = { startInvestment, getStatus, getMyRequests, getAllRequests, getEscalations, decideEscalation, completeData, getDashboardStats, deleteInvestment, getUserNotifications, markNotificationRead, deleteNotification };
