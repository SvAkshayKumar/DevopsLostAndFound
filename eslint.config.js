import js from '@eslint/js';
import tseslint from 'typescript-eslint';
import prettierPlugin from 'eslint-plugin-prettier';

export default [
  js.configs.recommended,
  ...tseslint.configs.recommended,
  {
    files: ['**/*.ts', '**/*.tsx'],
    languageOptions: {
      parser: tseslint.parser,
    },
    plugins: {
      prettier: prettierPlugin,
    },
    rules: {
      '@typescript-eslint/no-unused-vars': 'warn',
      '@typescript-eslint/no-explicit-any': 'warn',
      'no-undef': 'warn', // Allow warnings for undefined variables (e.g., `process`)
      'prettier/prettier': 'warn', // Change to 'error' if you want it as an error
    },
  },
  {
    files: ['*.config.js'],
    languageOptions: {
      globals: {
        process: 'readonly', // Prevent 'process' undefined warnings
        module: 'readonly',
      },
    },
  },
  {
    files: ['**/*.tsx', '**/*.ts'],
    languageOptions: {
      globals: {
        'console': 'readonly',
        'fetch': 'readonly',
        'setTimeout': 'readonly',
        'clearTimeout': 'readonly',
        'global': 'readonly',
        'NodeJS': 'readonly',
        'setInterval': 'readonly',
        'clearInterval': 'readonly',
        'window': 'readonly',
        // Add more globals here as needed
      },
    },
  },
  // Add React Native environment if applicable
  {
    files: ['**/*.tsx', '**/*.ts'],
    env: {
      'react-native/react-native': true,
    },
  },
];
