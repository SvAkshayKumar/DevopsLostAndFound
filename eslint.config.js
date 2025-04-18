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
import js from '@eslint/js';
import tseslint from 'typescript-eslint';
import prettierPlugin from 'eslint-plugin-prettier'; // ✅ import the plugin

export default [
  js.configs.recommended,
  ...tseslint.configs.recommended,
  {
    files: ['**/*.ts', '**/*.tsx'],
    languageOptions: {
      parser: tseslint.parser,
    },
    plugins: {
      prettier: prettierPlugin, // ✅ register the plugin
    },
    rules: {
      // ESLint rules
      '@typescript-eslint/no-unused-vars': 'warn',
      '@typescript-eslint/no-explicit-any': 'warn',
      'no-undef': 'warn', // general no-undef rule

      // Prettier rule
      'prettier/prettier': 'warn',
    },
  },
  {
    files: ['*.config.js'], // ✅ Allow Node.js globals for config files
    languageOptions: {
      globals: {
        process: 'readonly',
        module: 'readonly',
      },
    },
  },
  {
    files: ['**/*.tsx', '**/*.ts'], // ✅ Allow browser globals like `window`, `fetch`, etc.
    languageOptions: {
      globals: {
        'console': 'readonly', // Allow `console`
        'fetch': 'readonly', // Allow `fetch`
        'setTimeout': 'readonly', // Allow `setTimeout`
        'clearTimeout': 'readonly', // Allow `clearTimeout`
        'global': 'readonly', // Allow `global`
        'NodeJS': 'readonly', // Allow `NodeJS`
        'setInterval': 'readonly', // Allow `setInterval`
        'clearInterval': 'readonly', // Allow `clearInterval`
        'window': 'readonly', // Allow `window`
        // Any other specific globals you need to define without leading or trailing whitespace.
      },
    },
  },
];
