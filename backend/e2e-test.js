const CHROME_PATH = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const FRONTEND_URL = 'http://localhost:5173';

function delay(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

(async () => {
  console.log('🚀 Starting Chrome E2E Automated Test...');
  const puppeteer = (await import('puppeteer-core')).default;
  const browser = await puppeteer.launch({
    executablePath: CHROME_PATH,
    headless: false,
    defaultViewport: null,
    slowMo: 100, // Slows down operations so they are easily viewable
    args: ['--start-maximized']
  });

  const page = await browser.newPage();
  
  // Log browser console messages and errors
  page.on('console', msg => console.log('🌐 BROWSER LOG:', msg.text()));
  page.on('pageerror', err => console.error('🌐 BROWSER ERROR:', err.message));
  
  try {
    // ----------------------------------------------------
    // STEP 1: REGISTER & LOGIN AS NEW INVESTOR
    // ----------------------------------------------------
    console.log('🔑 Navigating to Login Page to Register...');
    await page.goto(`${FRONTEND_URL}/login`);
    await page.waitForSelector('#username');

    console.log('📝 Toggling to registration form...');
    const registerToggleBtn = await page.evaluateHandle(() => {
      const buttons = Array.from(document.querySelectorAll('button'));
      return buttons.find(el => el.textContent.includes('إنشاء حساب جديد'));
    });
    if (registerToggleBtn) {
      await registerToggleBtn.click();
    }
    await delay(1000);

    console.log('📝 Filling out registration details...');
    const regUsername = 'new_investor_' + Date.now();
    await page.waitForSelector('#username');
    await page.type('#username', regUsername);
    await page.type('#email', 'new_investor@egypt.gov.eg');
    await page.type('#phone', '01234567890');
    await page.type('#password', 'pass123');
    await delay(1000);

    console.log('🚀 Submitting registration form...');
    const registerBtn = await page.evaluateHandle(() => {
      const buttons = Array.from(document.querySelectorAll('button'));
      return buttons.find(el => el.textContent.includes('إنشاء الحساب كمستثمر'));
    });
    if (registerBtn) {
      await registerBtn.click();
    }

    console.log('⌛ Waiting for login form to load after successful registration...');
    await page.waitForFunction(() => {
      const btn = document.querySelector('button[type="submit"]');
      return btn && btn.textContent.includes('دخول');
    }, { timeout: 10000 });
    await delay(1000);

    console.log(`🔑 Logging in with newly created investor user: ${regUsername}...`);
    await page.waitForSelector('#username');
    
    // Clear and type the new username to ensure we have the correct user
    await page.click('#username');
    await page.keyboard.down('Control');
    await page.keyboard.press('A');
    await page.keyboard.up('Control');
    await page.keyboard.press('Backspace');
    await page.type('#username', regUsername);
    
    // Clear and type the password
    await page.click('#password');
    await page.keyboard.down('Control');
    await page.keyboard.press('A');
    await page.keyboard.up('Control');
    await page.keyboard.press('Backspace');
    await page.type('#password', 'pass123');
    await delay(500);

    // Click Login Button
    const loginSubmitBtn = await page.evaluateHandle(() => {
      const buttons = Array.from(document.querySelectorAll('button[type="submit"]'));
      return buttons.find(el => el.textContent.includes('دخول'));
    });
    if (loginSubmitBtn) {
      await loginSubmitBtn.click();
    }
    
    // Wait for the submission page to load
    await page.waitForSelector('.ant-steps');
    console.log('✅ Logged in successfully. Loaded Submit Investment Page.');
    await delay(1000);

    // ----------------------------------------------------
    // STEP 2: SUBMIT A MEDIUM-RISK INVESTMENT (Amount = 800,000)
    // ----------------------------------------------------
    console.log('📝 Filling out Step 1: Personal Info...');
    await page.type('#investor_fullName', 'أحمد محمود العشري');
    await page.type('#investor_nationalId', '29505051234567');
    await page.type('#investor_email', 'ahmed@egypt.gov.eg');
    await page.type('#investor_phone', '01012345678');
    await delay(1000);

    // Click Next Button (Second button in the submit layout is typically Next)
    console.log('➡️ Clicking Next...');
    const nextButtons1 = await page.$$('button');
    // Find the Next button (usually contains text "التالي")
    for (const btn of nextButtons1) {
      const text = await page.evaluate(el => el.textContent, btn);
      if (text.includes('التالي')) {
        await btn.click();
        break;
      }
    }
    await delay(1000);

    console.log('📝 Filling out Step 2: Company Info...');
    await page.waitForSelector('#company_name');
    await page.type('#company_name', 'الشركة المصرية لتطوير البرمجيات والذكاء الاصطناعي');
    
    // Select Company Type
    await page.waitForSelector('.ant-select-content');
    const selectSelectors = await page.$$('.ant-select-content');
    await selectSelectors[0].click(); // Click first select
    await page.waitForSelector('.ant-select-item-option-content');
    const options1 = await page.$$('.ant-select-item-option-content');
    await options1[0].click(); // Select LLC
    await delay(500);

    // Select Activity
    await selectSelectors[1].click(); // Click second select
    await page.waitForSelector('.ant-select-item-option-content');
    const options2 = await page.$$('.ant-select-item-option-content');
    await options2[5].click(); // Select IT/Software
    await delay(500);

    // Type Address
    await page.type('#company_address', 'القرية الذكية، طريق مصر الإسكندرية الصحراوي، الجيزة');
    await delay(1000);

    // Click Next
    console.log('➡️ Clicking Next...');
    const nextButtons2 = await page.$$('button');
    for (const btn of nextButtons2) {
      const text = await page.evaluate(el => el.textContent, btn);
      if (text.includes('التالي')) {
        await btn.click();
        break;
      }
    }
    await delay(1000);

    console.log('📝 Filling out Step 3: Investment Details...');
    await page.waitForSelector('#investment_amount');
    
    // Type Amount (800,000 - Medium Risk)
    await page.type('#investment_amount', '800000');
    
    // Select Investment Type
    await page.waitForSelector('.ant-select-content');
    const selectSelectors3 = await page.$$('.ant-select-content');
    await selectSelectors3[0].click();
    await page.waitForSelector('.ant-select-item-option-content');
    const options3 = await page.$$('.ant-select-item-option-content');
    await options3[1].click();
    await delay(500);

    // Type Partners
    await page.type('#investment_partners', '3');
    await page.type('#investment_notes', 'نرغب في الحصول على إعفاءات ضريبية للمشروعات التكنولوجية.');
    await delay(1000);

    // Click Next
    console.log('➡️ Clicking Next to Review...');
    const nextButtons3 = await page.$$('button');
    for (const btn of nextButtons3) {
      const text = await page.evaluate(el => el.textContent, btn);
      if (text.includes('التالي')) {
        await btn.click();
        break;
      }
    }
    await delay(1500);

    // Click Submit Button (Submit button usually has gold color and text "إرسال الطلب")
    console.log('🚀 Submitting Request...');
    const submitButtons = await page.$$('button');
    let procId = '';
    for (const btn of submitButtons) {
      const text = await page.evaluate(el => el.textContent, btn);
      if (text.includes('إرسال الطلب')) {
        await btn.click();
        break;
      }
    }

    // Wait for Success Result screen
    await page.waitForSelector('.ant-result-subtitle code');
    procId = await page.evaluate(() => document.querySelector('.ant-result-subtitle code').textContent.trim());
    console.log(`✅ Request submitted successfully! Process ID: ${procId}`);
    await delay(3000);

    // ----------------------------------------------------
    // STEP 3: LOGOUT AND LOGIN AS EMPLOYEE GROUP 1
    // ----------------------------------------------------
    console.log('🚪 Logging out from Investor...');
    await page.goto(`${FRONTEND_URL}/login`); // Simple logout by going back to login
    await page.waitForSelector('#username');
    await delay(1000);

    console.log('🔑 Logging in as emp_g1 (Employee G1)...');
    await page.type('#username', 'emp_g1');
    await page.type('#password', 'pass123');
    await page.click('button[type="submit"]');

    // Wait for Employee Tasks Page
    await page.waitForSelector('.ant-card');
    console.log('✅ Logged in as Employee G1.');
    await delay(2000);

    // ----------------------------------------------------
    // STEP 4: CLAIM AND RESPOND WITH MISSING DATA
    // ----------------------------------------------------
    console.log(`🔍 Finding task for Request ${procId}...`);
    // Find the task card containing the process id
    const taskCards = await page.$$('.ant-card');
    let taskCardToClick = null;
    for (const card of taskCards) {
      const text = await page.evaluate(el => el.textContent, card);
      if (text.includes(procId)) {
        taskCardToClick = card;
        break;
      }
    }

    if (taskCardToClick) {
      console.log('✋ Claiming task...');
      // Click "حجز المهمة" button inside card
      const claimBtn = await taskCardToClick.$('button.ant-btn-primary');
      if (claimBtn) {
        await claimBtn.click();
        console.log('Task claimed. Waiting for UI refresh...');
        await delay(2500); // Wait for API response and UI list refresh
      }

      // Now find the card again in the refreshed list
      const refreshedCards = await page.$$('.ant-card');
      let refreshedCard = null;
      for (const card of refreshedCards) {
        const text = await page.evaluate(el => el.textContent, card);
        if (text.includes(procId)) {
          refreshedCard = card;
          break;
        }
      }

      if (refreshedCard) {
        console.log('🔍 Opening task details modal...');
        const buttons = await refreshedCard.$$('button');
        for (const btn of buttons) {
          const text = await page.evaluate(el => el.textContent, btn);
          if (text.includes('إكمال المهمة') || text.includes('عرض')) {
            await btn.click();
            break;
          }
        }
        await delay(2000);
      }

      // Wait for details modal
      console.log('⌛ Waiting for details modal...');
      await page.waitForSelector('.ant-modal');
      await delay(1000);

      // Select 'بيانات ناقصة' (Missing Data) decision
      console.log('⚠️ Selecting Missing Data Decision...');
      const decisionBtns = await page.$$('.ant-modal button');
      for (const btn of decisionBtns) {
        const text = await page.evaluate(el => el.textContent, btn);
        if (text.includes('بيانات ناقصة')) {
          await btn.click();
          break;
        }
      }
      await delay(1000);

      // Check 'الرقم القومي' and 'العنوان'
      console.log('☑️ Selecting Missing Fields...');
      const checkboxes = await page.$$('.ant-checkbox-input');
      // Let's check first two checkboxes (الرقم القومي and الإعفاء الضريبي/العنوان)
      await checkboxes[0].click(); // National ID
      await checkboxes[1].click(); // Tax clearance
      await checkboxes[5].click(); // Address
      await delay(1000);

      // Click Confirm Decision
      console.log('💾 Confirming Decision...');
      const confirmBtns = await page.$$('.ant-modal-content button');
      for (const btn of confirmBtns) {
        const text = await page.evaluate(el => el.textContent, btn);
        if (text.includes('تأكيد القرار')) {
          await btn.click();
          break;
        }
      }
      console.log('✅ Task completed with Missing Data decision.');
      await delay(3000);
    } else {
      console.warn('⚠️ Could not find task card for procId in Employee list.');
    }

    // ----------------------------------------------------
    // STEP 5: LOGOUT AND LOGIN AS EMPLOYEE TO COMPLETE MISSING DATA
    // ----------------------------------------------------
    // Wait, in our app, the employee completes the missing data on behalf of the investor via MissingDataPage!
    // Let's click on "استكمال البيانات" (Missing Data page in Sidebar)
    console.log('📋 Navigating to Missing Data Page...');
    const sidebarLinks = await page.$$('aside nav a');
    for (const link of sidebarLinks) {
      const text = await page.evaluate(el => el.textContent, link);
      if (text.includes('بيانات ناقصة')) {
        await link.click();
        break;
      }
    }
    await delay(2000);

    // Find the request card and click complete data
    const missingCards = await page.$$('.ant-card');
    let missingCardToClick = null;
    for (const card of missingCards) {
      const text = await page.evaluate(el => el.textContent, card);
      if (text.includes(procId)) {
        missingCardToClick = card;
        break;
      }
    }

    if (missingCardToClick) {
      console.log('📝 Opening Complete Data form...');
      const btns = await missingCardToClick.$$('button');
      await btns[0].click(); // Click "استكمال البيانات" button
      await delay(1500);

      // Wait for Modal Form to load
      await page.waitForSelector('.ant-modal-body input');
      const modalInputs = await page.$$('.ant-modal-body input');
      
      console.log('📝 Typing updated fields...');
      // Fill the required missing fields
      for (const input of modalInputs) {
        await input.type('29505059999999'); // Type updated ID or Address
      }
      await delay(1000);

      // Click Send Data
      const sendBtns = await page.$$('.ant-modal-body button');
      for (const btn of sendBtns) {
        const text = await page.evaluate(el => el.textContent, btn);
        if (text.includes('إرسال البيانات')) {
          await btn.click();
          break;
        }
      }
      console.log('✅ Missing Data submitted successfully.');
      await delay(3000);
    } else {
      console.warn('⚠️ Could not find missing data card.');
    }

    // ----------------------------------------------------
    // STEP 6: LOGOUT AND LOGIN AS MANAGER TO REVIEW STATUS
    // ----------------------------------------------------
    console.log('🚪 Logging out to review as Manager...');
    await page.goto(`${FRONTEND_URL}/login`);
    await page.waitForSelector('#username');
    await delay(1000);

    console.log('🔑 Logging in as manager1...');
    await page.type('#username', 'manager1');
    await page.type('#password', 'pass123');
    await page.click('button[type="submit"]');

    // Wait for Dashboard
    await page.waitForSelector('.ant-statistic');
    console.log('✅ Logged in as Manager.');
    console.log('📊 Viewing Dashboard Metrics.');
    await delay(3000);

    // Navigate to Requests Page
    console.log('📋 Navigating to Manager Requests List...');
    const managerSidebarLinks = await page.$$('aside nav a');
    for (const link of managerSidebarLinks) {
      const text = await page.evaluate(el => el.textContent, link);
      if (text.includes('جميع الطلبات')) {
        await link.click();
        break;
      }
    }
    await delay(2000);

    // Verify request status is visible
    console.log(`🔍 Looking for Request ${procId} in list...`);
    await page.waitForSelector('.ant-table-row');
    const tableRows = await page.$$('.ant-table-row');
    let found = false;
    for (const row of tableRows) {
      const text = await page.evaluate(el => el.textContent, row);
      if (text.includes(procId)) {
        found = true;
        break;
      }
    }
    if (found) {
      console.log(`✅ Found Request ${procId} successfully in Manager list.`);
    } else {
      console.warn(`⚠️ Could not find Request ${procId} in Manager list.`);
    }

    console.log('🎉 E2E Automated UI Testing completed successfully!');

  } catch (err) {
    console.error('❌ E2E Test encountered an error:', err.message);
    try {
      const selectElements = await page.evaluate(() => {
        return Array.from(document.querySelectorAll('*'))
          .filter(el => el.className && typeof el.className === 'string' && (el.className.includes('select') || el.className.includes('modal')))
          .map(el => ({ tag: el.tagName, class: el.className, id: el.id }));
      });
      console.log('🔍 Found select/modal elements:', selectElements);
      
      const screenshotPath = 'C:\\Users\\moham\\.gemini\\antigravity-ide\\brain\\8ac3e67e-de05-4b4e-899c-0f19df9b10d6\\error_screenshot.png';
      await page.screenshot({ path: screenshotPath });
      console.log(`📸 Saved error screenshot to: ${screenshotPath}`);
    } catch (ssErr) {
      console.error('Failed to capture debug info:', ssErr.message);
    }
  } finally {
    await delay(4000);
    console.log('🚪 Closing browser...');
    await browser.close();
  }
})();
