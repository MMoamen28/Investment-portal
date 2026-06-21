const Task              = require('../models/Task');
const InvestmentRequest = require('../models/InvestmentRequest');
const AuditLog          = require('../models/AuditLog');
const { publishEvent }  = require('../services/kafka.service');
const { triggerFlowableRegistrationFlow } = require('../services/flowable-registration.service');

/* ────────────────── Helper ────────────────── */
const pushHistory = (request, entry) => {
  const hist = Array.isArray(request.history) ? [...request.history] : [];
  hist.push({ ...entry, timestamp: new Date() });
  request.history = hist;
};

/* ────────────────── List Tasks ────────────────── */
const getTasks = async (req, res) => {
  try {
    const { group, status } = req.query;
    const where = {};
    const now = new Date();

    if (group) where.assignedGroup = group;

    if (status) {
      where.status = status;
    } else {
      const { Op } = require('sequelize');
      where.status = { [Op.in]: ['AVAILABLE', 'CLAIMED'] };
    }

    const tasks = await Task.findAll({ where, order: [['createdAt', 'DESC']] });

    // Enrich tasks with investment request info
    const enriched = await Promise.all(
      tasks.map(async (t) => {
        const inv = await InvestmentRequest.findOne({ where: { processInstanceId: t.processInstanceId } });
        return {
          task: t,
          inv,
        };
      })
    );

    const visibleTasks = enriched
      .filter(({ task, inv }) => {
        const deadline = inv?.slaDeadline ? new Date(inv.slaDeadline) : null;
        const overdue = deadline && deadline <= now;
        return inv?.status !== 'ESCALATED' && inv?.currentStage !== 'ESCALATED' && !task.slaBreached && !inv?.slaBreached && !overdue;
      })
      .map(({ task, inv }) => ({
        ...task.toJSON(),
        investorName: inv?.investor?.fullName,
        companyName:  inv?.company?.name,
        riskLevel:    inv?.riskLevel,
        amount:       inv?.investment?.amount,
      }));

    res.json(visibleTasks);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

/* ────────────────── Task Details ────────────────── */
const getTaskDetails = async (req, res) => {
  try {
    const task = await Task.findOne({ where: { taskId: req.params.id } });
    if (!task) return res.status(404).json({ message: 'المهمة غير موجودة' });

    const request = await InvestmentRequest.findOne({ where: { processInstanceId: task.processInstanceId } });
    res.json({ task, request });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

/* ────────────────── Claim Task ────────────────── */
const claimTask = async (req, res) => {
  try {
    const task = await Task.findOne({ where: { taskId: req.params.id } });
    if (!task)                        return res.status(404).json({ message: 'المهمة غير موجودة' });
    if (task.status !== 'AVAILABLE')  return res.status(400).json({ message: 'المهمة محجوزة بالفعل' });

    task.status    = 'CLAIMED';
    task.claimedBy = req.user.username;
    await task.save();

    await AuditLog.create({
      action:            'TASK_CLAIMED',
      performedBy:       req.user.username,
      processInstanceId: task.processInstanceId,
      taskId:            task.taskId,
    });

    res.json({ message: 'تم حجز المهمة بنجاح', task });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

/* ────────────────── Complete Task (§3.2 Approval Workflow) ────────────────── */
const completeTask = async (req, res) => {
  try {
    const { decision, reason, missingFields } = req.body;
    const task = await Task.findOne({ where: { taskId: req.params.id } });
    if (!task) return res.status(404).json({ message: 'المهمة غير موجودة' });

    task.status      = 'COMPLETED';
    task.decision    = decision;
    task.completedAt = new Date();
    if (reason)        task.rejectionReason = reason;
    if (missingFields) task.missingFields   = missingFields;
    await task.save();

    const request = await InvestmentRequest.findOne({ where: { processInstanceId: task.processInstanceId } });

    if (request) {
      if (decision === 'APPROVED') {
        request.approvalsReceived = (request.approvalsReceived || 0) + 1;

        if (request.approvalsReceived >= request.approvalsRequired) {
          // §3.2: Process continues after ≥3 approvals — fully approved
          request.status       = 'APPROVED';
          request.currentStage = 'COMPANY_REGISTRATION';
          pushHistory(request, {
            stage: 'FULLY_APPROVED',
            note:  `تمت الموافقة الكاملة (${request.approvalsReceived}/${request.approvalsRequired})`,
            actor: req.user.username,
          });
          request.changed('history', true);
          await request.save();

          // §4.5: Company Registration via Flowable API integration
          setTimeout(async () => {
            await triggerFlowableRegistrationFlow(request.processInstanceId, request.company, request.investment);
          }, 3_000);

          // Send notification to investor only when fully approved
          await publishEvent('investment.notification.approval', { processInstanceId: request.processInstanceId });

          // Terminate other parallel tasks since threshold is reached
          const { Op } = require('sequelize');
          await Task.destroy({
            where: {
              processInstanceId: request.processInstanceId,
              taskId: { [Op.ne]: task.taskId }
            }
          });
        } else {
          pushHistory(request, {
            stage: 'PARTIAL_APPROVAL',
            note:  `موافقة جزئية (${request.approvalsReceived}/${request.approvalsRequired})`,
            actor: req.user.username,
          });
          request.changed('history', true);
          await request.save();
        }

      } else if (decision === 'REJECTED') {
        request.rejectionsReceived = (request.rejectionsReceived || 0) + 1;

        if (request.rejectionsReceived >= 3) {
          // Mathematically impossible to reach 3 approvals out of 5 groups
          request.status       = 'REJECTED';
          request.currentStage = 'REJECTED';
          pushHistory(request, {
            stage: 'REJECTED',
            note:  `تم رفض الطلب نهائياً (${request.rejectionsReceived} رفض)`,
            actor: req.user.username,
          });
          request.changed('history', true);
          await request.save();

          // Send notification to investor only when fully rejected
          await publishEvent('investment.notification.rejection', { processInstanceId: request.processInstanceId });

          // Terminate other parallel tasks since request is rejected
          const { Op } = require('sequelize');
          await Task.destroy({
            where: {
              processInstanceId: request.processInstanceId,
              taskId: { [Op.ne]: task.taskId }
            }
          });
        } else {
          pushHistory(request, {
            stage: 'PARTIAL_REJECTION',
            note:  `رفض جزئي (${request.rejectionsReceived}/3 للرفض النهائي): ${reason}`,
            actor: req.user.username,
          });
          request.changed('history', true);
          await request.save();
        }

      } else if (decision === 'MISSING_DATA') {
        // §4.8: User task created to collect missing data
        request.status       = 'MISSING_DATA';
        request.currentStage = 'MISSING_DATA';
        pushHistory(request, {
          stage: 'MISSING_DATA',
          note:  `بيانات ناقصة: ${missingFields?.join('، ')}`,
          actor: req.user.username,
        });
        request.changed('history', true);
        await request.save();
        await publishEvent('investment.notification.missing_data', { processInstanceId: request.processInstanceId });
      }
    }

    await AuditLog.create({
      action:            'TASK_COMPLETED',
      performedBy:       req.user.username,
      processInstanceId: task.processInstanceId,
      taskId:            task.taskId,
      details:           { decision, reason, missingFields },
    });

    res.json({ message: 'تم إكمال المهمة بنجاح', task });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

module.exports = { getTasks, getTaskDetails, claimTask, completeTask };
