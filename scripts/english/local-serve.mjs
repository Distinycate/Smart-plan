import { spawn } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { parse } from 'dotenv';
import { localRuntime } from './local-guard.mjs';
const r = localRuntime();
const settings = parse(readFileSync('.env.local'));
if (settings.NEXT_PUBLIC_SUPABASE_URL !== r.status.API_URL || settings.SUPABASE_SERVICE_ROLE_KEY !== r.status.SERVICE_ROLE_KEY ||
    settings.EMH_ISOLATED_LOCAL !== 'true') throw Error('LOCAL_APP_CONFIGURATION_REQUIRED');
const env = { ...process.env };
for (const key of Object.keys(env)) if (/^(GEMINI|SUPABASE|NEXT_PUBLIC_SUPABASE|EMH_|DATABASE_URL)/.test(key)) delete env[key];
Object.assign(env, settings, { NEXT_TELEMETRY_DISABLED: '1' });
if (Object.keys(settings).some(k => /^GEMINI|EMH_TEST_PROVIDER/.test(k))) throw Error('EXTERNAL_AI_OR_DOUBLE_FORBIDDEN');
try { await fetch('http://127.0.0.1:3190/login'); throw Error('LOCAL_APP_PORT_OCCUPIED'); }
catch (error) { if (error.message === 'LOCAL_APP_PORT_OCCUPIED') throw error; }
const args = ['node_modules/next/dist/bin/next', process.argv.includes('--dev') ? 'dev' : 'start', '--hostname', '127.0.0.1', '--port', '3190'];
const child = spawn(process.execPath, args, { env, stdio: 'inherit' });
for (const signal of ['SIGINT', 'SIGTERM']) process.once(signal, () => child.kill(signal));
child.once('exit', code => { process.exitCode = code ?? 1; });
