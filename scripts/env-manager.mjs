#!/usr/bin/env node
import { execSync, spawn } from 'node:child_process';
import * as fs from 'node:fs';
import * as path from 'node:path';

const ROOT_DIR = process.cwd();
const LOCK_FILE = path.join(ROOT_DIR, 'apps', 'backend', 'uploads', '.active-watcher.lock');

const DEV_PORTS = [
  { port: 3002, name: 'Backend API (dev)' },
  { port: 5180, name: 'Feed App (dev)' },
  { port: 5176, name: 'Admin CMS (dev)' },
  { port: 5177, name: 'Calendar App (dev)' },
];

const PROD_PORTS = [
  { port: 3001, name: 'Backend API (prod container)' },
  { port: 5175, name: 'Feed App (prod container)' },
  { port: 5174, name: 'Calendar App (prod container)' },
  { port: 5173, name: 'Admin CMS (prod container)' },
  { port: 8080, name: 'Nginx Gateway (prod container)' },
];

const INFRA_PORTS = [
  { port: 5434, name: 'PostgreSQL 16 (shared DB)' },
  { port: 3000, name: 'Obsidian Sync Server' },
];

const APP_CONTAINERS = ['backend', 'gateway', 'feed-app', 'calendar-app', 'admin-cms'];
const INFRA_CONTAINERS = ['postgres', 'container-sync-server'];

function runCmd(cmd, options = {}) {
  return execSync(cmd, {
    cwd: ROOT_DIR,
    stdio: options.silent ? 'pipe' : 'inherit',
    encoding: 'utf-8',
    env: { ...process.env, ...(options.env || {}) },
  });
}

function getListeningPid(port) {
  try {
    if (process.platform === 'win32') {
      const out = execSync(
        `powershell -NoProfile -Command "(Get-NetTCPConnection -LocalPort ${port} -State Listen -ErrorAction SilentlyContinue | Select-Object -First 1).OwningProcess"`,
        { encoding: 'utf-8', stdio: ['ignore', 'pipe', 'ignore'] },
      ).trim();
      return out ? parseInt(out, 10) : null;
    } else {
      const out = execSync(`lsof -ti tcp:${port} -sTCP:LISTEN`, {
        encoding: 'utf-8',
        stdio: ['ignore', 'pipe', 'ignore'],
      }).trim();
      return out ? parseInt(out.split('\n')[0], 10) : null;
    }
  } catch {
    return null;
  }
}

function stopLocalDevPorts() {
  let stoppedAny = false;
  for (const { port, name } of DEV_PORTS) {
    const pid = getListeningPid(port);
    if (pid && pid !== process.pid) {
      console.log(`🛑 Остановка локального dev-процесса ${name} (порт :${port}, PID: ${pid})...`);
      try {
        if (process.platform === 'win32') {
          execSync(`taskkill /PID ${pid} /T /F`, { stdio: 'ignore' });
        } else {
          process.kill(pid, 'SIGTERM');
        }
        stoppedAny = true;
      } catch {
        // Process already exited
      }
    }
  }
  if (stoppedAny) {
    console.log('✅ Локальные dev-порты освобождены.');
  }
}

function clearWatcherLock() {
  try {
    if (fs.existsSync(LOCK_FILE)) {
      fs.unlinkSync(LOCK_FILE);
    }
  } catch {
    // Ignore
  }
}

function stopProdAppContainers() {
  console.log('🛑 Остановка продакшн-контейнеров приложения (backend, gateway, feed-app, calendar-app, admin-cms)...');
  try {
    runCmd(`docker compose stop ${APP_CONTAINERS.join(' ')}`);
  } catch (err) {
    console.warn('⚠️ Не удалось остановить контейнеры через docker compose:', err.message);
  }
}

function ensureInfraContainers() {
  console.log('🐘 Запуск инфраструктурных контейнеров (postgres, container-sync-server)...');
  runCmd(`docker compose up -d ${INFRA_CONTAINERS.join(' ')}`);
}

function getDockerContainerStates() {
  try {
    const out = runCmd('docker compose ps --format json', { silent: true });
    if (!out || !out.trim()) return [];
    return out
      .trim()
      .split('\n')
      .map((line) => {
        try {
          return JSON.parse(line);
        } catch {
          return null;
        }
      })
      .filter(Boolean);
  } catch {
    return [];
  }
}

function printStatus() {
  console.log('\n====================================================================');
  console.log('🍋 LEMON CALENDARIUM — СТАТУС ОКРУЖЕНИЙ (DEV ↔ PROD)');
  console.log('====================================================================\n');

  const devActive = DEV_PORTS.filter((p) => Boolean(getListeningPid(p.port)));
  const containers = getDockerContainerStates();
  const prodBackendRunning = containers.some(
    (c) => (c.Service === 'backend' || c.Name === 'lemon-calendarium-backend') && c.State === 'running',
  );

  let modeBanner = '⚪ IDLE (Запущена только БД / Инфраструктура)';
  if (devActive.length > 0 && prodBackendRunning) {
    modeBanner = '🔴 КОНФЛИКТ! Запущены одновременно DEV и PROD! Выполните `pnpm run dev:local` или `pnpm run prod:up`.';
  } else if (devActive.length > 0) {
    modeBanner = '🟢 АКТИВЕН РЕЖИМ: DEVELOPMENT (Local Host :3002 / :5180)';
  } else if (prodBackendRunning) {
    modeBanner = '🟣 АКТИВЕН РЕЖИМ: PRODUCTION (Docker :3001 / :5175 / :8080)';
  }

  console.log(`Текущий режим: ${modeBanner}\n`);

  console.log('--- Локальные Dev-порты (Host) ---');
  for (const { port, name } of DEV_PORTS) {
    const pid = getListeningPid(port);
    console.log(`  :${port.toString().padEnd(5)} ${name.padEnd(28)} ${pid ? `🟢 Запущен (PID ${pid})` : '⚪ Остановлен'}`);
  }

  console.log('\n--- Продакшн-порты (Docker) ---');
  for (const { port, name } of PROD_PORTS) {
    const pid = getListeningPid(port);
    console.log(`  :${port.toString().padEnd(5)} ${name.padEnd(28)} ${pid ? `🟣 Слушает` : '⚪ Остановлен'}`);
  }

  console.log('\n--- Инфраструктура (Общая) ---');
  for (const { port, name } of INFRA_PORTS) {
    const pid = getListeningPid(port);
    console.log(`  :${port.toString().padEnd(5)} ${name.padEnd(28)} ${pid ? `🟢 Работает` : '🔴 Остановлен'}`);
  }

  if (fs.existsSync(LOCK_FILE)) {
    try {
      const lock = JSON.parse(fs.readFileSync(LOCK_FILE, 'utf-8'));
      const ageSec = Math.round((Date.now() - (lock.updatedAt || 0)) / 1000);
      console.log(
        `\n🔒 Single-Instance Watcher Lock: ${lock.hostname}:${lock.port} (PID ${lock.pid}, ${lock.nodeEnv}, обновлен ${ageSec}с назад)`,
      );
    } catch {
      // Ignore
    }
  }
  console.log('====================================================================\n');
}

async function main() {
  const command = process.argv[2] || 'status';

  switch (command) {
    case 'db:up': {
      ensureInfraContainers();
      break;
    }

    case 'dev': {
      console.log('🔄 Переключение в режим DEVELOPMENT (dev:local)...');
      stopProdAppContainers();
      ensureInfraContainers();
      stopLocalDevPorts();
      clearWatcherLock();

      console.log('🚀 Запуск локального dev-стека (backend :3002, feed :5180, admin :5176, calendar :5177)...');
      const child = spawn(
        'npx',
        [
          'turbo',
          'run',
          'dev',
          '--filter=lemon-lenta-backend',
          '--filter=@lenta/calendar-app',
          '--filter=lemon-seasons-admin',
          '--filter=@lenta/feed-app',
        ],
        {
          cwd: ROOT_DIR,
          stdio: 'inherit',
          shell: true,
        },
      );
      child.on('exit', (code) => process.exit(code ?? 0));
      break;
    }

    case 'prod:build': {
      console.log('🏗️ Сборка фронтендов и бэкенда для PRODUCTION (с относительными nginx API путями)...');
      runCmd('npx turbo run build --filter=!@lemon/obsidian-lenta-plugin --filter=!@lenta/e2e', {
        env: {
          VITE_API_URL: '',
          VITE_ADMIN_API_URL: '',
        },
      });
      console.log('🐳 Сборка Docker-образов...');
      runCmd('docker compose build');
      console.log('✅ Продакшн-сборка успешно завершена.');
      break;
    }

    case 'prod:up': {
      console.log('🔄 Переключение в режим PRODUCTION (Docker)...');
      stopLocalDevPorts();
      clearWatcherLock();

      try {
        runCmd('docker compose up -d');
      } catch (err) {
        console.error(
          '\n❌ Ошибка запуска контейнеров Docker. Если в ошибке указано "mkdir /run/desktop/mnt/host/c: file exists", перезапустите Docker Desktop (сбой монтирования диска C: после сна Windows) и повторите `pnpm run prod:up`.',
        );
        process.exit(1);
      }

      printStatus();
      break;
    }

    case 'prod:down': {
      stopProdAppContainers();
      clearWatcherLock();
      printStatus();
      break;
    }

    case 'status':
    default: {
      printStatus();
      break;
    }
  }
}

main().catch((err) => {
  console.error('❌ Ошибка env-manager:', err);
  process.exit(1);
});
