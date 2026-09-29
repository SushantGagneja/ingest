import { chromium } from 'playwright';
import fs from 'fs';
import path from 'path';

const BASE_URL = process.env.BASE_URL || 'http://localhost:5173';
const OUTPUT_DIR = process.argv[2] || 'docs/audit/before';
const REPORT_FILE = process.argv[3] || 'docs/audit/baseline-report.json';

const WIDTHS = [1440, 1024, 768, 390];
const HEIGHT = 900;

const ROUTES = [
  { name: 'landing', path: '/', role: null },
  { name: 'login', path: '/login', role: null },
  { name: 'apply_home', path: '/apply', role: 'applicant' },
  { name: 'apply_application', path: '/applications/a1b2c3d4-0002', role: 'applicant' },
  { name: 'review_application', path: '/applications/a1b2c3d4-0002', role: 'institute_officer' },
  { name: 'apply_awards', path: '/apply/awards', role: 'applicant' },
  { name: 'apply_help', path: '/help', role: 'applicant' },
  { name: 'queue', path: '/queue', role: 'institute_officer' },
  { name: 'risk', path: '/risk', role: 'scrutiny_officer' },
  { name: 'scholars', path: '/scholars', role: 'mission_officer' },
  { name: 'requests', path: '/requests', role: 'mission_officer' },
  { name: 'merit', path: '/merit', role: 'committee_member' },
  { name: 'merit_run', path: '/merit/runs/run-1', role: 'committee_member' },
  { name: 'finance', path: '/finance', role: 'finance_officer' },
  { name: 'admin_users', path: '/admin/users', role: 'scheme_admin' },
  { name: 'admin_institutions', path: '/admin/institutions', role: 'scheme_admin' },
  { name: 'admin_cycles', path: '/admin/cycles', role: 'scheme_admin' },
  { name: 'admin_config', path: '/admin/cycles/c-nfst-26', role: 'scheme_admin' },
  { name: 'dashboards', path: '/dashboards', role: 'leadership' },
  { name: 'grievances', path: '/grievances', role: 'scrutiny_officer' },
  { name: 'notifications', path: '/notifications', role: 'applicant' },
  { name: 'profile', path: '/profile', role: 'applicant' },
];

fs.mkdirSync(OUTPUT_DIR, { recursive: true });

async function run() {
  const browser = await chromium.launch({ headless: true });
  const results = {};

  for (const route of ROUTES) {
    console.log(`Auditing ${route.name} (${route.path}) [role: ${route.role}]...`);
    results[route.name] = {
      path: route.path,
      role: route.role,
      errors: [],
      warnings: [],
      failedRequests: [],
    };

    const context = await browser.newContext();

    if (route.role) {
      await context.addInitScript((role) => {
        localStorage.setItem('mock_role', role);
      }, route.role);
    } else {
      await context.addInitScript(() => {
        localStorage.removeItem('mock_role');
      });
    }

    const page = await context.newPage();

    page.on('console', (msg) => {
      const type = msg.type();
      const text = msg.text();
      if (type === 'error') {
        results[route.name].errors.push(text);
      } else if (type === 'warning') {
        results[route.name].warnings.push(text);
      }
    });

    page.on('requestfailed', (req) => {
      results[route.name].failedRequests.push({
        url: req.url(),
        failure: req.failure()?.errorText || 'Unknown failure',
      });
    });

    for (const width of WIDTHS) {
      await page.setViewportSize({ width, height: HEIGHT });
      try {
        await page.goto(`${BASE_URL}${route.path}`, { waitUntil: 'networkidle', timeout: 10000 });
      } catch {
        await page.goto(`${BASE_URL}${route.path}`, { waitUntil: 'domcontentloaded', timeout: 10000 });
      }
      await page.waitForTimeout(500);

      const screenshotPath = path.join(OUTPUT_DIR, `${route.name}_${width}.png`);
      await page.screenshot({ path: screenshotPath, fullPage: true });
    }

    await context.close();
  }

  await browser.close();

  fs.writeFileSync(REPORT_FILE, JSON.stringify(results, null, 2));
  console.log(`Completed audit! Report written to ${REPORT_FILE}`);
}

run().catch((err) => {
  console.error(err);
  process.exit(1);
});
