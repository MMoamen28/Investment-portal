const Task = require('../models/Task');
const InvestmentRequest = require('../models/InvestmentRequest');
const AuditLog = require('../models/AuditLog');
const { publishEvent } = require('../services/kafka.service');

const getTasks = async (req, res) => {
  try {
    const { group, status } = req.query;
    const filter = {};
    if (group)  filter.assignedGroup = group;
    if (status) filter.status = status;
    else        filter.status = { $in: ['AVAILABLE', 'CLAIMED'] };

    const tasks = await Task.find(filter).sort({ createdAt: -1 });

    const enriched = await Promise.all(
      tasks.map(async (t) => {
        const req_ = await InvestmentRequest.findOne({ processInstanceId: t.processInstanceId });
        return {
          ...t.toObject(),
          investorName: req_?.investor?.fullName,
          companyName:  req_?.company?.name,
          riskLevel:    req_?.riskLevel,
          amount:       req_?.investment?.amount,
        };
      })
    );

    res.json(enriched);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

const getTaskDetails = async (req, res) => {
  try {
    const task = await Task.findOne({ taskId: req.params.id });
    if (!task) return res.status(404).json({ message: 'المهمة غير موجودة' });
    const request = await InvestmentRequest.findOne({ processInstanceId: task.processInstanceId });
    res.json({ task, request });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

const claimTask = async (req, res) => {
  try {
    const task = await Task.findOne({ taskId: req.params.id });
    if (!task)                      return res.status(404).json({ message: 'المهمة غير موجودة' });
    if (task.status !== 'AVAILABLE') return res.status(400).json({ message: 'المهمة محجوزة بالفعل' });

    task.status    = 'CLAIMED';
    task.claimedBy = req.user.username;
    await task.save();

    await AuditLog.create({ action: 'TASK_CLAIMED', performedBy: req.user.username, processInstanceId: task.processInstanceId, taskId: task.taskId });

    res.json({ message: 'تم حجز المهمة بنجاح', task });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

const completeTask = async (req, res) => {
  try {
    const { decision, reason, missingFields } = req.body;
    const task = await Task.findOne({ taskId: req.params.id });
    if (!task) return res.status(404).json({ message: 'المهمة غير موجودة' });

    task.status      = 'COMPLETED';
    task.decision    = decision;
    task.completedAt = new Date();
    if (reason)        task.rejectionReason = reason;
    if (missingFields) task.missingFields   = missingFields;
    await task.save();

    const request = await InvestmentRequest.findOne({ processInstanceId: task.processInstanceId });
    if (request) {
      if (decision === 'APPROVED') {
        request.approvalsReceived = (request.approvalsReceived || 0) + 1;
        if (request.approvalsReceived >= request.approvalsRequired) {
          request.status       = 'APPROVED';
          request.currentStage = 'COMPANY_REGISTRATION';
          request.history.push({ stage: 'FULLY_APPROVED', timestamp: new Date(), note: `تمت الموافقة الكاملة (${request.approvalsReceived}/${request.approvalsRequired})`, actor: req.user.username });
          await request.save();
          await publishEvent('investment.notification.approval', { processInstanceId: request.processInstanceId });
        } else {
          request.history.push({ stage: 'PARTIAL_APPROVAL', timestamp: new Date(), note: `موافقة جزئية (${request.approvalsReceived}/${request.approvalsRequired})`, actor: req.user.username });
          await request.save();
        }
      } else if (decision === 'REJECTED') {
        request.status       = 'REJECTED';
        request.currentStage = 'REJECTED';
        request.history.push({ stage: 'REJECTED', timestamp: new Date(), note: `تم رفض الطلب: ${reason}`, actor: req.user.username });
        await request.save();
        await publishEvent('investment.notification.rejection', { processInstanceId: request.processInstanceId });
      } else if (decision === 'MISSING_DATA') {
        request.status       = 'MISSING_DATA';
        request.currentStage = 'MISSING_DATA';
        request.history.push({ stage: 'MISSING_DATA', timestamp: new Date(), note: `بيانات ناقصة: ${missingFields?.join('، ')}`, actor: req.user.username });
        await request.save();
        await publishEvent('investment.notification.missing_data', { processInstanceId: request.processInstanceId });
      }
    }

    await AuditLog.create({ action: 'TASK_COMPLETED', performedBy: req.user.username, processInstanceId: task.processInstanceId, taskId: task.taskId, details: { decision, reason, missingFields } });

    res.json({ message: 'تم إكمال المهمة بنجاح', task });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

module.exports = { getTasks, getTaskDetails, claimTask, completeTask };
