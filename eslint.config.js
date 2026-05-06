import js from '@eslint/js'
import globals from 'globals'

export default [
  {
    ignores: [
      '.next/**',
      'node_modules/**',
      'src/**',
      'api/**',
      'server.js',
      'vite.config.js',
    ],
  },
  js.configs.recommended,
  {
    files: ['**/*.{js,jsx,mjs}'],
    languageOptions: {
      ecmaVersion: 'latest',
      sourceType: 'module',
      globals: {
        ...globals.browser,
        ...globals.node,
      },
      parserOptions: {
        ecmaFeatures: {
          jsx: true,
        },
      },
    },
    rules: {
      'no-unused-vars': ['warn', { argsIgnorePattern: '^_' }],
    },
  },
]
