import { defineConfig } from 'vitest/config';
import path from 'path';

export default defineConfig({
  plugins: [
    {
      name: 'svelte-test-loader',
      transform(src, id) {
        if (id.endsWith('.svelte')) {
          return {
            code: `
              export default class MockSvelteComponent {
                constructor() {}
                $set() {}
                $destroy() {}
                $on() {}
              }
            `,
            map: null,
          };
        }
      },
    },
  ],
  test: {
    environment: 'node',
    globals: true,
  },
  resolve: {
    alias: {
      obsidian: path.resolve(__dirname, 'src/__mocks__/obsidian.ts'),
    },
  },
});
