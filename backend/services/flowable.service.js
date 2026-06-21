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

  deployDmnIfMissing: async () => {
    try {
      // Flowable-UI exposes DMN deployments at /dmn-api/dmn-repository/deployments
      // but wait, the endpoint on Flowable UI might be /flowable-ui/dmn-api/dmn-repository/deployments
      // The base URL is http://flowable:8080/flowable-ui/process-api, so we replace process-api with dmn-api
      const DMN_BASE_URL = FLOWABLE_BASE_URL.replace('/process-api', '/dmn-api');
      const { data: { data: deployments } } = await axios.get(`${DMN_BASE_URL}/dmn-repository/deployments`, { auth });
      const exists = deployments.some(d => d.name === 'riskEvaluation');
      
      if (!exists) {
        console.log('Deploying risk-evaluation.dmn to Flowable...');
        const dmnPath = path.join(__dirname, '../risk-evaluation.dmn');
        const formData = new FormData();
        formData.append('file', fs.createReadStream(dmnPath), { filename: 'risk-evaluation.dmn' });
        formData.append('name', 'riskEvaluation');

        await axios.post(`${DMN_BASE_URL}/dmn-repository/deployments`, formData, {
          auth,
          headers: formData.getHeaders(),
        });
        console.log('Successfully deployed riskEvaluation DMN to Flowable.');
      } else {
        console.log('riskEvaluation DMN already deployed in Flowable.');
      }
    } catch (err) {
      console.error('Failed to deploy Flowable DMN:', err.message);
    }
  },

  evaluateRisk: async (amount) => {
    const DMN_BASE_URL = FLOWABLE_BASE_URL.replace('/process-api', '/dmn-api');
    const { data } = await axios.post(`${DMN_BASE_URL}/dmn-rule/execute`, {
      decisionKey: 'riskEvaluation',
      inputVariables: [
        { name: 'amount', type: 'double', value: Number(amount) }
      ]
    }, { auth });
    
    // Process output variables
    let riskLevel = 'HIGH';
    let slaHours = 48;
    if (data && data.resultVariables && data.resultVariables.length > 0) {
      for (const resVar of data.resultVariables[0]) {
        if (resVar.name === 'riskLevel') riskLevel = resVar.value;
        if (resVar.name === 'slaHours') slaHours = resVar.value;
      }
    }
    return { riskLevel, slaHours };
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
