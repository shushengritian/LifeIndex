import eslint from '@eslint/js'
import reactHooks from 'eslint-plugin-react-hooks'
import reactRefresh from 'eslint-plugin-react-refresh'
import globals from 'globals'
import tseslint from 'typescript-eslint'
import { readFileSync } from 'node:fs'

// G4 uses classic deferred scripts sharing one global scope. Derive only real top-level declarations,
// rather than disabling undefined-name checks or treating every unknown identifier as a global.
const prototypeGlobals = {}
for (const file of [
  'g4-focus.js',
  'g4-icon-library.js',
  'g4-categories.js',
  'g4-cessation.js',
  'g4-app.js',
  'g4-accessibility.js',
]) {
  const source = readFileSync(new URL(`./docs/design/prototypes/${file}`, import.meta.url), 'utf8')
  const { ast } = tseslint.parser.parseForESLint(source, {
    sourceType: 'script',
    ecmaVersion: 2022,
  })
  for (const node of ast.body) {
    if (node.type === 'FunctionDeclaration' && node.id) prototypeGlobals[node.id.name] = 'readonly'
    if (node.type === 'VariableDeclaration') {
      for (const declaration of node.declarations) {
        if (declaration.id.type === 'Identifier')
          prototypeGlobals[declaration.id.name] = node.kind === 'const' ? 'readonly' : 'writable'
      }
    }
  }
}

export default tseslint.config(
  {
    ignores: ['dist', 'coverage', 'playwright-report', 'test-results'],
  },
  eslint.configs.recommended,
  ...tseslint.configs.recommended,
  // Design prototypes are browser scripts; review harnesses are CommonJS Node scripts, not TS modules.
  {
    files: ['docs/design/prototypes/**/*.js'],
    languageOptions: { sourceType: 'script', globals: { ...globals.browser, ...globals.es2022 } },
    rules: {
      '@typescript-eslint/no-unused-vars': ['error', { vars: 'local' }],
      // Classic-script lexical declarations may shadow browser/declared shared globals.
      'no-redeclare': ['error', { builtinGlobals: false }],
    },
  },
  {
    files: ['docs/design/prototypes/g4-*.js'],
    languageOptions: { globals: prototypeGlobals },
  },
  {
    files: ['docs/design/reviews/**/*.cjs'],
    languageOptions: { sourceType: 'commonjs', globals: { ...globals.node } },
    rules: { '@typescript-eslint/no-require-imports': 'off' },
  },
  {
    files: ['**/*.{ts,tsx}'],
    languageOptions: {
      globals: {
        ...globals.browser,
        ...globals.es2022,
      },
    },
    plugins: {
      'react-hooks': reactHooks,
      'react-refresh': reactRefresh,
    },
    rules: {
      ...reactHooks.configs.recommended.rules,
      'react-refresh/only-export-components': ['error', { allowConstantExport: true }],
    },
  },
  {
    files: ['scripts/**/*.mjs'],
    languageOptions: { globals: { ...globals.node } },
  },
  {
    files: ['*.config.{js,ts}', 'vite.config.ts', 'playwright.config.ts'],
    languageOptions: {
      globals: {
        ...globals.node,
      },
    },
  },
  {
    files: ['src/sw.ts'],
    languageOptions: {
      globals: {
        ...globals.serviceworker,
      },
    },
  },
)
