import { defineConfig } from 'tsup';

export default defineConfig((options) => ({
  entry: {
    index: 'src/index.ts',
    'server/index': 'src/server/index.ts',
  },
  format: ['esm', 'cjs'],
  dts: !options.watch,
  sourcemap: true,
  clean: !options.watch,
  treeshake: true,
  minify: false,
  platform: 'node',
  target: 'node22',
  external: ['rxjs', 'rxjs/operators', 'chokidar', 'node:sqlite'],
}));
