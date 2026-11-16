#!/usr/bin/env node
import { execSync } from 'node:child_process';
import * as path from 'node:path';

const ROOT_DIR = process.cwd();
const COMPOSE_FILE = 'docker-compose.remote.yml';
const REMOTE_HOST_IP = process.env.REMOTE_HOST_IP || '192.168.1.100';
const REMOTE_DOCKER_HOST = process.env.REMOTE_DOCKER_HOST || `tcp://${REMOTE_HOST_IP}:2375`;

const FRONTEND_SERVICES = ['feed-app', 'calendar-app', 'admin-cms'];
const ALL_SERVICES = ['postgres', 'backend', ...FRONTEND_SERVICES, 'gateway'];

const SERVICE_FILTERS = {
  'feed-app': '@lenta/feed-app',
  'calendar-app': '@lenta/calendar-app',
  'admin-cms': 'lemon-seasons-admin',
};

function getRemoteDockerEnv(extra = {}) {
  const env = { ...process.env, ...extra };
  // Prevent corporate/local HTTP_PROXY from intercepting LAN TCP Docker API traffic
  delete env.HTTP_PROXY;
  delete env.HTTPS_PROXY;
  delete env.http_proxy;
  delete env.https_proxy;
  env.NO_PROXY = `${REMOTE_HOST_IP},localhost,127.0.0.1`;
  env.DOCKER_HOST = REMOTE_DOCKER_HOST;
  return env;
}

function runLocal(cmd, extraEnv = {}) {
  return execSync(cmd, {
    cwd: ROOT_DIR,
    stdio: 'inherit',
    encoding: 'utf-8',
    env: { ...process.env, ...extraEnv },
  });
}

function runRemoteCompose(args, options = {}) {
  const cmd = `docker compose -f ${COMPOSE_FILE} ${args}`;
  return execSync(cmd, {
    cwd: ROOT_DIR,
    stdio: options.silent ? 'pipe' : 'inherit',
    encoding: 'utf-8',
    env: getRemoteDockerEnv(),
  });
}

function resolveRequestedServices(rawArgs) {
  const tokens = rawArgs.filter((arg) => !arg.startsWith('--'));
  if (tokens.length === 0) return [];
  const expanded = [];
  for (const token of tokens) {
    if (token === 'web' || token === 'frontends') {
      expanded.push(...FRONTEND_SERVICES);
    } else if (ALL_SERVICES.includes(token)) {
      expanded.push(token);
    } else {
      throw new Error(`Неизвестный сервис "${token}". Доступные: ${ALL_SERVICES.join(', ')}, web`);
    }
  }
  return [...new Set(expanded)];
}

function buildFrontendBundles(targets) {
  const webTargets = targets.length === 0 ? FRONTEND_SERVICES : targets.filter((s) => s in SERVICE_FILTERS);
  if (webTargets.length === 0) return;

  const filterFlags = webTargets.map((s) => `--filter=${SERVICE_FILTERS[s]}`).join(' ');
  console.log(`🏗️ Сборка production-бандлов (${webTargets.join(', ')})...`);
  runLocal(`npx turbo run build ${filterFlags}`, {
    VITE_API_URL: '',
    VITE_ADMIN_API_URL: '',
  });
}

function printStatus() {
  console.log(`\n====================================================================`);
  console.log(`🍋 LEMON SEASONS — УДАЛЁННЫЙ СТЕНД (${REMOTE_DOCKER_HOST})`);
  console.log(`====================================================================\n`);
  runRemoteCompose('ps -a');
  console.log(`\nТочки доступа:`);
  console.log(`  Feed App:     http://${REMOTE_HOST_IP}:5175`);
  console.log(`  Calendar App: http://${REMOTE_HOST_IP}:5174`);
  console.log(`  Admin CMS:    http://${REMOTE_HOST_IP}:5173`);
  console.log(`  Gateway:      http://${REMOTE_HOST_IP}:8090`);
  console.log(`  Backend API:  http://${REMOTE_HOST_IP}:3001/api/health`);
  console.log(`  PostgreSQL:   ${REMOTE_HOST_IP}:${process.env.REMOTE_POSTGRES_PORT || 5435}\n`);
}

const COMMAND_HANDLERS = {
  status: () => {
    printStatus();
  },

  'db:up': () => {
    console.log(`🐘 Запуск удалённой БД PostgreSQL на ${REMOTE_HOST_IP}...`);
    runRemoteCompose('up -d postgres');
    printStatus();
  },

  'backend:stop': () => {
    console.log(`🛑 Остановка удалённого backend (БД на ${REMOTE_HOST_IP} остаётся работать для dev)...`);
    runRemoteCompose('stop backend');
    printStatus();
  },

  'backend:start': (args) => {
    const withBuild = args.includes('--build');
    const flags = withBuild ? '--build ' : '';
    console.log(`🚀 Запуск удалённого backend на ${REMOTE_HOST_IP}...`);
    runRemoteCompose(`up -d ${flags}backend`);
    printStatus();
  },

  deploy: (args) => {
    const targets = resolveRequestedServices(args);
    buildFrontendBundles(targets);
    const serviceList = targets.join(' ');
    console.log(`🐳 Деплой на ${REMOTE_DOCKER_HOST}: ${serviceList || 'весь стек'}...`);
    runRemoteCompose(`up -d --build ${serviceList}`.trim());
    printStatus();
  },

  logs: (args) => {
    const targets = resolveRequestedServices(args);
    const serviceList = targets.join(' ');
    runRemoteCompose(`logs -f --tail=100 ${serviceList}`.trim());
  },
};

function main() {
  const [, , rawCommand = 'status', ...restArgs] = process.argv;
  const handler = COMMAND_HANDLERS[rawCommand];
  if (!handler) {
    console.error(
      `❌ Неизвестная команда "${rawCommand}". Доступные: ${Object.keys(COMMAND_HANDLERS).join(', ')}`,
    );
    process.exit(1);
  }
  handler(restArgs);
}

main();
