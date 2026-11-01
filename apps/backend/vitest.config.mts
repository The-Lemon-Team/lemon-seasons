import { defineConfig } from 'vitest/config';
import swc from 'unplugin-swc';
import path from 'node:path';

/**
 * Backend unit tests (fast, no database).
 * SWC is used instead of esbuild so NestJS decorator metadata (emitDecoratorMetadata) works,
 * which dependency injection in Test.createTestingModule() relies on.
 * Integration tests (real Postgres) use vitest.integration.config.mts.
 */
export default defineConfig({
  plugins: [swc.vite({ module: { type: 'es6' } })],
  resolve: {
    alias: {
      '@lenta/shared': path.resolve(import.meta.dirname, '../../packages/shared/src'),
      '@': path.resolve(import.meta.dirname, 'src'),
    },
  },
  test: {
    environment: 'node',
    include: ['src/**/*.spec.ts'],
    restoreMocks: true,
    coverage: {
      provider: 'v8',
      reporter: ['text', 'html'],
      include: ['src/**/*.ts'],
      exclude: ['src/**/*.spec.ts', 'src/main.ts', 'src/**/*.module.ts', 'src/**/*.data.ts', 'src/**/dto/**'],
    },
  },
});
