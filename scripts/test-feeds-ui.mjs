import { spawn } from 'child_process';
import fs from 'fs';
import path from 'path';

const CHROME_PATH = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const DEBUG_PORT = 9222;
const ARTIFACT_DIR = path.resolve('test-artifacts');

if (!fs.existsSync(ARTIFACT_DIR)) {
  fs.mkdirSync(ARTIFACT_DIR, { recursive: true });
}

const PROFILE_DIR = path.resolve('test-artifacts', 'chrome-profile');
if (!fs.existsSync(PROFILE_DIR)) {
  fs.mkdirSync(PROFILE_DIR, { recursive: true });
}

// 1. Launch Chrome with remote debugging and isolated user data dir
const chrome = spawn(CHROME_PATH, [
  '--headless=new',
  `--remote-debugging-port=${DEBUG_PORT}`,
  `--user-data-dir=${PROFILE_DIR}`,
  '--disable-gpu',
  '--no-sandbox',
  '--hide-scrollbars',
  'http://localhost:5174/'
]);

chrome.stderr.on('data', (d) => console.log('[Chrome Stderr]', d.toString()));
chrome.stdout.on('data', (d) => console.log('[Chrome Stdout]', d.toString()));
chrome.on('exit', (code) => console.log('[Chrome Exited]', code));

async function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function getDebuggerWsUrl() {
  for (let i = 0; i < 30; i++) {
    try {
      const res = await fetch(`http://127.0.0.1:${DEBUG_PORT}/json/list`);
      const tabs = await res.json();
      if (tabs.length > 0 && tabs[0].webSocketDebuggerUrl) {
        return tabs[0].webSocketDebuggerUrl;
      }
    } catch {
      await sleep(250);
    }
  }
  throw new Error('Chrome remote debugging endpoint not ready');
}

async function run() {
  try {
    const wsUrl = await getDebuggerWsUrl();
    console.log('Connected to Chrome DevTools Protocol at:', wsUrl);

    const ws = new WebSocket(wsUrl);
    let msgId = 1;
    const callbacks = new Map();

    ws.onmessage = (event) => {
      const data = JSON.parse(event.data);
      if (data.id && callbacks.has(data.id)) {
        callbacks.get(data.id)(data);
        callbacks.delete(data.id);
      }
    };

    await new Promise((resolve) => {
      ws.onopen = resolve;
    });

    function sendCommand(method, params = {}) {
      return new Promise((resolve) => {
        const id = msgId++;
        callbacks.set(id, (res) => resolve(res.result));
        ws.send(JSON.stringify({ id, method, params }));
      });
    }

    await sendCommand('Page.enable');
    await sendCommand('Runtime.enable');
    await sendCommand('Log.enable');

    ws.onmessage = (event) => {
      const data = JSON.parse(event.data);
      if (data.method === 'Runtime.consoleAPICalled') {
        const text = data.params.args.map(a => a.value || a.description || JSON.stringify(a)).join(' ');
        console.log('[Browser Console]', data.params.type, text);
      }
      if (data.id && callbacks.has(data.id)) {
        callbacks.get(data.id)(data);
        callbacks.delete(data.id);
      }
    };

    // Set authenticated user in localStorage
    await sendCommand('Runtime.evaluate', {
      expression: `
        localStorage.setItem('lemon_lenta_auth_session_v1', JSON.stringify({
          id: 'usr-member-001',
          name: 'Пользователь (User)',
          email: 'user@lemon.team',
          role: 'user'
        }));
      `
    });

    await sendCommand('Page.navigate', { url: 'http://localhost:5174/' });
    await sleep(3000);

    // Set Desktop viewport first (1440x900)
    await sendCommand('Emulation.setDeviceMetricsOverride', {
      width: 1440,
      height: 900,
      deviceScaleFactor: 1,
      mobile: false
    });

    // Ensure Light Mode initially and click Feeds button
    await sendCommand('Runtime.evaluate', {
      expression: `
        (() => {
          document.documentElement.classList.remove('dark');
          return new Promise((resolve) => {
            let attempts = 0;
            const check = () => {
              attempts++;
              const buttons = Array.from(document.querySelectorAll('nav button, button'));
              const feedsBtn = buttons.find(b => b.textContent && (b.textContent.includes('Каналы') || b.textContent.includes('Ленты')));
              if (feedsBtn) {
                feedsBtn.click();
                resolve('clicked');
              } else if (attempts > 30) {
                resolve('timeout');
              } else {
                setTimeout(check, 200);
              }
            };
            check();
          });
        })()
      `,
      awaitPromise: true
    });

    await sleep(3500);

    // Measure feed layout elements
    const metrics = await sendCommand('Runtime.evaluate', {
      expression: `
        (() => {
          const main = document.querySelector('main');
          const posts = document.querySelectorAll('article');
          const softPanel = document.querySelector('.rounded-2xl');
          const channelNames = Array.from(document.querySelectorAll('article h3')).slice(0, 5).map(h => h.textContent);
          const channelAvatars = Array.from(document.querySelectorAll('article .rounded-full')).slice(0, 5).map(a => a.textContent.trim());
          return {
            windowWidth: window.innerWidth,
            windowHeight: window.innerHeight,
            mainWidth: main ? main.clientWidth : null,
            postsCount: posts.length,
            firstPostWidth: posts[0] ? posts[0].clientWidth : null,
            firstFiveTitles: channelNames,
            firstFiveAvatars: channelAvatars,
            isDark: document.documentElement.classList.contains('dark'),
          };
        })()
      `,
      returnByValue: true
    });

    console.log('Desktop Light Metrics:', metrics.result?.value);

    // 1. Capture Desktop Light Screenshot
    const desktopShot = await sendCommand('Page.captureScreenshot', { format: 'png' });
    fs.writeFileSync(
      path.join(ARTIFACT_DIR, 'feeds_desktop_light.png'),
      Buffer.from(desktopShot.data, 'base64')
    );
    console.log('Saved feeds_desktop_light.png');

    // 2. Capture Mobile Light Viewport (390x844 iPhone 14)
    await sendCommand('Emulation.setDeviceMetricsOverride', {
      width: 390,
      height: 844,
      deviceScaleFactor: 2,
      mobile: true
    });
    await sleep(1000);

    const mobileLightShot = await sendCommand('Page.captureScreenshot', { format: 'png' });
    fs.writeFileSync(
      path.join(ARTIFACT_DIR, 'feeds_mobile_light.png'),
      Buffer.from(mobileLightShot.data, 'base64')
    );
    console.log('Saved feeds_mobile_light.png');

    // 3. Toggle Dark Mode
    await sendCommand('Runtime.evaluate', {
      expression: `
        document.documentElement.classList.add('dark');
      `
    });
    await sleep(800);

    // 4. Capture Mobile Dark
    const mobileDarkShot = await sendCommand('Page.captureScreenshot', { format: 'png' });
    fs.writeFileSync(
      path.join(ARTIFACT_DIR, 'feeds_mobile_dark.png'),
      Buffer.from(mobileDarkShot.data, 'base64')
    );
    console.log('Saved feeds_mobile_dark.png');

    // 5. Capture Desktop Dark
    await sendCommand('Emulation.setDeviceMetricsOverride', {
      width: 1440,
      height: 900,
      deviceScaleFactor: 1,
      mobile: false
    });
    await sleep(800);

    const desktopDarkShot = await sendCommand('Page.captureScreenshot', { format: 'png' });
    fs.writeFileSync(
      path.join(ARTIFACT_DIR, 'feeds_desktop_dark.png'),
      Buffer.from(desktopDarkShot.data, 'base64')
    );
    console.log('Saved feeds_desktop_dark.png');

    ws.close();
  } catch (err) {
    console.error('Error during testing:', err);
  } finally {
    chrome.kill();
  }
}

run();
