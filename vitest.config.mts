import { defineConfig } from 'vitest/config';

// environment: 'node' — every current test targets pure functions or file-content
// assertions, not a mounted React component. Don't add jsdom/@testing-library/react
// for a new test without a real need; see enforced-invariants.md invariant 6 for the
// reasoning (transcript hydration is tested at the pure-function level instead).
export default defineConfig({
  test: {
    environment: 'node',
    include: ['**/*.test.ts'],
    exclude: ['node_modules', '.next', 'supabase/tests/**'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'lcov'],
    },
  },
  resolve: {
    alias: {
      '@': import.meta.dirname,
    },
  },
});
