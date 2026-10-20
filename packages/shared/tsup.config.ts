import { defineConfig } from 'tsup';

export default defineConfig((options) => ({
  entry: ['src/index.ts'],
  format: ['esm', 'cjs'],
  dts: !options.watch,
  sourcemap: true,
  clean: !options.watch,
  treeshake: true,
  minify: false,
  noExternal: ['zod'],
}));
