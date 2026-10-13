import { spawn } from 'child_process';
import fs from 'fs';
import path from 'path';

const CHROME_PATH = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const DEBUG_PORT = 9222;
const ARTIFACT_DIR = 'C:\\Users\\Ilege\\.gemini\\antigravity\\brain\\53e585f0-ac41-4ce9-800e-4a03034fb046';

if (!fs.existsSync(ARTIFACT_DIR)) {
  fs.mkdirSync(ARTIFACT_DIR, { recursive: true });
}

const PROFILE_DIR = path.resolve('test-artifacts', 'chrome-profile-standalone');
if (!fs.existsSync(PROFILE_DIR)) {
  fs.mkdirSync(PROFILE_DIR, { recursive: true });
}

const chrome = spawn(CHROME_PATH, [
  '--headless=new',
  `--remote-debugging-port=${DEBUG_PORT}`,
  `--user-data-dir=${PROFILE_DIR}`,
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
    await sendCommand('Page.navigate', { url: 'http://localhost:5175/' });
    await sleep(3500);

    // 1. Mobile Viewport (iPhone 14 / Pixel 390x844)
    console.log('Setting mobile viewport (390x844)...');
    await sendCommand('Emulation.setDeviceMetricsOverride', {
      width: 390,
      height: 844,
      deviceScaleFactor: 1,
      mobile: true
    });
    await sleep(2000);

    // Capture Mobile Light Screenshot
    const mobileShot = await sendCommand('Page.captureScreenshot', { format: 'png' });
    fs.writeFileSync(
      path.join(ARTIFACT_DIR, 'standalone_mobile_light.png'),
      Buffer.from(mobileShot.data, 'base64')
    );
    console.log('Saved standalone_mobile_light.png');

    // 2. Open Mobile Categories Bottom Sheet
    console.log('Clicking Categories in bottom nav...');
    await sendCommand('Runtime.evaluate', {
      expression: `
        (() => {
          const buttons = Array.from(document.querySelectorAll('nav button, button'));
          const catBtn = buttons.find(b => b.textContent && b.textContent.includes('Категории'));
          if (catBtn) catBtn.click();
        })()
      `
    });
    await sleep(1000);

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
    await sleep(600);

    // 3. Desktop Viewport (1440x900)
    console.log('Setting desktop viewport (1440x900)...');
    await sendCommand('Emulation.setDeviceMetricsOverride', {
      width: 1440,
      height: 900,
      deviceScaleFactor: 1,
      mobile: false
    });
    await sleep(1500);

    const desktopShot = await sendCommand('Page.captureScreenshot', { format: 'png' });
    fs.writeFileSync(
      path.join(ARTIFACT_DIR, 'standalone_desktop_light.png'),
      Buffer.from(desktopShot.data, 'base64')
    );
    console.log('Saved standalone_desktop_light.png');

    // 4. Toggle Dark Mode
    await sendCommand('Runtime.evaluate', {
      expression: `document.documentElement.classList.add('dark');`
    });
    await sleep(1000);

    const desktopDarkShot = await sendCommand('Page.captureScreenshot', { format: 'png' });
    fs.writeFileSync(
      path.join(ARTIFACT_DIR, 'standalone_desktop_dark.png'),
      Buffer.from(desktopDarkShot.data, 'base64')
    );
    console.log('Saved standalone_desktop_dark.png');

    console.log('All standalone screenshots captured successfully!');
    ws.close();
  } catch (err) {
    console.error('Error during testing:', err);
  } finally {
    chrome.kill();
  }
}

run();
