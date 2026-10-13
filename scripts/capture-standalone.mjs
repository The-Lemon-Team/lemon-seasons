import { spawn } from 'child_process';
import fs from 'fs';
import path from 'path';

const CHROME_PATH = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const DEBUG_PORT = 9222;
const ARTIFACT_DIR = 'C:\\Users\\Ilege\\.gemini\\antigravity\\brain\\8f0cfac0-e2f0-4e8d-953c-6cd89119bb09';

if (!fs.existsSync(ARTIFACT_DIR)) {
  fs.mkdirSync(ARTIFACT_DIR, { recursive: true });
}

const PROFILE_DIR = path.resolve('test-artifacts', 'chrome-profile-cap');
if (!fs.existsSync(PROFILE_DIR)) {
  fs.mkdirSync(PROFILE_DIR, { recursive: true });
}

// Launch Chrome directly in 390x844 mobile viewport
const chrome = spawn(CHROME_PATH, [
  '--headless=new',
  `--remote-debugging-port=${DEBUG_PORT}`,
  `--user-data-dir=${PROFILE_DIR}`,
  '--window-size=390,844',
  '--disable-gpu',
  '--no-sandbox',
  '--hide-scrollbars',
  'http://localhost:5175/'
]);

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

    console.log('Navigating to http://localhost:5175/...');
    await new Promise((resolve) => {
      const onMsg = (e) => {
        const d = JSON.parse(e.data);
        if (d.method === 'Page.loadEventFired') {
          resolve();
        }
      };
      ws.addEventListener('message', onMsg);
      sendCommand('Page.navigate', { url: 'http://localhost:5175/' });
    });
    await sleep(1000);
    console.log('Waiting for articles to render...');
    await sendCommand('Runtime.evaluate', {
      expression: `
        new Promise((resolve) => {
          let count = 0;
          const check = () => {
            count++;
            const articles = document.querySelectorAll('article');
            if (articles.length > 0) resolve(articles.length);
            else if (count > 30) resolve(0);
            else setTimeout(check, 150);
          };
          check();
        })
      `,
      awaitPromise: true,
      returnByValue: true
    });
    await sleep(800);

    // 1. Mobile Light Screenshot
    console.log('Capturing standalone_mobile_light.png...');
    const mobileLightShot = await sendCommand('Page.captureScreenshot', { format: 'png' });
    fs.writeFileSync(
      path.join(ARTIFACT_DIR, 'standalone_mobile_light.png'),
      Buffer.from(mobileLightShot.data, 'base64')
    );
    console.log('Saved standalone_mobile_light.png');

    // 2. Open Categories Bottom Sheet
    console.log('Opening mobile categories bottom sheet...');
    await sendCommand('Runtime.evaluate', {
      expression: `
        (() => {
          const buttons = Array.from(document.querySelectorAll('nav button, button'));
          const catBtn = buttons.find(b => b.textContent && b.textContent.includes('Категории'));
          if (catBtn) catBtn.click();
        })()
      `
    });
    await sleep(500);

    const sheetShot = await sendCommand('Page.captureScreenshot', { format: 'png' });
    fs.writeFileSync(
      path.join(ARTIFACT_DIR, 'standalone_mobile_categories.png'),
      Buffer.from(sheetShot.data, 'base64')
    );
    console.log('Saved standalone_mobile_categories.png');

    // Close categories sheet
    await sendCommand('Runtime.evaluate', {
      expression: `
        (() => {
          const buttons = Array.from(document.querySelectorAll('nav button, button'));
          const streamBtn = buttons.find(b => b.textContent && b.textContent.includes('Поток'));
          if (streamBtn) streamBtn.click();
        })()
      `
    });
    await sleep(400);

    // 3. Open Detail Modal
    console.log('Opening article detail modal...');
    await sendCommand('Runtime.evaluate', {
      expression: `
        (() => {
          const article = document.querySelector('article');
          if (article) article.click();
        })()
      `
    });
    await sleep(500);

    const modalShot = await sendCommand('Page.captureScreenshot', { format: 'png' });
    fs.writeFileSync(
      path.join(ARTIFACT_DIR, 'standalone_mobile_detail.png'),
      Buffer.from(modalShot.data, 'base64')
    );
    console.log('Saved standalone_mobile_detail.png');

    // Close detail modal
    await sendCommand('Runtime.evaluate', {
      expression: `
        (() => {
          const closeBtn = document.querySelector('.fixed button');
          if (closeBtn) closeBtn.click();
        })()
      `
    });
    await sleep(400);

    // 4. Toggle Dark Mode on Mobile
    console.log('Toggling dark mode...');
    await sendCommand('Runtime.evaluate', {
      expression: `document.documentElement.classList.add('dark');`
    });
    await sleep(400);

    const mobileDarkShot = await sendCommand('Page.captureScreenshot', { format: 'png' });
    fs.writeFileSync(
      path.join(ARTIFACT_DIR, 'standalone_mobile_dark.png'),
      Buffer.from(mobileDarkShot.data, 'base64')
    );
    console.log('Saved standalone_mobile_dark.png');

    // 5. Desktop Viewport (1440x900)
    console.log('Setting desktop metrics (1440x900)...');
    await sendCommand('Emulation.setDeviceMetricsOverride', {
      width: 1440,
      height: 900,
      deviceScaleFactor: 1,
      mobile: false
    });
    await sleep(600);

    const desktopDarkShot = await sendCommand('Page.captureScreenshot', { format: 'png' });
    fs.writeFileSync(
      path.join(ARTIFACT_DIR, 'standalone_desktop_dark.png'),
      Buffer.from(desktopDarkShot.data, 'base64')
    );
    console.log('Saved standalone_desktop_dark.png');

    // Switch to Light Desktop
    await sendCommand('Runtime.evaluate', {
      expression: `document.documentElement.classList.remove('dark');`
    });
    await sleep(400);

    const desktopLightShot = await sendCommand('Page.captureScreenshot', { format: 'png' });
    fs.writeFileSync(
      path.join(ARTIFACT_DIR, 'standalone_desktop_light.png'),
      Buffer.from(desktopLightShot.data, 'base64')
    );
    console.log('Saved standalone_desktop_light.png');

    console.log('All standalone screenshots captured successfully!');
    ws.close();
  } catch (err) {
    console.error('Error during testing:', err);
  } finally {
    chrome.kill();
  }
}

run();
