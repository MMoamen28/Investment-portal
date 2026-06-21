const flowableService = require('./flowable.service');
const { registerCompany } = require('./external.service');
const { publishEvent } = require('./kafka.service');
const InvestmentRequest = require('../models/InvestmentRequest');

const pushHistory = (request, entry) => {
  const hist = Array.isArray(request.history) ? [...request.history] : [];
  hist.push({ ...entry, timestamp: new Date() });
  request.history = hist;
};

const triggerFlowableRegistrationFlow = async (processInstanceId, company, investment) => {
  try {
    console.log(`Starting Flowable company-registration for ${processInstanceId}`);
    // TODO: Replace this hook with a real investment-approved Kafka consumer once jBPM rebuild reaches that phase.

    // 1. Start Flowable Process
    const flowableInstanceId = await flowableService.startRegistration(processInstanceId, {
      companyName: company.name || 'Unknown',
      amount: investment.amount || '0',
    });
    console.log(`Flowable process started: ${flowableInstanceId}`);

    // 2. Immediately call the existing registry mock
    const registryResult = await registerCompany({ processInstanceId, company, investment });
    console.log(`Registry Mock returned: ${registryResult.registrationNumber}`);

    // 3. Complete 'Generate Registration' task
    const generateTask = await flowableService.getActiveTask(flowableInstanceId);
    if (generateTask && generateTask.name === 'Generate Registration') {
      await flowableService.completeTask(generateTask.id, [
        { name: 'registrationNumber', type: 'string', value: registryResult.registrationNumber }
      ]);
      console.log(`Completed Generate Registration task`);
    }

    // 4. Complete 'Confirm Document Upload' task as a placeholder
    // Currently no real document upload feature exists.
    const confirmTask = await flowableService.getActiveTask(flowableInstanceId);
    if (confirmTask && confirmTask.name === 'Confirm Document Upload') {
      await flowableService.completeTask(confirmTask.id, [
        { name: 'documentConfirmed', type: 'boolean', value: true }
      ]);
      console.log(`Completed Confirm Document Upload task (Placeholder)`);
    }

    // 5. Check if process is completed and publish Kafka event
    const status = await flowableService.getProcessStatus(flowableInstanceId);
    if (status === 'COMPLETED') {
      console.log('Flowable process COMPLETED.');
      await publishEvent('investment.notification.approval', { processInstanceId, registrationNumber: registryResult.registrationNumber });
      
      const req_ = await InvestmentRequest.findOne({ where: { processInstanceId } });
      if (req_) {
        pushHistory(req_, { stage: 'COMPANY_REGISTERED', note: `تم تسجيل الشركة تلقائياً (Flowable ${flowableInstanceId})`, actor: 'System' });
        req_.changed('history', true);
        await req_.save();
      }
    }
  } catch (err) {
    console.error('Flowable Registration Flow failed:', err.message);
  }
};

module.exports = { triggerFlowableRegistrationFlow };
