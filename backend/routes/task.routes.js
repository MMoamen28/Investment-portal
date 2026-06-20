const router = require('express').Router();
const auth = require('../middleware/auth.middleware');
const role = require('../middleware/role.middleware');
const { getTasks, getTaskDetails, claimTask, completeTask } = require('../controllers/task.controller');

router.get('/',              auth, role('EMPLOYEE', 'MANAGER'), getTasks);
router.get('/:id/details',  auth, role('EMPLOYEE', 'MANAGER'), getTaskDetails);
router.post('/:id/claim',   auth, role('EMPLOYEE', 'MANAGER'), claimTask);
router.post('/:id/complete',auth, role('EMPLOYEE', 'MANAGER'), completeTask);

module.exports = router;
