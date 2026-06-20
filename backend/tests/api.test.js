const request = require('supertest');
const mongoose = require('mongoose');
const { MongoMemoryServer } = require('mongodb-memory-server');
const app = require('../server');
const User = require('../models/User');
const InvestmentRequest = require('../models/InvestmentRequest');
const Task = require('../models/Task');
const AuditLog = require('../models/AuditLog');

let mongoServer;

beforeAll(async () => {
  mongoServer = await MongoMemoryServer.create();
  const uri = mongoServer.getUri();
  await mongoose.connect(uri);
});

afterAll(async () => {
  await mongoose.disconnect();
  await mongoServer.stop();
});

beforeEach(async () => {
  await User.deleteMany({});
  await InvestmentRequest.deleteMany({});
  await Task.deleteMany({});
  await AuditLog.deleteMany({});
});

describe('Investment Portal API Tests', () => {
  // Test User
  const testInvestor = {
    username: 'investor_test',
    password: 'pass123',
    role: 'INVESTOR',
    email: 'investor@test.com',
    phone: '01000000001'
  };

  const testEmployeeG1 = {
    username: 'emp_g1_test',
    password: 'pass123',
    role: 'EMPLOYEE',
    approvalGroup: 'GROUP_1',
    email: 'emp1@test.com'
  };

  const testEmployeeG2 = {
    username: 'emp_g2_test',
    password: 'pass123',
    role: 'EMPLOYEE',
    approvalGroup: 'GROUP_2',
    email: 'emp2@test.com'
  };

  const testEmployeeG3 = {
    username: 'emp_g3_test',
    password: 'pass123',
    role: 'EMPLOYEE',
    approvalGroup: 'GROUP_3',
    email: 'emp3@test.com'
  };

  async function getAuthToken(userObj) {
    // Register
    await request(app)
      .post('/api/auth/register')
      .send(userObj);

    // Login
    const loginRes = await request(app)
      .post('/api/auth/login')
      .send({ username: userObj.username, password: userObj.password });

    return loginRes.body.token;
  }

  test('User Registration and Login Flow', async () => {
    const regRes = await request(app)
      .post('/api/auth/register')
      .send(testInvestor);

    expect(regRes.statusCode).toBe(201);
    expect(regRes.body.message).toBe('تم إنشاء الحساب بنجاح');

    const loginRes = await request(app)
      .post('/api/auth/login')
      .send({ username: testInvestor.username, password: testInvestor.password });

    expect(loginRes.statusCode).toBe(200);
    expect(loginRes.body.token).toBeDefined();
    expect(loginRes.body.user.username).toBe(testInvestor.username);
  });

  test('Create low-risk investment (amount < 500,000) -> Auto Approved', async () => {
    const investorToken = await getAuthToken(testInvestor);

    const startRes = await request(app)
      .post('/api/investment/start')
      .set('Authorization', `Bearer ${investorToken}`)
      .send({
        investor: {
          fullName: 'محمد علي',
          nationalId: '12345678901234',
          email: 'investor@test.com',
          phone: '01000000001'
        },
        company: {
          name: 'مصر للاستشارات تكنولوجيا المعلومات',
          type: 'شركة ذات مسؤولية محدودة (LLC)',
          activity: 'تكنولوجيا المعلومات',
          address: 'القاهرة، مصر'
        },
        investment: {
          amount: 250000,
          type: 'استثمار محلي',
          partners: 2,
          notes: 'ملاحظة تجريبية'
        }
      });

    expect(startRes.statusCode).toBe(201);
    expect(startRes.body.status).toBe('APPROVED');
    expect(startRes.body.riskLevel).toBe('LOW');

    // Verify database document
    const reqDoc = await InvestmentRequest.findOne({ processInstanceId: startRes.body.processInstanceId });
    expect(reqDoc).toBeDefined();
    expect(reqDoc.status).toBe('APPROVED');
    expect(reqDoc.currentStage).toBe('AUTO_APPROVED');
    expect(reqDoc.approvalsRequired).toBe(0);

    // Verify no tasks created for low risk
    const tasksCount = await Task.countDocuments({ processInstanceId: startRes.body.processInstanceId });
    expect(tasksCount).toBe(0);
  });

  test('Create medium-risk investment -> Task flow, Missing Data, Resubmission, Approval', async () => {
    const investorToken = await getAuthToken(testInvestor);
    const empG1Token = await getAuthToken(testEmployeeG1);
    const empG2Token = await getAuthToken(testEmployeeG2);
    const empG3Token = await getAuthToken(testEmployeeG3);

    // 1. Submit Request (Medium Risk, Amount 1,500,000)
    const startRes = await request(app)
      .post('/api/investment/start')
      .set('Authorization', `Bearer ${investorToken}`)
      .send({
        investor: {
          fullName: 'أحمد محمود',
          nationalId: '22345678901234',
          email: 'investor2@test.com',
          phone: '01000000002'
        },
        company: {
          name: 'شركة النيل للصناعات الغذائية',
          type: 'شركة ذات مسؤولية محدودة (LLC)',
          activity: 'الصناعة والتصنيع',
          address: 'الجيزة، مصر'
        },
        investment: {
          amount: 1500000,
          type: 'استثمار محلي',
          partners: 3,
          notes: ''
        }
      });

    expect(startRes.statusCode).toBe(201);
    expect(startRes.body.status).toBe('IN_PROGRESS');
    expect(startRes.body.riskLevel).toBe('MEDIUM');
    const procId = startRes.body.processInstanceId;

    // Verify tasks are created
    const tasks = await Task.find({ processInstanceId: procId });
    expect(tasks.length).toBe(5); // GROUP_1 to GROUP_5 tasks
    const group1Task = tasks.find(t => t.assignedGroup === 'GROUP_1');
    expect(group1Task).toBeDefined();
    expect(group1Task.status).toBe('AVAILABLE');

    // 2. Employee G1 retrieves AVAILABLE tasks
    const tasksRes = await request(app)
      .get('/api/tasks?group=GROUP_1&status=AVAILABLE')
      .set('Authorization', `Bearer ${empG1Token}`);

    expect(tasksRes.statusCode).toBe(200);
    expect(tasksRes.body.some(t => t.taskId === group1Task.taskId)).toBe(true);

    // 3. Employee G1 claims the task
    const claimRes = await request(app)
      .post(`/api/tasks/${group1Task.taskId}/claim`)
      .set('Authorization', `Bearer ${empG1Token}`);

    expect(claimRes.statusCode).toBe(200);
    expect(claimRes.body.task.status).toBe('CLAIMED');
    expect(claimRes.body.task.claimedBy).toBe(testEmployeeG1.username);

    // 4. Employee G1 completes task with MISSING_DATA decision
    const completeRes = await request(app)
      .post(`/api/tasks/${group1Task.taskId}/complete`)
      .set('Authorization', `Bearer ${empG1Token}`)
      .send({
        decision: 'MISSING_DATA',
        reason: 'الرقم القومي غير واضح، والعنوان ناقص',
        missingFields: ['الرقم القومي', 'العنوان']
      });

    expect(completeRes.statusCode).toBe(200);
    expect(completeRes.body.task.status).toBe('COMPLETED');
    expect(completeRes.body.task.decision).toBe('MISSING_DATA');

    // Verify Investment Request status updated to MISSING_DATA and notification is triggered
    let reqDoc = await InvestmentRequest.findOne({ processInstanceId: procId });
    expect(reqDoc.status).toBe('MISSING_DATA');
    expect(reqDoc.currentStage).toBe('MISSING_DATA');
    expect(reqDoc.notifications.length).toBe(1);
    expect(reqDoc.notifications[0].type).toBe('MISSING_DATA');

    // 5. Investor completes the missing data
    const completeDataRes = await request(app)
      .post(`/api/investment/${procId}/complete-data`)
      .set('Authorization', `Bearer ${empG1Token}`) // Or any authenticated user
      .send({
        data: {
          'الرقم القومي': '29999999999999',
          'العنوان': 'حي الهرم، الجيزة، مصر'
        }
      });

    expect(completeDataRes.statusCode).toBe(200);
    expect(completeDataRes.body.request.status).toBe('IN_PROGRESS');
    expect(completeDataRes.body.request.currentStage).toBe('APPROVAL');
    
    // Verify mapped data is saved in DB
    reqDoc = await InvestmentRequest.findOne({ processInstanceId: procId });
    expect(reqDoc.investor.nationalId).toBe('29999999999999');
    expect(reqDoc.company.address).toBe('حي الهرم، الجيزة، مصر');

    // Verify the task has been reset back to AVAILABLE
    const resetTask = await Task.findOne({ taskId: group1Task.taskId });
    expect(resetTask.status).toBe('AVAILABLE');
    expect(resetTask.decision).toBeUndefined();
    expect(resetTask.claimedBy).toBeUndefined();

    // 6. Complete Approvals (3 required: G1, G2, G3)
    // GROUP 1 Approves
    await request(app).post(`/api/tasks/${group1Task.taskId}/claim`).set('Authorization', `Bearer ${empG1Token}`);
    await request(app).post(`/api/tasks/${group1Task.taskId}/complete`).set('Authorization', `Bearer ${empG1Token}`).send({ decision: 'APPROVED' });

    // GROUP 2 Approves
    const g2Task = await Task.findOne({ processInstanceId: procId, assignedGroup: 'GROUP_2' });
    await request(app).post(`/api/tasks/${g2Task.taskId}/claim`).set('Authorization', `Bearer ${empG2Token}`);
    await request(app).post(`/api/tasks/${g2Task.taskId}/complete`).set('Authorization', `Bearer ${empG2Token}`).send({ decision: 'APPROVED' });

    // GROUP 3 Approves (Third approval should trigger full approval)
    const g3Task = await Task.findOne({ processInstanceId: procId, assignedGroup: 'GROUP_3' });
    await request(app).post(`/api/tasks/${g3Task.taskId}/claim`).set('Authorization', `Bearer ${empG3Token}`);
    await request(app).post(`/api/tasks/${g3Task.taskId}/complete`).set('Authorization', `Bearer ${empG3Token}`).send({ decision: 'APPROVED' });

    // Verify Request is FULLY APPROVED
    reqDoc = await InvestmentRequest.findOne({ processInstanceId: procId });
    expect(reqDoc.status).toBe('APPROVED');
    expect(reqDoc.currentStage).toBe('COMPANY_REGISTRATION');
    expect(reqDoc.approvalsReceived).toBe(3);
    
    // Check notifications contains APPROVAL notification
    const approvalNotif = reqDoc.notifications.find(n => n.type === 'APPROVAL');
    expect(approvalNotif).toBeDefined();
  });

  test('SLA Breach escalation on checkStatus', async () => {
    const investorToken = await getAuthToken(testInvestor);

    // Create medium risk request
    const startRes = await request(app)
      .post('/api/investment/start')
      .set('Authorization', `Bearer ${investorToken}`)
      .send({
        investor: { fullName: 'خالد عمر', nationalId: '32345678901234', email: 'khaled@test.com', phone: '01000000003' },
        company: { name: 'المتحدة للنقل', type: 'شركة تضامن', activity: 'أخرى', address: 'الإسكندرية، مصر' },
        investment: { amount: 800000, type: 'استثمار محلي', partners: 1, notes: '' }
      });

    const procId = startRes.body.processInstanceId;

    // Manually force slaDeadline to be in the past to simulate a breach
    await InvestmentRequest.findOneAndUpdate(
      { processInstanceId: procId },
      { slaDeadline: new Date(Date.now() - 5000) } // 5s ago
    );

    // Retrieve status (triggers check)
    const statusRes = await request(app)
      .get(`/api/investment/status/${procId}`)
      .set('Authorization', `Bearer ${investorToken}`);

    expect(statusRes.body.slaBreached).toBe(true);
    expect(statusRes.body.status).toBe('ESCALATED');

    // Retrieve notifications in DB
    const reqDoc = await InvestmentRequest.findOne({ processInstanceId: procId });
    expect(reqDoc.notifications.some(n => n.type === 'ESCALATION')).toBe(true);
  });

  test('Flow involving all seeded roles: Investor 2, Employees G1-G5, and Manager 1', async () => {
    // Seed and get auth tokens for all roles
    const investor2Token = await getAuthToken({
      username: 'investor2_t', password: 'pass123', role: 'INVESTOR', email: 'investor2@test.com', phone: '01000000002'
    });
    const empTokens = {};
    for (let i = 1; i <= 5; i++) {
      empTokens[`GROUP_${i}`] = await getAuthToken({
        username: `emp_g${i}_t`, password: 'pass123', role: 'EMPLOYEE', approvalGroup: `GROUP_${i}`, email: `emp${i}@test.com`
      });
    }
    const managerToken = await getAuthToken({
      username: 'manager1_t', password: 'pass123', role: 'MANAGER', email: 'manager@test.com'
    });

    // 1. Investor 2 submits a High-Risk request (6,000,000)
    const startRes = await request(app)
      .post('/api/investment/start')
      .set('Authorization', `Bearer ${investor2Token}`)
      .send({
        investor: { fullName: 'فاطمة الزهراء', nationalId: '52345678901234', email: 'fatima@test.com', phone: '01000000005' },
        company: { name: 'العربية للتجارة', type: 'شركة مساهمة', activity: 'التجارة والتوزيع', address: 'أسيوط، مصر' },
        investment: { amount: 6000000, type: 'استثمار أجنبي مباشر', partners: 5, notes: '' }
      });

    expect(startRes.statusCode).toBe(201);
    expect(startRes.body.riskLevel).toBe('HIGH');
    const procId = startRes.body.processInstanceId;

    // Verify 5 tasks are created
    let tasks = await Task.find({ processInstanceId: procId });
    expect(tasks.length).toBe(5);

    // 2. Test Veto Rejection Flow (GROUP_4 Rejects the request)
    const g4Task = tasks.find(t => t.assignedGroup === 'GROUP_4');
    await request(app).post(`/api/tasks/${g4Task.taskId}/claim`).set('Authorization', `Bearer ${empTokens['GROUP_4']}`);
    const rejectRes = await request(app)
      .post(`/api/tasks/${g4Task.taskId}/complete`)
      .set('Authorization', `Bearer ${empTokens['GROUP_4']}`)
      .send({ decision: 'REJECTED', reason: 'المستندات القانونية للشركة غير مكتملة' });

    expect(rejectRes.statusCode).toBe(200);

    // Verify entire Request is REJECTED and rejection notification is recorded
    let requestDoc = await InvestmentRequest.findOne({ processInstanceId: procId });
    expect(requestDoc.status).toBe('REJECTED');
    expect(requestDoc.currentStage).toBe('REJECTED');
    expect(requestDoc.notifications.some(n => n.type === 'REJECTION')).toBe(true);

    // 3. Investor 2 submits another request (2,500,000 - Medium Risk)
    const startRes2 = await request(app)
      .post('/api/investment/start')
      .set('Authorization', `Bearer ${investor2Token}`)
      .send({
        investor: { fullName: 'فاطمة الزهراء', nationalId: '52345678901234', email: 'fatima@test.com', phone: '01000000005' },
        company: { name: 'المصرية للحلول البرمجية', type: 'شركة ذات مسؤولية محدودة (LLC)', activity: 'تكنولوجيا المعلومات', address: 'الإسكندرية، مصر' },
        investment: { amount: 2500000, type: 'مشروع مشترك', partners: 2, notes: '' }
      });

    const procId2 = startRes2.body.processInstanceId;
    let tasks2 = await Task.find({ processInstanceId: procId2 });

    // 4. Employee G1, G2, G3 approve the request (manager also has EMPLOYEE-like powers on routes)
    // GROUP 1 Approves
    const t1 = tasks2.find(t => t.assignedGroup === 'GROUP_1');
    await request(app).post(`/api/tasks/${t1.taskId}/claim`).set('Authorization', `Bearer ${empTokens['GROUP_1']}`);
    await request(app).post(`/api/tasks/${t1.taskId}/complete`).set('Authorization', `Bearer ${empTokens['GROUP_1']}`).send({ decision: 'APPROVED' });

    // GROUP 2 Approves
    const t2 = tasks2.find(t => t.assignedGroup === 'GROUP_2');
    await request(app).post(`/api/tasks/${t2.taskId}/claim`).set('Authorization', `Bearer ${empTokens['GROUP_2']}`);
    await request(app).post(`/api/tasks/${t2.taskId}/complete`).set('Authorization', `Bearer ${empTokens['GROUP_2']}`).send({ decision: 'APPROVED' });

    // GROUP 5 Approves
    const t5 = tasks2.find(t => t.assignedGroup === 'GROUP_5');
    await request(app).post(`/api/tasks/${t5.taskId}/claim`).set('Authorization', `Bearer ${empTokens['GROUP_5']}`);
    await request(app).post(`/api/tasks/${t5.taskId}/complete`).set('Authorization', `Bearer ${empTokens['GROUP_5']}`).send({ decision: 'APPROVED' });

    // Verify request status is APPROVED
    requestDoc = await InvestmentRequest.findOne({ processInstanceId: procId2 });
    expect(requestDoc.status).toBe('APPROVED');

    // 5. Test Manager Reporting & Dashboard services
    // Get all requests as Manager
    const allRes = await request(app)
      .get('/api/investment/all')
      .set('Authorization', `Bearer ${managerToken}`);
    expect(allRes.statusCode).toBe(200);
    expect(allRes.body.requests.length).toBe(2);

    // Get dashboard stats as Manager
    const statsRes = await request(app)
      .get('/api/investment/dashboard/stats')
      .set('Authorization', `Bearer ${managerToken}`);
    expect(statsRes.statusCode).toBe(200);
    expect(statsRes.body.stats).toBeDefined();
    expect(statsRes.body.byRisk).toBeDefined();
    expect(statsRes.body.byStatus).toBeDefined();
  });
});
