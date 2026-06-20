/**
 * External Integration Services (§3.5 / §4.5)
 *
 * Simulated external REST services with retry logic (§4.7):
 *   - maxRetries = 10
 *   - retryDelay = PT5S (5 seconds)
 *   - After retry exhaustion → escalation flow
 *
 * In production, replace the simulation functions with real HTTP calls
 * to the National ID service, Tax service, and Company Registry service.
 */

const AuditLog = require('../models/AuditLog');

const MAX_RETRIES  = 10;
const RETRY_DELAY  = 5_000; // 5 seconds (PT5S per spec)

/* ────────────────── Retry Wrapper ────────────────── */
const withRetry = async (fn, label, processInstanceId) => {
  let lastError;
  for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
    try {
      const result = await fn();
      if (attempt > 1) {
        console.log(`[${label}] Succeeded on attempt ${attempt}`);
      }
      return result;
    } catch (err) {
      lastError = err;
      console.warn(`[${label}] Attempt ${attempt}/${MAX_RETRIES} failed: ${err.message}`);

      await AuditLog.create({
        action:            `RETRY_${label.toUpperCase().replace(/\s+/g, '_')}`,
        performedBy:       'System',
        processInstanceId,
        details:           { attempt, maxRetries: MAX_RETRIES, error: err.message },
      }).catch(() => {});

      if (attempt < MAX_RETRIES) {
        await new Promise(r => setTimeout(r, RETRY_DELAY));
      }
    }
  }

  // Retry exhausted → update investment request to escalation flow
  console.error(`[${label}] All ${MAX_RETRIES} retries exhausted`);

  // Mark the investment request as retry-exhausted (caller handles status update)
  throw Object.assign(new Error(`${label} failed after ${MAX_RETRIES} retries`), { retryExhausted: true });
};

/* ────────────────── National ID Verification Service ────────────────── */
const verifyNationalId = async (nationalId, fullName) => {
  return withRetry(async () => {
    // Simulate external REST call to National ID service
    // In production: axios.post(process.env.NATIONAL_ID_SERVICE_URL, { nationalId, fullName })
    await new Promise(r => setTimeout(r, 800)); // simulate network latency

    if (!nationalId || nationalId.length < 5) {
      throw new Error('رقم الهوية القومية غير صالح');
    }

    return {
      verified:   true,
      nationalId,
      fullName,
      verifiedAt: new Date(),
    };
  }, 'NationalID Verification', null);
};

/* ────────────────── Tax Clearance Service ────────────────── */
const verifyTaxClearance = async (nationalId) => {
  return withRetry(async () => {
    // Simulate external REST call to Tax service
    // In production: axios.get(`${process.env.TAX_SERVICE_URL}/clearance/${nationalId}`)
    await new Promise(r => setTimeout(r, 600)); // simulate network latency

    if (!nationalId) {
      throw new Error('رقم الهوية مطلوب للتحقق من الإعفاء الضريبي');
    }

    return {
      cleared:    true,
      nationalId,
      clearedAt:  new Date(),
    };
  }, 'Tax Clearance', null);
};

/* ────────────────── Company Registry Service (§4.5) ────────────────── */
const registerCompany = async ({ processInstanceId, company, investment }) => {
  const InvestmentRequest = require('../models/InvestmentRequest');

  try {
    return await withRetry(async () => {
      // Simulate external REST call to Company Registry
      // In production: axios.post(process.env.COMPANY_REGISTRY_URL, { company, investment })
      await new Promise(r => setTimeout(r, 1_200)); // simulate network latency

      if (!company?.name) {
        throw new Error('اسم الشركة مطلوب للتسجيل في السجل التجاري');
      }

      const registrationNumber = `REG-${Date.now()}-${Math.random().toString(36).substr(2, 6).toUpperCase()}`;

      await AuditLog.create({
        action:            'COMPANY_REGISTERED',
        performedBy:       'System',
        processInstanceId,
        details:           { company, registrationNumber, registeredAt: new Date() },
      }).catch(() => {});

      return { registrationNumber, registeredAt: new Date() };
    }, 'Company Registry', processInstanceId);

  } catch (err) {
    if (err.retryExhausted) {
      // §4.7: After retry exhaustion → escalation flow
      await InvestmentRequest.update(
        { retryExhausted: true, status: 'ESCALATED' },
        { where: { processInstanceId } }
      ).catch(() => {});

      await AuditLog.create({
        action:            'RETRY_EXHAUSTED',
        performedBy:       'System',
        processInstanceId,
        details:           { service: 'Company Registry', maxRetries: MAX_RETRIES },
      }).catch(() => {});

      const { publishEvent } = require('../services/kafka.service');
      await publishEvent('investment.escalation', {
        processInstanceId,
        reason: 'COMPANY_REGISTRATION_RETRY_EXHAUSTED',
      }).catch(() => {});
    }
    throw err;
  }
};

module.exports = { verifyNationalId, verifyTaxClearance, registerCompany };
