import { createClient } from '@supabase/supabase-js';
import { randomBytes } from 'node:crypto';
import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import path from 'node:path';
import { localRuntime } from './local-guard.mjs';
import { SupabaseRepository, insert } from '../../lib/english-mastery/repository';
import { importPackages } from '../../lib/english-mastery/content';
import { PERMISSIONS } from '../../lib/english-mastery/policy';
async function main() {
  const r = localRuntime();
  const file = path.join(r.state, 'accounts.json');
  const accounts: Record<string, { id: string; email: string; password: string }> =
    existsSync(file) ? JSON.parse(readFileSync(file, 'utf8')) : {};
  const client = createClient(r.status.API_URL, r.status.SERVICE_ROLE_KEY,
    { auth: { persistSession: false, autoRefreshToken: false } });
  for (const name of ['learner', 'author', 'reviewer', 'other']) {
    if (accounts[name]) continue;
    const email = `${name}@english-mastery.local`;
    const password = randomBytes(24).toString('base64url');
    const { data, error } = await client.auth.admin.createUser({ email, password,
      email_confirm: true, user_metadata: { full_name: `LOCAL TEST ${name}` } });
    if (error || !data.user) throw Error(`LOCAL_USER_CREATION_FAILED:${error?.code}`);
    accounts[name] = { id: data.user.id, email, password };
    writeFileSync(file, JSON.stringify(accounts, null, 2), { mode: 0o600 });
  }
  const repo = new SupabaseRepository(client);
  const imported = await importPackages(repo, accounts.author.id, false);
  for (const [name, account] of Object.entries(accounts)) {
    const permissions = name === 'author' ? PERMISSIONS.filter(p => p !== 'english.review') :
      name === 'reviewer' ? ['english.learn', 'english.preview', 'english.review', 'english.audit_attempts'] :
      name === 'learner' ? ['english.learn', 'english.preview'] : ['english.learn'];
    for (const permission of permissions) {
      const id = `${account.id}:${permission}`;
      if (!await repo.get('permissions', id)) await repo.commit([
        insert('permissions', id, account.id, { permission, units: ['*'], reviewTypes: ['*'] })]);
    }
  }
  const credentials = ['# บัญชีเฉพาะระบบทดสอบในเครื่อง', '',
    'เปิด http://127.0.0.1:3190/login — ใช้ได้เฉพาะเครื่องนี้',
    'ข้อมูลเก็บใน Supabase local จริงและคงอยู่หลังปิดเปิด ห้ามนำรหัสเหล่านี้ไปใช้กับระบบหลัก', '',
    ...Object.entries(accounts).flatMap(([name, a]) => [`## ${name}`, `Email: ${a.email}`, `Password: ${a.password}`, '']),
    'learner: ทดลองเรียน/เขียน/พูด; author: จัดการเนื้อหา; reviewer: ตรวจงาน; other: ทดสอบการปฏิเสธสิทธิ์',
    'ยังไม่มีเนื้อหาที่ผ่านการตรวจโดยมนุษย์ การทดลองใช้ preview ไม่ออกใบรับรอง CEFR',
    'ไฟล์เสียงใช้แนวทาง LOCAL-TEST-ONLY เก็บ 1 วัน ใช้เสียงสังเคราะห์/ข้อมูลจำลอง และลบได้ทันที', ''].join('\n');
  writeFileSync(path.join(r.state, 'บัญชีทดสอบ.md'), credentials, { mode: 0o600 });
  const env = {
    NEXT_PUBLIC_SUPABASE_URL: r.status.API_URL,
    NEXT_PUBLIC_SUPABASE_ANON_KEY: r.status.ANON_KEY,
    SUPABASE_SERVICE_ROLE_KEY: r.status.SERVICE_ROLE_KEY,
    EMH_ENABLED: 'true', EMH_ENV: 'development', EMH_ISOLATED_LOCAL: 'true',
    EMH_RECORDING_POLICY_VERSION: 'LOCAL-TEST-ONLY', EMH_RECORDING_RETENTION_DAYS: '1',
    NEXT_TELEMETRY_DISABLED: '1',
  };
  writeFileSync(path.join(r.root, '.env.local'), Object.entries(env).map(([k,v]) => `${k}=${v}`).join('\n')+'\n', { mode: 0o600 });
  console.log(`Four real local Auth accounts and ${imported.units} curriculum entries / ${imported.versions} preview versions ready. Credentials saved privately; no content approved or published.`);
}
main().catch(e => { console.error(e.code || e.message || 'LOCAL_SETUP_FAILED'); process.exitCode = 1; });
