import { readFileSync, existsSync } from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { execFileSync } from 'node:child_process';

export const PROJECT = 'smart-plan-emh-local';
export const PROFILE = 'emh-testing';
export const CONTAINER = `supabase_db_${PROJECT}`;
export function requireLoopbackListeners(output, ports) {
  for (const port of ports) {
    const lines = output.split('\n').filter(line => line.includes(`:${port} (LISTEN)`));
    if (!lines.length || lines.some(line => !line.includes(`TCP 127.0.0.1:${port} (LISTEN)`)))
      throw Error('LOOPBACK_LISTENER_REQUIRED');
  }
}
export function requireLocalStatus(status) {
  if (status.API_URL !== 'http://127.0.0.1:55321') throw Error('LOCAL_API_REQUIRED');
  const db = new URL(status.DB_URL);
  if (db.hostname !== '127.0.0.1' || db.port !== '55322' || db.pathname !== '/postgres')
    throw Error('LOCAL_DATABASE_REQUIRED');
  if (!status.SERVICE_ROLE_KEY || !status.ANON_KEY) throw Error('LOCAL_KEYS_REQUIRED');
  return status;
}
export function localRuntime(root = process.cwd()) {
  const state = path.join(root, '.emh-local');
  const config = readFileSync(path.join(root, 'supabase/config.toml'), 'utf8');
  if (!/^project_id = "smart-plan-emh-local"$/m.test(config)) throw Error('ISOLATED_PROJECT_REQUIRED');
  if (existsSync(path.join(root, 'supabase/.temp/project-ref'))) throw Error('CLOUD_LINK_FORBIDDEN');
  const status = requireLocalStatus(JSON.parse(readFileSync(path.join(state, 'status.json'), 'utf8')));
  const ports = [55321, 55322, Number(new URL(status.MAILPIT_URL).port)];
  const listeners = execFileSync('/usr/sbin/lsof', ['-nP', ...ports.map(port => `-iTCP:${port}`), '-sTCP:LISTEN'], { encoding: 'utf8' });
  requireLoopbackListeners(listeners, ports);
  const env = { ...process.env, DOCKER_CONFIG: path.join(state, 'docker'),
    DOCKER_HOST: `unix://${os.homedir()}/.colima/${PROFILE}/docker.sock` };
  const docker = (args, options = {}) => execFileSync('/opt/homebrew/bin/docker', args,
    { env, encoding: 'utf8', maxBuffer: 16 * 1024 * 1024, ...options });
  const [container] = JSON.parse(docker(['inspect', CONTAINER]));
  const labels = container.Config.Labels;
  if (labels['com.supabase.cli.project'] !== PROJECT ||
      path.resolve(labels['com.supabase.cli.workdir']) !== path.resolve(root))
    throw Error('LOCAL_CONTAINER_MISMATCH');
  if (docker(['info', '--format', '{{.Name}}']).trim() !== `colima-${PROFILE}`)
    throw Error('ISOLATED_DOCKER_REQUIRED');
  const sql = (input) => docker(['exec', '-i', CONTAINER, 'psql', '-X', '-U', 'postgres',
    '-d', 'postgres', '-v', 'ON_ERROR_STOP=1', '-At'], { input });
  return { root, state, status, env, docker, sql };
}
