export default [{
  files: ['**/*.js'],
  languageOptions: {
    ecmaVersion: 2022, sourceType: 'script',
    globals: { window: 'readonly', document: 'readonly', localStorage: 'readonly', performance: 'readonly', requestAnimationFrame: 'readonly', cancelAnimationFrame: 'readonly', setTimeout: 'readonly', clearTimeout: 'readonly', Element: 'readonly', console: 'readonly', CSS: 'readonly', getComputedStyle: 'readonly' },
  },
  rules: {
    'no-undef': 'error', 'no-unused-vars': ['warn', { args: 'none' }], 'no-redeclare': 'error', 'no-dupe-keys': 'error',
    'no-unreachable': 'error', 'no-constant-condition': 'warn', 'no-self-assign': 'error', 'no-use-before-define': ['error', { functions: false, classes: true, variables: false }],
    'no-shadow-restricted-names': 'error', 'no-fallthrough': 'error', 'eqeqeq': ['warn', 'smart'], 'no-empty': ['error', { allowEmptyCatch: true }],
  },
}];
