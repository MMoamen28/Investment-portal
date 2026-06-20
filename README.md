# بوابة الاستثمار الحكومية — Investment Portal POC

E-Government Investment & Company Establishment Portal for Egypt.

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | React 18 + Vite + Tailwind CSS + Ant Design |
| Backend | Node.js + Express |
| Database | MongoDB Community Edition (Local) |
| Workflow | jBPM + Drools (mock-ready) |
| Messaging | Apache Kafka (mock-ready) |

## Quick Start

### Prerequisites
- Node.js 18+
- MongoDB Community Edition running locally
- (Optional) Apache Kafka on localhost:9092
- (Optional) jBPM Kie Server on localhost:8080

### 1. Start MongoDB
```bash
mongod --dbpath /data/db
```

### 2. Backend
```bash
cd backend
npm install
node scripts/seed.js    # Creates demo users
npm run dev             # Starts on http://localhost:5000
```

### 3. Frontend
```bash
cd frontend
npm install
npm run dev             # Starts on http://localhost:5173
```

## Demo Accounts

| Role | Username | Password |
|------|----------|----------|
| مستثمر (Investor) | investor1 | pass123 |
| موظف مجموعة 1 (Employee G1) | emp_g1 | pass123 |
| موظف مجموعة 2 (Employee G2) | emp_g2 | pass123 |
| موظف مجموعة 3 (Employee G3) | emp_g3 | pass123 |
| مدير (Manager) | manager1 | pass123 |

## Workflow

```
المستثمر يقدم طلب
      ↓
تحقق موازي (هوية + ضريبة) — 8 ثوان تجريبية
      ↓
تقييم المخاطر (Drools mock)
  LOW  → موافقة تلقائية
  MEDIUM/HIGH → 5 مجموعات موافقة (min 3/5)
      ↓
تسجيل الشركة
      ↓
إشعار Kafka (SMS + Email)
```

## Risk Thresholds (Mock Drools)
- **LOW** — أقل من 500,000 جنيه → موافقة تلقائية فورية
- **MEDIUM** — 500,000 → 5,000,000 جنيه → SLA 24 ساعة
- **HIGH** — أكثر من 5,000,000 جنيه → SLA 48 ساعة

## API Endpoints

```
POST /api/auth/login
POST /api/auth/register

POST /api/investment/start
GET  /api/investment/status/:id
GET  /api/investment/all            (Manager)
GET  /api/investment/escalations    (Manager)
GET  /api/investment/dashboard/stats (Manager)
POST /api/investment/:id/complete-data

GET  /api/tasks
GET  /api/tasks/:id/details
POST /api/tasks/:id/claim
POST /api/tasks/:id/complete
```

## MongoDB (Local)
Connection: `mongodb://localhost:27017/investment_portal`

Collections: `investment_requests`, `users`, `tasks`, `audit_logs`

Use **MongoDB Compass** to inspect data during development.

## Colors
- Primary: `#1e3a5f` (Deep Blue)
- Accent: `#c9a84c` (Gold)
