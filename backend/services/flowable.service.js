const axios = require('axios');
const fs = require('fs');
const path = require('path');
const FormData = require('form-data');

const FLOWABLE_BASE_URL = process.env.FLOWABLE_BASE_URL || 'http://localhost:8080/flowable-ui/process-api';
const FLOWABLE_USER = process.env.FLOWABLE_REST_ADMIN_USER || 'admin';
const FLOWABLE_PASS = process.env.FLOWABLE_REST_ADMIN_PASSWORD || 'test';

const auth = {
  username: FLOWABLE_USER,
  password: FLOWABLE_PASS,
};

const flowableService = {
  deployProcessIfMissing: async () => {
    try {
      // Check if already deployed
      const { data: { data: deployments } } = await axios.get(`${FLOWABLE_BASE_URL}/repository/deployments`, { auth });
      const exists = deployments.some(d => d.name === 'company-registration');
      
      if (!exists) {
        console.log('Deploying company-registration.bpmn to Flowable...');
        const bpmnPath = path.join(__dirname, '../company-registration.bpmn');
        const formData = new FormData();
        formData.append('file', fs.createReadStream(bpmnPath), { filename: 'company-registration.bpmn' });
        formData.append('name', 'company-registration');

        await axios.post(`${FLOWABLE_BASE_URL}/repository/deployments`, formData, {
          auth,
          headers: formData.getHeaders(),
        });
        console.log('Successfully deployed company-registration to Flowable.');
      } else {
        console.log('company-registration process already deployed in Flowable.');
      }
    } catch (err) {
      console.error('Failed to deploy Flowable process:', err.message);
    }
  },

  startRegistration: async (investmentRequestId, registrationData) => {
    const variables = [
      { name: 'investmentRequestId', type: 'string', value: investmentRequestId },
    ];
    // Add additional registrationData fields as process variables if needed
    for (const [key, value] of Object.entries(registrationData || {})) {
      variables.push({ name: key, type: 'string', value: String(value) });
    }

    const { data } = await axios.post(`${FLOWABLE_BASE_URL}/runtime/process-instances`, {
      processDefinitionKey: 'company-registration',
      variables,
      businessKey: investmentRequestId,
    }, { auth });
    return data.id;
  },

  getActiveTask: async (processInstanceId) => {
    const { data } = await axios.get(`${FLOWABLE_BASE_URL}/runtime/tasks`, {
      params: { processInstanceId },
      auth,
    });
    return data.data[0]; // Return the first open task
  },

  completeTask: async (taskId, variables = []) => {
    const payload = {
      action: 'complete',
      variables,
    };
    await axios.post(`${FLOWABLE_BASE_URL}/runtime/tasks/${taskId}`, payload, { auth });
  },

  getProcessStatus: async (processInstanceId) => {
    try {
      const { data } = await axios.get(`${FLOWABLE_BASE_URL}/history/historic-process-instances/${processInstanceId}`, { auth });
      if (data.endTime) {
        return 'COMPLETED';
      }
      return 'ACTIVE';
    } catch (err) {
      return 'UNKNOWN';
    }
  },
};

module.exports = flowableService;
