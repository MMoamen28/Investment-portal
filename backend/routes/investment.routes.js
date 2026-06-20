const router = require('express').Router();
const auth = require('../middleware/auth.middleware');
const role = require('../middleware/role.middleware');
const {
  startInvestment, getStatus, getAllRequests,
  getEscalations, completeData, getDashboardStats,
} = require('../controllers/investment.controller');

router.post('/start',                 auth,                                startInvestment);
router.get('/status/:id',             auth,                                getStatus);
router.get('/all',                    auth, role('MANAGER'),               getAllRequests);
router.get('/escalations',            auth, role('MANAGER'),               getEscalations);
router.get('/dashboard/stats',        auth, role('MANAGER'),               getDashboardStats);
router.post('/:id/complete-data',     auth, role('EMPLOYEE', 'MANAGER'),  completeData);

module.exports = router;
