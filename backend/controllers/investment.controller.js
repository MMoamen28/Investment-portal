const InvestmentRequest = require('../models/InvestmentRequest');
const Task = require('../models/Task');
const AuditLog = require('../models/AuditLog');
const { publishEvent } = require('../services/kafka.service');

const getRisk = (amount) => {
  if (amount < 500000)   return { riskLevel: 'LOW',    slaHours: 0  };
  if (amount < 5000000)  return { riskLevel: 'MEDIUM', slaHours: 24 };
  return                        { riskLevel: 'HIGH',   slaHours: 48 };
};

const startInvestment = async (req, res) => {
  try {
    const { investor, company, investment } = req.body;
    const processInstanceId = `INV-${Date.now()}-${Math.random().toString(36).substr(2, 5).toUpperCase()}`;
    const { riskLevel, slaHours } = getRisk(Number(investment.amount));
    const slaDeadline = slaHours > 0 ? new Date(Date.now() + slaHours * 3_600_000) : undefined;

    const isLow = riskLevel === 'LOW';

    const request = await InvestmentRequest.create({
      processInstanceId,
      investor,
      company,
      investment,
      riskLevel,
      status:            isLow ? 'APPROVED'      : 'IN_PROGRESS',
      currentStage:      isLow ? 'AUTO_APPROVED' : 'VERIFICATION',
      approvalsRequired: isLow ? 0               : 3,
      slaDeadline,
      verificationStatus: { nationalId: 'PENDING', taxClearance: 'PENDING' },
      history: [{ stage: 'SUBMITTED', timestamp: new Date(), note: 'تم تقديم الطلب', actor: investor.fullName }],
    });

    if (!isLow) {
      const taskDocs = Array.from({ length: 5 }, (_, i) => ({
        taskId:            `TASK-${processInstanceId}-G${i + 1}`,
        processInstanceId,
        taskName:          'الموافقة على تسجيل الشركة',
        assignedGroup:     `GROUP_${i + 1}`,
        status:            'AVAILABLE',
        slaDeadline,
      }));
      await Task.insertMany(taskDocs);

      // Simulate async verification (8 s)
      setTimeout(async () => {
        try {
          await InvestmentRequest.findOneAndUpdate(
            { processInstanceId },
            {
              'verificationStatus.nationalId':   'VERIFIED',
              'verificationStatus.taxClearance': 'VERIFIED',
              currentStage: 'APPROVAL',
              $push: {
                history: {
                  stage: 'VERIFIED', timestamp: new Date(),
                  note: 'تم التحقق من الهوية الوطنية والإعفاء الضريبي', actor: 'System',
                },
              },
            }
          );
        } catch { /* silent */ }
      }, 8_000);
    }

    await AuditLog.create({
      action: 'INVESTMENT_SUBMITTED',
      performedBy: investor.fullName,
      processInstanceId,
      details: { riskLevel, amount: investment.amount },
    });

    res.status(201).json({ processInstanceId, status: request.status, riskLevel, message: 'تم تقديم طلبك بنجاح' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

const getStatus = async (req, res) => {
  try {
    const request = await InvestmentRequest.findOne({ processInstanceId: req.params.id });
    if (!request) return res.status(404).json({ message: 'الطلب غير موجود' });

    if (request.status === 'IN_PROGRESS' && request.slaDeadline && new Date() > request.slaDeadline && !request.slaBreached) {
      request.slaBreached = true;
      request.status = 'ESCALATED';
      request.history.push({ stage: 'SLA_BREACHED', timestamp: new Date(), note: 'تم تجاوز الميعاد النهائي', actor: 'System' });
      await request.save();
      await AuditLog.create({ action: 'SLA_BREACHED', performedBy: 'System', processInstanceId: request.processInstanceId });
      await publishEvent('investment.escalation', { processInstanceId: request.processInstanceId });
    }

    res.json(request);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

const getAllRequests = async (req, res) => {
  try {
    const { status, riskLevel, investorName, startDate, endDate, page = 1, limit = 20 } = req.query;
    const filter = {};

    if (status)       filter.status    = status;
    if (riskLevel)    filter.riskLevel = riskLevel;
    if (investorName) filter['investor.fullName'] = new RegExp(investorName, 'i');
    if (startDate || endDate) {
      filter.createdAt = {};
      if (startDate) filter.createdAt.$gte = new Date(startDate);
      if (endDate)   filter.createdAt.$lte = new Date(endDate);
    }

    const [total, requests] = await Promise.all([
      InvestmentRequest.countDocuments(filter),
      InvestmentRequest.find(filter).sort({ createdAt: -1 }).skip((page - 1) * limit).limit(Number(limit)),
    ]);

    res.json({ requests, total, page: Number(page), totalPages: Math.ceil(total / limit) });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

const getEscalations = async (req, res) => {
  try {
    const escalations = await InvestmentRequest.find({
      $or: [{ slaBreached: true }, { retryExhausted: true }],
    }).sort({ updatedAt: -1 });
    res.json(escalations);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

const completeData = async (req, res) => {
  try {
    const request = await InvestmentRequest.findOne({ processInstanceId: req.params.id });
    if (!request) return res.status(404).json({ message: 'الطلب غير موجود' });

    const { data } = req.body;
    if (data) {
      if (data.investor)  Object.assign(request.investor,  data.investor);
      if (data.company)   Object.assign(request.company,   data.company);
      if (data.investment)Object.assign(request.investment,data.investment);

      // Map Arabic fields to correct schema paths
      for (const [key, value] of Object.entries(data)) {
        if (key === 'الرقم القومي') {
          request.investor.nationalId = value;
          request.markModified('investor.nationalId');
        } else if (key === 'الإعفاء الضريبي') {
          request.verificationStatus.taxClearance = 'VERIFIED';
          request.markModified('verificationStatus.taxClearance');
        } else if (key === 'عقد الشركة') {
          request.company.name = value;
          request.markModified('company.name');
        } else if (key === 'بيانات الشركاء') {
          if (value !== undefined && value !== null) {
            if (!isNaN(value)) {
              request.investment.partners = Number(value);
              request.markModified('investment.partners');
            } else {
              request.investment.notes = value;
              request.markModified('investment.notes');
            }
          }
        } else if (key === 'رخصة النشاط') {
          request.company.activity = value;
          request.markModified('company.activity');
        } else if (key === 'العنوان') {
          request.company.address = value;
          request.markModified('company.address');
        } else if (key === 'بيانات الاستثمار') {
          if (value !== undefined && value !== null) {
            if (!isNaN(value)) {
              request.investment.amount = Number(value);
              request.markModified('investment.amount');
            } else {
              request.investment.notes = value;
              request.markModified('investment.notes');
            }
          }
        } else if (key === 'مستندات أخرى') {
          request.investment.notes = value;
          request.markModified('investment.notes');
        }
      }
      request.markModified('investor');
      request.markModified('company');
      request.markModified('investment');
      request.markModified('verificationStatus');
    }

    request.status       = 'IN_PROGRESS';
    request.currentStage = 'APPROVAL';
    request.history.push({ stage: 'DATA_COMPLETED', timestamp: new Date(), note: 'تم استكمال البيانات الناقصة', actor: req.user.username });
    await request.save();

    // Reset the task that requested the missing data back to AVAILABLE
    await Task.findOneAndUpdate(
      { processInstanceId: req.params.id, status: 'COMPLETED', decision: 'MISSING_DATA' },
      {
        status: 'AVAILABLE',
        $unset: { decision: 1, completedAt: 1, rejectionReason: 1, missingFields: 1, claimedBy: 1 }
      }
    );

    await AuditLog.create({ action: 'DATA_COMPLETED', performedBy: req.user.username, processInstanceId: req.params.id, details: data });

    res.json({ message: 'تم استكمال البيانات بنجاح', request });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

const getDashboardStats = async (req, res) => {
  try {
    const today = new Date(); today.setHours(0, 0, 0, 0);

    const [total, pending, slaBreached, approvedToday, rejectedToday, byRisk, byStatus, dailySubmissions] =
      await Promise.all([
        InvestmentRequest.countDocuments({ status: 'IN_PROGRESS' }),
        InvestmentRequest.countDocuments({ currentStage: 'APPROVAL' }),
        InvestmentRequest.countDocuments({ slaBreached: true }),
        InvestmentRequest.countDocuments({ status: 'APPROVED', updatedAt: { $gte: today } }),
        InvestmentRequest.countDocuments({ status: 'REJECTED', updatedAt: { $gte: today } }),
        InvestmentRequest.aggregate([{ $group: { _id: '$riskLevel', count: { $sum: 1 } } }]),
        InvestmentRequest.aggregate([{ $group: { _id: '$status',    count: { $sum: 1 } } }]),
        InvestmentRequest.aggregate([
          { $match: { createdAt: { $gte: new Date(Date.now() - 7 * 86_400_000) } } },
          { $group: { _id: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } }, count: { $sum: 1 } } },
          { $sort: { _id: 1 } },
        ]),
      ]);

    res.json({ stats: { total, pending, slaBreached, approvedToday, rejectedToday }, byRisk, byStatus, dailySubmissions });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

module.exports = { startInvestment, getStatus, getAllRequests, getEscalations, completeData, getDashboardStats };
