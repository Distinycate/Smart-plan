// Operates only the already-provisioned local profile. No cloud resource or billing API.
import { execFileSync, spawn } from 'node:child_process';
import { readFileSync, writeFileSync, openSync, closeSync, existsSync, unlinkSync } from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { fileURLToPath } from 'node:url';
import { localRuntime, PROJECT, PROFILE } from './local-guard.mjs';
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
process.chdir(root);
const state = path.join(root, '.emh-local');
const env = { ...process.env, DOCKER_CONFIG: path.join(state, 'docker'),
  DOCKER_HOST: `unix://${os.homedir()}/.colima/${PROFILE}/docker.sock` };
for (const key of Object.keys(env)) if (/^(SUPABASE_ACCESS|SUPABASE_DB|GEMINI|EMH_TEST)/.test(key)) delete env[key];
const config = readFileSync('supabase/config.toml', 'utf8');
if (!config.includes(`project_id = "${PROJECT}"`) || existsSync('supabase/.temp/project-ref'))
  throw Error('CLOUD_LINK_FORBIDDEN');
const profile = readFileSync(path.join(os.homedir(), '.colima', PROFILE, 'colima.yaml'), 'utf8');
const dockerSettings = profile.match(/^docker:\n((?: {2,}.*\n|\n)*)/m)?.[1] || '';
if (!/^  ip: 127\.0\.0\.1$/m.test(dockerSettings) ||
    !/^      com\.docker\.network\.bridge\.host_binding_ipv4: 127\.0\.0\.1$/m.test(dockerSettings))
  throw Error('ISOLATED_LOOPBACK_VM_CONFIGURATION_REQUIRED');
const cli = path.join(state, 'tools/supabase');
const call = (exe, args) => {
  const fd = openSync(path.join(state, 'control.log'), 'a', 0o600);
  try { execFileSync(exe, args, { env, stdio: ['ignore', fd, fd] }); }
  finally { closeSync(fd); }
};
const cliArgs = ['--workdir', root, '--agent', 'no'];
const pidFile = path.join(state, 'app.pid');
const serve = path.join(root, 'scripts/english/local-serve.mjs');
function stopApp() {
  if (!existsSync(pidFile)) return;
  const pid = Number(readFileSync(pidFile, 'utf8'));
  if (!Number.isSafeInteger(pid) || pid < 2) throw Error('INVALID_LOCAL_APP_PID');
  let command;
  try { command = execFileSync('/bin/ps', ['-p', String(pid), '-o', 'command='], { encoding: 'utf8' }); }
  catch { unlinkSync(pidFile); return; }
  if (!command.includes(serve)) throw Error('LOCAL_APP_PID_MISMATCH');
  process.kill(pid, 'SIGTERM');
  unlinkSync(pidFile);
}
const action = process.argv[2];
if (action === 'stop') {
  stopApp();
  call(cli, ['stop', ...cliArgs, '--output-format', 'text']); // preserves database / Storage volumes
  call('/opt/homebrew/bin/colima', ['stop', PROFILE]);
  console.log('Local app and isolated VM stopped. Database and recordings are preserved.');
} else if (action === 'start') {
  call('/opt/homebrew/bin/colima', ['start', PROFILE, '--activate=false', '--ssh-config=false']);
  call(cli, ['start', ...cliArgs, '--exclude', 'realtime,imgproxy,postgres-meta,studio,edge-runtime,logflare,vector,supavisor', '--output-format', 'text']);
  const status = execFileSync(cli, ['status', ...cliArgs, '--output-format', 'json'], { env, encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] });
  writeFileSync(path.join(state, 'status.json'), status, { mode: 0o600 });
  localRuntime(root);
  let occupied = false;
  try { const response = await fetch('http://127.0.0.1:3190/login');
    const html = await response.text();
    if (!html.includes('Local testing environment')) throw Error('UNEXPECTED_APP_ON_LOCAL_PORT');
    occupied = true;
  } catch (error) { if (error.message === 'UNEXPECTED_APP_ON_LOCAL_PORT') throw error; }
  if (!occupied) {
    const fd = openSync(path.join(state, 'app.log'), 'a', 0o600);
    const child = spawn(process.execPath, [serve], { cwd: root, env, detached: true, stdio: ['ignore', fd, fd] });
    child.unref(); closeSync(fd);
    writeFileSync(pidFile, String(child.pid), { mode: 0o600 });
    let ready = false;
    for (let i=0; i<60; i++) {
      try { if ((await fetch('http://127.0.0.1:3190/login')).ok) { ready = true; break; } } catch {}
      await new Promise(resolve => setTimeout(resolve, 500));
    }
    if (!ready) throw Error('LOCAL_APP_NOT_READY_CHECK_PRIVATE_LOG');
  }
  console.log('Ready: http://127.0.0.1:3190/login — real local Supabase; main system untouched.');
} else throw Error('Use start or stop. No reset/delete command is provided.');
