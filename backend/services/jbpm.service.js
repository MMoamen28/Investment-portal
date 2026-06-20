const axios = require('axios');

const JBPM = process.env.JBPM_URL || 'http://localhost:8080/kie-server/services/rest/server';
const AUTH = { username: 'kieserver', password: 'kieserver1!' };

const jBPMService = {
  startProcess: (data) =>
    axios.post(`${JBPM}/containers/investment/processes/InvestmentProcess/instances`, data, { auth: AUTH }),

  getStatus: (instanceId) =>
    axios.get(`${JBPM}/containers/investment/processes/instances/${instanceId}`, { auth: AUTH }),

  getTasksByGroup: (group) =>
    axios.get(`${JBPM}/queries/tasks/instances/pot-owners?groups=${group}`, { auth: AUTH }),

  claimTask: (taskId, user) =>
    axios.put(`${JBPM}/containers/investment/tasks/${taskId}/states/claimed?user=${user}`, {}, { auth: AUTH }),

  completeTask: (taskId, data) =>
    axios.put(`${JBPM}/containers/investment/tasks/${taskId}/states/completed`, data, { auth: AUTH }),
};

module.exports = jBPMService;
