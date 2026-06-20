const router = require('express').Router();
const auth = require('../middleware/auth.middleware');
const role = require('../middleware/role.middleware');
const {
  startInvestment, getStatus, getMyRequests, getAllRequests,
  getEscalations, decideEscalation, completeData, getDashboardStats, deleteInvestment, getUserNotifications, markNotificationRead, deleteNotification,
} = require('../controllers/investment.controller');

router.post('/start',                 auth,                                startInvestment);
router.get('/status/:id',             auth,                                getStatus);
router.get('/my-requests',            auth, role('INVESTOR'),              getMyRequests);
router.get('/notifications',          auth, role('INVESTOR'),              getUserNotifications);
router.patch('/notifications/:notificationId/read', auth, role('INVESTOR'), markNotificationRead);
router.delete('/notifications/:notificationId',      auth, role('INVESTOR'), deleteNotification);
router.get('/all',                    auth, role('MANAGER'),               getAllRequests);
router.get('/escalations',            auth, role('MANAGER'),               getEscalations);
router.post('/:id/decision',          auth, role('MANAGER'),               decideEscalation);
router.get('/dashboard/stats',        auth, role('MANAGER'),               getDashboardStats);
router.post('/:id/complete-data',     auth, role('EMPLOYEE', 'MANAGER'),  completeData);
router.delete('/:id',                 auth, role('MANAGER'),               deleteInvestment);

module.exports = router;
