// import js from '@eslint/js';
// import tseslint from 'typescript-eslint';
// import react from 'eslint-plugin-react';
// import reactNative from 'eslint-plugin-react-native';
// import prettier from 'eslint-plugin-prettier';
// import globals from 'globals';

// // Clean up any whitespace issues in globals
// const cleanedGlobals = {};
// for (const [key, value] of Object.entries(globals.browser)) {
//   cleanedGlobals[key.trim()] = value;
// }

// export default [
//   js.configs.recommended,
//   ...tseslint.configs.recommended,
//   {
//     files: ['**/*.ts', '**/*.tsx'],
//     languageOptions: {
//       parser: tseslint.parser,
//       parserOptions: {
//         ecmaVersion: 'latest',
//         sourceType: 'module',
//         project: './tsconfig.json',
//       },
//       globals: {
//         ...cleanedGlobals,
//       },
//     },
//     plugins: {
//       react,
//       'react-native': reactNative,
//       prettier,
//     },
//     rules: {
//       'prettier/prettier': 'warn',
//       'react-native/no-inline-styles': 'off',
//       'react/prop-types': 'off',
//     },
//     settings: {
//       react: {
//         version: 'detect',
//       },
//     },
//   },
// ];

// eslint.config.js
// eslint.config.js
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
      'no-undef': 'warn', // Allow warnings for undefined variables (for `process`)
      'prettier/prettier': 'warn',
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
];
