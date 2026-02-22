import { defineConfig, globalIgnores } from 'eslint/config';
import nextVitals from 'eslint-config-next/core-web-vitals';
import tseslint from 'typescript-eslint';
import prettier from 'eslint-config-prettier/flat';

const eslintConfig = defineConfig([
  ...nextVitals,
  ...tseslint.configs.recommended,
  prettier,
  globalIgnores(['.next/**', 'out/**', 'build/**', 'next-env.d.ts']),
  {
    rules: {
      '@typescript-eslint/no-unused-vars': [
        'warn',
        { argsIgnorePattern: '^_', varsIgnorePattern: '^_' },
      ],
      '@typescript-eslint/no-explicit-any': 'warn',
      // Prevent regression to styled-jsx. All 'use client' components must use
      // CSS Modules (.module.css) instead — see docs on the FOUC fix.
      'no-restricted-syntax': [
        'error',
        {
          selector: "JSXOpeningElement[name.name='style'] > JSXAttribute[name.name='jsx']",
          message:
            "Do not use <style jsx>. Use a CSS Module (.module.css) instead to prevent Flash of Unstyled Content (FOUC).",
        },
      ],
    },
  },
]);

export default eslintConfig;
