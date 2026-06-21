const axios = require('axios');
(async () => {
  try {
    const res = await axios.get('http://localhost:8080/flowable-ui/process-api/repository/deployments', {
      auth: { username: 'admin', password: 'test' }
    });
    console.log('SUCCESS /flowable-ui/process-api:', res.status);
  } catch (err) {
    console.error('FAILED /flowable-ui/process-api:', err.message);
  }
  
  try {
    const res = await axios.get('http://localhost:8080/process-api/repository/deployments', {
      auth: { username: 'admin', password: 'test' }
    });
    console.log('SUCCESS /process-api:', res.status);
  } catch (err) {
    console.error('FAILED /process-api:', err.message);
  }
})();
