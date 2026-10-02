import puppeteer from 'puppeteer-core';
import dotenv from 'dotenv';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import { createServerClient } from '@supabase/ssr';

dotenv.config({ path: '.env.local' });

const CHROME_PATH = '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
const BASE_URL = 'https://smart-plan-ten.vercel.app';
const EMAIL = 'teacher.guided.v312@example.com';
const PASSWORD = 'TestPassword123!@#';
const ARTIFACTS_DIR = '/Users/distinycate/.gemini/antigravity-ide/brain/d4ab2280-eb6d-4228-ba6a-101c4de02510';

async function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function getAuthCookies() {
  const jar = new Map();
  const c = createServerClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY, {
    cookies: {
      getAll: () => Array.from(jar, ([n, v]) => ({ name: n, value: v })),
      setAll: (items) => items.forEach(({ name, value }) => jar.set(name, value)),
    },
  });
  await c.auth.signInWithPassword({ email: EMAIL, password: PASSWORD });
  return Array.from(jar, ([name, value]) => ({
    name,
    value,
    domain: 'smart-plan-ten.vercel.app',
    path: '/',
    secure: true,
  }));
}

async function runDeepVerification() {
  console.log('--- STARTING DEEP PRODUCTION UX VERIFICATION ---');
  const cookies = await getAuthCookies();
  const browser = await puppeteer.launch({
    executablePath: CHROME_PATH,
    headless: 'new',
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--window-size=1280,800'],
  });

  const page = await browser.newPage();
  await page.setViewport({ width: 1280, height: 800 });
  await page.setCookie(...cookies);

  const testResults = {};

  // 1. Load Step 2 on current plan
  const planId = 'ab045ab7-3b02-4ad0-bc4c-6e154562da07';
  await page.goto(`${BASE_URL}/plan/v3/${planId}?step=2`, { waitUntil: 'networkidle2' });
  await sleep(3000);

  // A. Select candidate 1
  console.log('Testing Objective Selection...');
  const selectObjectiveResult = await page.evaluate(() => {
    const btns = Array.from(document.querySelectorAll('button')).filter(b => b.textContent && b.textContent.includes('เลือกใช้ข้อนี้'));
    if (btns[1]) {
      btns[1].click(); // Select target objective
      return { clicked: true, text: btns[1].parentElement?.innerText?.slice(0, 100) };
    }
    return { clicked: false };
  });
  console.log('Select Objective 1:', selectObjectiveResult);
  await sleep(2000);

  // B. Test Regenerate Safety:
  console.log('Testing Regenerate Safety on Objectives...');
  const regenSafety = await page.evaluate(async () => {
    const savedBefore = document.body.innerText.includes('นักเรียนสามารถพูดบรรยายกิจวัตรประจำวัน');
    const regenBtn = Array.from(document.querySelectorAll('button')).find(b => b.textContent && b.textContent.includes('เสนอใหม่'));
    if (regenBtn) {
      regenBtn.click();
      return { clicked: true, savedBefore };
    }
    return { clicked: false, savedBefore };
  });
  console.log('Regenerate clicked:', regenSafety);
  await sleep(3000);

  const regenVerification = await page.evaluate(() => {
    const savedAfter = document.body.innerText.includes('นักเรียนสามารถพูดบรรยายกิจวัตรประจำวัน');
    return { savedAfter };
  });
  console.log('Regenerate preservation check (saved data unchanged):', regenVerification);
  testResults.regenerateSafety = regenVerification.savedAfter ? 'PASS' : 'FAIL';

  // C. Test Refresh Persistence:
  console.log('Testing Refresh Persistence...');
  await page.reload({ waitUntil: 'networkidle2' });
  await sleep(2000);
  const refreshCheck = await page.evaluate(() => {
    const hasSavedObj = document.body.innerText.includes('นักเรียนสามารถพูดบรรยายกิจวัตรประจำวัน');
    return { hasSavedObj };
  });
  console.log('Refresh Persistence check:', refreshCheck);
  testResults.refreshPersistence = refreshCheck.hasSavedObj ? 'PASS' : 'FAIL';

  // D. Select Evidence
  console.log('Selecting Evidence...');
  await page.evaluate(() => {
    const evdBtns = Array.from(document.querySelectorAll('button')).filter(b => b.textContent && b.textContent.includes('เลือกใช้หลักฐานนี้'));
    if (evdBtns[0]) evdBtns[0].click();
  });
  await sleep(2000);

  // Take screenshot of step 2 with saved objective & evidence
  await page.screenshot({ path: path.join(ARTIFACTS_DIR, 'v312_step2_verified.png') });

  // Move to Step 3
  console.log('Moving to Step 3 (Activity Flows)...');
  await page.goto(`${BASE_URL}/plan/v3/${planId}?step=3`, { waitUntil: 'networkidle2' });
  await sleep(3000);

  const step3State = await page.evaluate(() => {
    const text = document.body.innerText;
    const hasFlows = text.includes('Flow') || text.includes('2W3P') || text.includes('Task-Based') || text.includes('นาที');
    const flowButtons = Array.from(document.querySelectorAll('button')).map(b => b.textContent.trim()).filter(t => t.includes('Flow') || t.includes('เลือก') || t.includes('กิจกรรม'));
    return { textSnippet: text.slice(0, 1000), hasFlows, flowButtons };
  });
  console.log('Step 3 Content:', step3State);
  await page.screenshot({ path: path.join(ARTIFACTS_DIR, 'v312_step3_verified.png') });

  // Check Step 4 (Assessment)
  console.log('Checking Step 4 (Assessment Tools)...');
  await page.goto(`${BASE_URL}/plan/v3/${planId}?step=4`, { waitUntil: 'networkidle2' });
  await sleep(3000);
  const step4State = await page.evaluate(() => {
    const text = document.body.innerText;
    return {
      hasRubric: text.includes('Rubric') || text.includes('เกณฑ์การประเมิน') || text.includes('Speaking'),
      hasObservation: text.includes('สังเกต') || text.includes('Observation'),
      isSoloMCQ: text.includes('ปรนัย') && !text.includes('Rubric'),
      textSnippet: text.slice(0, 800),
    };
  });
  console.log('Step 4 Assessment State:', step4State);
  await page.screenshot({ path: path.join(ARTIFACTS_DIR, 'v312_step4_verified.png') });

  // Check Step 5 (Teaching Package)
  console.log('Checking Step 5 (Teaching Package Checklist)...');
  await page.goto(`${BASE_URL}/plan/v3/${planId}?step=5`, { waitUntil: 'networkidle2' });
  await sleep(3000);
  const step5State = await page.evaluate(() => {
    const text = document.body.innerText;
    const items = ['Speaking Card', 'Rubric', 'ใบงาน', 'บัตรคำ', 'Worksheet', 'Exit Ticket'].filter(i => text.includes(i));
    return { itemsFound: items, textSnippet: text.slice(0, 800) };
  });
  console.log('Step 5 Teaching Package:', step5State);
  await page.screenshot({ path: path.join(ARTIFACTS_DIR, 'v312_step5_verified.png') });

  // Check Step 8 & 9 (Post-Teaching & Reflection)
  console.log('Checking Step 8 (Post-Teaching Chips)...');
  await page.goto(`${BASE_URL}/plan/v3/${planId}?step=8`, { waitUntil: 'networkidle2' });
  await sleep(3000);
  const step8Text = await page.evaluate(() => document.body.innerText.slice(0, 1000));
  console.log('Step 8 Text:', step8Text);

  console.log('Checking Step 9 (Reflection AI Assist)...');
  await page.goto(`${BASE_URL}/plan/v3/${planId}?step=9`, { waitUntil: 'networkidle2' });
  await sleep(3000);
  const step9State = await page.evaluate(() => {
    const text = document.body.innerText;
    const chips = ['นักเรียนมีส่วนร่วมดี', 'เวลาไม่พอ', 'นักเรียนบางส่วนยังไม่เข้าใจ', 'เพิ่มเวลาฝึก', 'จัดกลุ่มซ่อมเสริม'].filter(c => text.includes(c));
    const hasAssistBtn = Array.from(document.querySelectorAll('button')).some(b => b.textContent && b.textContent.includes('ช่วยเรียบเรียง'));
    return { chipsFound: chips, hasAssistBtn, textSnippet: text.slice(0, 800) };
  });
  console.log('Step 9 State:', step9State);

  // Mobile 375px Verification
  console.log('Checking 375px Mobile Layout...');
  await page.setViewport({ width: 375, height: 812, isMobile: true });
  await page.goto(`${BASE_URL}/plan/v3/${planId}?step=2`, { waitUntil: 'networkidle2' });
  await sleep(2000);
  const mobileStep2 = await page.evaluate(() => ({
    overflow: document.documentElement.scrollWidth > window.innerWidth,
    scrollWidth: document.documentElement.scrollWidth,
    innerWidth: window.innerWidth,
  }));
  console.log('Mobile Step 2:', mobileStep2);
  await page.screenshot({ path: path.join(ARTIFACTS_DIR, 'v312_mobile_step2_375px.png') });

  await page.goto(`${BASE_URL}/plan/v3/${planId}?step=9`, { waitUntil: 'networkidle2' });
  await sleep(2000);
  const mobileStep9 = await page.evaluate(() => ({
    overflow: document.documentElement.scrollWidth > window.innerWidth,
    scrollWidth: document.documentElement.scrollWidth,
    innerWidth: window.innerWidth,
  }));
  console.log('Mobile Step 9:', mobileStep9);
  await page.screenshot({ path: path.join(ARTIFACTS_DIR, 'v312_mobile_step9_375px.png') });

  await browser.close();

  fs.writeFileSync(path.join(ARTIFACTS_DIR, 'deep_verification_results.json'), JSON.stringify({
    selectObjectiveResult,
    regenSafety,
    regenVerification,
    refreshCheck,
    step3State,
    step4State,
    step5State,
    step8Text,
    step9State,
    mobileStep2,
    mobileStep9,
  }, null, 2));

  console.log('--- DEEP VERIFICATION COMPLETE ---');
}

runDeepVerification();
