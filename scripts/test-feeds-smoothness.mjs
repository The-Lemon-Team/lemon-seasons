import { spawn } from 'child_process';
import fs from 'fs';
import path from 'path';

const CHROME_PATH = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const DEBUG_PORT = 9222;
const ARTIFACT_DIR = 'C:\\Users\\Ilege\\.gemini\\antigravity\\brain\\53e585f0-ac41-4ce9-800e-4a03034fb046';

if (!fs.existsSync(ARTIFACT_DIR)) {
  fs.mkdirSync(ARTIFACT_DIR, { recursive: true });
}

const PROFILE_DIR = path.resolve('test-artifacts', 'chrome-profile-smooth');
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
  'http://localhost:5174/'
]);

chrome.stderr.on('data', (d) => console.log('[Chrome Stderr]', d.toString()));
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

    // 1. Set authenticated user session in localStorage
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

    // 2. Navigate to Calendar App
    console.log('Navigating to http://localhost:5174/...');
    await sendCommand('Page.navigate', { url: 'http://localhost:5174/' });
    await sleep(2500);

    // 3. Desktop Viewport
    await sendCommand('Emulation.setDeviceMetricsOverride', {
      width: 1440,
      height: 900,
      deviceScaleFactor: 1,
      mobile: false
    });

    // 4. Click Feeds Tab in Navbar
    console.log('Waiting for Navbar Feeds button...');
    const navResult = await sendCommand('Runtime.evaluate', {
      expression: `
        new Promise((resolve) => {
          let count = 0;
          const check = () => {
            count++;
            const buttons = Array.from(document.querySelectorAll('nav button, header button, button'));
            const btn = buttons.find(b => b.textContent && (b.textContent.includes('Каналы') || b.textContent.includes('Ленты')));
            if (btn) {
              btn.click();
              resolve('clicked');
            } else if (count > 40) {
              resolve('not_found');
            } else {
              setTimeout(check, 100);
            }
          };
          check();
        })
      `,
      awaitPromise: true,
      returnByValue: true
    });
    console.log('Feeds navigation result:', navResult.value);
    await sleep(2000);

    // 5. Test Button Width Stability: Measure before and after clicking "Spark AI"
    console.log('Testing Button Width Stability...');
    const buttonTest = await sendCommand('Runtime.evaluate', {
      expression: `
        (() => {
          const allTabs = Array.from(document.querySelectorAll('button')).filter(b => 
            b.textContent && (b.textContent.includes('Все каналы') || b.textContent.includes('AI') || b.textContent.includes('Habr'))
          );
          if (allTabs.length < 2) {
            return { error: 'Feeds tabs not found', count: allTabs.length };
          }

          const allBtn = allTabs[0];
          const aiBtn = allTabs[1];

          const beforeAllRect = allBtn.getBoundingClientRect();
          const beforeAiRect = aiBtn.getBoundingClientRect();

          // Click AI tab
          aiBtn.click();

          const afterAllRect = allBtn.getBoundingClientRect();
          const afterAiRect = aiBtn.getBoundingClientRect();

          return {
            allBtnText: allBtn.textContent.trim(),
            allWidthBefore: beforeAllRect.width,
            allWidthAfter: afterAllRect.width,
            allWidthDiff: Math.abs(afterAllRect.width - beforeAllRect.width),
            aiBtnText: aiBtn.textContent.trim(),
            aiWidthBefore: beforeAiRect.width,
            aiWidthAfter: afterAiRect.width,
            aiWidthDiff: Math.abs(afterAiRect.width - beforeAiRect.width),
          };
        })()
      `,
      returnByValue: true
    });
    console.log('Button Width Stability Results:', buttonTest.value);

    // 6. Test Zero-Latency In-Memory Filter (no loading spinner, articles present)
    await sleep(400);
    const filterMetrics = await sendCommand('Runtime.evaluate', {
      expression: `
        (() => {
          const posts = document.querySelectorAll('article');
          const spinner = document.querySelector('.animate-pulse');
          return {
            sparkAiPostsCount: posts.length,
            hasLoadingSpinner: Boolean(spinner),
            firstPostTitle: posts[0]?.querySelector('.font-semibold')?.textContent?.trim() || null,
          };
        })()
      `,
      returnByValue: true
    });
    console.log('Spark AI Filter Metrics:', filterMetrics.value);

    // Capture Spark AI Desktop Screenshot
    const sparkShot = await sendCommand('Page.captureScreenshot', { format: 'png' });
    fs.writeFileSync(
      path.join(ARTIFACT_DIR, 'feeds_desktop_light.png'),
      Buffer.from(sparkShot.data, 'base64')
    );
    console.log('Saved feeds_desktop_light.png');

    // 7. Test Switching to Classic Mode
    console.log('Switching to Classic Mode...');
    const classicClick = await sendCommand('Runtime.evaluate', {
      expression: `
        (() => {
          const buttons = Array.from(document.querySelectorAll('button'));
          const classicBtn = buttons.find(b => b.textContent && b.textContent.includes('Classic'));
          if (classicBtn) {
            classicBtn.click();
            return 'clicked';
          }
          return 'not_found';
        })()
      `,
      returnByValue: true
    });
    console.log('Classic Mode click:', classicClick.value);
    await sleep(800);

    const classicMetrics = await sendCommand('Runtime.evaluate', {
      expression: `
        (() => {
          const tabs = Array.from(document.querySelectorAll('button')).filter(b => 
            b.textContent && (b.textContent.includes('Все события') || b.textContent.includes('Госпраздники') || b.textContent.includes('Воинская') || b.textContent.includes('Православие') || b.textContent.includes('MCU'))
          ).map(b => b.textContent.trim());
          const posts = document.querySelectorAll('article');
          const firstPostTitle = posts[0]?.querySelector('.font-semibold')?.textContent?.trim() || null;
          return {
            classicTabsFound: tabs,
            classicPostsCount: posts.length,
            firstPostTitle
          };
        })()
      `,
      returnByValue: true
    });
    console.log('Classic Mode Metrics:', classicMetrics.value);

    // Capture Classic Desktop Screenshot
    const classicShot = await sendCommand('Page.captureScreenshot', { format: 'png' });
    fs.writeFileSync(
      path.join(ARTIFACT_DIR, 'feeds_classic_mode.png'),
      Buffer.from(classicShot.data, 'base64')
    );
    console.log('Saved feeds_classic_mode.png');

    // 8. Test Switching to Telegram Mode
    console.log('Switching to Telegram Mode...');
    const telegramClick = await sendCommand('Runtime.evaluate', {
      expression: `
        (() => {
          const buttons = Array.from(document.querySelectorAll('button'));
          const tgBtn = buttons.find(b => b.textContent && b.textContent.includes('Telegram'));
          if (tgBtn) {
            tgBtn.click();
            return 'clicked';
          }
          return 'not_found';
        })()
      `,
      returnByValue: true
    });
    console.log('Telegram Mode click:', telegramClick.value);
    await sleep(1500);

    const tgMetrics = await sendCommand('Runtime.evaluate', {
      expression: `
        (() => {
          const tgStream = document.querySelector('main');
          return {
            hasMain: Boolean(tgStream),
            contentSnippet: tgStream?.textContent?.slice(0, 150)
          };
        })()
      `,
      returnByValue: true
    });
    console.log('Telegram Mode Metrics:', tgMetrics.value);

    // Capture Telegram Desktop Screenshot
    const tgShot = await sendCommand('Page.captureScreenshot', { format: 'png' });
    fs.writeFileSync(
      path.join(ARTIFACT_DIR, 'feeds_telegram_mode.png'),
      Buffer.from(tgShot.data, 'base64')
    );
    console.log('Saved feeds_telegram_mode.png');

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
