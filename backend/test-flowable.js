require('dotenv').config();
const flowableService = require('./services/flowable.service');
const { triggerFlowableRegistrationFlow } = require('./services/flowable-registration.service');

(async () => {
  try {
    console.log('Deploying BPMN...');
    await flowableService.deployProcessIfMissing();

    const axios = require('axios');
    const auth = { username: 'admin', password: 'test' };
    
    // Verify deployment
    console.log('\n--- VERIFICATION 1: GET process-definitions ---');
    const { data: defs } = await axios.get('http://localhost:8080/flowable-ui/process-api/repository/process-definitions', { auth });
    console.log(JSON.stringify(defs.data.map(d => ({ id: d.id, key: d.key, name: d.name })), null, 2));

    // Intercept axios in flowableService to print req/res for completeTask
    axios.interceptors.request.use(req => {
      if (req.method === 'post' && req.url.includes('/runtime/tasks/')) {
        console.log(`\n--- VERIFICATION 3: completeTask Request ---`);
        console.log(`POST ${req.url}`);
        console.log(`Payload: ${JSON.stringify(req.data)}`);
      }
      return req;
    });
    axios.interceptors.response.use(res => {
      if (res.config.method === 'post' && res.config.url.includes('/runtime/tasks/')) {
        console.log(`--- completeTask Response ---`);
        console.log(`Status: ${res.status}`);
        console.log(`Data: ${JSON.stringify(res.data || 'OK')}`);
      }
      return res;
    });

    // Run flow
    console.log('\n--- TRIGGERING APPROVAL HOOK ---');
    // We mock InvestmentRequest.findOne to avoid DB issues in this loose script
    const InvestmentRequest = require('./models/InvestmentRequest');
    InvestmentRequest.findOne = async () => ({
      changed: () => {},
      save: async () => {},
    });

    const processInstanceId = `INV-TEST-${Date.now()}`;
    await triggerFlowableRegistrationFlow(
      processInstanceId,
      { name: 'My Test Company' },
      { amount: 1000000 }
    );

    // Verify historic instances
    console.log('\n--- VERIFICATION 2: GET historic-process-instances ---');
    const { data: history } = await axios.get('http://localhost:8080/flowable-ui/process-api/history/historic-process-instances', {
      params: { processInstanceBusinessKey: processInstanceId },
      auth
    });
    console.log(JSON.stringify(history.data.map(h => ({ id: h.id, businessKey: h.businessKey, endTime: h.endTime })), null, 2));

  } catch (err) {
    console.error(err);
  }
})();
