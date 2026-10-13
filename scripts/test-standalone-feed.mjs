import { spawn } from 'child_process';
import fs from 'fs';
import path from 'path';

const CHROME_PATH = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const DEBUG_PORT = 9222;
const ARTIFACT_DIR = 'C:\\Users\\Ilege\\.gemini\\antigravity\\brain\\53e585f0-ac41-4ce9-800e-4a03034fb046';

if (!fs.existsSync(ARTIFACT_DIR)) {
  fs.mkdirSync(ARTIFACT_DIR, { recursive: true });
}

const PROFILE_DIR = path.resolve('test-artifacts', 'chrome-profile-feed');
if (!fs.existsSync(PROFILE_DIR)) {
  fs.mkdirSync(PROFILE_DIR, { recursive: true });
}

// Kill any previous chrome processes first
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
  let ws = null;
  const timeoutId = setTimeout(() => {
    console.error('Test timed out after 45s!');
    try { if (ws) ws.close(); } catch {}
    chrome.kill();
    process.exit(1);
  }, 45000);

  try {
    const wsUrl = await getDebuggerWsUrl();
    console.log('Connected to Chrome DevTools Protocol at:', wsUrl);

    ws = new WebSocket(wsUrl);
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
      return new Promise((resolve, reject) => {
        const id = msgId++;
        const timer = setTimeout(() => {
          callbacks.delete(id);
          reject(new Error(`Command ${method} timed out`));
        }, 10000);
        callbacks.set(id, (res) => {
          clearTimeout(timer);
          resolve(res.result);
        });
        ws.send(JSON.stringify({ id, method, params }));
      });
    }

    await sendCommand('Page.enable');
    await sendCommand('Runtime.enable');

    console.log('Navigating to http://localhost:5175/...');
    await sendCommand('Page.navigate', { url: 'http://localhost:5175/' });
    await sleep(2500);

    // 1. Mobile Viewport (iPhone 14: 390x844)
    console.log('Setting Mobile Viewport (390x844)...');
    await sendCommand('Emulation.setDeviceMetricsOverride', {
      width: 390,
      height: 844,
      deviceScaleFactor: 2,
      mobile: true
    });
    await sleep(1000);

    // Capture Mobile Light Screenshot
    const mobileLightShot = await sendCommand('Page.captureScreenshot', { format: 'png' });
    fs.writeFileSync(
      path.join(ARTIFACT_DIR, 'standalone_feed_mobile_light.png'),
      Buffer.from(mobileLightShot.data, 'base64')
    );
    console.log('Saved standalone_feed_mobile_light.png');

    // 2. Open Mobile Categories Sheet (Click "Категории" bottom nav button)
    console.log('Opening Mobile Categories Sheet...');
    await sendCommand('Runtime.evaluate', {
      expression: `
        (() => {
          const buttons = Array.from(document.querySelectorAll('nav button, button'));
          const catBtn = buttons.find(b => b.textContent && b.textContent.includes('Категории'));
          if (catBtn) catBtn.click();
        })()
      `
    });
    await sleep(600);

    const mobileSheetShot = await sendCommand('Page.captureScreenshot', { format: 'png' });
    fs.writeFileSync(
      path.join(ARTIFACT_DIR, 'standalone_feed_mobile_sheet.png'),
      Buffer.from(mobileSheetShot.data, 'base64')
    );
    console.log('Saved standalone_feed_mobile_sheet.png');

    // Close categories sheet (click stream or backdrop)
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

    // 3. Open Detail Modal on First Post Card
    console.log('Opening Detail Modal...');
    await sendCommand('Runtime.evaluate', {
      expression: `
        (() => {
          const firstCard = document.querySelector('article');
          if (firstCard) firstCard.click();
        })()
      `
    });
    await sleep(600);

    const detailModalShot = await sendCommand('Page.captureScreenshot', { format: 'png' });
    fs.writeFileSync(
      path.join(ARTIFACT_DIR, 'standalone_feed_detail_modal.png'),
      Buffer.from(detailModalShot.data, 'base64')
    );
    console.log('Saved standalone_feed_detail_modal.png');

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
    console.log('Toggling Dark Mode...');
    await sendCommand('Runtime.evaluate', {
      expression: `document.documentElement.classList.add('dark');`
    });
    await sleep(500);

    const mobileDarkShot = await sendCommand('Page.captureScreenshot', { format: 'png' });
    fs.writeFileSync(
      path.join(ARTIFACT_DIR, 'standalone_feed_mobile_dark.png'),
      Buffer.from(mobileDarkShot.data, 'base64')
    );
    console.log('Saved standalone_feed_mobile_dark.png');

    // 5. Desktop Viewport (1440x900)
    console.log('Setting Desktop Viewport (1440x900)...');
    await sendCommand('Emulation.setDeviceMetricsOverride', {
      width: 1440,
      height: 900,
      deviceScaleFactor: 1,
      mobile: false
    });
    await sleep(800);

    const desktopDarkShot = await sendCommand('Page.captureScreenshot', { format: 'png' });
    fs.writeFileSync(
      path.join(ARTIFACT_DIR, 'standalone_feed_desktop_dark.png'),
      Buffer.from(desktopDarkShot.data, 'base64')
    );
    console.log('Saved standalone_feed_desktop_dark.png');

    // Switch to Light Desktop
    await sendCommand('Runtime.evaluate', {
      expression: `document.documentElement.classList.remove('dark');`
    });
    await sleep(500);

    const desktopLightShot = await sendCommand('Page.captureScreenshot', { format: 'png' });
    fs.writeFileSync(
      path.join(ARTIFACT_DIR, 'standalone_feed_desktop_light.png'),
      Buffer.from(desktopLightShot.data, 'base64')
    );
    console.log('Saved standalone_feed_desktop_light.png');

    console.log('All tests completed successfully!');
    clearTimeout(timeoutId);
    ws.close();
  } catch (err) {
    console.error('Error during testing:', err);
    clearTimeout(timeoutId);
  } finally {
    chrome.kill();
  }
}

run();
