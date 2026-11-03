import * as path from 'path';
import * as os from 'os';
import * as fs from 'fs';

// Ensure test environment points to dedicated test database
const postgresPort = process.env.POSTGRES_PORT || '5434';
process.env.DATABASE_URL =
  process.env.TEST_DATABASE_URL ||
  `postgresql://lemon:lemon_secret@127.0.0.1:${postgresPort}/lemon_calendarium_test?schema=public`;
process.env.ADMIN_TOKEN = 'lenta_adm_master_permanent_7f8a9b0c1d2e3f4a5b6c7d8e9f0a1b2c';
process.env.NODE_ENV = 'test';

// Isolate sparks watcher from user home directory during integration tests
const testSparksDir = path.join(os.tmpdir(), 'lemon-test-sparks-empty');
fs.mkdirSync(testSparksDir, { recursive: true });
process.env.SPARKS_INCOMING_DIR = testSparksDir;
process.env.GDRIVE_SYNC_FOLDER = '';

