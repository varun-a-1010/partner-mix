// Explicitly authorized local reuse of Slate's default Vertex project. Fetch
// only the three required settings into child-process memory; never write them.
import { execFileSync, spawn } from 'node:child_process';
const args = process.argv.slice(2);
if (!args.length) throw new Error('Provide a command to run with Vertex configured.');
const env = { ...process.env };
delete env.GOOGLE_API_KEY;
delete env.GEMINI_API_KEY;
for (const name of ['VERTEX_LLM_PROJECT_ID', 'VERTEX_LLM_SERVICE_ACCOUNT', 'VERTEX_LLM_REGION']) {
  env[name] = execFileSync(
    'doppler',
    ['secrets', 'get', name, '--project', 'slate', '--config', 'dev_mac', '--plain'],
    { encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] },
  ).trim();
}
const child = spawn(args[0], args.slice(1), { env, stdio: 'inherit' });
for (const signal of ['SIGTERM', 'SIGINT']) process.on(signal, () => child.kill(signal));
child.on('exit', (code) => process.exit(code ?? 1));
