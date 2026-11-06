// Runs stock Firefox with a content script and a page script reading ariaLabelledByElements.
//   node run.mjs <firefox binary> <geckodriver binary>
// Prints one result per page. Exits 0 when only the page that uses both worlds crashes.
import { spawn } from 'node:child_process';
import http from 'node:http';
import { fileURLToPath } from 'node:url';

const [firefox, geckodriver] = process.argv.slice(2);
const pageScript = `<script>document.getElementById('b').ariaLabelledByElements;</script>`;
const button = `<span id="l">Save</span><button id="b" aria-labelledby="l"></button>`;
const pages = {
  '/content-script-only': { html: `<!doctype html><body>${button}`, crashes: false },
  '/page-script-only': { html: `<!doctype html><body data-skip-content-script>${button}${pageScript}`, crashes: false },
  '/both-worlds': { html: `<!doctype html><body>${button}${pageScript}`, crashes: true },
};

const extension = fileURLToPath(new URL('./extension/', import.meta.url));

const server = http.createServer((req, res) => {
  res.setHeader('content-type', 'text/html');
  res.end(pages[req.url]?.html ?? '');
}).listen(4011);
const driver = spawn(geckodriver, ['--port', '4012', '--binary', firefox], { stdio: 'ignore' });
await new Promise((resolve) => setTimeout(resolve, 1500));
const wd = async (method, path, body) => {
  const res = await fetch(`http://127.0.0.1:4012${path}`, { method, body: body && JSON.stringify(body), headers: { 'content-type': 'application/json' } });
  return (await res.json()).value;
};

let good = true;
for (const [path, { crashes }] of Object.entries(pages)) {
  for (let run = 1; run <= 3; run++) {
    const session = await wd('POST', '/session', { capabilities: { alwaysMatch: { 'moz:firefoxOptions': { args: ['-headless'] } } } });
    const { sessionId } = session;
    if (!sessionId) {
      console.error(`Firefox did not start: ${JSON.stringify(session)}`);
      driver.kill();
      server.close();
      process.exit(2);
    }
    await wd('POST', `/session/${sessionId}/moz/addon/install`, { path: extension, temporary: true });
    await wd('POST', `/session/${sessionId}/url`, { url: `http://localhost:4011${path}` }).catch(() => {});
    await new Promise((resolve) => setTimeout(resolve, 800));
    const alive = await wd('POST', `/session/${sessionId}/execute/sync`, { script: 'return navigator.userAgent', args: [] }).catch(() => null);
    const crashed = typeof alive !== 'string';
    console.log(`${path} run ${run}: ${crashed ? 'CRASHED' : 'alive'}${crashed ? '' : ` (${alive.match(/Firefox.*/)[0]})`}`);
    if (crashed !== crashes) good = false;
    await wd('DELETE', `/session/${sessionId}`).catch(() => {});
  }
}
driver.kill();
server.close();
console.log(good ? 'RESULT: crash reproduced on /both-worlds only' : 'RESULT: not the expected pattern');
process.exit(good ? 0 : 1);
